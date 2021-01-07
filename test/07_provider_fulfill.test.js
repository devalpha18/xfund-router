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
const MockConsumerCustomRequest = contract.fromArtifact("MockConsumerCustomRequest") // Loads a compiled contract
const ConsumerLib = contract.fromArtifact('ConsumerLib') // Loads a compiled contract

const signData = async function(reqId, priceToSend, consumerContractAddress, providerPk) {
  const msg = generateSigMsg(reqId, priceToSend, consumerContractAddress)
  return web3.eth.accounts.sign(msg, providerPk)
}

function generateSigMsg(requestId, data, consumerAddress) {
  return web3.utils.soliditySha3(
    { 'type': 'bytes32', 'value': requestId},
    { 'type': 'uint256', 'value': data},
    { 'type': 'address', 'value': consumerAddress}
  )
}

const getReqIdFromReceipt = function(receipt) {
  for(let i = 0; i < receipt.logs.length; i += 1) {
    const log = receipt.logs[i]
    if(log.event === "DataRequested") {
      return log.args.requestId
    }
  }
  return null
}

function generateRequestId(
  consumerAddress,
  requestNonce,
  dataProvider,
  routerAddress) {
  return web3.utils.soliditySha3(
    { 'type': 'address', 'value': consumerAddress},
    { 'type': 'address', 'value': dataProvider},
    { 'type': 'address', 'value': routerAddress},
    { 'type': 'uint256', 'value': requestNonce.toNumber()}
  )
}

const randomPrice = function() {
  const rand = Math.floor(Math.random() * (999999999)) + 1
  return web3.utils.toWei(String(rand), "ether")
}

