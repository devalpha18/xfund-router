const { accounts, contract, web3, privateKeys } = require('@openzeppelin/test-environment')

const {
  BN,           // Big Number support
  constants,
  expectRevert,
  expectEvent,
} = require('@openzeppelin/test-helpers')

const { expect } = require('chai')

const MockToken = contract.fromArtifact('MockToken') // Loads a compiled contract
const Router = contract.fromArtifact('Router') // Loads a compiled contract
const MockConsumer = contract.fromArtifact('MockConsumer') // Loads a compiled contract
const MockBadConsumer = contract.fromArtifact('MockBadConsumer') // Loads a compiled contract
const ConsumerLib = contract.fromArtifact('ConsumerLib') // Loads a compiled contract

const REQUEST_VAR_GAS_PRICE_LIMIT = 1; // gas price limit in gwei the consumer is willing to pay for data processing
const REQUEST_VAR_TOP_UP_LIMIT = 2; // max ETH that can be sent in a gas top up Tx
const REQUEST_VAR_REQUEST_TIMEOUT = 3; // request timeout in seconds

function generateSigMsg(requestId, data, consumerAddress) {
  return web3.utils.soliditySha3(
    { 'type': 'bytes32', 'value': requestId},
    { 'type': 'uint256', 'value': data.toNumber()},
    { 'type': 'address', 'value': consumerAddress}
  )
}

function generateRequestId(
  consumerAddress,
  requestNonce,
  dataProvider,
  salt) {
  return web3.utils.soliditySha3(
    { 'type': 'address', 'value': consumerAddress},
    { 'type': 'uint256', 'value': requestNonce.toNumber()},
    { 'type': 'address', 'value': dataProvider},
    { 'type': 'bytes32', 'value': salt}
  )
}

