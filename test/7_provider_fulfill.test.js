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

describe('Provider - fulfillment tests', function () {
  this.timeout(300000)

  const [admin, dataProvider, dataConsumerOwner, rando] = accounts
  const [adminPk, dataProviderPk, dataConsumerPk, randoPk] = privateKeys
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

    it( 'dataProvider can fulfill a request', async function () {
      const requestNonce = await this.MockConsumerContract.getRequestNonce()
      const routerSalt = await this.RouterContract.getSalt()

      const reqId = generateRequestId(this.MockConsumerContract.address, requestNonce, dataProvider, endpoint, callbackFuncSig, gasPrice, routerSalt)
      const reqReciept = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

      expectEvent( reqReciept, 'DataRequestSubmitted', {
        sender: dataConsumerOwner,
        dataConsumer: this.MockConsumerContract.address,
        dataProvider: dataProvider,
        fee: fee,
        endpoint: endpoint,
        gasPrice: new BN(gasPrice * (10 ** 9)),
        callbackFunctionSignature: callbackFuncSig,
        requestId: reqId,
      } )

      const msg = generateSigMsg(reqId, priceToSend, this.MockConsumerContract.address)
      const sig = await web3.eth.accounts.sign(msg, dataProviderPk)
      const fulfullReceipt = await this.RouterContract.fulfillRequest(reqId, priceToSend, sig.signature, {from: dataProvider})

      expectEvent( fulfullReceipt, 'RequestFulfilled', {
        dataConsumer: this.MockConsumerContract.address,
        dataProvider: dataProvider,
        requestId: reqId,
        callbackFunctionSignature: callbackFuncSig,
        requestedData: new BN(priceToSend),
      } )

      const retPrice = await this.MockConsumerContract.price()
      expect(retPrice.toNumber()).to.equal(priceToSend.toNumber())
    } )

    it( 'only requested, authorised dataProvider can fulfill a request', async function () {
      const requestNonce = await this.MockConsumerContract.getRequestNonce()
      const routerSalt = await this.RouterContract.getSalt()

      const reqId = generateRequestId(this.MockConsumerContract.address, requestNonce, dataProvider, endpoint, callbackFuncSig, gasPrice, routerSalt)
      const reqReciept = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

      expectEvent( reqReciept, 'DataRequestSubmitted', {
        sender: dataConsumerOwner,
        dataConsumer: this.MockConsumerContract.address,
        dataProvider: dataProvider,
        fee: fee,
        endpoint: endpoint,
        gasPrice: new BN(gasPrice * (10 ** 9)),
        callbackFunctionSignature: callbackFuncSig,
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
      const requestNonce = await this.MockConsumerContract.getRequestNonce()
      const routerSalt = await this.RouterContract.getSalt()

      const reqId = generateRequestId(this.MockConsumerContract.address, requestNonce, dataProvider, endpoint, callbackFuncSig, gasPrice, routerSalt)
      const reqReciept = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

      expectEvent( reqReciept, 'DataRequestSubmitted', {
        sender: dataConsumerOwner,
        dataConsumer: this.MockConsumerContract.address,
        dataProvider: dataProvider,
        fee: fee,
        endpoint: endpoint,
        gasPrice: new BN(gasPrice * (10 ** 9)),
        callbackFunctionSignature: callbackFuncSig,
        requestId: reqId,
      } )

      // revoke priviledges for dataProvider
      await this.MockConsumerContract.removeDataProvider(dataProvider,  { from: dataConsumerOwner } )

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
      const requestNonce = await this.MockConsumerContract.getRequestNonce()
      const routerSalt = await this.RouterContract.getSalt()

      const reqId = generateRequestId(this.MockConsumerContract.address, requestNonce, dataProvider, endpoint, callbackFuncSig, gasPrice, routerSalt)
      await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )


      // dataProvider tries to fulfill request paying higher than gas price
      const msg = generateSigMsg(reqId, priceToSend, this.MockConsumerContract.address)
      const sig = await web3.eth.accounts.sign(msg, dataProviderPk)

      const gasPriceTooHigh = gasPrice * 2

      await expectRevert(
        this.RouterContract.fulfillRequest(reqId, priceToSend, sig.signature, {from: dataProvider, gasPrice: (gasPriceTooHigh * (10 ** 9))}),
        "Router: tx.gasprice cannot exceed gas price consumer is willing to pay"
      )

      // should still be zero
      const retPrice = await this.MockConsumerContract.price()
      expect(retPrice.toNumber()).to.equal(0)
    } )

  })

})
