const { accounts, contract, web3 } = require('@openzeppelin/test-environment')

const {
  BN,           // Big Number support
  constants,
  expectRevert,
  expectEvent,
} = require('@openzeppelin/test-helpers')

const { expect } = require('chai')

const MockToken = contract.fromArtifact('MockToken') // Loads a compiled contract
const Router = contract.fromArtifact('Router') // Loads a compiled contract
const MockConsumer = contract.fromArtifact('MockConsumer') // Loads a compiled contract
const ConsumerLib = contract.fromArtifact('ConsumerLib') // Loads a compiled contract

const REQUEST_VAR_GAS_PRICE_LIMIT = 1; // gas price limit in gwei the consumer is willing to pay for data processing
const REQUEST_VAR_TOP_UP_LIMIT = 2; // max ETH that can be sent in a gas top up Tx
const REQUEST_VAR_REQUEST_TIMEOUT = 3; // request timeout in seconds

const calculateCost = async function(receipts, value) {
  let totalCost = new BN(value)

  for(let i = 0; i < receipts.length; i += 1) {
    const r = receipts[i]
    const gasUsed = r.receipt.gasUsed
    const tx = await web3.eth.getTransaction(r.tx)
    const gasPrice = tx.gasPrice
    const gasCost = new BN(gasPrice).mul(new BN(gasUsed))
    totalCost = totalCost.add(gasCost)
  }

  return totalCost
}

