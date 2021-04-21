const {
  BN, // Big Number support
  constants,
  expectRevert,
  expectEvent,
} = require("@openzeppelin/test-helpers")

const { expect } = require("chai")

const { generateRequestId, generateSigMsg } = require("./helpers/utils")

const MockToken = artifacts.require("MockToken") // Loads a compiled contract
const Router = artifacts.require("Router") // Loads a compiled contract
const DemoConsumer = artifacts.require("DemoConsumer") // Loads a compiled contract

contract("Router - fulfillment & withdraw tests", (accounts) => {
  const [admin, dataProvider, dataConsumerOwner, rando] = accounts
  const dataProviderPk = "0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1"
  const randoPk = "0x646f1ce2fdad0e6deeeb5c7e8e5543bdde65e86029e2fd9fc169899c440a7913"

  const decimals = 9
  const initSupply = 1000 * 10 ** decimals
  const defaultFee = 100
  const endpoint = web3.utils.asciiToHex("PRICE.BTC.USD.AVG")
  const priceToSend = new BN("1000")

  // deploy contracts before every test
  beforeEach(async function () {
    // admin deploy Token contract
    this.MockTokenContract = await MockToken.new("MockToken", "MockToken", initSupply, decimals, {
      from: admin,
    })

    // admin deploy Router contract
    this.RouterContract = await Router.new(this.MockTokenContract.address, { from: admin })

    // deploy demo
    this.DemoConsumer = await DemoConsumer.new(
      this.RouterContract.address,
      this.MockTokenContract.address,
      dataProvider,
      defaultFee,
      {
        from: dataConsumerOwner,
      },
    )

    // register provider on router
    await this.RouterContract.registerAsProvider(defaultFee, { from: dataProvider })
    // send xFUND to consumer contract
    await this.MockTokenContract.transfer(this.DemoConsumer.address, defaultFee, { from: admin })
  })

  it("can setProvider", async function () {
    await this.DemoConsumer.setProvider(rando, { from: dataConsumerOwner })
  })

  it("can setFee", async function () {
    await this.DemoConsumer.setFee(100, { from: dataConsumerOwner })
  })

  it("can setRouter", async function () {
    await expectRevert(
      this.DemoConsumer.setRouter(constants.ZERO_ADDRESS, { from: dataConsumerOwner }),
      "router cannot be the zero address",
    )

    await expectRevert(
      this.DemoConsumer.setRouter(rando, { from: dataConsumerOwner }),
      "router address must be a contract",
    )

    const newRouterContract = await Router.new(this.MockTokenContract.address, { from: admin })

    await this.DemoConsumer.setRouter(newRouterContract.address, { from: dataConsumerOwner })
  })

  it("can increaseRouterAllowance", async function () {
    await this.DemoConsumer.increaseRouterAllowance(100000000, { from: dataConsumerOwner })
  })

  it("can withdrawxFund", async function () {
    await this.MockTokenContract.transfer(this.DemoConsumer.address, 100000000, { from: admin })
    await this.DemoConsumer.withdrawxFund(dataConsumerOwner, 100000000, { from: dataConsumerOwner })
  })

  it("can getData and receiveData", async function () {
    await this.DemoConsumer.increaseRouterAllowance(100000000, { from: dataConsumerOwner })

    const requestId = generateRequestId(
      this.DemoConsumer.address,
      dataProvider,
      this.RouterContract.address,
      new BN(0),
      endpoint,
    )

    // request
    await this.DemoConsumer.getData(endpoint, {
      from: dataConsumerOwner,
    })

    // fulfill
    const msg = generateSigMsg(requestId, priceToSend, this.DemoConsumer.address)
    const sig = await web3.eth.accounts.sign(msg, dataProviderPk)
    const receipt = await this.RouterContract.fulfillRequest(requestId, priceToSend, sig.signature, {
      from: dataProvider,
    })

    expectEvent.inTransaction(receipt.tx, this.DemoConsumer, "PriceDiff", {
      requestId,
      oldPrice: new BN(0),
      newPrice: new BN(priceToSend),
      diff: new BN(priceToSend),
    })

    const price = await this.DemoConsumer.price()

    expect(price).to.be.bignumber.equal(new BN(priceToSend))
  })
})
