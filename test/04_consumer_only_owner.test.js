const {
  BN, // Big Number support
  constants,
  expectRevert,
  expectEvent,
} = require("@openzeppelin/test-helpers")

const { expect } = require("chai")

const MockToken = artifacts.require("MockToken") // Loads a compiled contract
const Router = artifacts.require("Router") // Loads a compiled contract
const MockConsumer = artifacts.require("MockConsumer") // Loads a compiled contract
const ConsumerLib = artifacts.require("ConsumerLib") // Loads a compiled contract

const REQUEST_VAR_GAS_PRICE_LIMIT = 1 // gas price limit in gwei the consumer is willing to pay for data processing
const REQUEST_VAR_TOP_UP_LIMIT = 2 // max ETH that can be sent in a gas top up Tx
const REQUEST_VAR_REQUEST_TIMEOUT = 3 // request timeout in seconds

contract("Consumer - only owner function tests", (accounts) => {
  const [admin, dataConsumerOwner, dataProvider, rando, eoa] = accounts
  const decimals = 9
  const initSupply = 1000 * 10 ** decimals

  beforeEach(async function () {
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

    // dataConsumerOwner deploy Consumer contract
    this.MockConsumerContract = await MockConsumer.new(this.RouterContract.address, {
      from: dataConsumerOwner,
    })
  })

  /*
   * Withdraw Token tests
   */
  describe("token withdraw", function () {
    it("owner can withdrawAllTokens - WithdrawTokensFromContract event emitted", async function () {
      const initialAmount = 1000
      const amountForContract = 100
      // Admin Transfer Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer(dataConsumerOwner, initialAmount, { from: admin })
      // dataConsumerOwner Transfer Tokens to MockConsumerContract
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, amountForContract, {
        from: dataConsumerOwner,
      })

      const receipt = await this.MockConsumerContract.withdrawAllTokens({ from: dataConsumerOwner })

      expectEvent(receipt, "WithdrawTokensFromContract", {
        sender: dataConsumerOwner,
        from: this.MockConsumerContract.address,
        to: dataConsumerOwner,
        amount: new BN(amountForContract),
      })
    })

    it("owner can withdrawAllTokens - ERC20 Transfer event emitted", async function () {
      const initialAmount = 1000
      const amountForContract = 100
      // Admin Transfer Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer(dataConsumerOwner, initialAmount, { from: admin })
      // dataConsumerOwner Transfer Tokens to MockConsumerContract
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, amountForContract, {
        from: dataConsumerOwner,
      })

      const receipt = await this.MockConsumerContract.withdrawAllTokens({ from: dataConsumerOwner })

      expectEvent(receipt, "Transfer", {
        from: this.MockConsumerContract.address,
        to: dataConsumerOwner,
        value: new BN(amountForContract),
      })
    })

    it("owner can withdrawAllTokens - owner balance is 1000, contract balance is zero", async function () {
      const initialAmount = 1000
      const amountForContract = 100
      const expectedAmount = 1000
      const expectedAmountForContract = 0
      // Admin Transfer Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer(dataConsumerOwner, initialAmount, { from: admin })
      // dataConsumerOwner Transfer Tokens to MockConsumerContract
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, amountForContract, {
        from: dataConsumerOwner,
      })

      // withdraw all tokens from contract to owner
      await this.MockConsumerContract.withdrawAllTokens({ from: dataConsumerOwner })

      // dataConsumerOwner should have 1000 tokens again, and Consumer contract should have zero
      const dcBalance = await this.MockTokenContract.balanceOf(dataConsumerOwner)
      const contractBalance = await this.MockTokenContract.balanceOf(this.MockConsumerContract.address)
      expect(dcBalance.toNumber()).to.equal(expectedAmount)
      expect(contractBalance.toNumber()).to.equal(expectedAmountForContract)
    })

    it("only owner can withdrawAllTokens - should revert with error", async function () {
      const initialAmount = 1000
      const amountForContract = 100
      // Admin Transfer 10 Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer(dataConsumerOwner, initialAmount, { from: admin })
      // dataConsumerOwner Transfer 1 Tokens to MockConsumerContract
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, amountForContract, {
        from: dataConsumerOwner,
      })

      await expectRevert(
        this.MockConsumerContract.withdrawAllTokens({ from: rando }),
        "ConsumerLib: only owner",
      )
    })

    it("only owner can withdrawAllTokens - owner balance should still be 900, and contract 100", async function () {
      const initialAmount = 1000
      const amountForContract = 100
      const expectedAmount = 900
      const expectedAmountForContract = 100
      // Admin Transfer 10 Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer(dataConsumerOwner, initialAmount, { from: admin })
      // dataConsumerOwner Transfer 1 Tokens to MockConsumerContract
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, amountForContract, {
        from: dataConsumerOwner,
      })

      await expectRevert(
        this.MockConsumerContract.withdrawAllTokens({ from: rando }),
        "ConsumerLib: only owner",
      )

      // dataConsumerOwner should have 900 tokens again, and Consumer contract should have 100
      const dcBalance = await this.MockTokenContract.balanceOf(dataConsumerOwner)
      const contractBalance = await this.MockTokenContract.balanceOf(this.MockConsumerContract.address)
      expect(dcBalance.toNumber()).to.equal(expectedAmount)
      expect(contractBalance.toNumber()).to.equal(expectedAmountForContract)
    })
  })

  /*
   * Router allowance tests
   */
  describe("router allowance", function () {
    it("owner can increase router allowance - initial allowance should be zero", async function () {
      // should initially be zero
      const routerAllowanceBefore = await this.MockTokenContract.allowance(
        this.MockConsumerContract.address,
        this.RouterContract.address,
      )
      expect(routerAllowanceBefore.toNumber()).to.equal(0)
    })

    it("owner can increase router allowance - should emit IncreasedRouterAllowance event", async function () {
      const initialAmount = 1000
      const amountForContract = 100
      const allowance = 100

      // Admin Transfer Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer(dataConsumerOwner, initialAmount, { from: admin })
      // dataConsumerOwner Transfer Tokens to MockConsumerContract
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, amountForContract, {
        from: dataConsumerOwner,
      })

      const receipt = await this.MockConsumerContract.setRouterAllowance(allowance, true, {
        from: dataConsumerOwner,
      })

      expectEvent(receipt, "IncreasedRouterAllowance", {
        sender: dataConsumerOwner,
        router: this.RouterContract.address,
        contractAddress: this.MockConsumerContract.address,
        amount: new BN(allowance),
      })
    })

    it("owner can increase router allowance - should emit ERC20 Approval event", async function () {
      const initialAmount = 1000
      const amountForContract = 100
      const allowance = 100

      // Admin Transfer Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer(dataConsumerOwner, initialAmount, { from: admin })
      // dataConsumerOwner Transfer Tokens to MockConsumerContract
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, amountForContract, {
        from: dataConsumerOwner,
      })

      const receipt = await this.MockConsumerContract.setRouterAllowance(allowance, true, {
        from: dataConsumerOwner,
      })

      expectEvent(receipt, "Approval", {
        owner: this.MockConsumerContract.address,
        spender: this.RouterContract.address,
        value: new BN(allowance),
      })
    })

    it("owner can increase router allowance - router should have allowance of 100", async function () {
      const initialAmount = 1000
      const amountForContract = 100
      const allowance = 100
      const expectedAllowance = 100

      // Admin Transfer Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer(dataConsumerOwner, initialAmount, { from: admin })
      // dataConsumerOwner Transfer Tokens to MockConsumerContract
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, amountForContract, {
        from: dataConsumerOwner,
      })

      await this.MockConsumerContract.setRouterAllowance(allowance, true, { from: dataConsumerOwner })

      // router should have an allowance of 100
      const routerAllowanceAfter = await this.MockTokenContract.allowance(
        this.MockConsumerContract.address,
        this.RouterContract.address,
      )
      expect(routerAllowanceAfter.toNumber()).to.equal(expectedAllowance)
    })

    it("only owner can increase router allowance - should revert with error", async function () {
      const initialAmount = 1000
      const amountForContract = 100
      const allowance = 100

      // Admin Transfer Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer(dataConsumerOwner, initialAmount, { from: admin })
      // dataConsumerOwner Transfer Tokens to MockConsumerContract
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, amountForContract, {
        from: dataConsumerOwner,
      })

      await expectRevert(
        this.MockConsumerContract.setRouterAllowance(allowance, true, { from: rando }),
        "ConsumerLib: only owner",
      )
    })

    it("only owner can increase router allowance - allowance should remain zero", async function () {
      const initialAmount = 1000
      const amountForContract = 100
      const allowance = 100
      const expectedAllowance = 0

      // Admin Transfer Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer(dataConsumerOwner, initialAmount, { from: admin })
      // dataConsumerOwner Transfer Tokens to MockConsumerContract
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, amountForContract, {
        from: dataConsumerOwner,
      })

      await expectRevert(
        this.MockConsumerContract.setRouterAllowance(allowance, true, { from: rando }),
        "ConsumerLib: only owner",
      )

      // router should have an allowance of zero
      const routerAllowanceAfter = await this.MockTokenContract.allowance(
        this.MockConsumerContract.address,
        this.RouterContract.address,
      )
      expect(routerAllowanceAfter.toNumber()).to.equal(expectedAllowance)
    })

    it("owner can decrease router allowance - should emit DecreasedRouterAllowance event", async function () {
      const initialAmount = 1000
      const amountForContract = 100
      const allowance = 100
      const decrease = 20

      // Admin Transfer Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer(dataConsumerOwner, initialAmount, { from: admin })
      // dataConsumerOwner Transfer Tokens to MockConsumerContract
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, amountForContract, {
        from: dataConsumerOwner,
      })

      await this.MockConsumerContract.setRouterAllowance(allowance, true, { from: dataConsumerOwner })

      const receipt = await this.MockConsumerContract.setRouterAllowance(decrease, false, {
        from: dataConsumerOwner,
      })

      expectEvent(receipt, "DecreasedRouterAllowance", {
        sender: dataConsumerOwner,
        router: this.RouterContract.address,
        contractAddress: this.MockConsumerContract.address,
        amount: new BN(decrease),
      })
    })

    it("owner can decrease router allowance - should emit ERC20 Approval event", async function () {
      const initialAmount = 1000
      const amountForContract = 100
      const allowance = 100
      const decrease = 20
      const newApproved = 80

      // Admin Transfer Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer(dataConsumerOwner, initialAmount, { from: admin })
      // dataConsumerOwner Transfer Tokens to MockConsumerContract
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, amountForContract, {
        from: dataConsumerOwner,
      })

      await this.MockConsumerContract.setRouterAllowance(allowance, true, { from: dataConsumerOwner })

      const receipt = await this.MockConsumerContract.setRouterAllowance(decrease, false, {
        from: dataConsumerOwner,
      })

      expectEvent(receipt, "Approval", {
        owner: this.MockConsumerContract.address,
        spender: this.RouterContract.address,
        value: new BN(newApproved),
      })
    })

    it("owner can decrease router allowance - router allowance should be reduced to 80", async function () {
      const initialAmount = 1000
      const amountForContract = 100
      const allowance = 100
      const decrease = 20
      const expectedAllowance = 80

      // Admin Transfer Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer(dataConsumerOwner, initialAmount, { from: admin })
      // dataConsumerOwner Transfer Tokens to MockConsumerContract
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, amountForContract, {
        from: dataConsumerOwner,
      })

      await this.MockConsumerContract.setRouterAllowance(allowance, true, { from: dataConsumerOwner })

      await this.MockConsumerContract.setRouterAllowance(decrease, false, { from: dataConsumerOwner })

      // router should have an allowance of 80
      const routerAllowanceAfter = await this.MockTokenContract.allowance(
        this.MockConsumerContract.address,
        this.RouterContract.address,
      )
      expect(routerAllowanceAfter.toNumber()).to.equal(expectedAllowance)
    })

    it("only owner can decrease router allowance - should revert with error", async function () {
      const initialAmount = 1000
      const amountForContract = 100
      const allowance = 100
      const decrease = 20
      const expectedAllowance = 100

      // Admin Transfer Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer(dataConsumerOwner, initialAmount, { from: admin })
      // dataConsumerOwner Transfer Tokens to MockConsumerContract
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, amountForContract, {
        from: dataConsumerOwner,
      })

      await this.MockConsumerContract.setRouterAllowance(allowance, true, { from: dataConsumerOwner })

      await expectRevert(
        this.MockConsumerContract.setRouterAllowance(decrease, false, { from: rando }),
        "ConsumerLib: only owner",
      )
    })

    it("only owner can decrease router allowance - allowance should remain 100", async function () {
      const initialAmount = 1000
      const amountForContract = 100
      const allowance = 100
      const decrease = 20
      const expectedAllowance = 100

      // Admin Transfer Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer(dataConsumerOwner, initialAmount, { from: admin })
      // dataConsumerOwner Transfer Tokens to MockConsumerContract
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, amountForContract, {
        from: dataConsumerOwner,
      })

      await this.MockConsumerContract.setRouterAllowance(allowance, true, { from: dataConsumerOwner })

      await expectRevert(
        this.MockConsumerContract.setRouterAllowance(decrease, false, { from: rando }),
        "ConsumerLib: only owner",
      )

      // router should still have an allowance of 100
      const routerAllowanceAfter = await this.MockTokenContract.allowance(
        this.MockConsumerContract.address,
        this.RouterContract.address,
      )
      expect(routerAllowanceAfter.toNumber()).to.equal(expectedAllowance)
    })
  })

  /*
   * Data provider tests
   */
  describe("data providers", function () {
    beforeEach(async function () {
      await this.RouterContract.registerAsProvider(100, false, { from: dataProvider })
    })

    it("owner can add a data provider - emits AddedDataProvider event", async function () {
      const fee = 100

      const receipt = await this.MockConsumerContract.addRemoveDataProvider(dataProvider, fee, false, {
        from: dataConsumerOwner,
      })

      expectEvent(receipt, "AddedDataProvider", {
        sender: dataConsumerOwner,
        provider: dataProvider,
        oldFee: new BN("0"),
        newFee: new BN(fee),
      })
    })

    it("owner can add a data provider - emits Router GrantProviderPermission event", async function () {
      const fee = 100

      const receipt = await this.MockConsumerContract.addRemoveDataProvider(dataProvider, fee, false, {
        from: dataConsumerOwner,
      })

      expectEvent(receipt, "GrantProviderPermission", {
        dataConsumer: this.MockConsumerContract.address,
        dataProvider,
      })
    })

    it("owner can add a data provider - dataProvider is authorised for this contract on Router", async function () {
      const fee = 100

      await this.MockConsumerContract.addRemoveDataProvider(dataProvider, fee, false, {
        from: dataConsumerOwner,
      })

      // dataProvider should now be authorised on Router for this contract
      expect(
        await this.RouterContract.providerIsAuthorised(this.MockConsumerContract.address, dataProvider),
      ).to.equal(true)
    })

    it("only owner can add a data provider - should revert with error", async function () {
      const fee = 100

      await expectRevert(
        this.MockConsumerContract.addRemoveDataProvider(dataProvider, fee, false, { from: rando }),
        "ConsumerLib: only owner",
      )
    })

    it("only owner can add a data provider - dataProvider should not be authorised on Router", async function () {
      const fee = 100

      await expectRevert(
        this.MockConsumerContract.addRemoveDataProvider(dataProvider, fee, false, { from: rando }),
        "ConsumerLib: only owner",
      )

      // dataProvider should now be authorised on Router for this contract
      expect(
        await this.RouterContract.providerIsAuthorised(this.MockConsumerContract.address, dataProvider),
      ).to.equal(false)
    })

    it("addRemoveDataProvider - data provider must not be a zero address", async function () {
      const fee = 100

      await expectRevert(
        this.MockConsumerContract.addRemoveDataProvider(constants.ZERO_ADDRESS, fee, false, {
          from: dataConsumerOwner,
        }),
        "ConsumerLib: dataProvider cannot be the zero address",
      )
    })

    it("addRemoveDataProvider - initial fee must be > 0", async function () {
      await expectRevert(
        this.MockConsumerContract.addRemoveDataProvider(dataProvider, 0, false, { from: dataConsumerOwner }),
        "ConsumerLib: fee must be > 0",
      )
    })

    it("addRemoveDataProvider - must be a registered provider on the Router", async function () {
      await expectRevert(
        this.MockConsumerContract.addRemoveDataProvider(rando, 100, false, { from: dataConsumerOwner }),
        "Router: provider not registered",
      )
    })

    it("addRemoveDataProvider - can add, remove, then authorise with fee = 0 - oldFee and newFee match in event", async function () {
      const fee = 100

      // add the dataProvider
      await this.MockConsumerContract.addRemoveDataProvider(dataProvider, fee, false, {
        from: dataConsumerOwner,
      })
      await this.MockConsumerContract.addRemoveDataProvider(dataProvider, 0, true, {
        from: dataConsumerOwner,
      })

      const receipt = await this.MockConsumerContract.addRemoveDataProvider(dataProvider, 0, false, {
        from: dataConsumerOwner,
      })

      expectEvent(receipt, "AddedDataProvider", {
        sender: dataConsumerOwner,
        provider: dataProvider,
        oldFee: new BN(fee),
        newFee: new BN(fee),
      })
    })

    it("addRemoveDataProvider - can add, remove, then authorise with fee = 0 - fee remains unchanged", async function () {
      const fee = 100

      // add the dataProvider
      await this.MockConsumerContract.addRemoveDataProvider(dataProvider, fee, false, {
        from: dataConsumerOwner,
      })
      await this.MockConsumerContract.addRemoveDataProvider(dataProvider, 0, true, {
        from: dataConsumerOwner,
      })

      await this.MockConsumerContract.addRemoveDataProvider(dataProvider, 0, false, {
        from: dataConsumerOwner,
      })

      const f = await this.MockConsumerContract.getDataProviderFee(dataProvider)
      expect(f.toNumber()).to.equal(fee)
    })

    it("owner can remove a data provider - emits RemovedDataProvider event", async function () {
      const fee = 100

      // add the dataProvider
      await this.MockConsumerContract.addRemoveDataProvider(dataProvider, fee, false, {
        from: dataConsumerOwner,
      })

      const receipt = await this.MockConsumerContract.addRemoveDataProvider(dataProvider, 0, true, {
        from: dataConsumerOwner,
      })

      expectEvent(receipt, "RemovedDataProvider", {
        sender: dataConsumerOwner,
        provider: dataProvider,
      })
    })

    it("owner can remove a data provider - Router emits RevokeProviderPermission event", async function () {
      const fee = 100

      // add the dataProvider
      await this.MockConsumerContract.addRemoveDataProvider(dataProvider, fee, false, {
        from: dataConsumerOwner,
      })

      const receipt = await this.MockConsumerContract.addRemoveDataProvider(dataProvider, 0, true, {
        from: dataConsumerOwner,
      })

      expectEvent(receipt, "RevokeProviderPermission", {
        dataConsumer: this.MockConsumerContract.address,
        dataProvider,
      })
    })

    it("owner can remove a data provider - dataProvider no longer authorised for this contract in Router", async function () {
      const fee = 100

      // add the dataProvider
      await this.MockConsumerContract.addRemoveDataProvider(dataProvider, fee, false, {
        from: dataConsumerOwner,
      })
      // dataProvider should be authorised in Router
      expect(
        await this.RouterContract.providerIsAuthorised(this.MockConsumerContract.address, dataProvider),
      ).to.equal(true)

      await this.MockConsumerContract.addRemoveDataProvider(dataProvider, 0, true, {
        from: dataConsumerOwner,
      })

      // dataProvider should no longer be authorised in Router
      expect(
        await this.RouterContract.providerIsAuthorised(this.MockConsumerContract.address, dataProvider),
      ).to.equal(false)
    })

    it("only owner can remove a data provider - expect revert with error", async function () {
      const fee = 100

      // add the dataProvider
      await this.MockConsumerContract.addRemoveDataProvider(dataProvider, fee, false, {
        from: dataConsumerOwner,
      })

      await expectRevert(
        this.MockConsumerContract.addRemoveDataProvider(dataProvider, 0, true, { from: rando }),
        "ConsumerLib: only owner",
      )
    })

    it("only owner can remove a data provider - dataProvider should still be authorised in Router", async function () {
      const fee = 100

      // add the dataProvider
      await this.MockConsumerContract.addRemoveDataProvider(dataProvider, fee, false, {
        from: dataConsumerOwner,
      })

      await expectRevert(
        this.MockConsumerContract.addRemoveDataProvider(dataProvider, 0, true, { from: rando }),
        "ConsumerLib: only owner",
      )

      // dataProvider should still be authorised in Router
      expect(
        await this.RouterContract.providerIsAuthorised(this.MockConsumerContract.address, dataProvider),
      ).to.equal(true)
    })

    it("cannot remove non existent data provider", async function () {
      await expectRevert(
        this.MockConsumerContract.addRemoveDataProvider(dataProvider, 0, true, { from: dataConsumerOwner }),
        "ConsumerLib: _dataProvider is not authorised",
      )

      expect(
        await this.RouterContract.providerIsAuthorised(this.MockConsumerContract.address, dataProvider),
      ).to.equal(false)
    })

    it("owner can set data provider fee - emits AddedDataProvider event", async function () {
      const fee = 100
      const newFee = 200

      // add the dataProvider
      await this.MockConsumerContract.addRemoveDataProvider(dataProvider, fee, false, {
        from: dataConsumerOwner,
      })
      const f1 = await this.MockConsumerContract.getDataProviderFee(dataProvider)
      expect(f1.toNumber()).to.equal(fee)

      // update
      const receipt = await this.MockConsumerContract.addRemoveDataProvider(dataProvider, newFee, false, {
        from: dataConsumerOwner,
      })

      expectEvent(receipt, "AddedDataProvider", {
        sender: dataConsumerOwner,
        provider: dataProvider,
        oldFee: new BN(fee),
        newFee: new BN(newFee),
      })
    })

    it("owner can set data provider fee - fee increases from 100 to 200", async function () {
      const fee = 100
      const newFee = 200

      // add the dataProvider with fee of 100
      await this.MockConsumerContract.addRemoveDataProvider(dataProvider, fee, false, {
        from: dataConsumerOwner,
      })

      // set fee to 200
      await this.MockConsumerContract.addRemoveDataProvider(dataProvider, newFee, false, {
        from: dataConsumerOwner,
      })

      const f2 = await this.MockConsumerContract.getDataProviderFee(dataProvider)
      expect(f2.toNumber()).to.equal(newFee)
    })

    it("only owner can set data provider fee", async function () {
      const fee = 100
      const newFee = 200

      // add the dataProvider
      await this.MockConsumerContract.addRemoveDataProvider(dataProvider, fee, false, {
        from: dataConsumerOwner,
      })
      const f1 = await this.MockConsumerContract.getDataProviderFee(dataProvider)
      expect(f1.toNumber()).to.equal(fee)

      await expectRevert(
        this.MockConsumerContract.addRemoveDataProvider(dataProvider, newFee, false, { from: rando }),
        "ConsumerLib: only owner",
      )

      // should still be 100
      const f2 = await this.MockConsumerContract.getDataProviderFee(dataProvider)
      expect(f2.toNumber()).to.equal(fee)
    })

    it("addRemoveDataProvider - initial fee must be > 0", async function () {
      await expectRevert(
        this.MockConsumerContract.addRemoveDataProvider(dataProvider, 0, false, { from: dataConsumerOwner }),
        "ConsumerLib: fee must be > 0",
      )
    })
  })

  /*
   * Misc tests
   */
  describe("misc.", function () {
    it("owner can set gas price limit - emits SetRequestVar event", async function () {
      const newLimit = 80
      const receipt = await this.MockConsumerContract.setRequestVar(REQUEST_VAR_GAS_PRICE_LIMIT, newLimit, {
        from: dataConsumerOwner,
      })

      expectEvent(receipt, "SetRequestVar", {
        sender: dataConsumerOwner,
        oldValue: new BN(200),
        newValue: new BN(newLimit),
        variable: new BN(REQUEST_VAR_GAS_PRICE_LIMIT),
      })
    })

    it("owner can set gas price limit - limit reduced from 200 to 80", async function () {
      const newLimit = 80
      await this.MockConsumerContract.setRequestVar(REQUEST_VAR_GAS_PRICE_LIMIT, newLimit, {
        from: dataConsumerOwner,
      })

      const limit = await this.MockConsumerContract.getRequestVar(REQUEST_VAR_GAS_PRICE_LIMIT)
      expect(limit.toNumber()).to.equal(newLimit)
    })

    it("only owner can set gas price limit", async function () {
      const newLimit = 80
      await expectRevert(
        this.MockConsumerContract.setRequestVar(REQUEST_VAR_GAS_PRICE_LIMIT, newLimit, { from: rando }),
        "ConsumerLib: only owner",
      )

      // should still be the default 200
      const limit = await this.MockConsumerContract.getRequestVar(REQUEST_VAR_GAS_PRICE_LIMIT)
      expect(limit.toNumber()).to.equal(200)
    })

    it("new gas price limit must be > 0", async function () {
      await expectRevert(
        this.MockConsumerContract.setRequestVar(REQUEST_VAR_GAS_PRICE_LIMIT, 0, { from: dataConsumerOwner }),
        "ConsumerLib: _value must be > 0",
      )

      // should still be the default 200
      const limit = await this.MockConsumerContract.getRequestVar(REQUEST_VAR_GAS_PRICE_LIMIT)
      expect(limit.toNumber()).to.equal(200)
    })

    it("owner can set request timeout - emits SetRequestVar event", async function () {
      const newLimit = 500
      const receipt = await this.MockConsumerContract.setRequestVar(REQUEST_VAR_REQUEST_TIMEOUT, newLimit, {
        from: dataConsumerOwner,
      })

      expectEvent(receipt, "SetRequestVar", {
        sender: dataConsumerOwner,
        oldValue: new BN(300),
        newValue: new BN(newLimit),
        variable: new BN(REQUEST_VAR_REQUEST_TIMEOUT),
      })
    })

    it("owner can set request timeout - limit changed from 300 to 500", async function () {
      const newLimit = 500
      await this.MockConsumerContract.setRequestVar(REQUEST_VAR_REQUEST_TIMEOUT, newLimit, {
        from: dataConsumerOwner,
      })

      const limit = await this.MockConsumerContract.getRequestVar(REQUEST_VAR_REQUEST_TIMEOUT)
      expect(limit.toNumber()).to.equal(newLimit)
    })

    it("only owner can set request timeout", async function () {
      const newLimit = 500
      await expectRevert(
        this.MockConsumerContract.setRequestVar(REQUEST_VAR_REQUEST_TIMEOUT, newLimit, { from: rando }),
        "ConsumerLib: only owner",
      )

      // should still be the default 300
      const limit = await this.MockConsumerContract.getRequestVar(REQUEST_VAR_REQUEST_TIMEOUT)
      expect(limit.toNumber()).to.equal(300)
    })

    it("new request timeout must be > 0", async function () {
      await expectRevert(
        this.MockConsumerContract.setRequestVar(REQUEST_VAR_REQUEST_TIMEOUT, 0, { from: dataConsumerOwner }),
        "ConsumerLib: _value must be > 0",
      )

      // should still be the default 300
      const limit = await this.MockConsumerContract.getRequestVar(REQUEST_VAR_REQUEST_TIMEOUT)
      expect(limit.toNumber()).to.equal(300)
    })

    it("owner can set new router - emits RouterSet event", async function () {
      const newRouterContract = await Router.new(this.MockTokenContract.address, { from: admin })
      const receipt = await this.MockConsumerContract.setRouter(newRouterContract.address, {
        from: dataConsumerOwner,
      })

      expectEvent(receipt, "RouterSet", {
        sender: dataConsumerOwner,
        oldRouter: this.RouterContract.address,
        newRouter: newRouterContract.address,
      })
    })

    it("owner can set new router - new router contract address is correctly stored", async function () {
      const newRouterContract = await Router.new(this.MockTokenContract.address, { from: admin })
      await this.MockConsumerContract.setRouter(newRouterContract.address, { from: dataConsumerOwner })
      expect(await this.MockConsumerContract.getRouterAddress()).to.equal(newRouterContract.address)
    })

    it("only owner can set new router", async function () {
      const newRouterContract = await Router.new(this.MockTokenContract.address, { from: admin })

      await expectRevert(
        this.MockConsumerContract.setRouter(newRouterContract.address, { from: rando }),
        "ConsumerLib: only owner",
      )

      // should still be original router address
      expect(await this.MockConsumerContract.getRouterAddress()).to.equal(this.RouterContract.address)
    })

    it("router cannot be zero address", async function () {
      await expectRevert(
        this.MockConsumerContract.setRouter(constants.ZERO_ADDRESS, { from: dataConsumerOwner }),
        "ConsumerLib: router cannot be the zero address",
      )

      // should still be original router address
      expect(await this.MockConsumerContract.getRouterAddress()).to.equal(this.RouterContract.address)
    })

    it("router must be a contract", async function () {
      await expectRevert(
        this.MockConsumerContract.setRouter(eoa, { from: dataConsumerOwner }),
        "ConsumerLib: router address must be a contract",
      )

      // should still be original router address
      expect(await this.MockConsumerContract.getRouterAddress()).to.equal(this.RouterContract.address)
    })

    it("owner can set gas topup limit - emits SetRequestVar event", async function () {
      const newLimit = web3.utils.toWei("1", "ether")
      const receipt = await this.MockConsumerContract.setRequestVar(REQUEST_VAR_TOP_UP_LIMIT, newLimit, {
        from: dataConsumerOwner,
      })

      expectEvent(receipt, "SetRequestVar", {
        sender: dataConsumerOwner,
        oldValue: web3.utils.toWei("0.5", "ether"),
        newValue: newLimit,
        variable: new BN(REQUEST_VAR_TOP_UP_LIMIT),
      })
    })

    it("owner can set gas topup limit - increase to 1 eth", async function () {
      const newLimit = web3.utils.toWei("1", "ether")
      await this.MockConsumerContract.setRequestVar(REQUEST_VAR_TOP_UP_LIMIT, newLimit, {
        from: dataConsumerOwner,
      })

      const limit = await this.MockConsumerContract.getRequestVar(REQUEST_VAR_TOP_UP_LIMIT)
      expect(limit.toString()).to.equal(newLimit.toString())
    })

    it("only owner can set gas topup limit", async function () {
      const newLimit = web3.utils.toWei("1", "ether")
      const oldLimit = web3.utils.toWei("0.5", "ether")
      await expectRevert(
        this.MockConsumerContract.setRequestVar(REQUEST_VAR_TOP_UP_LIMIT, newLimit, { from: rando }),
        "ConsumerLib: only owner",
      )

      // should still be the default 200
      const limit = await this.MockConsumerContract.getRequestVar(REQUEST_VAR_TOP_UP_LIMIT)
      expect(limit.toString()).to.equal(oldLimit.toString())
    })

    it("new gas topup limit must be > 0", async function () {
      const oldLimit = web3.utils.toWei("0.5", "ether")
      await expectRevert(
        this.MockConsumerContract.setRequestVar(REQUEST_VAR_TOP_UP_LIMIT, 0, { from: dataConsumerOwner }),
        "ConsumerLib: _value must be > 0",
      )

      // should still be the default
      const limit = await this.MockConsumerContract.getRequestVar(REQUEST_VAR_TOP_UP_LIMIT)
      expect(limit.toString()).to.equal(oldLimit.toString())
    })

    it("new gas topup limit must be <= Router gas topup limit", async function () {
      const newLimit = web3.utils.toWei("1.5", "ether")
      const oldLimit = web3.utils.toWei("0.5", "ether")
      await expectRevert(
        this.MockConsumerContract.setRequestVar(REQUEST_VAR_TOP_UP_LIMIT, newLimit, {
          from: dataConsumerOwner,
        }),
        "ConsumerLib: _value must be <= Router gasTopUpLimit",
      )

      // should still be the default 200
      const limit = await this.MockConsumerContract.getRequestVar(REQUEST_VAR_TOP_UP_LIMIT)
      expect(limit.toString()).to.equal(oldLimit.toString())
    })
  })
})
