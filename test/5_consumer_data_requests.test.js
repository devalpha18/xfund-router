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

    it( 'dataConsumer (owner) can initialise a request', async function () {
      const requestNonce = await this.MockConsumerContract.getRequestNonce()
      const routerSalt = await this.RouterContract.getSalt()

      const reqId = generateRequestId(this.MockConsumerContract.address, requestNonce, dataProvider, endpoint, callbackFuncSig, gasPrice, routerSalt)
      const reciept = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

      expectEvent( reciept, 'DataRequestSubmitted', {
        dataConsumer: this.MockConsumerContract.address,
        dataProvider: dataProvider,
        fee: fee,
        endpoint: endpoint,
        callbackFunctionSignature: callbackFuncSig,
        requestId: reqId,
      } )
    } )

    it( 'only dataConsumer (owner) can initialise a request', async function () {
      await expectRevert(
        this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: rando } ),
        "Consumer: only owner can do this"
      )

    } )

    it( 'cannot exceed own gas limit', async function () {
      // gasLimit is 200 Gwei. Send with 300
      await expectRevert(
        this.MockConsumerContract.requestData( dataProvider, endpoint, 300, { from: dataConsumerOwner } ),
        "Consumer: gasPrice > gasPriceLimit"
      )
    } )

    it( 'consumer must have authorised provider', async function () {
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
        callbackFunctionSignature: callbackFuncSig,
        requestId: reqId,
      } )
    } )

    it( 'request will fail if dataProvider revoked', async function () {
      // remove dataProvider as a data provider
      await this.MockConsumerContract.removeDataProvider(dataProvider, {from: dataConsumerOwner});
      // dataProvider is no longer authorised
      await expectRevert(
        this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } ),
        "Consumer: _dataProvider does not have role DATA_PROVIDER"
      )
    } )
  })

  /*
   * Tests with Tokens
   */
  describe('token tests', function () {
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
        callbackFunctionSignature: callbackFuncSig,
        requestId: reqId,
      } )

    })
  })
})