describe('Router - interaction tests', function () {
  this.timeout(300000)

  const [admin, dataProvider, dataConsumerOwner, rando] = accounts
  const [adminPk, dataProviderPk, dataConsumerPk, randoPk] = privateKeys
  const decimals = 9
  const initSupply = 1000 * (10 ** decimals)
  const fee = new BN(0.1 * ( 10 ** 9 ))
  const endpoint = "PRICE.BTC.USD.AVG"
  const salt = web3.utils.soliditySha3(web3.utils.randomHex(32), new Date())
  const gasPrice = 100 // gwei, 10 ** 9 done in contract
  const callbackFuncSig = web3.eth.abi.encodeFunctionSignature('recieveData(uint256,bytes32,bytes)')
  const priceToSend = new BN("1000")
  const ROLE_DATA_PROVIDER = web3.utils.sha3('DATA_PROVIDER')

  // deploy contracts before every test
  beforeEach(async function () {
    // admin deploy Token contract
    this.MockTokenContract = await MockToken.new("MockToken", "MockToken", initSupply, decimals, {from: admin})

    // admin deploy Router contract
    this.RouterContract = await Router.new(this.MockTokenContract.address, salt, {from: admin})

    // Deploy ConsumerLib library and link
    this.ConsumerLib = await ConsumerLib.new({from: admin})
    await MockConsumer.detectNetwork();
    await MockConsumer.link("ConsumerLib", this.ConsumerLib.address)

    // dataConsumerOwner deploy Consumer contract
    this.MockConsumerContract = await MockConsumer.new(this.RouterContract.address, {from: dataConsumerOwner})

  })

  /*
   * Basic queries and interaction
   */
  describe('basic queries and interaction', function () {
    it( 'getToken returns expected address', async function () {
      const mockToken = await MockToken.new("MockToken", "MockToken", initSupply, decimals, {from: admin})
      const mockRouter = await Router.new(mockToken.address, salt, {from: admin})

      const storedAddress = await mockRouter.getTokenAddress()
      expect(storedAddress).to.equal(mockToken.address)
    } )

    it( 'getSalt returns expected value', async function () {
      const newSalt = web3.utils.soliditySha3(web3.utils.randomHex(32))
      const mockToken = await MockToken.new("MockToken", "MockToken", initSupply, decimals, {from: admin})
      const mockRouter = await Router.new(mockToken.address, newSalt, {from: admin})

      const storedSalt = await mockRouter.getSalt()
      expect(storedSalt).to.equal(newSalt)
    } )

    it( 'getGasTopUpLimit returns expected value', async function () {
      const expected = web3.utils.toWei("1", "ether")
      const newSalt = web3.utils.soliditySha3(web3.utils.randomHex(32))
      const mockToken = await MockToken.new("MockToken", "MockToken", initSupply, decimals, {from: admin})
      const mockRouter = await Router.new(mockToken.address, newSalt, {from: admin})

      const storedGasTopUpLimit = await mockRouter.getGasTopUpLimit()
      expect(storedGasTopUpLimit.toString()).to.equal(expected.toString())
    } )

    it( 'providerIsAuthorised returns expected value', async function () {
      const newSalt = web3.utils.soliditySha3(web3.utils.randomHex(32))
      const mockToken = await MockToken.new("MockToken", "MockToken", initSupply, decimals, {from: admin})
      const mockRouter = await Router.new(mockToken.address, newSalt, {from: admin})
      const mockConsumer = await MockConsumer.new(mockRouter.address, {from: dataConsumerOwner})
      await mockConsumer.addDataProvider(dataProvider, 100, {from: dataConsumerOwner})

      const isNotAuthorised = await mockRouter.providerIsAuthorised(rando, dataProvider)
      expect(isNotAuthorised).to.equal(false)

      const isAuthorised = await mockRouter.providerIsAuthorised(mockConsumer.address, dataProvider)
      expect(isAuthorised).to.equal(true)
    } )
    
    /*
     * Data Request queries
     */
    describe('data request queries', function () {
      it( 'requestExists - request does not exist', async function () {
        const notExistReqId =  web3.utils.soliditySha3(web3.utils.randomHex(32))
        expect(await this.RouterContract.requestExists(notExistReqId)).to.equal(false)
      })

      it( 'requestExists - request does exist', async function () {
        await this.MockConsumerContract.addDataProvider(dataProvider, 100, {from: dataConsumerOwner})
        // Admin Transfer 10 Tokens to dataConsumerOwner
        await this.MockTokenContract.transfer(dataConsumerOwner, new BN(10 * (10 ** decimals)), {from: admin})
        // Transfer 1 Tokens to MockConsumerContract from dataConsumerOwner
        await this.MockTokenContract.transfer(this.MockConsumerContract.address, new BN((10 ** decimals)), {from: dataConsumerOwner})
        // increase Router allowance
        await this.MockConsumerContract.increaseRouterAllowance(new BN(999999 * ( 10 ** 9 )), {from: dataConsumerOwner})

        // get current nonce and salt so the request ID can be recreated
        const requestNonce = await this.MockConsumerContract.getRequestNonce()
        const routerSalt = await this.RouterContract.getSalt()

        const reqId = generateRequestId(this.MockConsumerContract.address, requestNonce, dataProvider, routerSalt)
        await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        expect(await this.RouterContract.requestExists(reqId)).to.equal(true)
      })

      it( 'getDataRequestConsumer - request does not exist, consumer is zero address', async function () {
        const notExistReqId =  web3.utils.soliditySha3(web3.utils.randomHex(32))
        expect(await this.RouterContract.getDataRequestConsumer(notExistReqId)).to.equal(constants.ZERO_ADDRESS)
      })

      it( 'getDataRequestConsumer - request does exist, consumer is contract address', async function () {
        await this.MockConsumerContract.addDataProvider(dataProvider, 100, {from: dataConsumerOwner})
        // Admin Transfer 10 Tokens to dataConsumerOwner
        await this.MockTokenContract.transfer(dataConsumerOwner, new BN(10 * (10 ** decimals)), {from: admin})
        // Transfer 1 Tokens to MockConsumerContract from dataConsumerOwner
        await this.MockTokenContract.transfer(this.MockConsumerContract.address, new BN((10 ** decimals)), {from: dataConsumerOwner})
        // increase Router allowance
        await this.MockConsumerContract.increaseRouterAllowance(new BN(999999 * ( 10 ** 9 )), {from: dataConsumerOwner})

        // get current nonce and salt so the request ID can be recreated
        const requestNonce = await this.MockConsumerContract.getRequestNonce()
        const routerSalt = await this.RouterContract.getSalt()

        const reqId = generateRequestId(this.MockConsumerContract.address, requestNonce, dataProvider, routerSalt)
        await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        expect(await this.RouterContract.getDataRequestConsumer(reqId)).to.equal(this.MockConsumerContract.address)
      })

      it( 'getDataRequestProvider - request does not exist, provider is zero address', async function () {
        const notExistReqId =  web3.utils.soliditySha3(web3.utils.randomHex(32))
        expect(await this.RouterContract.getDataRequestProvider(notExistReqId)).to.equal(constants.ZERO_ADDRESS)
      })

      it( 'getDataRequestProvider - request does exist, provider is contract address', async function () {
        await this.MockConsumerContract.addDataProvider(dataProvider, 100, {from: dataConsumerOwner})
        // Admin Transfer 10 Tokens to dataConsumerOwner
        await this.MockTokenContract.transfer(dataConsumerOwner, new BN(10 * (10 ** decimals)), {from: admin})
        // Transfer 1 Tokens to MockConsumerContract from dataConsumerOwner
        await this.MockTokenContract.transfer(this.MockConsumerContract.address, new BN((10 ** decimals)), {from: dataConsumerOwner})
        // increase Router allowance
        await this.MockConsumerContract.increaseRouterAllowance(new BN(999999 * ( 10 ** 9 )), {from: dataConsumerOwner})

        // get current nonce and salt so the request ID can be recreated
        const requestNonce = await this.MockConsumerContract.getRequestNonce()
        const routerSalt = await this.RouterContract.getSalt()

        const reqId = generateRequestId(this.MockConsumerContract.address, requestNonce, dataProvider, routerSalt)
        await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        expect(await this.RouterContract.getDataRequestProvider(reqId)).to.equal(dataProvider)
      })

      it( 'getDataRequestExpires - request does not exist, expires is zero', async function () {
        const notExistReqId =  web3.utils.soliditySha3(web3.utils.randomHex(32))
        const expires = await this.RouterContract.getDataRequestExpires(notExistReqId)
        expect(expires.toNumber()).to.equal(0)
      })

      it( 'getDataRequestExpires - request does exist, expires > now', async function () {
        await this.MockConsumerContract.addDataProvider(dataProvider, 100, {from: dataConsumerOwner})
        // Admin Transfer 10 Tokens to dataConsumerOwner
        await this.MockTokenContract.transfer(dataConsumerOwner, new BN(10 * (10 ** decimals)), {from: admin})
        // Transfer 1 Tokens to MockConsumerContract from dataConsumerOwner
        await this.MockTokenContract.transfer(this.MockConsumerContract.address, new BN((10 ** decimals)), {from: dataConsumerOwner})
        // increase Router allowance
        await this.MockConsumerContract.increaseRouterAllowance(new BN(999999 * ( 10 ** 9 )), {from: dataConsumerOwner})

        // get current nonce and salt so the request ID can be recreated
        const requestNonce = await this.MockConsumerContract.getRequestNonce()
        const routerSalt = await this.RouterContract.getSalt()
        const now = Math.floor(Date.now() / 1000)

        const reqId = generateRequestId(this.MockConsumerContract.address, requestNonce, dataProvider, routerSalt)
        await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        const expires = await this.RouterContract.getDataRequestExpires(reqId)
        expect(expires.toNumber()).to.be.above(now)
      })

      it( 'getDataRequestGasPrice - request does not exist, gas price is zero', async function () {
        const notExistReqId =  web3.utils.soliditySha3(web3.utils.randomHex(32))
        const gasPrice = await this.RouterContract.getDataRequestGasPrice(notExistReqId)
        expect(gasPrice.toNumber()).to.equal(0)
      })

      it( 'getDataRequestGasPrice - request does exist, gas price is same as gasPrice sent in request', async function () {
        await this.MockConsumerContract.addDataProvider(dataProvider, 100, {from: dataConsumerOwner})
        // Admin Transfer 10 Tokens to dataConsumerOwner
        await this.MockTokenContract.transfer(dataConsumerOwner, new BN(10 * (10 ** decimals)), {from: admin})
        // Transfer 1 Tokens to MockConsumerContract from dataConsumerOwner
        await this.MockTokenContract.transfer(this.MockConsumerContract.address, new BN((10 ** decimals)), {from: dataConsumerOwner})
        // increase Router allowance
        await this.MockConsumerContract.increaseRouterAllowance(new BN(999999 * ( 10 ** 9 )), {from: dataConsumerOwner})

        // get current nonce and salt so the request ID can be recreated
        const requestNonce = await this.MockConsumerContract.getRequestNonce()
        const routerSalt = await this.RouterContract.getSalt()

        const reqId = generateRequestId(this.MockConsumerContract.address, requestNonce, dataProvider, routerSalt)
        await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        const gasPriceInRequest = await this.RouterContract.getDataRequestGasPrice(reqId)
        expect(gasPriceInRequest.toNumber()).to.equal(gasPrice * (10 ** 9))
      })
    })

    /*
     * Admin getter/setters
     */
    describe('admin getters/setters', function () {
      it( 'admin (owner) can setGasTopUpLimit - emits SetGasTopUpLimit event', async function () {
        const newLimit = web3.utils.toWei("1.5", "ether")
        const receipt = await this.RouterContract.setGasTopUpLimit(newLimit,  { from: admin } )

        expectEvent( receipt, 'SetGasTopUpLimit', {
          sender: admin,
          oldLimit: web3.utils.toWei("1", "ether"),
          newLimit: newLimit,
        } )
      })

      it( 'admin (owner) can setGasTopUpLimit - gasTopUpLimit correctly set', async function () {
        const newLimit = web3.utils.toWei("1.5", "ether")
        await this.RouterContract.setGasTopUpLimit(newLimit,  { from: admin } )

        const limit = await this.RouterContract.getGasTopUpLimit()
        expect( limit.toString() ).to.equal( newLimit.toString() )
      })

      it( 'only admin (owner) can set gas topup limit', async function () {
        const newLimit = web3.utils.toWei("1.5", "ether")
        const oldLimit = web3.utils.toWei("1", "ether")
        await expectRevert(
          this.RouterContract.setGasTopUpLimit(newLimit, { from: rando } ),
          "Router: only admin can do this"
        )

        // should still be the default
        const limit = await this.RouterContract.getGasTopUpLimit()
        expect( limit.toString() ).to.equal( oldLimit.toString() )
      } )

      it( 'new gas topup limit must be > 0', async function () {

        const oldLimit = web3.utils.toWei("1", "ether")
        await expectRevert(
          this.RouterContract.setGasTopUpLimit(0, { from: admin } ),
          "Router: _gasTopUpLimit must be > 0"
        )

        // should still be the default
        const limit = await this.RouterContract.getGasTopUpLimit()
        expect( limit.toString() ).to.equal( oldLimit.toString() )
      } )
    })

    /*
     * Provider getter/setters
     */
    describe('provider getters/setters', function () {
      it( 'getProviderPaysGas is initially false', async function () {
        expect(await this.RouterContract.getProviderPaysGas(dataProvider)).to.equal(false)
      })

      it( 'getProviderMinFee is initially 0', async function () {
        expect(await this.RouterContract.getProviderMinFee(dataProvider)).to.be.bignumber.equal(new BN(0))
      })

      it( 'provider can setProviderPaysGas - correctly set', async function () {
        await this.RouterContract.setProviderPaysGas(true, {from: dataProvider})
        expect(await this.RouterContract.getProviderPaysGas(dataProvider)).to.equal(true)

        await this.RouterContract.setProviderPaysGas(false, {from: dataProvider})
        expect(await this.RouterContract.getProviderPaysGas(dataProvider)).to.equal(false)
      })

      it( 'provider can setProviderPaysGas - emits SetProviderPaysGas event', async function () {
        const receipt = await this.RouterContract.setProviderPaysGas(true, {from: dataProvider})
        expectEvent( receipt, 'SetProviderPaysGas', {
          dataProvider: dataProvider,
          providerPays: true,
        } )

        const receipt1 = await this.RouterContract.setProviderPaysGas(false, {from: dataProvider})
        expectEvent( receipt1, 'SetProviderPaysGas', {
          dataProvider: dataProvider,
          providerPays: false,
        } )
      })

      it( 'provider can setProviderMinFee - correctly set', async function () {
        await this.RouterContract.setProviderMinFee(10000, {from: dataProvider})
        expect(await this.RouterContract.getProviderMinFee(dataProvider)).to.be.bignumber.equal(new BN("10000"))
      })

      it( 'provider can setProviderMinFee - emits SetProviderMinFee event', async function () {
        const receipt = await this.RouterContract.setProviderMinFee(10000, {from: dataProvider})
        expectEvent( receipt, 'SetProviderMinFee', {
          dataProvider: dataProvider,
          minFee: new BN("10000"),
        } )
      })
    })
  })

  /*
   * EOA
   */
  describe('eoa interactions', function () {
    it( 'eoa cannot initialise request', async function () {
      const reqId = web3.utils.soliditySha3(web3.utils.randomHex(32))
      const cbSig = web3.eth.abi.encodeFunctionSignature('nowt(uint256)')
      await expectRevert(
        this.RouterContract.initialiseRequest(dataProvider, 100, 0, 20, 200, reqId, "SOME.STUFF", cbSig, {from: dataConsumerOwner}),
        "Router: only a contract can initialise a request"
      )
    } )

    it( 'eoa cannot authorise data provider', async function () {
      await expectRevert(
        this.RouterContract.grantProviderPermission(dataProvider, {from: dataConsumerOwner}),
        "Router: only a contract can grant a provider permission"
      )
    } )

    it( 'eoa cannot revoke data provider', async function () {
      await expectRevert(
        this.RouterContract.revokeProviderPermission(dataProvider, {from: dataConsumerOwner}),
        "Router: only a contract can revoke a provider permission"
      )
    } )

    it( 'eoa cannot cancel request', async function () {
      const reqId = web3.utils.soliditySha3(web3.utils.randomHex(32))
      await expectRevert(
        this.RouterContract.cancelRequest(reqId, {from: dataConsumerOwner}),
        "Router: only a contract can cancel a request"
      )
    } )

    it( 'eoa cannot topup gas - reverts with error', async function () {
      const topupValue = web3.utils.toWei("0.5", "ether")
      await expectRevert(
        this.RouterContract.topUpGas(dataProvider, {from: dataConsumerOwner, value: topupValue}),
        "Router: only a contract can top up gas"
      )
    } )

    it( 'eoa cannot topup gas - Router contract balance does not change', async function () {
      const topupValue = web3.utils.toWei("0.5", "ether")
      await expectRevert(
        this.RouterContract.topUpGas(dataProvider, {from: dataConsumerOwner, value: topupValue}),
        "Router: only a contract can top up gas"
      )
      const newBalance = await web3.eth.getBalance(this.RouterContract.address)

      expect(newBalance.toString()).to.equal("0")
    } )

    it( 'eoa cannot withdraw gas - reverts with error', async function () {
      await expectRevert(
        this.RouterContract.withDrawGasTopUpForProvider(dataProvider, {from: dataConsumerOwner}),
        "Router: only a contract can withdraw gas"
      )
    } )
  })

  /*
   * Bad consumer implementations
   */
  describe('bad consumer implementation - direct router interaction', function () {

    // deploy badly implemented consumer contract
    beforeEach(async function () {
      this.BadConsumerContract = await MockBadConsumer.new(this.RouterContract.address, {from: dataConsumerOwner})
    })

    it( 'dataProvider not registered on router', async function () {
      // Consumer's contract has not used the Consumer lib to authorise providers
      await expectRevert(
        this.BadConsumerContract.requestData(dataProvider, endpoint, {from: dataConsumerOwner}),
        "Router: dataProvider not authorised for this dataConsumer"
      )
    } )

    it( 'request ids must match', async function () {
      await this.BadConsumerContract.addDataProviderToRouter(dataProvider, {from: dataConsumerOwner})
      const rubbishRequestId = web3.utils.soliditySha3(web3.utils.randomHex(32))

      const now = Math.floor(Date.now() / 1000)
      const expires = now + 300
      // request ID being sent will not match reconstructed version in Router
      await expectRevert(
        this.BadConsumerContract.requestDataWithAllParamsAndRequestId(
          dataProvider,
          100,
          1,
          endpoint,
          200000000000,
          expires,
          rubbishRequestId,
          {from: dataConsumerOwner}
          ),
        "Router: reqId != _requestId"
      )
    } )

    it( 'expiry must be future date', async function () {
      await this.BadConsumerContract.addDataProviderToRouter(dataProvider, {from: dataConsumerOwner})
      const rubbishRequestId = web3.utils.soliditySha3(web3.utils.randomHex(32))

      const now = Math.floor(Date.now() / 1000)
      const expires = now - 86400 // yesterday
      // request ID being sent will not match reconstructed version in Router
      await expectRevert(
        this.BadConsumerContract.requestDataWithAllParamsAndRequestId(
          dataProvider,
          100,
          1,
          endpoint,
          200000000000,
          expires,
          rubbishRequestId,
          {from: dataConsumerOwner}
        ),
        "Router: expiration must be > now"
      )
    } )

    it( 'not enough tokens', async function () {
      await this.BadConsumerContract.addDataProviderToRouter(dataProvider, {from: dataConsumerOwner})

      // Consumer contract does not have enough tokens to pay provider fee
      await expectRevert(
        this.BadConsumerContract.requestData(dataProvider, endpoint, {from: dataConsumerOwner}),
        "ERC20: transfer amount exceeds balance"
      )
    } )

    it( 'request id already exists', async function () {
      await this.BadConsumerContract.addDataProviderToRouter(dataProvider, {from: dataConsumerOwner})
      // Admin Transfer 10 Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer(dataConsumerOwner, new BN(10 * (10 ** decimals)), {from: admin})
      // Transfer 1 Tokens to MockConsumerContract from dataConsumerOwner
      await this.MockTokenContract.transfer(this.BadConsumerContract.address, new BN((10 ** decimals)), {from: dataConsumerOwner})
      // increase Router allowance
      await this.BadConsumerContract.increaseRouterAllowance(new BN(999999 * ( 10 ** 9 )), {from: dataConsumerOwner})

      const now = Math.floor(Date.now() / 1000)
      const expires = now + 300
      // first req - not implementing Consumer lib's submitRequest function
      await this.BadConsumerContract.requestDataWithAllParams(dataProvider, 100, 2, endpoint, 200000000000, expires, {from: dataConsumerOwner})

      // second request - same method, same data
      await expectRevert(
        this.BadConsumerContract.requestDataWithAllParams(dataProvider, 100, 2, endpoint, 200000000000, expires, {from: dataConsumerOwner}),
        "Router: request id already initialised"
      )
    } )

    it( 'cancel request - request id must exist', async function () {
      const reqId = web3.utils.soliditySha3(web3.utils.randomHex(32))
      await expectRevert(
        this.RouterContract.cancelRequest(reqId, {from: this.BadConsumerContract.address}),
        "Router: request id does not exist"
      )
    } )
    /*
     * Bad gas topup
     */
    describe('bad gas top up', function () {
      it( 'gas topup - provider cannot be zero address (revert with provider not authorised error)', async function () {
        const topupValue = web3.utils.toWei("0.1", "ether")
        await expectRevert(
          this.BadConsumerContract.topUpGas(constants.ZERO_ADDRESS, {from: dataConsumerOwner, value: topupValue}),
          "Router: dataProvider not authorised for this dataConsumer"
        )
      } )

      it( 'gas topup - provider must be authorised for consumer', async function () {
        const topupValue = web3.utils.toWei("0.1", "ether")
        await expectRevert(
          this.BadConsumerContract.topUpGas(dataProvider, {from: dataConsumerOwner, value: topupValue}),
          "Router: dataProvider not authorised for this dataConsumer"
        )
      } )

      it( 'gas topup - provider cannot be zero amount - no value sent', async function () {
        await this.BadConsumerContract.addDataProviderToRouter(dataProvider, {from: dataConsumerOwner})
        await expectRevert(
          this.BadConsumerContract.topUpGas(dataProvider, {from: dataConsumerOwner}),
          "Router: cannot top up zero"
        )
      } )

      it( 'gas topup - provider cannot be zero amount - zero value sent', async function () {
        await this.BadConsumerContract.addDataProviderToRouter(dataProvider, {from: dataConsumerOwner})
        await expectRevert(
          this.BadConsumerContract.topUpGas(dataProvider, {from: dataConsumerOwner, value: 0}),
          "Router: cannot top up zero"
        )
      } )

      it( 'gas topup - cannot top up more than router limit', async function () {
        const topupValue = web3.utils.toWei("10", "ether")
        await this.BadConsumerContract.addDataProviderToRouter(dataProvider, {from: dataConsumerOwner})
        await expectRevert(
          this.BadConsumerContract.topUpGas(dataProvider, {from: dataConsumerOwner, value: topupValue}),
          "Router: cannot top up more than gasTopUpLimit"
        )
      } )
    })


    /*
     * Bad gas withdraw
     */
    describe('bad gas withdraw', function () {
      it( 'provider cannot be zero address - revert with error', async function () {
        await expectRevert(
          this.BadConsumerContract.withDrawGasTopUpForProvider(constants.ZERO_ADDRESS, { from: dataConsumerOwner }),
          "Router: _dataProvider cannot be zero address"
        )
      } )

    })

  })


  /*
   * Bad fulfillment
   */
  describe('bad fulfillment', function () {
    // deploy badly implemented consumer contract
    beforeEach(async function () {
      this.BadConsumerContract = await MockBadConsumer.new(this.RouterContract.address, {from: dataConsumerOwner})
    })

    it( 'fulfillRequest - no signature', async function () {
      const reqId = web3.utils.soliditySha3(web3.utils.randomHex(32))

      await expectRevert(
        this.RouterContract.fulfillRequest(reqId, 100, [], {from: dataProvider}),
        "Router: must include signature"
      )
    })

    it( 'fulfillRequest - request id does not exist', async function () {
      const reqId = web3.utils.soliditySha3(web3.utils.randomHex(32))
      const msg = generateSigMsg(reqId, priceToSend, this.MockConsumerContract.address)
      const sig = await web3.eth.accounts.sign(msg, dataProviderPk)

      await expectRevert(
        this.RouterContract.fulfillRequest(reqId, 100, sig.signature, {from: dataProvider}),
        "Router: request does not exist"
      )
    })

    it( 'fulfillRequest - request cannot be fulfilled by random actor', async function () {
      await this.MockConsumerContract.addDataProvider(dataProvider, 100, {from: dataConsumerOwner})
      // Admin Transfer 10 Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer(dataConsumerOwner, new BN(10 * (10 ** decimals)), {from: admin})
      // Transfer 1 Tokens to MockConsumerContract from dataConsumerOwner
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, new BN((10 ** decimals)), {from: dataConsumerOwner})
      // increase Router allowance
      await this.MockConsumerContract.increaseRouterAllowance(new BN(999999 * ( 10 ** 9 )), {from: dataConsumerOwner})

      const requestNonce = await this.MockConsumerContract.getRequestNonce()
      const routerSalt = await this.RouterContract.getSalt()

      const reqId = generateRequestId(this.MockConsumerContract.address, requestNonce, dataProvider, routerSalt)
      await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

      const msg = generateSigMsg(reqId, priceToSend, this.MockConsumerContract.address)
      // signed by rando
      const sig = await web3.eth.accounts.sign(msg, randoPk)

      await expectRevert(
        this.RouterContract.fulfillRequest(reqId, priceToSend, sig.signature, {from: rando}),
        "Router: msg.sender != requested dataProvider"
      )
    })

    it( 'fulfillRequest - unauthorised dataProvider can no longer provide data', async function () {
      await this.MockConsumerContract.addDataProvider(dataProvider, 100, {from: dataConsumerOwner})
      // Admin Transfer 10 Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer(dataConsumerOwner, new BN(10 * (10 ** decimals)), {from: admin})
      // Transfer 1 Tokens to MockConsumerContract from dataConsumerOwner
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, new BN((10 ** decimals)), {from: dataConsumerOwner})
      // increase Router allowance
      await this.MockConsumerContract.increaseRouterAllowance(new BN(999999 * ( 10 ** 9 )), {from: dataConsumerOwner})

      // get current nonce and salt so the request ID can be recreated
      const requestNonce = await this.MockConsumerContract.getRequestNonce()
      const routerSalt = await this.RouterContract.getSalt()

      const reqId = generateRequestId(this.MockConsumerContract.address, requestNonce, dataProvider, routerSalt)
      await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

      // after data request has been sent, dataProvider is revoked
      await this.MockConsumerContract.removeDataProvider(dataProvider, {from: dataConsumerOwner})

      const msg = generateSigMsg(reqId, priceToSend, this.MockConsumerContract.address)
      const sig = await web3.eth.accounts.sign(msg, dataProviderPk)

      // signed priceToSend is 1000. Send 200. ECRevover function when validating in Consumer
      // lib will return a difference address, hence the "does not have DATA_PROVIDER" error
      await expectRevert(
        this.RouterContract.fulfillRequest(reqId, priceToSend, sig.signature, {from: dataProvider}),
        "Router: dataProvider not authorised for this dataConsumer"
      )
    })

    // Assumes Consumer has correctly implemented Consumer lib and isValidFulfillment modifier!
    it( 'fulfillRequest - data sent must match data in signature', async function () {
      await this.MockConsumerContract.addDataProvider(dataProvider, 100, {from: dataConsumerOwner})
      // Admin Transfer 10 Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer(dataConsumerOwner, new BN(10 * (10 ** decimals)), {from: admin})
      // Transfer 1 Tokens to MockConsumerContract from dataConsumerOwner
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, new BN((10 ** decimals)), {from: dataConsumerOwner})
      // increase Router allowance
      await this.MockConsumerContract.increaseRouterAllowance(new BN(999999 * ( 10 ** 9 )), {from: dataConsumerOwner})

      // get current nonce and salt so the request ID can be recreated
      const requestNonce = await this.MockConsumerContract.getRequestNonce()
      const routerSalt = await this.RouterContract.getSalt()

      const reqId = generateRequestId(this.MockConsumerContract.address, requestNonce, dataProvider, routerSalt)
      await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

      const msg = generateSigMsg(reqId, priceToSend, this.MockConsumerContract.address)
      const sig = await web3.eth.accounts.sign(msg, dataProviderPk)

      // signed priceToSend is 1000. Send 200 in fulfillRequest call. ECRevover function when validating in Consumer
      // lib will return a difference address, hence the "does not have DATA_PROVIDER" error
      await expectRevert(
        this.RouterContract.fulfillRequest(reqId, 200, sig.signature, {from: dataProvider}),
        "Consumer: provider is not authorised"
      )
    })
  })
  /*
  * Bad cancellation
  */
  describe('bad cancellation', function () {
    // deploy badly implemented consumer contract
    beforeEach(async function () {
      this.BadConsumerContract = await MockBadConsumer.new(this.RouterContract.address, {from: dataConsumerOwner})
    })

    it( 'cancelRequest - must come from dataConsumer who submitted the request', async function () {
      await this.MockConsumerContract.addDataProvider(dataProvider, 100, {from: dataConsumerOwner})
      // Admin Transfer 10 Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer(dataConsumerOwner, new BN(10 * (10 ** decimals)), {from: admin})
      // Transfer 1 Tokens to MockConsumerContract from dataConsumerOwner
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, new BN((10 ** decimals)), {from: dataConsumerOwner})
      // increase Router allowance
      await this.MockConsumerContract.increaseRouterAllowance(new BN(999999 * ( 10 ** 9 )), {from: dataConsumerOwner})

      // get current nonce and salt so the request ID can be recreated
      const requestNonce = await this.MockConsumerContract.getRequestNonce()
      const routerSalt = await this.RouterContract.getSalt()

      const reqId = generateRequestId(this.MockConsumerContract.address, requestNonce, dataProvider, routerSalt)
      await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

      await expectRevert(
        this.BadConsumerContract.cancelDataRequest(reqId, {from: dataConsumerOwner}),
        "Router: msg.sender != dataConsumer"
      )
    })
  })

})
