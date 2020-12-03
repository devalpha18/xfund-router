const { accounts, contract, web3, privateKeys } = require('@openzeppelin/test-environment')

const {
  BN,           // Big Number support
  expectRevert,
  expectEvent,
} = require('@openzeppelin/test-helpers')

const { expect } = require('chai')

const MockToken = contract.fromArtifact('MockToken') // Loads a compiled contract
const Router = contract.fromArtifact('Router') // Loads a compiled contract
const MockConsumer = contract.fromArtifact('MockConsumer') // Loads a compiled contract

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
  data,
  callbackFunctionSignature,
  gasPrice,
  salt) {
  return web3.utils.soliditySha3(
    { 'type': 'address', 'value': consumerAddress},
    { 'type': 'uint256', 'value': requestNonce.toNumber()},
    { 'type': 'address', 'value': dataProvider},
    { 'type': 'string', 'value': data},
    { 'type': 'bytes4', 'value': callbackFunctionSignature},
    { 'type': 'uint256', 'value': gasPrice * (10 ** 9)},
    { 'type': 'bytes32', 'value': salt}
  )
}

describe('Consumer - data request tests', function () {
  this.timeout(300000)

  const [admin, dataProvider, dataConsumerOwner, rando, dataProvider2, dataConsumerOwner2] = accounts
  const [adminPk, dataProviderPk, dataConsumerPk, randoPk, dataProvider2Pk] = privateKeys
  const decimals = 9
  const initSupply = 1000 * (10 ** decimals)
  const fee = new BN(0.1 * ( 10 ** 9 ))
  const endpoint = "PRICE.BTC.USD.AVG"
  const salt = web3.utils.soliditySha3(web3.utils.randomHex(32))
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

    // dataConsumerOwner deploy Consumer contract
    this.MockConsumerContract = await MockConsumer.new(this.RouterContract.address, {from: dataConsumerOwner})

  })

  /*
   * Tests in ideal scenario
   */
  describe('ideal scenario - enough tokens and allowance, dataProvider authorised', function () {
    // set up ideal scenario for these tests
    beforeEach(async function () {
      // increase Router allowance
      await this.MockConsumerContract.increaseRouterAllowance(new BN(999999 * ( 10 ** 9 )), {from: dataConsumerOwner})

      // add a dataProvider
      await this.MockConsumerContract.addDataProvider(dataProvider, fee, {from: dataConsumerOwner});

      // Admin Transfer 10 Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer(dataConsumerOwner, new BN(10 * (10 ** decimals)), {from: admin})

      // Transfer 1 Tokens to MockConsumerContract from dataConsumerOwner
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, new BN((10 ** decimals)), {from: dataConsumerOwner})
    })

    it( 'dataConsumer (owner) can initialise a request - emits DataRequestSubmitted event', async function () {
      const requestNonce = await this.MockConsumerContract.getRequestNonce()
      const routerSalt = await this.RouterContract.getSalt()

      const reqId = generateRequestId(this.MockConsumerContract.address, requestNonce, dataProvider, endpoint, callbackFuncSig, gasPrice, routerSalt)
      const reciept = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

      expectEvent( reciept, 'DataRequestSubmitted', {
        dataConsumer: this.MockConsumerContract.address,
        dataProvider: dataProvider,
        fee: fee,
        endpoint: endpoint,
        gasPrice: new BN(gasPrice * (10 ** 9)),
        callbackFunctionSignature: callbackFuncSig,
        requestId: reqId,
      } )
    } )

    it( 'dataConsumer (owner) can initialise a request - Router emits DataRequested event', async function () {
      const requestNonce = await this.MockConsumerContract.getRequestNonce()
      const routerSalt = await this.RouterContract.getSalt()

      const reqId = generateRequestId(this.MockConsumerContract.address, requestNonce, dataProvider, endpoint, callbackFuncSig, gasPrice, routerSalt)
      const reciept = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )
      const expires = await this.RouterContract.getDataRequestExpires(reqId)

      expectEvent( reciept, 'DataRequested', {
        dataConsumer: this.MockConsumerContract.address,
        dataProvider: dataProvider,
        fee: fee,
        data: endpoint,
        requestId: reqId,
        gasPrice: new BN(gasPrice * (10 ** 9)),
        expires: expires,
        callbackFunctionSignature: callbackFuncSig,
      } )
    } )

    it( 'only dataConsumer (owner) can initialise a request - reverts with error', async function () {
      await expectRevert(
        this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: rando } ),
        "Consumer: only owner can do this"
      )
    } )

    it( 'cannot exceed own gas limit - reverts with error', async function () {
      // gasLimit is 200 Gwei. Send with 300
      await expectRevert(
        this.MockConsumerContract.requestData( dataProvider, endpoint, 300, { from: dataConsumerOwner } ),
        "Consumer: gasPrice > gasPriceLimit"
      )
    } )

    it( 'consumer must have authorised provider - reverts with error', async function () {
      // rando is not authorised
      await expectRevert(
        this.MockConsumerContract.requestData( rando, endpoint, gasPrice, { from: dataConsumerOwner } ),
        "Consumer: _dataProvider does not have role DATA_PROVIDER"
      )
    } )

    it( 'dataConsumer (owner) can add rando as new data provider and initialise a request', async function () {
      const requestNonce = await this.MockConsumerContract.getRequestNonce()
      const routerSalt = await this.RouterContract.getSalt()

      // add rando as new provider
      await this.MockConsumerContract.addDataProvider(rando, fee, {from: dataConsumerOwner});

      const reqId = generateRequestId(this.MockConsumerContract.address, requestNonce, rando, endpoint, callbackFuncSig, gasPrice, routerSalt)
      const reciept = await this.MockConsumerContract.requestData( rando, endpoint, gasPrice, { from: dataConsumerOwner } )

      expectEvent( reciept, 'DataRequestSubmitted', {
        dataConsumer: this.MockConsumerContract.address,
        dataProvider: rando,
        fee: fee,
        endpoint: endpoint,
        gasPrice: new BN(gasPrice * (10 ** 9)),
        callbackFunctionSignature: callbackFuncSig,
        requestId: reqId,
      } )
    } )

    it( 'request will fail if dataProvider revoked - reverts with error', async function () {
      // remove dataProvider as a data provider
      await this.MockConsumerContract.removeDataProvider(dataProvider, {from: dataConsumerOwner});
      // dataProvider is no longer authorised
      await expectRevert(
        this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } ),
        "Consumer: _dataProvider does not have role DATA_PROVIDER"
      )
    } )

    it( 'fee is correctly held in Router contract - emits Transfer event', async function () {
     const reciept = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

      expectEvent( reciept, 'Transfer', {
        from: this.MockConsumerContract.address,
        to: this.RouterContract.address,
        value: fee,
      } )
    } )
  })

  /*
   * Advanced Tests with Tokens
   */
  describe('basic token tests', function () {
    // add data provider but no tokens
    beforeEach(async function () {
      // Admin Transfer 10 Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer(dataConsumerOwner, new BN(10 * (10 ** decimals)), {from: admin})
      // add Data provider
      await this.MockConsumerContract.addDataProvider(dataProvider, fee, {from: dataConsumerOwner});
    })

    it( 'consumer contract must have enough tokens', async function () {
      await expectRevert(
        this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } ),
        "Consumer: this contract does not have enough tokens to pay fee"
      )
    } )

    it( 'router contract must have enough allowance', async function () {
      // Transfer 1 Tokens to MockConsumerContract from dataConsumerOwner
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, new BN((10 ** decimals)), {from: dataConsumerOwner})

      await expectRevert(
        this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } ),
        "Consumer: not enough Router allowance to pay fee"
      )
    } )

    it( 'request succeeds when contract balance and router allowance increases', async function () {
      await expectRevert(
        this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } ),
        "Consumer: this contract does not have enough tokens to pay fee"
      )

      await this.MockTokenContract.transfer(this.MockConsumerContract.address, new BN((10 ** decimals)), {from: dataConsumerOwner})

      await expectRevert(
        this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } ),
        "Consumer: not enough Router allowance to pay fee"
      )

      // increase Router allowance
      await this.MockConsumerContract.increaseRouterAllowance(new BN(999999 * ( 10 ** 9 )), {from: dataConsumerOwner})

      const requestNonce = await this.MockConsumerContract.getRequestNonce()
      const routerSalt = await this.RouterContract.getSalt()
      const reqId = generateRequestId(this.MockConsumerContract.address, requestNonce, dataProvider, endpoint, callbackFuncSig, gasPrice, routerSalt)
      const reciept = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

      expectEvent( reciept, 'DataRequestSubmitted', {
        dataConsumer: this.MockConsumerContract.address,
        dataProvider: dataProvider,
        fee: fee,
        endpoint: endpoint,
        gasPrice: new BN(gasPrice * (10 ** 9)),
        callbackFunctionSignature: callbackFuncSig,
        requestId: reqId,
      } )

    })
  })
  /*
   * Advanced Tests with Tokens
   */
  describe('advanced token and payment tests', function () {
    // add data provider and tokens
    beforeEach( async function () {
      // Admin Transfer 10 Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer( dataConsumerOwner, new BN( 10 * ( 10 ** decimals ) ), { from: admin } )
      // Admin Transfer 10 Tokens to dataConsumerOwner2
      await this.MockTokenContract.transfer( dataConsumerOwner2, new BN( 10 * ( 10 ** decimals ) ), { from: admin } )
    } )
    describe('single data provider', function () {
      it( 'data request success - ERC20 Transfer event emitted', async function () {
        const initialContract = 1000
        const dpFee = 100
        // add tokens to consumer contract
        await this.MockTokenContract.transfer( this.MockConsumerContract.address, initialContract, { from: dataConsumerOwner } )
        // add Data provider
        await this.MockConsumerContract.addDataProvider( dataProvider, dpFee, { from: dataConsumerOwner } );
        // increase router allowance
        await this.MockConsumerContract.increaseRouterAllowance( new BN( 999999 * ( 10 ** 9 ) ), { from: dataConsumerOwner } )

        const reciept = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )
        expectEvent( reciept, 'Transfer', {
          from: this.MockConsumerContract.address,
          to: this.RouterContract.address,
          value: new BN( dpFee ),
        } )
      } )

      it( 'data request success - Router getTotalTokensHeld should be 200 after 2 requests', async function () {
        const initialContract = 1000
        const expectedRouter = 200
        const dpFee = 100

        // add tokens to consumer contract
        await this.MockTokenContract.transfer( this.MockConsumerContract.address, initialContract, { from: dataConsumerOwner } )
        // add Data provider
        await this.MockConsumerContract.addDataProvider( dataProvider, dpFee, { from: dataConsumerOwner } );
        // increase router allowance
        await this.MockConsumerContract.increaseRouterAllowance( new BN( 999999 * ( 10 ** 9 ) ), { from: dataConsumerOwner } )

        // request 1, pay 100
        await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        const tot1 = await this.RouterContract.getTotalTokensHeld()
        expect( tot1.toNumber() ).to.equal( dpFee )

        // request 2, pay another 100
        await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        const tot2 = await this.RouterContract.getTotalTokensHeld()
        expect( tot2.toNumber() ).to.equal( expectedRouter )
      } )

      it( 'data request success - ERC20 token balance for Router should be 200 after 2 requests', async function () {
        const initialContract = 1000
        const expectedRouter = 200
        const dpFee = 100

        // add tokens to consumer contract
        await this.MockTokenContract.transfer( this.MockConsumerContract.address, initialContract, { from: dataConsumerOwner } )
        // add Data provider
        await this.MockConsumerContract.addDataProvider( dataProvider, dpFee, { from: dataConsumerOwner } );
        // increase router allowance
        await this.MockConsumerContract.increaseRouterAllowance( new BN( 999999 * ( 10 ** 9 ) ), { from: dataConsumerOwner } )

        // request 1, pay 100
        await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        const tot1 = await this.MockTokenContract.balanceOf( this.RouterContract.address )
        expect( tot1.toNumber() ).to.equal( dpFee )

        // request 2, pay another 100
        await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        const tot2 = await this.MockTokenContract.balanceOf( this.RouterContract.address )
        expect( tot2.toNumber() ).to.equal( expectedRouter )
      } )

      it( 'data request success - Router getTokensHeldFor for consumer contract/provider should be 200 after 2 requests', async function () {
        const initialContract = 1000
        const expectedRouter = 200
        const dpFee = 100

        // add tokens to consumer contract
        await this.MockTokenContract.transfer( this.MockConsumerContract.address, initialContract, { from: dataConsumerOwner } )
        // add Data provider
        await this.MockConsumerContract.addDataProvider( dataProvider, dpFee, { from: dataConsumerOwner } );
        // increase router allowance
        await this.MockConsumerContract.increaseRouterAllowance( new BN( 999999 * ( 10 ** 9 ) ), { from: dataConsumerOwner } )

        // request 1, pay 100
        await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        const tot1 = await this.RouterContract.getTokensHeldFor( this.MockConsumerContract.address, dataProvider )
        expect( tot1.toNumber() ).to.equal( dpFee )

        // request 2, pay another 100
        await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        const tot2 = await this.RouterContract.getTokensHeldFor( this.MockConsumerContract.address, dataProvider )
        expect( tot2.toNumber() ).to.equal( expectedRouter )
      } )

      it( 'data request success - ERC20 token balance for Consumer contract should be 800 after 2 requests', async function () {
        const initialContract = 1000
        const expectedContract = 800
        const expectedRouter = 200
        const dpFee = 100

        // add tokens to consumer contract
        await this.MockTokenContract.transfer( this.MockConsumerContract.address, initialContract, { from: dataConsumerOwner } )
        // add Data provider
        await this.MockConsumerContract.addDataProvider( dataProvider, dpFee, { from: dataConsumerOwner } );
        // increase router allowance
        await this.MockConsumerContract.increaseRouterAllowance( new BN( 999999 * ( 10 ** 9 ) ), { from: dataConsumerOwner } )

        // request 1, pay 100
        await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )
        // request 2, pay another 100
        await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        const erc20Balance = await this.MockTokenContract.balanceOf( this.MockConsumerContract.address )
        expect( erc20Balance.toNumber() ).to.equal( expectedContract )
      } )
    })
    describe('multiple data providers', function () {
      it( 'data request success - Router getTotalTokensHeld should be 300 after 2 requests', async function () {
        const initialContract = 1000
        const expectedRouter = 300
        const dp1Fee = 100
        const dp2Fee = 200

        // add tokens to consumer contract
        await this.MockTokenContract.transfer( this.MockConsumerContract.address, initialContract, { from: dataConsumerOwner } )
        // add Data provider1
        await this.MockConsumerContract.addDataProvider( dataProvider, dp1Fee, { from: dataConsumerOwner } );
        // add Data provider2
        await this.MockConsumerContract.addDataProvider( dataProvider2, dp2Fee, { from: dataConsumerOwner } );
        // increase router allowance
        await this.MockConsumerContract.increaseRouterAllowance( new BN( 999999 * ( 10 ** 9 ) ), { from: dataConsumerOwner } )

        // request 1 from provider 1, pay 100
        await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        const tot1 = await this.RouterContract.getTotalTokensHeld()
        expect( tot1.toNumber() ).to.equal( dp1Fee )

        // request 2, from provider 2 pay 200
        await this.MockConsumerContract.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner } )

        const tot2 = await this.RouterContract.getTotalTokensHeld()
        expect( tot2.toNumber() ).to.equal( expectedRouter )
      } )

      it( 'data request success - ERC20 token balance for Router should be 300 after 2 requests', async function () {
        const initialContract = 1000
        const expectedRouter = 300
        const dp1Fee = 100
        const dp2Fee = 200

        // add tokens to consumer contract
        await this.MockTokenContract.transfer( this.MockConsumerContract.address, initialContract, { from: dataConsumerOwner } )
        // add Data provider1
        await this.MockConsumerContract.addDataProvider( dataProvider, dp1Fee, { from: dataConsumerOwner } );
        // add Data provider2
        await this.MockConsumerContract.addDataProvider( dataProvider2, dp2Fee, { from: dataConsumerOwner } );
        // increase router allowance
        await this.MockConsumerContract.increaseRouterAllowance( new BN( 999999 * ( 10 ** 9 ) ), { from: dataConsumerOwner } )

        // request 1 from provider 1, pay 100
        await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        const tot1 = await this.MockTokenContract.balanceOf( this.RouterContract.address )
        expect( tot1.toNumber() ).to.equal( dp1Fee )

        // request 2, from provider 2 pay 200
        await this.MockConsumerContract.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner } )

        // total should be 300 in ERC20 contract
        const tot2 = await this.MockTokenContract.balanceOf( this.RouterContract.address )
        expect( tot2.toNumber() ).to.equal( expectedRouter )
      } )

      it( 'data request success - Router getTokensHeldFor for consumer contract/provider should be 100 and 200 after 2 requests', async function () {
        const initialContract = 1000
        const dp1Fee = 100
        const dp2Fee = 200

        // add tokens to consumer contract
        await this.MockTokenContract.transfer( this.MockConsumerContract.address, initialContract, { from: dataConsumerOwner } )
        // add Data provider1
        await this.MockConsumerContract.addDataProvider( dataProvider, dp1Fee, { from: dataConsumerOwner } );
        // add Data provider2
        await this.MockConsumerContract.addDataProvider( dataProvider2, dp2Fee, { from: dataConsumerOwner } );
        // increase router allowance
        await this.MockConsumerContract.increaseRouterAllowance( new BN( 999999 * ( 10 ** 9 ) ), { from: dataConsumerOwner } )

        // request 1 from provider 1, pay 100
        await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        // total should be 100 for consumer dp1 pair
        const tot1 = await this.RouterContract.getTokensHeldFor( this.MockConsumerContract.address, dataProvider )
        expect( tot1.toNumber() ).to.equal( dp1Fee )

        // request 2, from provider 2 pay 200
        await this.MockConsumerContract.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner } )

        // total should be 200 for consumer dp2 pair
        const tot2 = await this.RouterContract.getTokensHeldFor( this.MockConsumerContract.address, dataProvider2 )
        expect( tot2.toNumber() ).to.equal( dp2Fee )
      } )

      it( 'data request success - ERC20 token balance for Consumer contract should be 700 after 2 requests', async function () {
        const initialContract = 1000
        const expectedContract = 700
        const dp1Fee = 100
        const dp2Fee = 200

        // add tokens to consumer contract
        await this.MockTokenContract.transfer( this.MockConsumerContract.address, initialContract, { from: dataConsumerOwner } )
        // add Data provider1
        await this.MockConsumerContract.addDataProvider( dataProvider, dp1Fee, { from: dataConsumerOwner } );
        // add Data provider2
        await this.MockConsumerContract.addDataProvider( dataProvider2, dp2Fee, { from: dataConsumerOwner } );
        // increase router allowance
        await this.MockConsumerContract.increaseRouterAllowance( new BN( 999999 * ( 10 ** 9 ) ), { from: dataConsumerOwner } )

        // request 1 from provider 1, pay 100
        await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )
        // request 2, from provider 2 pay 200
        await this.MockConsumerContract.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner } )

        // ERC20 balance for consumer contract should be 700
        const erc20Balance = await this.MockTokenContract.balanceOf( this.MockConsumerContract.address )
        expect( erc20Balance.toNumber() ).to.equal( expectedContract )
      } )
    })

    describe('multiple data consumers and providers', function () {
      it( 'data request success - Router getTotalTokensHeld should be 600 after 4 requests', async function () {
        const initialContract1 = 1000
        const initialContract2 = 1000
        const dp1Fee1 = 100
        const dp2Fee1 = 200
        const dp1Fee2 = 100
        const dp2Fee2 = 200
        const expectedRouter = 600

        // dataConsumerOwner deploy Consumer contract
        const MockConsumerContract1 = await MockConsumer.new(this.RouterContract.address, {from: dataConsumerOwner})
        // add tokens to consumer contract
        await this.MockTokenContract.transfer( MockConsumerContract1.address, initialContract1, { from: dataConsumerOwner } )
        // add Data provider1
        await MockConsumerContract1.addDataProvider( dataProvider, dp1Fee1, { from: dataConsumerOwner } );
        // add Data provider2
        await MockConsumerContract1.addDataProvider( dataProvider2, dp2Fee1, { from: dataConsumerOwner } );
        // increase router allowance
        await MockConsumerContract1.increaseRouterAllowance( new BN( 999999 * ( 10 ** 9 ) ), { from: dataConsumerOwner } )

        // dataConsumerOwner2 deploy Consumer contract
        const MockConsumerContract2 = await MockConsumer.new(this.RouterContract.address, {from: dataConsumerOwner2})
        // add tokens to consumer contract
        await this.MockTokenContract.transfer( MockConsumerContract2.address, initialContract2, { from: dataConsumerOwner2 } )
        // add Data provider1
        await MockConsumerContract2.addDataProvider( dataProvider, dp1Fee2, { from: dataConsumerOwner2 } );
        // add Data provider2
        await MockConsumerContract2.addDataProvider( dataProvider2, dp2Fee2, { from: dataConsumerOwner2 } );
        // increase router allowance
        await MockConsumerContract2.increaseRouterAllowance( new BN( 999999 * ( 10 ** 9 ) ), { from: dataConsumerOwner2 } )

        // request 1 - consumer 1 from provider 1, pay 100
        await MockConsumerContract1.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        // request 2 - consumer 1 from provider 2 pay 200
        await MockConsumerContract1.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner } )

        // request 3 - consumer 2 from provider 1, pay 100
        await MockConsumerContract2.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner2 } )

        // request 4 - consumer 2 from provider 2 pay 200
        await MockConsumerContract2.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner2 } )

        const tot = await this.RouterContract.getTotalTokensHeld()
        expect( tot.toNumber() ).to.equal( expectedRouter )
      } )

      it( 'data request success - ERC20 token balance for Router should be 600 after 4 requests', async function () {
        const initialContract1 = 1000
        const initialContract2 = 1000
        const dp1Fee1 = 100
        const dp2Fee1 = 200
        const dp1Fee2 = 100
        const dp2Fee2 = 200
        const expectedRouter = 600

        // dataConsumerOwner deploy Consumer contract
        const MockConsumerContract1 = await MockConsumer.new(this.RouterContract.address, {from: dataConsumerOwner})
        // add tokens to consumer contract
        await this.MockTokenContract.transfer( MockConsumerContract1.address, initialContract1, { from: dataConsumerOwner } )
        // add Data provider1
        await MockConsumerContract1.addDataProvider( dataProvider, dp1Fee1, { from: dataConsumerOwner } );
        // add Data provider2
        await MockConsumerContract1.addDataProvider( dataProvider2, dp2Fee1, { from: dataConsumerOwner } );
        // increase router allowance
        await MockConsumerContract1.increaseRouterAllowance( new BN( 999999 * ( 10 ** 9 ) ), { from: dataConsumerOwner } )

        // dataConsumerOwner2 deploy Consumer contract
        const MockConsumerContract2 = await MockConsumer.new(this.RouterContract.address, {from: dataConsumerOwner2})
        // add tokens to consumer contract
        await this.MockTokenContract.transfer( MockConsumerContract2.address, initialContract2, { from: dataConsumerOwner2 } )
        // add Data provider1
        await MockConsumerContract2.addDataProvider( dataProvider, dp1Fee2, { from: dataConsumerOwner2 } );
        // add Data provider2
        await MockConsumerContract2.addDataProvider( dataProvider2, dp2Fee2, { from: dataConsumerOwner2 } );
        // increase router allowance
        await MockConsumerContract2.increaseRouterAllowance( new BN( 999999 * ( 10 ** 9 ) ), { from: dataConsumerOwner2 } )

        // request 1 - consumer 1 from provider 1, pay 100
        await MockConsumerContract1.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        // request 2 - consumer 1 from provider 2 pay 200
        await MockConsumerContract1.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner } )

        // request 3 - consumer 2 from provider 1, pay 100
        await MockConsumerContract2.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner2 } )

        // request 4 - consumer 2 from provider 2 pay 200
        await MockConsumerContract2.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner2 } )

        const tot = await this.MockTokenContract.balanceOf( this.RouterContract.address )
        expect( tot.toNumber() ).to.equal( expectedRouter )
      })

      it( 'data request success - Router getTokensHeldFor for consumer contract/provider pairs should be correct', async function () {
        const initialContract1 = 1000
        const initialContract2 = 1000
        const c1p1Fee = 100
        const c1p2Fee = 200
        const c2p1Fee = 300
        const c2p2Fee = 400
        const expectedC1P1 = 100
        const expectedC1P2 = 200
        const expectedC2P1 = 300
        const expectedC2P2 = 400

        // dataConsumerOwner deploy Consumer contract
        const MockConsumerContract1 = await MockConsumer.new(this.RouterContract.address, {from: dataConsumerOwner})
        // add tokens to consumer contract
        await this.MockTokenContract.transfer( MockConsumerContract1.address, initialContract1, { from: dataConsumerOwner } )
        // add Data provider1
        await MockConsumerContract1.addDataProvider( dataProvider, c1p1Fee, { from: dataConsumerOwner } );
        // add Data provider2
        await MockConsumerContract1.addDataProvider( dataProvider2, c1p2Fee, { from: dataConsumerOwner } );
        // increase router allowance
        await MockConsumerContract1.increaseRouterAllowance( new BN( 999999 * ( 10 ** 9 ) ), { from: dataConsumerOwner } )

        // dataConsumerOwner2 deploy Consumer contract
        const MockConsumerContract2 = await MockConsumer.new(this.RouterContract.address, {from: dataConsumerOwner2})
        // add tokens to consumer contract
        await this.MockTokenContract.transfer( MockConsumerContract2.address, initialContract2, { from: dataConsumerOwner2 } )
        // add Data provider1
        await MockConsumerContract2.addDataProvider( dataProvider, c2p1Fee, { from: dataConsumerOwner2 } );
        // add Data provider2
        await MockConsumerContract2.addDataProvider( dataProvider2, c2p2Fee, { from: dataConsumerOwner2 } );
        // increase router allowance
        await MockConsumerContract2.increaseRouterAllowance( new BN( 999999 * ( 10 ** 9 ) ), { from: dataConsumerOwner2 } )

        // request 1 - consumer 1 from provider 1, pay 100
        await MockConsumerContract1.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        // request 2 - consumer 1 from provider 2 pay 200
        await MockConsumerContract1.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner } )

        // request 3 - consumer 2 from provider 1, pay 100
        await MockConsumerContract2.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner2 } )

        // request 4 - consumer 2 from provider 2 pay 200
        await MockConsumerContract2.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner2 } )

        // total should be 100 for consumer1 dp1 pair
        const c1p1Tot = await this.RouterContract.getTokensHeldFor( MockConsumerContract1.address, dataProvider )
        expect( c1p1Tot.toNumber() ).to.equal( expectedC1P1 )

        // total should be 200 for consumer1 dp2 pair
        const c1p2Tot = await this.RouterContract.getTokensHeldFor( MockConsumerContract1.address, dataProvider2 )
        expect( c1p2Tot.toNumber() ).to.equal( expectedC1P2 )

        // total should be 300 for consumer1 dp1 pair
        const c2p1Tot = await this.RouterContract.getTokensHeldFor( MockConsumerContract2.address, dataProvider )
        expect( c2p1Tot.toNumber() ).to.equal( expectedC2P1 )

        // total should be 400 for consumer1 dp2 pair
        const c2p2Tot = await this.RouterContract.getTokensHeldFor( MockConsumerContract2.address, dataProvider2 )
        expect( c2p2Tot.toNumber() ).to.equal( expectedC2P2 )
      })
      it( 'data request success - ERC20 token balance for Consumer contracts should be correct after 4 requests', async function () {
        const initialContract1 = 1000
        const initialContract2 = 1000
        const c1p1Fee = 100
        const c1p2Fee = 200
        const c2p1Fee = 300
        const c2p2Fee = 400
        const expectedC1 = 700
        const expectedC2 = 300

        // dataConsumerOwner deploy Consumer contract
        const MockConsumerContract1 = await MockConsumer.new(this.RouterContract.address, {from: dataConsumerOwner})
        // add tokens to consumer contract
        await this.MockTokenContract.transfer( MockConsumerContract1.address, initialContract1, { from: dataConsumerOwner } )
        // add Data provider1
        await MockConsumerContract1.addDataProvider( dataProvider, c1p1Fee, { from: dataConsumerOwner } );
        // add Data provider2
        await MockConsumerContract1.addDataProvider( dataProvider2, c1p2Fee, { from: dataConsumerOwner } );
        // increase router allowance
        await MockConsumerContract1.increaseRouterAllowance( new BN( 999999 * ( 10 ** 9 ) ), { from: dataConsumerOwner } )

        // dataConsumerOwner2 deploy Consumer contract
        const MockConsumerContract2 = await MockConsumer.new(this.RouterContract.address, {from: dataConsumerOwner2})
        // add tokens to consumer contract
        await this.MockTokenContract.transfer( MockConsumerContract2.address, initialContract2, { from: dataConsumerOwner2 } )
        // add Data provider1
        await MockConsumerContract2.addDataProvider( dataProvider, c2p1Fee, { from: dataConsumerOwner2 } );
        // add Data provider2
        await MockConsumerContract2.addDataProvider( dataProvider2, c2p2Fee, { from: dataConsumerOwner2 } );
        // increase router allowance
        await MockConsumerContract2.increaseRouterAllowance( new BN( 999999 * ( 10 ** 9 ) ), { from: dataConsumerOwner2 } )

        // request 1 - consumer 1 from provider 1, pay 100
        await MockConsumerContract1.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        // request 2 - consumer 1 from provider 2 pay 200
        await MockConsumerContract1.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner } )

        // request 3 - consumer 2 from provider 1, pay 100
        await MockConsumerContract2.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner2 } )

        // request 4 - consumer 2 from provider 2 pay 200
        await MockConsumerContract2.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner2 } )

        // ERC20 balance for C1 should be 700
        const erc20BalanceC1 = await this.MockTokenContract.balanceOf( MockConsumerContract1.address )
        expect( erc20BalanceC1.toNumber() ).to.equal( expectedC1 )

        // ERC20 balance for C2 should be 300
        const erc20BalanceC2 = await this.MockTokenContract.balanceOf( MockConsumerContract2.address )
        expect( erc20BalanceC2.toNumber() ).to.equal( expectedC2 )
      })
    } )
  })
})
