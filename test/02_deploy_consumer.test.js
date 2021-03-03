const { constants, expectRevert } = require("@openzeppelin/test-helpers")

const { expect } = require("chai")

const MockToken = artifacts.require("MockToken") // Loads a compiled contract
const Router = artifacts.require("Router") // Loads a compiled contract
const MockConsumer = artifacts.require("MockConsumer") // Loads a compiled contract
const ConsumerLib = artifacts.require("ConsumerLib") // Loads a compiled contract

const REQUEST_VAR_GAS_PRICE_LIMIT = 1 // gas price limit in gwei the consumer is willing to pay for data processing
const REQUEST_VAR_TOP_UP_LIMIT = 2 // max ETH that can be sent in a gas top up Tx
const REQUEST_VAR_REQUEST_TIMEOUT = 3 // request timeout in seconds

contract("Consumer - deploy", (accounts) => {
  const [admin, dataConsumerOwner, eoa] = accounts
  const decimals = 9
  const initSupply = 1000 * 10 ** decimals

  before(async function () {
    // admin deploy Token contract
    this.MockTokenContract = await MockToken.new("MockToken", "MockToken", initSupply, decimals, {
      from: admin,
    })

    // admin deploy Router contract
    this.RouterContract = await Router.new(this.MockTokenContract.address, { from: admin })

    // Deploy ConsumerLib library and link
    this.ConsumerLib = await ConsumerLib.new({ from: admin })
    await MockConsumer.detectNetwork()
    await MockConsumer.link("ConsumerLib", this.ConsumerLib.address)
  })

  it("can deploy a Consumer contract with router address - has correct router address", async function () {
    const MockConsumerContract = await MockConsumer.new(this.RouterContract.address, {
      from: dataConsumerOwner,
    })
    expect(await MockConsumerContract.getRouterAddress()).to.equal(this.RouterContract.address)
  })

  it("can deploy a Consumer contract with router address - owner is deployer", async function () {
    const MockConsumerContract = await MockConsumer.new(this.RouterContract.address, {
      from: dataConsumerOwner,
    })
    expect(await MockConsumerContract.owner()).to.equal(dataConsumerOwner)
  })

  it("start gasPriceLimit is 200", async function () {
    const MockConsumerContract = await MockConsumer.new(this.RouterContract.address, {
      from: dataConsumerOwner,
    })
    const gasPriceLimit = await MockConsumerContract.getRequestVar(REQUEST_VAR_GAS_PRICE_LIMIT)
    expect(gasPriceLimit.toNumber()).to.equal(200)
  })

  it("start requestTimeout is 300", async function () {
    const MockConsumerContract = await MockConsumer.new(this.RouterContract.address, {
      from: dataConsumerOwner,
    })
    const requestTimeout = await MockConsumerContract.getRequestVar(REQUEST_VAR_REQUEST_TIMEOUT)
    expect(requestTimeout.toNumber()).to.equal(300)
  })

  it("start gasTopUpLimit is 0.5 eth", async function () {
    const startVal = web3.utils.toWei("0.5", "ether")
    const MockConsumerContract = await MockConsumer.new(this.RouterContract.address, {
      from: dataConsumerOwner,
    })
    const requestTimeout = await MockConsumerContract.getRequestVar(REQUEST_VAR_TOP_UP_LIMIT)
    expect(requestTimeout.toString()).to.equal(startVal.toString())
  })

  it("must deploy with router", async function () {
    await expectRevert(
      MockConsumer.new(constants.ZERO_ADDRESS, { from: dataConsumerOwner }),
      "ConsumerLib: router cannot be the zero address",
    )
  })

  it("router address must be a contract", async function () {
    await expectRevert(
      MockConsumer.new(eoa, { from: dataConsumerOwner }),
      "ConsumerLib: router address must be a contract",
    )
  })
})
