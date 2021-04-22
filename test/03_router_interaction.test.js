const {
  BN, // Big Number support
  constants,
  expectRevert,
  expectEvent,
} = require("@openzeppelin/test-helpers")

const { expect } = require("chai")

const MockToken = artifacts.require("MockToken") // Loads a compiled contract
const Router = artifacts.require("Router") // Loads a compiled contract

contract("Router - direct interaction tests", (accounts) => {
  const [admin, dataProvider, dataConsumerOwner] = accounts

  const decimals = 9
  const initSupply = 1000 * 10 ** decimals
  const defaultFee = 100

  // deploy contracts before every test
  beforeEach(async function () {
    // admin deploy Token contract
    this.MockTokenContract = await MockToken.new("MockToken", "MockToken", initSupply, decimals, {
      from: admin,
    })

    // admin deploy Router contract
    this.RouterContract = await Router.new(this.MockTokenContract.address, { from: admin })
  })

  describe("should succeed", function () {
    describe("setters", function () {
      it("registerAsProvider - can register new provider", async function () {
        await this.RouterContract.registerAsProvider(defaultFee, { from: dataProvider })
        expect(await this.RouterContract.getProviderMinFee(dataProvider)).to.be.bignumber.equal(
          new BN(defaultFee),
        )
      })

      it("registerAsProvider - emits ProviderRegistered event", async function () {
        const receipt = await this.RouterContract.registerAsProvider(defaultFee, { from: dataProvider })

        expectEvent(receipt, "ProviderRegistered", {
          provider: dataProvider,
          minFee: new BN(defaultFee),
        })
      })

      it("setProviderMinFee - can set", async function () {
        const newFee = 200
        await this.RouterContract.registerAsProvider(defaultFee, { from: dataProvider })
        await this.RouterContract.setProviderMinFee(newFee, { from: dataProvider })
        expect(await this.RouterContract.getProviderMinFee(dataProvider)).to.be.bignumber.equal(
          new BN(newFee),
        )
      })

      it("setProviderMinFee - emits SetProviderMinFee event", async function () {
        const newFee = 200
        await this.RouterContract.registerAsProvider(defaultFee, { from: dataProvider })

        const receipt = await this.RouterContract.setProviderMinFee(newFee, { from: dataProvider })

        expectEvent(receipt, "SetProviderMinFee", {
          provider: dataProvider,
          oldMinFee: new BN(defaultFee),
          newMinFee: new BN(newFee),
        })
      })

      it("setProviderGranularFee - can set", async function () {
        const newFee = 200
        await this.RouterContract.registerAsProvider(defaultFee, { from: dataProvider })
        await this.RouterContract.setProviderGranularFee(dataConsumerOwner, newFee, { from: dataProvider })
        expect(
          await this.RouterContract.getProviderGranularFee(dataProvider, dataConsumerOwner),
        ).to.be.bignumber.equal(new BN(newFee))
      })

      it("setProviderGranularFee - emits SetProviderGranularFee event", async function () {
        const newFee = 200
        await this.RouterContract.registerAsProvider(defaultFee, { from: dataProvider })

        const receipt = await this.RouterContract.setProviderGranularFee(dataConsumerOwner, newFee, {
          from: dataProvider,
        })

        expectEvent(receipt, "SetProviderGranularFee", {
          provider: dataProvider,
          consumer: dataConsumerOwner,
          oldFee: new BN(0),
          newFee: new BN(newFee),
        })
      })
    })

    describe("getters", function () {
      it("getToken - returns expected address", async function () {
        const mockToken = await MockToken.new("MockToken", "MockToken", initSupply, decimals, { from: admin })
        const mockRouter = await Router.new(mockToken.address, { from: admin })

        const storedAddress = await mockRouter.getTokenAddress()
        expect(storedAddress).to.equal(mockToken.address)
      })

      it("getProviderMinFee - returns expected minFee", async function () {
        await this.RouterContract.registerAsProvider(defaultFee, { from: dataProvider })
        expect(await this.RouterContract.getProviderMinFee(dataProvider)).to.be.bignumber.equal(
          new BN(defaultFee),
        )
      })

      it("getProviderGranularFee - returns global minFee when not set", async function () {
        await this.RouterContract.registerAsProvider(defaultFee, { from: dataProvider })
        expect(
          await this.RouterContract.getProviderGranularFee(dataProvider, dataConsumerOwner),
        ).to.be.bignumber.equal(new BN(defaultFee))
      })

      it("getProviderGranularFee - returns expected fee when set", async function () {
        const newFee = 200
        await this.RouterContract.registerAsProvider(defaultFee, { from: dataProvider })
        await this.RouterContract.setProviderGranularFee(dataConsumerOwner, newFee, { from: dataProvider })
        expect(
          await this.RouterContract.getProviderGranularFee(dataProvider, dataConsumerOwner),
        ).to.be.bignumber.equal(new BN(newFee))
      })
    })
  })

  describe("should fail", function () {
    describe("setters", function () {
      it("registerAsProvider - reverts: cannot register with zero fee", async function () {
        await expectRevert(
          this.RouterContract.registerAsProvider(0, { from: dataProvider }),
          "fee must be > 0",
        )
      })

      it("registerAsProvider - reverts: cannot register more than once", async function () {
        await this.RouterContract.registerAsProvider(defaultFee, { from: dataProvider })
        await expectRevert(
          this.RouterContract.registerAsProvider(defaultFee, { from: dataProvider }),
          "already registered",
        )
      })

      it("setProviderMinFee - reverts: fee must not be zero", async function () {
        await expectRevert(
          this.RouterContract.setProviderMinFee(0, { from: dataProvider }),
          "fee must be > 0",
        )
      })

      it("setProviderMinFee - reverts: provider must be registered", async function () {
        await expectRevert(
          this.RouterContract.setProviderMinFee(defaultFee, { from: dataProvider }),
          "not registered yet",
        )
      })

      it("setProviderGranularFee - reverts: fee must not be zero", async function () {
        await expectRevert(
          this.RouterContract.setProviderGranularFee(dataConsumerOwner, 0, { from: dataProvider }),
          "fee must be > 0",
        )
      })

      it("setProviderGranularFee - reverts: provider must be registered", async function () {
        await expectRevert(
          this.RouterContract.setProviderGranularFee(dataConsumerOwner, defaultFee, { from: dataProvider }),
          "not registered yet",
        )
      })
    })
  })
})