const randomGasPrice = function(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

describe('Provider - fulfillment tests', function () {
  this.timeout(300000)

  const [admin, dataProvider, dataConsumerOwner, rando] = accounts
  const [adminPk, dataProviderPk, dataConsumerPk, randoPk] = privateKeys
  const decimals = 9
  const initSupply = 1000 * (10 ** decimals)
  const fee = new BN(0.1 * ( 10 ** 9 ))
  const endpoint = web3.utils.asciiToHex("PRICE.BTC.USD.AVG")
  const gasPrice = 100 // gwei, 10 ** 9 done in contract
  const callbackFuncSig = web3.eth.abi.encodeFunctionSignature('recieveData(uint256,bytes32,bytes)')
  const priceToSend = new BN("1000")
  const ROLE_DATA_PROVIDER = web3.utils.sha3('DATA_PROVIDER')

  // deploy contracts before every test
  beforeEach(async function () {
    // admin deploy Token contract
    this.MockTokenContract = await MockToken.new("MockToken", "MockToken", initSupply, decimals, {from: admin})

    // admin deploy Router contract
    this.RouterContract = await Router.new(this.MockTokenContract.address, {from: admin})

    // Deploy ConsumerLib library and link
    this.ConsumerLib = await ConsumerLib.new({from: admin})
    await MockConsumer.detectNetwork();
    await MockConsumer.link("ConsumerLib", this.ConsumerLib.address)
    await MockConsumerCustomRequest.detectNetwork();
    await MockConsumerCustomRequest.link("ConsumerLib", this.ConsumerLib.address)

    // dataConsumerOwner deploy Consumer contract
    this.MockConsumerContract = await MockConsumer.new(this.RouterContract.address, {from: dataConsumerOwner})
    this.MockConsumerCustomRequestContract = await MockConsumerCustomRequest.new(this.RouterContract.address, {from: dataConsumerOwner})

  })

  /*
   * Tests in ideal scenario
   */
  describe('ideal scenario - enough tokens and allowance, dataProvider authorised', function () {
    // set up ideal scenario for these tests
    beforeEach(async function () {
      // increase Router allowance
      await this.MockConsumerContract.setRouterAllowance( new BN( 999999 * ( 10 ** 9 ) ), true, {from: dataConsumerOwner})
      await this.MockConsumerCustomRequestContract.setRouterAllowance( new BN( 999999 * ( 10 ** 9 ) ), true, {from: dataConsumerOwner})

      // add a dataProvider
      await this.MockConsumerContract.addRemoveDataProvider(dataProvider, fee, false, {from: dataConsumerOwner});
      await this.MockConsumerCustomRequestContract.addRemoveDataProvider(dataProvider, fee, false, {from: dataConsumerOwner});

      // Admin Transfer 100 Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer(dataConsumerOwner, new BN(100 * (10 ** decimals)), {from: admin})

      // Transfer 10 Tokens to MockConsumerContract from dataConsumerOwner
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, new BN(10 * (10 ** decimals)), {from: dataConsumerOwner})
      await this.MockTokenContract.transfer(this.MockConsumerCustomRequestContract.address, new BN(10 * (10 ** decimals)), {from: dataConsumerOwner})

      await this.MockConsumerContract.topUpGas(dataProvider, { from: dataConsumerOwner, value: web3.utils.toWei("0.1", "ether") })
      await this.MockConsumerCustomRequestContract.topUpGas(dataProvider, { from: dataConsumerOwner, value: web3.utils.toWei("0.1", "ether") })
    })

    it( 'dataProvider can fulfill a request', async function () {
      const reqId = generateRequestId(this.MockConsumerContract.address, new BN(0), dataProvider, this.RouterContract.address)
      const reqReciept = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

      expectEvent( reqReciept, 'DataRequestSubmitted', {
        requestId: reqId,
      } )

      const msg = generateSigMsg(reqId, priceToSend, this.MockConsumerContract.address)
      const sig = await web3.eth.accounts.sign(msg, dataProviderPk)
      const fulfullReceipt = await this.RouterContract.fulfillRequest(reqId, priceToSend, sig.signature, {from: dataProvider})

      expectEvent( fulfullReceipt, 'RequestFulfilled', {
        dataConsumer: this.MockConsumerContract.address,
        dataProvider: dataProvider,
        requestId: reqId,
        requestedData: new BN(priceToSend),
      } )

      const retPrice = await this.MockConsumerContract.price()
      expect(retPrice.toNumber()).to.equal(priceToSend.toNumber())
    } )

    it( 'dataProvider can fulfill a custom request', async function () {
      const reqId = generateRequestId(this.MockConsumerCustomRequestContract.address, new BN(0), dataProvider, this.RouterContract.address)
      const reqReciept = await this.MockConsumerCustomRequestContract.customRequestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

      expectEvent( reqReciept, 'CustomDataRequested', {
        requestId: reqId,
        data: `${endpoint}000000000000000000000000000000`
      } )

      const msg = generateSigMsg(reqId, priceToSend, this.MockConsumerCustomRequestContract.address)
      const sig = await web3.eth.accounts.sign(msg, dataProviderPk)
      const fulfullReceipt = await this.RouterContract.fulfillRequest(reqId, priceToSend, sig.signature, {from: dataProvider})

      expectEvent( fulfullReceipt, 'RequestFulfilled', {
        dataConsumer: this.MockConsumerCustomRequestContract.address,
        dataProvider: dataProvider,
        requestId: reqId,
        requestedData: new BN(priceToSend),
      } )

      const retPrice = await this.MockConsumerCustomRequestContract.price()
      expect(retPrice.toNumber()).to.equal(priceToSend.toNumber())
    } )

    it( 'dataProvider is paid correct token fee after fulfilling a request', async function () {
      const reqReciept = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )
      const reqId = getReqIdFromReceipt(reqReciept)

      const balanceBefore = await this.MockTokenContract.balanceOf(dataProvider)
      expect( balanceBefore.toNumber() ).to.equal( 0 )

      const sig = await signData(reqId, priceToSend, this.MockConsumerContract.address, dataProviderPk)
      await this.RouterContract.fulfillRequest(reqId, priceToSend, sig.signature, {from: dataProvider})

      const balanceAfter = await this.MockTokenContract.balanceOf(dataProvider)
      expect( balanceAfter.toNumber() ).to.equal( fee.toNumber() )
    } )

    it( 'dataProvider is paid correct token fee after fulfilling a custom request', async function () {
      const reqReciept = await this.MockConsumerCustomRequestContract.customRequestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )
      const reqId = getReqIdFromReceipt(reqReciept)

      const balanceBefore = await this.MockTokenContract.balanceOf(dataProvider)
      expect( balanceBefore.toNumber() ).to.equal( 0 )

      const sig = await signData(reqId, priceToSend, this.MockConsumerCustomRequestContract.address, dataProviderPk)
      await this.RouterContract.fulfillRequest(reqId, priceToSend, sig.signature, {from: dataProvider})

      const balanceAfter = await this.MockTokenContract.balanceOf(dataProvider)
      expect( balanceAfter.toNumber() ).to.equal( fee.toNumber() )
    } )

    it( '20 iterations: RequestFulfilled event emitted', async function () {
      for(let i = 0; i < 20; i += 1) {
        // simulate gas price fluctuation
        const randGas = randomGasPrice(10, 20)
        const reciept = await this.MockConsumerContract.requestData( dataProvider, endpoint, randGas, { from: dataConsumerOwner } )
        const reqId = await getReqIdFromReceipt(reciept)

        const price = randomPrice()
        const gasPriceGwei = randGas * ( 10 ** 9 )

        const sig = await signData( reqId, price, this.MockConsumerContract.address, dataProviderPk )
        const fulfullReceipt = await this.RouterContract.fulfillRequest( reqId, price, sig.signature, {
          from: dataProvider,
          gasPrice: gasPriceGwei
        } )

        expectEvent( fulfullReceipt, 'RequestFulfilled', {
          dataConsumer: this.MockConsumerContract.address,
          dataProvider: dataProvider,
          requestId: reqId,
          requestedData: price,
        } )
      }
    })

    it( '20 iterations: price updated correctly', async function () {
      for(let i = 0; i < 20; i += 1) {
        // simulate gas price fluctuation
        const randGas = randomGasPrice(10, 20)
        const reciept = await this.MockConsumerContract.requestData( dataProvider, endpoint, randGas, { from: dataConsumerOwner } )
        const reqId = await getReqIdFromReceipt(reciept)

        const price = randomPrice()
        const gasPriceGwei = randGas * ( 10 ** 9 )

        const sig = await signData( reqId, price, this.MockConsumerContract.address, dataProviderPk )
        await this.RouterContract.fulfillRequest( reqId, price, sig.signature, {
          from: dataProvider,
          gasPrice: gasPriceGwei
        } )

        // check price
        const retPrice = await this.MockConsumerContract.price()
        expect(retPrice).to.be.bignumber.equal(price)
      }
    })

    it( '20 iterations: provider paid correctly', async function () {
      const expectedBalance = fee.mul(new BN("20"))
      for(let i = 0; i < 20; i += 1) {
        // simulate gas price fluctuation
        const randGas = randomGasPrice(10, 20)
        const r = await this.MockConsumerContract.requestData( dataProvider, endpoint, randGas, { from: dataConsumerOwner } )
        const reqId = getReqIdFromReceipt(r)

        const price = randomPrice()
        const gasPriceGwei = randGas * ( 10 ** 9 )

        const sig = await signData( reqId, price, this.MockConsumerContract.address, dataProviderPk )
        await this.RouterContract.fulfillRequest( reqId, price, sig.signature, {
          from: dataProvider,
          gasPrice: gasPriceGwei
        } )
      }
      const balanceAfter = await this.MockTokenContract.balanceOf(dataProvider)
      expect( balanceAfter.toNumber() ).to.equal( expectedBalance.toNumber() )
    })

    it( 'only requested, authorised dataProvider can fulfill a request', async function () {
      const reqId = generateRequestId(this.MockConsumerContract.address, new BN(0), dataProvider, this.RouterContract.address)
      const reqReciept = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

      expectEvent( reqReciept, 'DataRequestSubmitted', {
        requestId: reqId,
      } )

      // rando tries to fulfill request
      const msg = generateSigMsg(reqId, priceToSend, this.MockConsumerContract.address)
      const sig = await web3.eth.accounts.sign(msg, randoPk)

      await expectRevert(
        this.RouterContract.fulfillRequest(reqId, priceToSend, sig.signature, {from: rando}),
        "Router: msg.sender != requested dataProvider"
      )

      // should still be zero
      const retPrice = await this.MockConsumerContract.price()
      expect(retPrice.toNumber()).to.equal(0)
    } )

    it( 'dataProvider cannot fulfill a request if authorisation revoked', async function () {
      const reqId = generateRequestId(this.MockConsumerContract.address, new BN(0), dataProvider, this.RouterContract.address)
      const reqReciept = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

      expectEvent( reqReciept, 'DataRequestSubmitted', {
        requestId: reqId,
      } )

      // revoke priviledges for dataProvider
      await this.MockConsumerContract.addRemoveDataProvider(dataProvider, 0, true, { from: dataConsumerOwner } )

      // dataProvider tries to fulfill request
      const msg = generateSigMsg(reqId, priceToSend, this.MockConsumerContract.address)
      const sig = await web3.eth.accounts.sign(msg, dataProviderPk)

      await expectRevert(
        this.RouterContract.fulfillRequest(reqId, priceToSend, sig.signature, {from: dataProvider}),
        "Router: dataProvider not authorised for this dataConsumer"
      )

      // should still be zero
      const retPrice = await this.MockConsumerContract.price()
      expect(retPrice.toNumber()).to.equal(0)
    } )

    it( 'dataProvider cannot pay higher gas than consumer requested', async function () {
      const reciept = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )
      const reqId = await getReqIdFromReceipt(reciept)

      // dataProvider tries to fulfill request paying higher than gas price
      const msg = generateSigMsg(reqId, priceToSend, this.MockConsumerContract.address)
      const sig = await web3.eth.accounts.sign(msg, dataProviderPk)

      const gasPriceTooHigh = gasPrice * 2

      await expectRevert(
        this.RouterContract.fulfillRequest(reqId, priceToSend, sig.signature, {from: dataProvider, gasPrice: (gasPriceTooHigh * (10 ** 9))}),
        "Router: tx.gasprice too high"
      )

      // should still be zero
      const retPrice = await this.MockConsumerContract.price()
      expect(retPrice.toNumber()).to.equal(0)
    } )

  })

  /*
   * Tests should fail
   */
  describe('should fail', function () {
    // set up ideal scenario for these tests
    beforeEach( async function () {
      // add a dataProvider
      await this.MockConsumerContract.addRemoveDataProvider( dataProvider, fee, false, { from: dataConsumerOwner } );

      // Admin Transfer 100 Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer( dataConsumerOwner, new BN( 100 * ( 10 ** decimals ) ), { from: admin } )

      // set provider to pay gas for data fulfilment - not testing this here
      await this.RouterContract.setProviderPaysGas(true, { from: dataProvider })
    } )

    it( 'consumer contract does not have enough tokens to pay fee - cannot request', async function () {
      await expectRevert(
        this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } ),
        "Router: contract does not have enough tokens to pay fee"
      )
    })

    it( 'router allowance not high enough to pay fee - cannot request', async function () {
      // Transfer 10 Tokens to MockConsumerContract from dataConsumerOwner
      await this.MockTokenContract.transfer( this.MockConsumerContract.address, new BN( 10 * ( 10 ** decimals ) ), { from: dataConsumerOwner } )
      await expectRevert(
        this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } ),
        "Router: not enough allowance to pay fee"
      )
    })

    it( 'consumer contract does not have enough tokens to pay fee - provider cannot fulfil - ERC20 revert', async function () {
      // Transfer 10 Tokens to MockConsumerContract from dataConsumerOwner
      await this.MockTokenContract.transfer( this.MockConsumerContract.address, new BN( 10 * ( 10 ** decimals ) ), { from: dataConsumerOwner } )
      // increase Router allowance
      await this.MockConsumerContract.setRouterAllowance( new BN( 999999 * ( 10 ** 9 ) ), true, { from: dataConsumerOwner } )

      const reqReciept = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )
      const reqId = getReqIdFromReceipt(reqReciept)

      // withdraw all tokens from Consumer contract
      await this.MockConsumerContract.withdrawAllTokens( { from: dataConsumerOwner } )

      // provider attempts to fulfil
      const sig = await signData(reqId, priceToSend, this.MockConsumerContract.address, dataProviderPk)
      await expectRevert(
        this.RouterContract.fulfillRequest(reqId, priceToSend, sig.signature, {from: dataProvider}),
        "ERC20: transfer amount exceeds balance"
      )
    })

    it( 'router allowance not high enough to pay fee - provider cannot fulfil - ERC20 revert', async function () {
      // Transfer 10 Tokens to MockConsumerContract from dataConsumerOwner
      await this.MockTokenContract.transfer( this.MockConsumerContract.address, new BN( 10 * ( 10 ** decimals ) ), { from: dataConsumerOwner } )
      // increase Router allowance
      await this.MockConsumerContract.setRouterAllowance( new BN( 999999 * ( 10 ** 9 ) ), true, { from: dataConsumerOwner } )

      const reqReciept = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )
      const reqId = getReqIdFromReceipt(reqReciept)

      // decrease router allowance Consumer contract
      await this.MockConsumerContract.setRouterAllowance( new BN( 999999 * ( 10 ** 9 ) ), false, { from: dataConsumerOwner } )

      // provider attempts to fulfil
      const sig = await signData(reqId, priceToSend, this.MockConsumerContract.address, dataProviderPk)
      await expectRevert(
        this.RouterContract.fulfillRequest(reqId, priceToSend, sig.signature, {from: dataProvider}),
        "ERC20: transfer amount exceeds allowance"
      )
    })

  })

})
