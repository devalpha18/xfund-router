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
const MockConsumer = artifacts.require("MockConsumer") // Loads a compiled contract

contract("Router - fulfillment & withdraw tests", (accounts) => {
  const [admin, dataProvider, dataConsumerOwner, rando, beneficiary] = accounts
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
    describe("fulfillRequest", function () {
      it("can fulfill request", async function () {
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

        // request
        await this.MockConsumerContract.getData(dataProvider, defaultFee, endpoint, {
          from: dataConsumerOwner,
        })

        // fulfill
        const msg = generateSigMsg(requestId, priceToSend, this.MockConsumerContract.address)
        const sig = await web3.eth.accounts.sign(msg, dataProviderPk)
        await this.RouterContract.fulfillRequest(requestId, priceToSend, sig.signature, {
          from: dataProvider,
        })
      })

      it("router emits RequestFulfilled event", async function () {
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
        await this.MockConsumerContract.getData(dataProvider, defaultFee, endpoint, {
          from: dataConsumerOwner,
        })

        // fulfill
        const msg = generateSigMsg(requestId, priceToSend, this.MockConsumerContract.address)
        const sig = await web3.eth.accounts.sign(msg, dataProviderPk)
        const receipt = await this.RouterContract.fulfillRequest(requestId, priceToSend, sig.signature, {
          from: dataProvider,
        })

        expectEvent.inTransaction(receipt.tx, this.RouterContract, "RequestFulfilled", {
          consumer: this.MockConsumerContract.address,
          provider: dataProvider,
          requestId,
          requestedData: new BN(priceToSend),
        })
      })

      it("provider tokens correctly credited", async function () {
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

        // request
        await this.MockConsumerContract.getData(dataProvider, defaultFee, endpoint, {
          from: dataConsumerOwner,
        })

        // fulfill
        const msg = generateSigMsg(requestId, priceToSend, this.MockConsumerContract.address)
        const sig = await web3.eth.accounts.sign(msg, dataProviderPk)
        await this.RouterContract.fulfillRequest(requestId, priceToSend, sig.signature, {
          from: dataProvider,
        })

        expect(await this.RouterContract.getWithdrawableTokens(dataProvider)).to.be.bignumber.equal(
          new BN(defaultFee),
        )
      })
    })

    describe("withdraw", function () {
      it("provider can withdraw tokens to own address", async function () {
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

        // request
        await this.MockConsumerContract.getData(dataProvider, defaultFee, endpoint, {
          from: dataConsumerOwner,
        })

        // fulfill
        const msg = generateSigMsg(requestId, priceToSend, this.MockConsumerContract.address)
        const sig = await web3.eth.accounts.sign(msg, dataProviderPk)
        await this.RouterContract.fulfillRequest(requestId, priceToSend, sig.signature, {
          from: dataProvider,
        })

        await this.RouterContract.withdraw(dataProvider, defaultFee, { from: dataProvider })

        expect(await this.MockTokenContract.balanceOf(dataProvider)).to.be.bignumber.equal(new BN(defaultFee))
      })

      it("provider can withdraw tokens to beneficiary address", async function () {
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

        // request
        await this.MockConsumerContract.getData(dataProvider, defaultFee, endpoint, {
          from: dataConsumerOwner,
        })

        // fulfill
        const msg = generateSigMsg(requestId, priceToSend, this.MockConsumerContract.address)
        const sig = await web3.eth.accounts.sign(msg, dataProviderPk)
        await this.RouterContract.fulfillRequest(requestId, priceToSend, sig.signature, {
          from: dataProvider,
        })

        await this.RouterContract.withdraw(beneficiary, defaultFee, { from: dataProvider })

        expect(await this.MockTokenContract.balanceOf(beneficiary)).to.be.bignumber.equal(new BN(defaultFee))
      })
    })
  })

  describe("should fail", function () {
    describe("fulfillRequest", function () {
      it("provider must be registered", async function () {
        const requestId = generateRequestId(
          this.MockConsumerContract.address,
          dataProvider,
          this.RouterContract.address,
          new BN(0),
          endpoint,
        )
        const msg = generateSigMsg(requestId, priceToSend, this.MockConsumerContract.address)
        const sig = await web3.eth.accounts.sign(msg, dataProviderPk)
        await expectRevert(
          this.RouterContract.fulfillRequest(requestId, priceToSend, sig.signature, { from: dataProvider }),
          "provider not registered",
        )
      })

      it("request must exist", async function () {
        // register provider on router
        await this.RouterContract.registerAsProvider(defaultFee, { from: dataProvider })

        const requestId = generateRequestId(
          this.MockConsumerContract.address,
          dataProvider,
          this.RouterContract.address,
          new BN(0),
          endpoint,
        )
        const msg = generateSigMsg(requestId, priceToSend, this.MockConsumerContract.address)
        const sig = await web3.eth.accounts.sign(msg, dataProviderPk)
        await expectRevert(
          this.RouterContract.fulfillRequest(requestId, priceToSend, sig.signature, { from: dataProvider }),
          "request does not exist",
        )
      })

      it("must come from requested provider", async function () {
        // register providers on router
        await this.RouterContract.registerAsProvider(defaultFee, { from: dataProvider })
        await this.RouterContract.registerAsProvider(defaultFee, { from: rando })
        // send xFUND to consumer contract
        await this.MockTokenContract.transfer(this.MockConsumerContract.address, defaultFee, { from: admin })
        // increase router allowance
        await this.MockConsumerContract.increaseRouterAllowance(defaultFee, { from: dataConsumerOwner })

        // request from dataProvider
        await this.MockConsumerContract.getData(dataProvider, defaultFee, endpoint, {
          from: dataConsumerOwner,
        })
        const requestId = generateRequestId(
          this.MockConsumerContract.address,
          dataProvider,
          this.RouterContract.address,
          new BN(0),
          endpoint,
        )

        const msg = generateSigMsg(requestId, priceToSend, this.MockConsumerContract.address)
        // rando signs & sends
        const sig = await web3.eth.accounts.sign(msg, randoPk)
        await expectRevert(
          this.RouterContract.fulfillRequest(requestId, priceToSend, sig.signature, { from: rando }),
          "ECDSA.recover mismatch - correct provider and data?",
        )
      })

      it("signer and sender must match", async function () {
        // unlikely event
        // register providers on router
        await this.RouterContract.registerAsProvider(defaultFee, { from: dataProvider })
        await this.RouterContract.registerAsProvider(defaultFee, { from: rando })
        // send xFUND to consumer contract
        await this.MockTokenContract.transfer(this.MockConsumerContract.address, defaultFee, { from: admin })
        // increase router allowance
        await this.MockConsumerContract.increaseRouterAllowance(defaultFee, { from: dataConsumerOwner })

        // request from dataProvider
        await this.MockConsumerContract.getData(dataProvider, defaultFee, endpoint, {
          from: dataConsumerOwner,
        })
        const requestId = generateRequestId(
          this.MockConsumerContract.address,
          dataProvider,
          this.RouterContract.address,
          new BN(0),
          endpoint,
        )

        const msg = generateSigMsg(requestId, priceToSend, this.MockConsumerContract.address)
        // rando signs
        const sig = await web3.eth.accounts.sign(msg, randoPk)
        // dataProvider sends
        await expectRevert(
          this.RouterContract.fulfillRequest(requestId, priceToSend, sig.signature, { from: dataProvider }),
          "ECDSA.recover mismatch - correct provider and data?",
        )
      })

      it("data sent must match signature", async function () {
        // register providers on router
        await this.RouterContract.registerAsProvider(defaultFee, { from: dataProvider })
        // send xFUND to consumer contract
        await this.MockTokenContract.transfer(this.MockConsumerContract.address, defaultFee, { from: admin })
        // increase router allowance
        await this.MockConsumerContract.increaseRouterAllowance(defaultFee, { from: dataConsumerOwner })

        // request from dataProvider
        await this.MockConsumerContract.getData(dataProvider, defaultFee, endpoint, {
          from: dataConsumerOwner,
        })
        const requestId = generateRequestId(
          this.MockConsumerContract.address,
          dataProvider,
          this.RouterContract.address,
          new BN(0),
          endpoint,
        )

        const msg = generateSigMsg(requestId, priceToSend, this.MockConsumerContract.address)
        // dataProvider signs
        const sig = await web3.eth.accounts.sign(msg, dataProviderPk)
        // dataProvider sends, but price not same as signed price
        await expectRevert(
          this.RouterContract.fulfillRequest(requestId, 20, sig.signature, { from: dataProvider }),
          "ECDSA.recover mismatch - correct provider and data?",
        )
      })
    })

    describe("ConsumerBase.rawReceiveData", function () {
      it("only Router can call", async function () {
        const requestId = generateRequestId(
          this.MockConsumerContract.address,
          dataProvider,
          this.RouterContract.address,
          new BN(0),
          endpoint,
        )

        await expectRevert(
          this.MockConsumerContract.rawReceiveData(20, requestId, { from: dataProvider }),
          "only Router can call",
        )
      })
    })

    describe("withdraw", function () {
      it("msg.sender must have withdrawable tokens", async function () {
        await expectRevert(
          this.RouterContract.withdraw(dataProvider, 20, { from: dataProvider }),
          "can't withdraw more than balance",
        )
      })
    })
  })
})
