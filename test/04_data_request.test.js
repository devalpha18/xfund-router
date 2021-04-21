const {
  BN, // Big Number support
  expectRevert,
  expectEvent,
} = require("@openzeppelin/test-helpers")

const { expect } = require("chai")

const { generateRequestId } = require("./helpers/utils")

const MockToken = artifacts.require("MockToken") // Loads a compiled contract
const Router = artifacts.require("Router") // Loads a compiled contract
const MockConsumer = artifacts.require("MockConsumer") // Loads a compiled contract

contract("Router - data request tests", (accounts) => {
  const [admin, dataProvider, dataConsumerOwner] = accounts

  const decimals = 9
  const initSupply = 1000 * 10 ** decimals
  const defaultFee = 100
  const endpoint = web3.utils.asciiToHex("PRICE.BTC.USD.AVG")

  // deploy contracts before every test
  beforeEach(async function () {
    // admin deploy Token contract
    this.MockTokenContract = await MockToken.new("MockToken", "MockToken", initSupply, decimals, {
      from: admin,
    })

    // admin deploy Router contract
    this.RouterContract = await Router.new(this.MockTokenContract.address, { from: admin })

    // deploy mock consumer
    this.MockConsumerContract = await MockConsumer.new(
      this.RouterContract.address,
      this.MockTokenContract.address,
      {
        from: dataConsumerOwner,
      },
    )
  })

  describe("should succeed", function () {
    it("requestData - can request data", async function () {
      // register provider on router
      await this.RouterContract.registerAsProvider(defaultFee, { from: dataProvider })
      // send xFUND to consumer contract
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, defaultFee, { from: admin })
      // increase router allowance
      await this.MockConsumerContract.increaseRouterAllowance(defaultFee, { from: dataConsumerOwner })

      // run
      await this.MockConsumerContract.getData(dataProvider, defaultFee, endpoint, { from: dataConsumerOwner })
    })

    it("requestData - router emits DataRequested event", async function () {
      // register provider on router
      await this.RouterContract.registerAsProvider(defaultFee, { from: dataProvider })
      // send xFUND to consumer contract
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, defaultFee, { from: admin })
      // increase router allowance
      await this.MockConsumerContract.increaseRouterAllowance(defaultFee, { from: dataConsumerOwner })

      const requestId = generateRequestId(
        this.MockConsumerContract.address,
        dataProvider,
        this.RouterContract.address,
        new BN(0),
        endpoint,
      )
      // run
      const receipt = await this.MockConsumerContract.getData(dataProvider, defaultFee, endpoint, {
        from: dataConsumerOwner,
      })

      expectEvent.inTransaction(receipt.tx, this.RouterContract, "DataRequested", {
        consumer: this.MockConsumerContract.address,
        provider: dataProvider,
        fee: new BN(defaultFee),
        data: `${endpoint}000000000000000000000000000000`,
        requestId,
      })
    })
  })

  describe("getters", function () {
    it("getDataRequestConsumer - should return correct consumer address", async function () {
      // register provider on router
      await this.RouterContract.registerAsProvider(defaultFee, { from: dataProvider })
      // send xFUND to consumer contract
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, defaultFee, { from: admin })
      // increase router allowance
      await this.MockConsumerContract.increaseRouterAllowance(defaultFee, { from: dataConsumerOwner })

      const requestId = generateRequestId(
        this.MockConsumerContract.address,
        dataProvider,
        this.RouterContract.address,
        new BN(0),
        endpoint,
      )
      // run
      await this.MockConsumerContract.getData(dataProvider, defaultFee, endpoint, { from: dataConsumerOwner })

      expect(await this.RouterContract.getDataRequestConsumer(requestId)).to.be.equal(
        this.MockConsumerContract.address,
      )
    })

    it("getDataRequestProvider - should return correct provider address", async function () {
      // register provider on router
      await this.RouterContract.registerAsProvider(defaultFee, { from: dataProvider })
      // send xFUND to consumer contract
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, defaultFee, { from: admin })
      // increase router allowance
      await this.MockConsumerContract.increaseRouterAllowance(defaultFee, { from: dataConsumerOwner })

      const requestId = generateRequestId(
        this.MockConsumerContract.address,
        dataProvider,
        this.RouterContract.address,
        new BN(0),
        endpoint,
      )
      // run
      await this.MockConsumerContract.getData(dataProvider, defaultFee, endpoint, { from: dataConsumerOwner })

      expect(await this.RouterContract.getDataRequestProvider(requestId)).to.be.equal(dataProvider)
    })

    it("requestExists - should return true", async function () {
      // register provider on router
      await this.RouterContract.registerAsProvider(defaultFee, { from: dataProvider })
      // send xFUND to consumer contract
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, defaultFee, { from: admin })
      // increase router allowance
      await this.MockConsumerContract.increaseRouterAllowance(defaultFee, { from: dataConsumerOwner })

      const requestId = generateRequestId(
        this.MockConsumerContract.address,
        dataProvider,
        this.RouterContract.address,
        new BN(0),
        endpoint,
      )
      // run
      await this.MockConsumerContract.getData(dataProvider, defaultFee, endpoint, { from: dataConsumerOwner })

      expect(await this.RouterContract.requestExists(requestId)).to.be.equal(true)
    })

    it("requestExists - should return false", async function () {
      // register provider on router
      await this.RouterContract.registerAsProvider(defaultFee, { from: dataProvider })
      // send xFUND to consumer contract
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, defaultFee, { from: admin })
      // increase router allowance
      await this.MockConsumerContract.increaseRouterAllowance(defaultFee, { from: dataConsumerOwner })

      const requestId = generateRequestId(
        this.MockConsumerContract.address,
        dataProvider,
        this.RouterContract.address,
        new BN(0),
        endpoint,
      )

      expect(await this.RouterContract.requestExists(requestId)).to.be.equal(false)
    })

    it("getRequestStatus - should return 1", async function () {
      // register provider on router
      await this.RouterContract.registerAsProvider(defaultFee, { from: dataProvider })
      // send xFUND to consumer contract
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, defaultFee, { from: admin })
      // increase router allowance
      await this.MockConsumerContract.increaseRouterAllowance(defaultFee, { from: dataConsumerOwner })

      const requestId = generateRequestId(
        this.MockConsumerContract.address,
        dataProvider,
        this.RouterContract.address,
        new BN(0),
        endpoint,
      )
      // run
      await this.MockConsumerContract.getData(dataProvider, defaultFee, endpoint, { from: dataConsumerOwner })

      const status = await this.RouterContract.getRequestStatus(requestId)
      expect(status).to.be.bignumber.equal(new BN(1))
    })

    it("getRequestStatus - should return 0", async function () {
      // register provider on router
      await this.RouterContract.registerAsProvider(defaultFee, { from: dataProvider })
      // send xFUND to consumer contract
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, defaultFee, { from: admin })
      // increase router allowance
      await this.MockConsumerContract.increaseRouterAllowance(defaultFee, { from: dataConsumerOwner })

      const requestId = generateRequestId(
        this.MockConsumerContract.address,
        dataProvider,
        this.RouterContract.address,
        new BN(0),
        endpoint,
      )

      const status = await this.RouterContract.getRequestStatus(requestId)
      expect(status).to.be.bignumber.equal(new BN(0))
    })
  })

  describe("should fail", function () {
    it("initialiseRequest - fee must not be zero", async function () {
      await expectRevert(
        this.MockConsumerContract.getData(dataProvider, 0, endpoint, { from: dataConsumerOwner }),
        "fee cannot be zero",
      )
    })

    it("initialiseRequest - fee must correct", async function () {
      await this.RouterContract.registerAsProvider(defaultFee, { from: dataProvider })
      await expectRevert(
        this.MockConsumerContract.getData(dataProvider, 1, endpoint, { from: dataConsumerOwner }),
        "below agreed min fee",
      )
    })

    it("initialiseRequest - granular fee must correct", async function () {
      const newFee = 200
      await this.RouterContract.registerAsProvider(defaultFee, { from: dataProvider })
      await this.RouterContract.setProviderGranularFee(this.MockConsumerContract.address, newFee, {
        from: dataProvider,
      })
      await expectRevert(
        this.MockConsumerContract.getData(dataProvider, 1, endpoint, { from: dataConsumerOwner }),
        "below agreed granular fee",
      )
    })

    it("initialiseRequest - only a contract can initialise", async function () {
      // directly call Router function using dataConsumerOwner EOA wallet address
      await expectRevert(
        this.RouterContract.initialiseRequest(dataProvider, 1, endpoint, { from: dataConsumerOwner }),
        "only a contract can initialise",
      )
    })

    it("initialiseRequest - provider not registered", async function () {
      await expectRevert(
        this.MockConsumerContract.getData(dataProvider, 1, endpoint, { from: dataConsumerOwner }),
        "provider not registered",
      )
    })

    it("initialiseRequest - insufficient xFUND balance", async function () {
      // register provider on router
      await this.RouterContract.registerAsProvider(defaultFee, { from: dataProvider })
      await expectRevert(
        this.MockConsumerContract.getData(dataProvider, defaultFee, endpoint, { from: dataConsumerOwner }),
        "ERC20: transfer amount exceeds balance",
      )
    })

    it("initialiseRequest - insufficient Router allowance", async function () {
      // register provider on router
      await this.RouterContract.registerAsProvider(defaultFee, { from: dataProvider })
      // send xFUND to consumer contract
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, defaultFee, { from: admin })
      await expectRevert(
        this.MockConsumerContract.getData(dataProvider, defaultFee, endpoint, { from: dataConsumerOwner }),
        "ERC20: transfer amount exceeds allowance",
      )
    })
  })
})
