const { accounts, contract, web3, privateKeys } = require('@openzeppelin/test-environment')
const { v4: uuidv4 } = require("uuid")

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

describe('MockToken - initialise', function () {
  const [admin, editor, dataProvider, dataConsumer, rando] = accounts
  const [adminPk, editorPk, dataProviderPk, dataConsumerPk] = privateKeys
  const decimals = 9
  const initSupply = 1000 * (10 ** decimals)
  const fee = new BN(0.1 * ( 10 ** 9 ))
  const endpoint = "PRICE.BTC.USD.AVG"
  const salt = web3.utils.randomHex(32)
  const gasPrice = 100 // gwei, 10 ** 9 done in contract
  const callbackFuncSig = web3.eth.abi.encodeFunctionSignature('recieveData(uint256,bytes32,bytes)')
  const priceToSend = new BN("1000")
  const ROLE_DATA_PROVIDER = web3.utils.sha3('DATA_PROVIDER')
  const ROLE_DATA_REQUESTER = web3.utils.sha3('DATA_REQUESTER')

  const setUpIdealScenario = async function(instance) {
    // increase Router allowance
    await instance.MockConsumerContract.increaseRouterAllowance(new BN(999999 * ( 10 ** 9 )), {from: dataConsumer})

    // add a dataProvider
    await instance.MockConsumerContract.addDataProvider(dataProvider, fee, {from: dataConsumer});

    // Admin Transfer 10 Tokens to dataConsumer
    await instance.MockTokenContract.transfer(dataConsumer, new BN(10 * (10 ** decimals)), {from: admin})

    // Transfer 1 Tokens to MockConsumerContract from dataConsumer
    await instance.MockTokenContract.transfer(instance.MockConsumerContract.address, new BN((10 ** decimals)), {from: dataConsumer})
  }

  beforeEach(async function () {
    // admin deploy Token contract
    this.MockTokenContract = await MockToken.new("MockToken", "MockToken", initSupply, decimals, {from: admin})

    // admin deploy Router contract
    this.RouterContract = await Router.new(this.MockTokenContract.address, salt, {from: admin})

    // dataConsumer deploy Consumer contract
    this.MockConsumerContract = await MockConsumer.new(this.RouterContract.address, {from: dataConsumer})

  })

  it('can initialise a request - with ideal pre-setup', async function () {
    await setUpIdealScenario(this)
    const reciept = await this.MockConsumerContract.requestData(dataProvider, endpoint, gasPrice, { from: dataConsumer})

    expectEvent(reciept, 'DataRequestSubmitted', {
      dataConsumer: this.MockConsumerContract.address,
      dataProvider: dataProvider,
      fee: fee,
      endpoint: endpoint,
      callbackFunctionSignature: callbackFuncSig
    })
  })

  it('cannot exceed own gas limit - with ideal pre-setup', async function () {
    await setUpIdealScenario(this)

    await expectRevert(
      this.MockConsumerContract.requestData(dataProvider, endpoint, 300, { from: dataConsumer}),
      "Consumer: gasPrice > gasPriceLimit"
    )
  })

  it('consumer must have authorised provider - with ideal pre-setup', async function () {
    await setUpIdealScenario(this)

    await expectRevert(
      this.MockConsumerContract.requestData(rando, endpoint, 300, { from: dataConsumer}),
      "Consumer: _dataProvider does not have role DATA_PROVIDER"
    )
  })

  it('consumer can authorise new provider - with ideal pre-setup', async function () {
    await setUpIdealScenario(this)
    const authReceipt = await this.MockConsumerContract.addDataProvider(rando, fee, { from: dataConsumer})
    expectEvent(authReceipt, 'RoleGranted', {
      role: ROLE_DATA_PROVIDER,
      account: rando,
      sender: dataConsumer
    })
  })

  it('consumer can revoke data provider - with ideal pre-setup', async function () {
    await setUpIdealScenario(this)
    const authReceipt = await this.MockConsumerContract.removeDataProvider(dataProvider, { from: dataConsumer})
    expectEvent(authReceipt, 'RoleRevoked', {
      role: ROLE_DATA_PROVIDER,
      account: dataProvider,
      sender: dataConsumer
    })
  })

})
