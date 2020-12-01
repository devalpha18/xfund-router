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
const MockBadConsumer = contract.fromArtifact('MockBadConsumer') // Loads a compiled contract

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

describe('Router - interaction tests', function () {
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
   * EOA
   */
  describe('eoa interactions', function () {
    it( 'eoa cannot initialise request', async function () {
      await expectRevert(
        this.RouterContract.initialiseRequest(dataProvider, fee, 0, endpoint, 20, salt, callbackFuncSig, {from: dataConsumerOwner}),
        "Router: only a contract can initialise a request"
      )
    } )
  })

  /*
   * Bad consumer implementations
   */
  describe('bad consumer implementations', function () {
    beforeEach(async function () {
      this.BadConsumerContract = await MockBadConsumer.new(this.RouterContract.address, {from: dataConsumerOwner})
    })
    it( 'dataProvider not registered on router', async function () {
      await expectRevert(
        this.BadConsumerContract.requestData(dataProvider, endpoint, {from: dataConsumerOwner}),
        "Router: dataProvider not authorised for this dataConsumer"
      )
    } )

    it( 'request ids must match', async function () {
      await this.BadConsumerContract.addDataProviderToRouter(dataProvider, {from: dataConsumerOwner})
      const rubbushRequestId = web3.utils.soliditySha3(web3.utils.randomHex(32))
      await expectRevert(
        this.BadConsumerContract.requestDataWithAllParamsAndRequestId(dataProvider, 100, 1, endpoint, 200000000000, rubbushRequestId, {from: dataConsumerOwner}),
        "Router: reqId != _requestId"
      )
    } )

    it( 'not enough tokens', async function () {
      await this.BadConsumerContract.addDataProviderToRouter(dataProvider, {from: dataConsumerOwner})

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

      // first req
      await this.BadConsumerContract.requestDataWithAllParams(dataProvider, 100, 2, endpoint, 200000000000, {from: dataConsumerOwner})

      await expectRevert(
        this.BadConsumerContract.requestDataWithAllParams(dataProvider, 100, 2, endpoint, 200000000000, {from: dataConsumerOwner}),
        "Router: request id already initialised"
      )
    } )

  })
})