describe('Consumer - Gas top up and withdraw', function () {
  this.timeout(300000)
  const [admin, dataConsumerOwner1, dataConsumerOwner2, dataProvider1, dataProvider2, rando, eoa] = accounts
  const decimals = 9
  const initSupply = 1000 * (10 ** decimals)
  const initialAmount = 1000
  const amountForContract = 100

  beforeEach(async function () {
    // admin deploy Token contract
    this.MockTokenContract = await MockToken.new("MockToken", "MockToken", initSupply, decimals, {from: admin})

    // admin deploy Router contract
    this.RouterContract = await Router.new(this.MockTokenContract.address, {from: admin})

    // Deploy ConsumerLib library and link
    this.ConsumerLib = await ConsumerLib.new({from: admin})
    await MockConsumer.detectNetwork();
    await MockConsumer.link("ConsumerLib", this.ConsumerLib.address)

    // dataConsumerOwner1 deploy Consumer contract
    this.MockConsumerContract1 = await MockConsumer.new(this.RouterContract.address, {from: dataConsumerOwner1})

    // Admin Transfer Tokens to dataConsumerOwner1
    await this.MockTokenContract.transfer( dataConsumerOwner1, initialAmount, { from: admin } )

    // dataConsumerOwner1 Transfer Tokens to MockConsumerContract
    await this.MockTokenContract.transfer( this.MockConsumerContract1.address, amountForContract, { from: dataConsumerOwner1 } )
  })

  /*
   * Gas Top up tests
   */
  describe('gas topup - deposit', function () {
    describe('should succeed - single consumer, single provider', function () {
      beforeEach(async function () {
        // add a data provider
        await this.MockConsumerContract1.addDataProvider(dataProvider1, 100,  { from: dataConsumerOwner1 } )
      })

      it( 'owner can top up - Router emits GasToppedUp event', async function () {
        const topupValue = web3.utils.toWei("0.1", "ether")

        const receipt = await this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue })

        expectEvent(receipt, 'GasToppedUp', {
          dataConsumer: this.MockConsumerContract1.address,
          dataProvider: dataProvider1,
          amount: topupValue
        })
      } )

      it( 'owner can top up - Router account balance should be 0.1 ETH', async function () {
        const topupValue = web3.utils.toWei("0.1", "ether")

        const startBalance = await web3.eth.getBalance(this.RouterContract.address)
        expect(Number(startBalance)).to.equal(0)

        await this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue })

        const newBalance = await web3.eth.getBalance(this.RouterContract.address)

        expect(newBalance.toString()).to.equal(topupValue.toString())
      } )

      it( 'owner can top up - Consumer contract account balance should remain zero', async function () {
        const topupValue = web3.utils.toWei("0.1", "ether")

        const startBalance = await web3.eth.getBalance(this.MockConsumerContract1.address)
        expect(Number(startBalance)).to.equal(0)

        await this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue })

        const newBalance = await web3.eth.getBalance(this.MockConsumerContract1.address)

        expect(Number(newBalance)).to.equal(0)
      } )

      it( 'owner can top up - dataConsumerOwner1 account balance should be reduced by topup amount and gas', async function () {
        const topupValue = web3.utils.toWei("0.5", "ether")

        const startBalance = await web3.eth.getBalance(dataConsumerOwner1)

        const receipt = await this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue })

        const totalCost = await calculateCost([receipt], topupValue)

        const finalExpectedBalance = new BN(String(startBalance)).sub(totalCost)

        const newBalance = await web3.eth.getBalance(dataConsumerOwner1)

        expect(newBalance.toString()).to.equal(finalExpectedBalance.toString())
      } )

      it( 'owner can top up - Router getTotalGasDeposits should be 0.1 ETH', async function () {
        const topupValue = web3.utils.toWei("0.1", "ether")

        await this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue })

        const depositValue = await this.RouterContract.getTotalGasDeposits()

        expect(depositValue.toString()).to.equal(topupValue.toString())
      } )

      it( 'owner can top up - Router getGasDepositsForConsumer should be 0.1 ETH', async function () {
        const topupValue = web3.utils.toWei("0.1", "ether")

        await this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue })

        const depositValue = await this.RouterContract.getGasDepositsForConsumer(this.MockConsumerContract1.address)

        expect(depositValue.toString()).to.equal(topupValue.toString())
      } )

      it( 'owner can top up - Router getGasDepositsForConsumerProviders should be 0.1 ETH', async function () {
        const topupValue = web3.utils.toWei("0.1", "ether")

        await this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue })

        const depositValue = await this.RouterContract.getGasDepositsForConsumerProviders(this.MockConsumerContract1.address, dataProvider1)

        expect(depositValue.toString()).to.equal(topupValue.toString())
      } )
    })

    describe('should succeed - single consumer, multiple providers', function () {
      beforeEach( async function () {
        // add a data providers
        await this.MockConsumerContract1.addDataProvider( dataProvider1, 100, { from: dataConsumerOwner1 } )
        await this.MockConsumerContract1.addDataProvider( dataProvider2, 100, { from: dataConsumerOwner1 } )
      } )

      it( 'owner can top up - Router emits GasToppedUp event', async function () {
        const topupValue1 = web3.utils.toWei("0.1", "ether")
        const topupValue2 = web3.utils.toWei("0.2", "ether")

        const receipt1 = await this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue1 })

        expectEvent(receipt1, 'GasToppedUp', {
          dataConsumer: this.MockConsumerContract1.address,
          dataProvider: dataProvider1,
          amount: topupValue1
        })
        const receipt2 = await this.MockConsumerContract1.topUpGas(dataProvider2, { from: dataConsumerOwner1, value: topupValue2 })

        expectEvent(receipt2, 'GasToppedUp', {
          dataConsumer: this.MockConsumerContract1.address,
          dataProvider: dataProvider2,
          amount: topupValue2
        })
      } )

      it( 'owner can top up - Router account balance should be 0.3 ETH', async function () {
        const topupValue1 = web3.utils.toWei("0.1", "ether")
        const topupValue2 = web3.utils.toWei("0.2", "ether")
        const totalExpected = new BN(topupValue1).add(new BN(topupValue2))

        const startBalance = await web3.eth.getBalance(this.RouterContract.address)
        expect(Number(startBalance)).to.equal(0)

        await this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue1 })
        await this.MockConsumerContract1.topUpGas(dataProvider2, { from: dataConsumerOwner1, value: topupValue2 })

        const newBalance = await web3.eth.getBalance(this.RouterContract.address)

        expect(newBalance.toString()).to.equal(totalExpected.toString())
      } )

      it( 'owner can top up - Consumer contract account balance should remain zero', async function () {
        const topupValue1 = web3.utils.toWei("0.1", "ether")
        const topupValue2 = web3.utils.toWei("0.2", "ether")

        const startBalance = await web3.eth.getBalance(this.MockConsumerContract1.address)
        expect(Number(startBalance)).to.equal(0)

        await this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue1 })
        await this.MockConsumerContract1.topUpGas(dataProvider2, { from: dataConsumerOwner1, value: topupValue2 })

        const newBalance = await web3.eth.getBalance(this.MockConsumerContract1.address)

        expect(Number(newBalance)).to.equal(0)
      } )

      it( 'owner can top up - dataConsumerOwner1 account balance should be reduced by topup amount and gas', async function () {
        const topupValue1 = web3.utils.toWei("0.1", "ether")
        const topupValue2 = web3.utils.toWei("0.2", "ether")
        const totalExpected = new BN(topupValue1).add(new BN(topupValue2))

        const startBalance = await web3.eth.getBalance(dataConsumerOwner1)

        const receipt1 = await this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue1 })
        const receipt2 = await this.MockConsumerContract1.topUpGas(dataProvider2, { from: dataConsumerOwner1, value: topupValue2 })

        const totalCost = await calculateCost([receipt1, receipt2], totalExpected.toString())

        const finalExpectedBalance = new BN(String(startBalance)).sub(totalCost)

        const newBalance = await web3.eth.getBalance(dataConsumerOwner1)

        expect(newBalance.toString()).to.equal(finalExpectedBalance.toString())
      } )

      it( 'owner can top up - Router getTotalGasDeposits should be 0.3 ETH', async function () {
        const topupValue1 = web3.utils.toWei("0.1", "ether")
        const topupValue2 = web3.utils.toWei("0.2", "ether")
        const totalExpected = new BN(topupValue1).add(new BN(topupValue2))

        await this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue1 })
        await this.MockConsumerContract1.topUpGas(dataProvider2, { from: dataConsumerOwner1, value: topupValue2 })

        const depositValue = await this.RouterContract.getTotalGasDeposits()

        expect(depositValue.toString()).to.equal(totalExpected.toString())
      } )

      it( 'owner can top up - Router getGasDepositsForConsumer should be 0.3 ETH', async function () {
        const topupValue1 = web3.utils.toWei("0.1", "ether")
        const topupValue2 = web3.utils.toWei("0.2", "ether")
        const totalExpected = new BN(topupValue1).add(new BN(topupValue2))

        await this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue1 })
        await this.MockConsumerContract1.topUpGas(dataProvider2, { from: dataConsumerOwner1, value: topupValue2 })

        const depositValue = await this.RouterContract.getGasDepositsForConsumer(this.MockConsumerContract1.address)
        expect(depositValue.toString()).to.equal(totalExpected.toString())
      } )

      it( 'owner can top up - Router getGasDepositsForConsumerProviders should be correct', async function () {
        const topupValue1 = web3.utils.toWei("0.1", "ether")
        const topupValue2 = web3.utils.toWei("0.2", "ether")

        await this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue1 })
        await this.MockConsumerContract1.topUpGas(dataProvider2, { from: dataConsumerOwner1, value: topupValue2 })

        const depositValue1 = await this.RouterContract.getGasDepositsForConsumerProviders(this.MockConsumerContract1.address, dataProvider1)
        expect(depositValue1.toString()).to.equal(topupValue1.toString())

        const depositValue2 = await this.RouterContract.getGasDepositsForConsumerProviders(this.MockConsumerContract1.address, dataProvider2)
        expect(depositValue2.toString()).to.equal(topupValue2.toString())
      } )

    })

    describe('should succeed - multiple consumers, multiple providers', function () {
      beforeEach( async function () {

        // dataConsumerOwner2 deploy Consumer contract
        this.MockConsumerContract2 = await MockConsumer.new( this.RouterContract.address, { from: dataConsumerOwner2 } )

        // Admin Transfer Tokens to dataConsumerOwner2
        await this.MockTokenContract.transfer( dataConsumerOwner2, initialAmount, { from: admin } )

        // dataConsumerOwner2 Transfer Tokens to MockConsumerContract2
        await this.MockTokenContract.transfer( this.MockConsumerContract2.address, amountForContract, { from: dataConsumerOwner2 } )

        // add a data providers
        await this.MockConsumerContract1.addDataProvider( dataProvider1, 100, { from: dataConsumerOwner1 } )
        await this.MockConsumerContract1.addDataProvider( dataProvider2, 100, { from: dataConsumerOwner1 } )
        await this.MockConsumerContract2.addDataProvider( dataProvider1, 100, { from: dataConsumerOwner2 } )
        await this.MockConsumerContract2.addDataProvider( dataProvider2, 100, { from: dataConsumerOwner2 } )
      } )

      it( 'owner can top up - Router emits GasToppedUp event', async function () {
        const topupValue1 = web3.utils.toWei("0.1", "ether")
        const topupValue2 = web3.utils.toWei("0.2", "ether")
        const topupValue3 = web3.utils.toWei("0.3", "ether")
        const topupValue4 = web3.utils.toWei("0.4", "ether")

        const receipt1 = await this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue1 })

        expectEvent(receipt1, 'GasToppedUp', {
          dataConsumer: this.MockConsumerContract1.address,
          dataProvider: dataProvider1,
          amount: topupValue1
        })
        const receipt2 = await this.MockConsumerContract1.topUpGas(dataProvider2, { from: dataConsumerOwner1, value: topupValue2 })

        expectEvent(receipt2, 'GasToppedUp', {
          dataConsumer: this.MockConsumerContract1.address,
          dataProvider: dataProvider2,
          amount: topupValue2
        })

        const receipt3 = await this.MockConsumerContract2.topUpGas(dataProvider1, { from: dataConsumerOwner2, value: topupValue3 })

        expectEvent(receipt3, 'GasToppedUp', {
          dataConsumer: this.MockConsumerContract2.address,
          dataProvider: dataProvider1,
          amount: topupValue3
        })
        const receipt4 = await this.MockConsumerContract2.topUpGas(dataProvider2, { from: dataConsumerOwner2, value: topupValue4 })

        expectEvent(receipt4, 'GasToppedUp', {
          dataConsumer: this.MockConsumerContract2.address,
          dataProvider: dataProvider2,
          amount: topupValue4
        })
      } )

      it( 'owner can top up - Router account balance should be 1 ETH', async function () {
        const topupValue1 = web3.utils.toWei("0.1", "ether")
        const topupValue2 = web3.utils.toWei("0.2", "ether")
        const topupValue3 = web3.utils.toWei("0.3", "ether")
        const topupValue4 = web3.utils.toWei("0.4", "ether")
        const totalExpected = new BN(topupValue1).add(new BN(topupValue2)).add(new BN(topupValue3)).add(new BN(topupValue4))

        const startBalance = await web3.eth.getBalance(this.RouterContract.address)
        expect(Number(startBalance)).to.equal(0)

        await this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue1 })
        await this.MockConsumerContract1.topUpGas(dataProvider2, { from: dataConsumerOwner1, value: topupValue2 })
        await this.MockConsumerContract2.topUpGas(dataProvider1, { from: dataConsumerOwner2, value: topupValue3 })
        await this.MockConsumerContract2.topUpGas(dataProvider2, { from: dataConsumerOwner2, value: topupValue4 })

        const newBalance = await web3.eth.getBalance(this.RouterContract.address)

        expect(newBalance.toString()).to.equal(totalExpected.toString())
      } )

      it( 'owner can top up - both Consumer contracts account balance should remain zero', async function () {
        const topupValue1 = web3.utils.toWei("0.1", "ether")
        const topupValue2 = web3.utils.toWei("0.2", "ether")
        const topupValue3 = web3.utils.toWei("0.3", "ether")
        const topupValue4 = web3.utils.toWei("0.4", "ether")

        const startBalance = await web3.eth.getBalance(this.MockConsumerContract1.address)
        expect(Number(startBalance)).to.equal(0)

        await this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue1 })
        await this.MockConsumerContract1.topUpGas(dataProvider2, { from: dataConsumerOwner1, value: topupValue2 })
        await this.MockConsumerContract2.topUpGas(dataProvider1, { from: dataConsumerOwner2, value: topupValue3 })
        await this.MockConsumerContract2.topUpGas(dataProvider2, { from: dataConsumerOwner2, value: topupValue4 })

        const newBalance1 = await web3.eth.getBalance(this.MockConsumerContract1.address)
        expect(Number(newBalance1)).to.equal(0)
        const newBalance2 = await web3.eth.getBalance(this.MockConsumerContract2.address)
        expect(Number(newBalance2)).to.equal(0)
      } )

      it( 'owner can top up - dataConsumerOwner account balances should be reduced by topup amount and gas', async function () {
        const topupValue1 = web3.utils.toWei("0.1", "ether")
        const topupValue2 = web3.utils.toWei("0.2", "ether")
        const topupValue3 = web3.utils.toWei("0.3", "ether")
        const topupValue4 = web3.utils.toWei("0.4", "ether")
        const totalExpected1 = new BN(topupValue1).add(new BN(topupValue2))
        const totalExpected2 = new BN(topupValue3).add(new BN(topupValue4))

        // start balances
        const startBalance1 = await web3.eth.getBalance(dataConsumerOwner1)
        const startBalance2 = await web3.eth.getBalance(dataConsumerOwner2)

        // send Txs
        const receipt1 = await this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue1 })
        const receipt2 = await this.MockConsumerContract1.topUpGas(dataProvider2, { from: dataConsumerOwner1, value: topupValue2 })
        const receipt3 = await this.MockConsumerContract2.topUpGas(dataProvider1, { from: dataConsumerOwner2, value: topupValue3 })
        const receipt4 = await this.MockConsumerContract2.topUpGas(dataProvider2, { from: dataConsumerOwner2, value: topupValue4 })

        // check dataConsumerOwner1
        const totalCost1 = await calculateCost([receipt1, receipt2], totalExpected1.toString())
        const finalExpectedBalance1 = new BN(String(startBalance1)).sub(totalCost1)
        const newBalance1 = await web3.eth.getBalance(dataConsumerOwner1)
        expect(newBalance1.toString()).to.equal(finalExpectedBalance1.toString())

        // check dataConsumerOwner2
        const totalCost2 = await calculateCost([receipt3, receipt4], totalExpected2.toString())
        const finalExpectedBalance2 = new BN(String(startBalance2)).sub(totalCost2)
        const newBalance2 = await web3.eth.getBalance(dataConsumerOwner2)
        expect(newBalance2.toString()).to.equal(finalExpectedBalance2.toString())
      } )

      it( 'owner can top up - Router getTotalGasDeposits should be 1 ETH', async function () {
        const topupValue1 = web3.utils.toWei("0.1", "ether")
        const topupValue2 = web3.utils.toWei("0.2", "ether")
        const topupValue3 = web3.utils.toWei("0.3", "ether")
        const topupValue4 = web3.utils.toWei("0.4", "ether")
        const totalExpected = new BN(topupValue1).add(new BN(topupValue2)).add(new BN(topupValue3)).add(new BN(topupValue4))

        await this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue1 })
        await this.MockConsumerContract1.topUpGas(dataProvider2, { from: dataConsumerOwner1, value: topupValue2 })
        await this.MockConsumerContract2.topUpGas(dataProvider1, { from: dataConsumerOwner2, value: topupValue3 })
        await this.MockConsumerContract2.topUpGas(dataProvider2, { from: dataConsumerOwner2, value: topupValue4 })

        const depositValue = await this.RouterContract.getTotalGasDeposits()

        expect(depositValue.toString()).to.equal(totalExpected.toString())
      } )

      it( 'owner can top up - Router getGasDepositsForConsumer should be 0.3 and 0.7 ETH', async function () {
        const topupValue1 = web3.utils.toWei("0.1", "ether")
        const topupValue2 = web3.utils.toWei("0.2", "ether")
        const topupValue3 = web3.utils.toWei("0.3", "ether")
        const topupValue4 = web3.utils.toWei("0.4", "ether")
        const totalExpected1 = new BN(topupValue1).add(new BN(topupValue2))
        const totalExpected2 = new BN(topupValue3).add(new BN(topupValue4))

        await this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue1 })
        await this.MockConsumerContract1.topUpGas(dataProvider2, { from: dataConsumerOwner1, value: topupValue2 })
        await this.MockConsumerContract2.topUpGas(dataProvider1, { from: dataConsumerOwner2, value: topupValue3 })
        await this.MockConsumerContract2.topUpGas(dataProvider2, { from: dataConsumerOwner2, value: topupValue4 })

        const depositValue1 = await this.RouterContract.getGasDepositsForConsumer(this.MockConsumerContract1.address)
        expect(depositValue1.toString()).to.equal(totalExpected1.toString())

        const depositValue2 = await this.RouterContract.getGasDepositsForConsumer(this.MockConsumerContract2.address)
        expect(depositValue2.toString()).to.equal(totalExpected2.toString())
      } )

      it( 'owner can top up - Router getGasDepositsForConsumerProviders should be correct', async function () {
        const topupValue1 = web3.utils.toWei("0.1", "ether")
        const topupValue2 = web3.utils.toWei("0.2", "ether")
        const topupValue3 = web3.utils.toWei("0.3", "ether")
        const topupValue4 = web3.utils.toWei("0.4", "ether")

        await this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue1 })
        await this.MockConsumerContract1.topUpGas(dataProvider2, { from: dataConsumerOwner1, value: topupValue2 })
        await this.MockConsumerContract2.topUpGas(dataProvider1, { from: dataConsumerOwner2, value: topupValue3 })
        await this.MockConsumerContract2.topUpGas(dataProvider2, { from: dataConsumerOwner2, value: topupValue4 })

        const depositValue1 = await this.RouterContract.getGasDepositsForConsumerProviders(this.MockConsumerContract1.address, dataProvider1)
        expect(depositValue1.toString()).to.equal(topupValue1.toString())

        const depositValue2 = await this.RouterContract.getGasDepositsForConsumerProviders(this.MockConsumerContract1.address, dataProvider2)
        expect(depositValue2.toString()).to.equal(topupValue2.toString())

        const depositValue3 = await this.RouterContract.getGasDepositsForConsumerProviders(this.MockConsumerContract2.address, dataProvider1)
        expect(depositValue3.toString()).to.equal(topupValue3.toString())

        const depositValue4 = await this.RouterContract.getGasDepositsForConsumerProviders(this.MockConsumerContract2.address, dataProvider2)
        expect(depositValue4.toString()).to.equal(topupValue4.toString())
      } )

    })

    describe('should fail', function () {

      it( 'only owner can top up - should revert with error', async function () {
        const topupValue = web3.utils.toWei("0.1", "ether")

        // add a data provider
        await this.MockConsumerContract1.addDataProvider(dataProvider1, 100,  { from: dataConsumerOwner1 } )

        await expectRevert(
          this.MockConsumerContract1.topUpGas(dataProvider1, { from: rando, value: topupValue }),
          "Consumer: only owner can do this"
        )
      } )

      it( 'must be authorised provider - should revert with error', async function () {
        const topupValue = web3.utils.toWei("0.1", "ether")

        await expectRevert(
          this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue }),
          "Consumer: _dataProvider is not authorised"
        )
      } )

      it( 'owner requires sufficient ETH balance - should revert with error', async function () {
        const silly = web3.utils.toWei("150", "ether")
        const topupValue = web3.utils.toWei("101", "ether")
        await this.RouterContract.setGasTopUpLimit(silly, { from: admin })
        await this.MockConsumerContract1.setRequestVar(REQUEST_VAR_TOP_UP_LIMIT, silly, { from: dataConsumerOwner1 })
        // add a data provider
        await this.MockConsumerContract1.addDataProvider(dataProvider1, 100,  { from: dataConsumerOwner1 } )
        await expectRevert(
          this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue}),
          "Consumer: sender has insufficient balance"
        )
      } )

      it( 'owner requires sufficient ETH balance - owner balance should not change', async function () {
        const silly = web3.utils.toWei("150", "ether")
        const topupValue = web3.utils.toWei("101", "ether")
        await this.RouterContract.setGasTopUpLimit(silly, { from: admin })
        await this.MockConsumerContract1.setRequestVar(REQUEST_VAR_TOP_UP_LIMIT, silly, { from: dataConsumerOwner1 })

        // add a data provider
        await this.MockConsumerContract1.addDataProvider(dataProvider1, 100,  { from: dataConsumerOwner1 } )

        const startBalance = await web3.eth.getBalance(dataConsumerOwner1)

        await expectRevert(
          this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue}),
          "Consumer: sender has insufficient balance"
        )

        const newBalance = await web3.eth.getBalance(dataConsumerOwner1)

        expect(newBalance.toString()).to.equal(startBalance.toString())
      } )

      it( 'owner requires sufficient ETH balance - router balance should not change', async function () {
        const silly = web3.utils.toWei("150", "ether")
        const topupValue = web3.utils.toWei("101", "ether")
        await this.RouterContract.setGasTopUpLimit(silly, { from: admin })
        await this.MockConsumerContract1.setRequestVar(REQUEST_VAR_TOP_UP_LIMIT, silly, { from: dataConsumerOwner1 })

        // add a data provider
        await this.MockConsumerContract1.addDataProvider(dataProvider1, 100,  { from: dataConsumerOwner1 } )

        await expectRevert(
          this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue}),
          "Consumer: sender has insufficient balance"
        )

        const routerBalance = await web3.eth.getBalance(this.RouterContract.address)

        expect(routerBalance.toString()).to.equal("0")
      } )

      it( 'amount must be > 0: no value sent - should revert with error', async function () {
        // add a data provider
        await this.MockConsumerContract1.addDataProvider(dataProvider1, 100,  { from: dataConsumerOwner1 } )
        await expectRevert(
          this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1}),
          "Consumer: amount cannot be zero"
        )
      } )

      it( 'amount must be > 0: value set to 0 - should revert with error', async function () {
        // add a data provider
        await this.MockConsumerContract1.addDataProvider(dataProvider1, 100,  { from: dataConsumerOwner1 } )
        await expectRevert(
          this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: 0}),
          "Consumer: amount cannot be zero"
        )
      } )

      it( 'cannot exceed own limit - should revert with error', async function () {
        const topupValue = web3.utils.toWei("10", "ether")
        // add a data provider
        await this.MockConsumerContract1.addDataProvider(dataProvider1, 100,  { from: dataConsumerOwner1 } )
        await expectRevert(
          this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue}),
          "Consumer: amount cannot exceed own gasTopUpLimit"
        )
      } )

    })

  })

  /*
   * Gas Top up Withdrawal tests
   */
  describe('gas topup - withdraw', function () {
    describe( 'should succeed - single consumer, single provider', function () {
      beforeEach( async function () {
        // add a data provider
        await this.MockConsumerContract1.addDataProvider( dataProvider1, 100, { from: dataConsumerOwner1 } )
      } )

      it( 'owner can withdraw - Consumer emits PaymentRecieved event', async function () {
        const topupValue = web3.utils.toWei("0.1", "ether")

        await this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue })

        const receipt = await this.MockConsumerContract1.withdrawTopUpGas(dataProvider1, { from: dataConsumerOwner1 })

        expectEvent(receipt, 'PaymentRecieved', {
          sender: this.RouterContract.address,
          amount: topupValue
        })
      } )

      it( 'owner can withdraw - Router emits GasWithdrawnByConsumer event', async function () {
        const topupValue = web3.utils.toWei("0.1", "ether")

        await this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue })

        const receipt = await this.MockConsumerContract1.withdrawTopUpGas(dataProvider1, { from: dataConsumerOwner1 })

        expectEvent(receipt, 'GasWithdrawnByConsumer', {
          dataConsumer: this.MockConsumerContract1.address,
          dataProvider: dataProvider1,
          amount: topupValue
        })
      } )

      it( 'owner can withdraw - Router balance correctly debited', async function () {
        const topupValue = web3.utils.toWei( "0.1", "ether" )

        await this.MockConsumerContract1.topUpGas( dataProvider1, { from: dataConsumerOwner1, value: topupValue } )

        // should be 0.1 Eth
        const newBalance = await web3.eth.getBalance( this.RouterContract.address )
        expect( newBalance.toString() ).to.equal( topupValue.toString() )

        await this.MockConsumerContract1.withdrawTopUpGas( dataProvider1, { from: dataConsumerOwner1 } )

        // should be 0 Eth
        const endBalance = await web3.eth.getBalance( this.RouterContract.address )
        expect( endBalance.toString() ).to.equal( "0" )
      })

      it( 'owner can withdraw - gasDepositsForConsumer correctly updated', async function () {
        const topupValue = web3.utils.toWei( "0.1", "ether" )

        await this.MockConsumerContract1.topUpGas( dataProvider1, { from: dataConsumerOwner1, value: topupValue } )

        // should be 0.1 Eth
        const depositValue = await this.RouterContract.getGasDepositsForConsumer(this.MockConsumerContract1.address)
        expect(depositValue.toString()).to.equal(topupValue.toString())

        await this.MockConsumerContract1.withdrawTopUpGas( dataProvider1, { from: dataConsumerOwner1 } )

        // should be 0 Eth
        const endDepositValue = await this.RouterContract.getGasDepositsForConsumer(this.MockConsumerContract1.address)
        expect(endDepositValue.toString()).to.equal("0")
      })

      it( 'owner can withdraw - gasDepositsForConsumerProviders correctly updated', async function () {
        const topupValue = web3.utils.toWei( "0.1", "ether" )

        await this.MockConsumerContract1.topUpGas( dataProvider1, { from: dataConsumerOwner1, value: topupValue } )

        // should be 0.1 Eth
        const depositValue = await this.RouterContract.getGasDepositsForConsumerProviders(this.MockConsumerContract1.address, dataProvider1)
        expect(depositValue.toString()).to.equal(topupValue.toString())

        await this.MockConsumerContract1.withdrawTopUpGas( dataProvider1, { from: dataConsumerOwner1 } )

        // should be 0 Eth
        const endDepositValue = await this.RouterContract.getGasDepositsForConsumerProviders(this.MockConsumerContract1.address, dataProvider1)
        expect(endDepositValue.toString()).to.equal("0")
      })

      it( 'owner can withdraw - Consumer contract balance should always be zero', async function () {
        const topupValue = web3.utils.toWei( "0.1", "ether" )

        await this.MockConsumerContract1.topUpGas( dataProvider1, { from: dataConsumerOwner1, value: topupValue } )

        // should be 0 Eth
        const startBalance = await web3.eth.getBalance( this.MockConsumerContract1.address )
        expect( startBalance.toString() ).to.equal( "0" )

        await this.MockConsumerContract1.withdrawTopUpGas( dataProvider1, { from: dataConsumerOwner1 } )

        // should be 0 Eth
        const endBalance = await web3.eth.getBalance( this.MockConsumerContract1.address )
        expect( endBalance.toString() ).to.equal( "0" )
      })

      it( 'owner can withdraw - dataConsumerOwner1 account balance should be reduced by gas costs only', async function () {
        const topupValue = web3.utils.toWei("0.5", "ether")

        const startBalance = await web3.eth.getBalance(dataConsumerOwner1)

        const receipt1 = await this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue })
        const totalCost1 = await calculateCost([receipt1], topupValue)
        const finalExpectedBalance1 = new BN(String(startBalance)).sub(totalCost1)
        const newBalance1 = await web3.eth.getBalance(dataConsumerOwner1)
        expect(newBalance1.toString()).to.equal(finalExpectedBalance1.toString())

        const receipt2 = await this.MockConsumerContract1.withdrawTopUpGas( dataProvider1, { from: dataConsumerOwner1 } )
        const totalCost2 = await calculateCost([receipt1, receipt2], 0)
        const finalExpectedBalance2 = new BN(String(startBalance)).sub(totalCost2)
        const newBalance2 = await web3.eth.getBalance(dataConsumerOwner1)
        expect(newBalance2.toString()).to.equal(finalExpectedBalance2.toString())
      } )

      it( 'owner can withdraw - Consumer contract Owner balance should be correctly credited', async function () {
        const topupValue = web3.utils.toWei( "0.1", "ether" )
        const startBalance = await web3.eth.getBalance(dataConsumerOwner1)

        const receipt1 = await this.MockConsumerContract1.topUpGas( dataProvider1, { from: dataConsumerOwner1, value: topupValue } )
        const cost1 = await calculateCost([receipt1], topupValue)
        const expectedBalance1 = new BN(String(startBalance)).sub(cost1)
        const balance1 = await web3.eth.getBalance(dataConsumerOwner1)
        expect(balance1.toString()).to.equal(expectedBalance1.toString())

        const receipt2 = await this.MockConsumerContract1.withdrawTopUpGas( dataProvider1, { from: dataConsumerOwner1 } )
        // overall cost should only be cost of gas - no need to include topupValue
        const cost2 = await calculateCost([receipt1, receipt2], 0)
        const expectedBalance2 = new BN(String(startBalance)).sub(cost2)
        const balance2 = await web3.eth.getBalance(dataConsumerOwner1)
        expect(balance2.toString()).to.equal(expectedBalance2.toString())
      })

      it( 'owner can withdraw from a revoked provider', async function () {
        const topupValue = web3.utils.toWei("0.1", "ether")

        const startBalance = await web3.eth.getBalance(dataConsumerOwner1)

        const receipt1 = await this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue })

        // should be start - (value + gas costs)
        const cost1 = await calculateCost([receipt1], topupValue)
        const expectedBalance1 = new BN(String(startBalance)).sub(cost1)
        const balance1 = await web3.eth.getBalance(dataConsumerOwner1)
        expect(balance1.toString()).to.equal(expectedBalance1.toString())

        // remove a data provider
        const receipt2 = await this.MockConsumerContract1.removeDataProvider( dataProvider1, { from: dataConsumerOwner1 } )

        const receipt3 = await this.MockConsumerContract1.withdrawTopUpGas(dataProvider1, { from: dataConsumerOwner1 })

        expectEvent(receipt3, 'GasWithdrawnByConsumer', {
          dataConsumer: this.MockConsumerContract1.address,
          dataProvider: dataProvider1,
          amount: topupValue
        })
        expectEvent(receipt3, 'PaymentRecieved', {
          sender: this.RouterContract.address,
          amount: topupValue
        })

        // Router balance should be 0 Eth
        const routerBalance = await web3.eth.getBalance( this.RouterContract.address )
        expect( routerBalance.toString() ).to.equal( "0" )

        // should be reimbursed - should be start - gas costs
        const cost2 = await calculateCost([receipt1, receipt2, receipt3], 0)
        const expectedBalance2 = new BN(String(startBalance)).sub(cost2)
        const balance2 = await web3.eth.getBalance(dataConsumerOwner1)
        expect(balance2.toString()).to.equal(expectedBalance2.toString())

      } )

    } )

    describe( 'should succeed - single consumer, multiple providers', function () {
      beforeEach( async function () {
        // add a data providers
        await this.MockConsumerContract1.addDataProvider( dataProvider1, 100, { from: dataConsumerOwner1 } )
        await this.MockConsumerContract1.addDataProvider( dataProvider2, 100, { from: dataConsumerOwner1 } )
      } )

      it( 'owner can withdraw - Consumer emits PaymentRecieved event', async function () {
        const topupValue1 = web3.utils.toWei("0.1", "ether")
        const topupValue2 = web3.utils.toWei("0.2", "ether")

        await this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue1 })
        await this.MockConsumerContract1.topUpGas(dataProvider2, { from: dataConsumerOwner1, value: topupValue2 })

        const receipt1 = await this.MockConsumerContract1.withdrawTopUpGas(dataProvider1, { from: dataConsumerOwner1 })

        expectEvent(receipt1, 'PaymentRecieved', {
          sender: this.RouterContract.address,
          amount: topupValue1
        })

        const receipt2 = await this.MockConsumerContract1.withdrawTopUpGas(dataProvider2, { from: dataConsumerOwner1 })

        expectEvent(receipt2, 'PaymentRecieved', {
          sender: this.RouterContract.address,
          amount: topupValue2
        })
      } )

      it( 'owner can withdraw - Router emits GasWithdrawnByConsumer event', async function () {
        const topupValue1 = web3.utils.toWei("0.1", "ether")
        const topupValue2 = web3.utils.toWei("0.2", "ether")

        await this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue1 })
        await this.MockConsumerContract1.topUpGas(dataProvider2, { from: dataConsumerOwner1, value: topupValue2 })

        const receipt1 = await this.MockConsumerContract1.withdrawTopUpGas(dataProvider1, { from: dataConsumerOwner1 })

        expectEvent(receipt1, 'GasWithdrawnByConsumer', {
          dataConsumer: this.MockConsumerContract1.address,
          dataProvider: dataProvider1,
          amount: topupValue1
        })

        const receipt2 = await this.MockConsumerContract1.withdrawTopUpGas(dataProvider2, { from: dataConsumerOwner1 })

        expectEvent(receipt2, 'GasWithdrawnByConsumer', {
          dataConsumer: this.MockConsumerContract1.address,
          dataProvider: dataProvider2,
          amount: topupValue2
        })
      } )

      it( 'owner can withdraw - Router balance correctly debited', async function () {
        const topupValue1 = web3.utils.toWei( "0.1", "ether" )
        const topupValue2 = web3.utils.toWei("0.2", "ether")
        const totalExpected = new BN(topupValue1).add(new BN(topupValue2))

        await this.MockConsumerContract1.topUpGas( dataProvider1, { from: dataConsumerOwner1, value: topupValue1 } )
        await this.MockConsumerContract1.topUpGas( dataProvider2, { from: dataConsumerOwner1, value: topupValue2 })

        // should be 0.3 Eth
        const newBalance1 = await web3.eth.getBalance( this.RouterContract.address )
        expect( newBalance1.toString() ).to.equal( totalExpected.toString() )

        await this.MockConsumerContract1.withdrawTopUpGas( dataProvider1, { from: dataConsumerOwner1 } )

        // should be 0.2 Eth
        const newBalance2 = await web3.eth.getBalance( this.RouterContract.address )
        expect( newBalance2.toString() ).to.equal( topupValue2.toString() )

        await this.MockConsumerContract1.withdrawTopUpGas( dataProvider2, { from: dataConsumerOwner1 } )

        // should be 0 Eth
        const newBalance3 = await web3.eth.getBalance( this.RouterContract.address )
        expect( newBalance3.toString() ).to.equal( "0" )
      })

      it( 'owner can withdraw - gasDepositsForConsumer correctly updated', async function () {
        const topupValue1 = web3.utils.toWei( "0.1", "ether" )
        const topupValue2 = web3.utils.toWei("0.2", "ether")
        const totalExpected = new BN(topupValue1).add(new BN(topupValue2))

        await this.MockConsumerContract1.topUpGas( dataProvider1, { from: dataConsumerOwner1, value: topupValue1 } )
        await this.MockConsumerContract1.topUpGas( dataProvider2, { from: dataConsumerOwner1, value: topupValue2 })

        // should be 0.3 Eth
        const depositValue1 = await this.RouterContract.getGasDepositsForConsumer(this.MockConsumerContract1.address)
        expect(depositValue1.toString()).to.equal(totalExpected.toString())

        await this.MockConsumerContract1.withdrawTopUpGas( dataProvider1, { from: dataConsumerOwner1 } )

        // should be 0.2 Eth
        const depositValue2 = await this.RouterContract.getGasDepositsForConsumer(this.MockConsumerContract1.address)
        expect(depositValue2.toString()).to.equal(topupValue2.toString())

        await this.MockConsumerContract1.withdrawTopUpGas( dataProvider2, { from: dataConsumerOwner1 } )

        // should be 0 Eth
        const depositValue3 = await this.RouterContract.getGasDepositsForConsumer(this.MockConsumerContract1.address)
        expect(depositValue3.toString()).to.equal("0")
      })

      it( 'owner can withdraw - gasDepositsForConsumerProviders correctly updated', async function () {
        const topupValue1 = web3.utils.toWei( "0.1", "ether" )
        const topupValue2 = web3.utils.toWei("0.2", "ether")

        await this.MockConsumerContract1.topUpGas( dataProvider1, { from: dataConsumerOwner1, value: topupValue1 } )
        await this.MockConsumerContract1.topUpGas( dataProvider2, { from: dataConsumerOwner1, value: topupValue2 })

        // should be 0.1 Eth
        const depositValue1 = await this.RouterContract.getGasDepositsForConsumerProviders(this.MockConsumerContract1.address, dataProvider1)
        expect(depositValue1.toString()).to.equal(topupValue1.toString())
        // should be 0.2 Eth
        const depositValue2 = await this.RouterContract.getGasDepositsForConsumerProviders(this.MockConsumerContract1.address, dataProvider2)
        expect(depositValue2.toString()).to.equal(topupValue2.toString())

        // withdraw dataProvider1
        await this.MockConsumerContract1.withdrawTopUpGas( dataProvider1, { from: dataConsumerOwner1 } )

        // should be 0 Eth
        const endDepositValue1 = await this.RouterContract.getGasDepositsForConsumerProviders(this.MockConsumerContract1.address, dataProvider1)
        expect(endDepositValue1.toString()).to.equal("0")

        // withdraw dataProvider2
        await this.MockConsumerContract1.withdrawTopUpGas( dataProvider2, { from: dataConsumerOwner1 } )

        // should be 0 Eth
        const endDepositValue2 = await this.RouterContract.getGasDepositsForConsumerProviders(this.MockConsumerContract1.address, dataProvider2)
        expect(endDepositValue2.toString()).to.equal("0")
      })

      it( 'owner can withdraw - Consumer contract balance should always be zero', async function () {
        const topupValue1 = web3.utils.toWei( "0.1", "ether" )
        const topupValue2 = web3.utils.toWei("0.2", "ether")
        const totalExpected = new BN(topupValue1).add(new BN(topupValue2))

        // dataProvider1
        await this.MockConsumerContract1.topUpGas( dataProvider1, { from: dataConsumerOwner1, value: topupValue1 } )

        // should be 0 Eth
        const startBalance1 = await web3.eth.getBalance( this.MockConsumerContract1.address )
        expect( startBalance1.toString() ).to.equal( "0" )

        await this.MockConsumerContract1.withdrawTopUpGas( dataProvider1, { from: dataConsumerOwner1 } )

        // should be 0 Eth
        const endBalance1 = await web3.eth.getBalance( this.MockConsumerContract1.address )
        expect( endBalance1.toString() ).to.equal( "0" )

        // dataProvider2
        await this.MockConsumerContract1.topUpGas( dataProvider2, { from: dataConsumerOwner1, value: topupValue2 } )

        // should be 0 Eth
        const startBalance2 = await web3.eth.getBalance( this.MockConsumerContract1.address )
        expect( startBalance2.toString() ).to.equal( "0" )

        await this.MockConsumerContract1.withdrawTopUpGas( dataProvider2, { from: dataConsumerOwner1 } )

        // should be 0 Eth
        const endBalance2 = await web3.eth.getBalance( this.MockConsumerContract1.address )
        expect( endBalance2.toString() ).to.equal( "0" )
      })

      it( 'owner can withdraw - dataConsumerOwner1 account balance should be reduced by gas costs only', async function () {
        const topupValue1 = web3.utils.toWei( "0.1", "ether" )
        const topupValue2 = web3.utils.toWei("0.2", "ether")
        const totalExpected = new BN(topupValue1).add(new BN(topupValue2))

        const startBalance = await web3.eth.getBalance(dataConsumerOwner1)

        // topup dataProvider1
        const receipt1 = await this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue1 })
        const totalCost1 = await calculateCost([receipt1], topupValue1)
        const finalExpectedBalance1 = new BN(String(startBalance)).sub(totalCost1)
        const newBalance1 = await web3.eth.getBalance(dataConsumerOwner1)
        expect(newBalance1.toString()).to.equal(finalExpectedBalance1.toString())

        // topup dataProvider2
        const receipt2 = await this.MockConsumerContract1.topUpGas(dataProvider2, { from: dataConsumerOwner1, value: topupValue2 })
        const totalCost2 = await calculateCost([receipt1, receipt2], totalExpected.toString())
        const finalExpectedBalance2 = new BN(String(startBalance)).sub(totalCost2)
        const newBalance2 = await web3.eth.getBalance(dataConsumerOwner1)
        expect(newBalance2.toString()).to.equal(finalExpectedBalance2.toString())

        // withdraw dataProvider1
        const receipt3 = await this.MockConsumerContract1.withdrawTopUpGas( dataProvider1, { from: dataConsumerOwner1 } )
        const totalCost3 = await calculateCost([receipt1, receipt2, receipt3], topupValue2)
        const finalExpectedBalance3 = new BN(String(startBalance)).sub(totalCost3)
        const newBalance3 = await web3.eth.getBalance(dataConsumerOwner1)
        expect(newBalance3.toString()).to.equal(finalExpectedBalance3.toString())

        // withdraw dataProvider2
        const receipt4 = await this.MockConsumerContract1.withdrawTopUpGas( dataProvider2, { from: dataConsumerOwner1 } )
        const totalCost4 = await calculateCost([receipt1, receipt2, receipt3, receipt4], 0)
        const finalExpectedBalance4 = new BN(String(startBalance)).sub(totalCost4)
        const newBalance4 = await web3.eth.getBalance(dataConsumerOwner1)
        expect(newBalance4.toString()).to.equal(finalExpectedBalance4.toString())
      } )

    })

    describe('should fail', function () {
      it( 'only owner can withdraw - should revert with error', async function () {
        const topupValue = web3.utils.toWei("0.1", "ether")

        // add provider in order to top up first
        await this.MockConsumerContract1.addDataProvider( dataProvider1, 100, { from: dataConsumerOwner1 } )
        await this.MockConsumerContract1.topUpGas(dataProvider1, { from: dataConsumerOwner1, value: topupValue })

        await expectRevert(
          this.MockConsumerContract1.withdrawTopUpGas(dataProvider1, { from: rando }),
          "Consumer: only owner can do this"
        )
      } )

      it( 'must have something to withdraw - revert with error', async function () {
        await expectRevert(
          this.MockConsumerContract1.withdrawTopUpGas(dataProvider1, { from: dataConsumerOwner1 }),
          "Consumer: nothing to withdraw"
        )
      } )

    })

  })
})
