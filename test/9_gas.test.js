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
  const [admin, dataConsumerOwner, dataProvider, rando, eoa] = accounts
  const decimals = 9
  const initSupply = 1000 * (10 ** decimals)
  const salt = web3.utils.soliditySha3(web3.utils.randomHex(32), new Date())
  const ROLE_DATA_PROVIDER = web3.utils.sha3('DATA_PROVIDER')

  beforeEach(async function () {
    const initialAmount = 1000
    const amountForContract = 100
    // admin deploy Token contract
    this.MockTokenContract = await MockToken.new("MockToken", "MockToken", initSupply, decimals, {from: admin})

    // admin deploy Router contract
    this.RouterContract = await Router.new(this.MockTokenContract.address, salt, {from: admin})

    // dataConsumerOwner deploy Consumer contract
    this.MockConsumerContract = await MockConsumer.new(this.RouterContract.address, {from: dataConsumerOwner})

    // Admin Transfer Tokens to dataConsumerOwner
    await this.MockTokenContract.transfer( dataConsumerOwner, initialAmount, { from: admin } )

    // dataConsumerOwner Transfer Tokens to MockConsumerContract
    await this.MockTokenContract.transfer( this.MockConsumerContract.address, amountForContract, { from: dataConsumerOwner } )
  })

  /*
   * Withdraw Token tests
   */
  describe('gas topup', function () {
    describe('should succeed', function () {
      beforeEach(async function () {
        // add a data provider
        await this.MockConsumerContract.addDataProvider(dataProvider, 100,  { from: dataConsumerOwner } )
      })

      it( 'owner can top up - Router emits GasToppedUp event', async function () {
        const topupValue = web3.utils.toWei("0.1", "ether")

        const receipt = await this.MockConsumerContract.topUpGas(dataProvider, { from: dataConsumerOwner, value: topupValue })

        expectEvent(receipt, 'GasToppedUp', {
          dataConsumer: this.MockConsumerContract.address,
          dataProvider: dataProvider,
          amount: topupValue
        })
      } )

      it( 'owner can top up - Router account balance should be 0.1 ETH', async function () {
        const topupValue = web3.utils.toWei("0.1", "ether")

        const startBalance = await web3.eth.getBalance(this.RouterContract.address)
        expect(Number(startBalance)).to.equal(0)

        await this.MockConsumerContract.topUpGas(dataProvider, { from: dataConsumerOwner, value: topupValue })

        const newBalance = await web3.eth.getBalance(this.RouterContract.address)

        expect(newBalance.toString()).to.equal(topupValue.toString())
      } )

      it( 'owner can top up - Consumer contract account balance should remain zero', async function () {
        const topupValue = web3.utils.toWei("0.1", "ether")

        const startBalance = await web3.eth.getBalance(this.MockConsumerContract.address)
        expect(Number(startBalance)).to.equal(0)

        await this.MockConsumerContract.topUpGas(dataProvider, { from: dataConsumerOwner, value: topupValue })

        const newBalance = await web3.eth.getBalance(this.MockConsumerContract.address)

        expect(Number(newBalance)).to.equal(0)
      } )

      it( 'owner can top up - dataConsumerOwner account balance should be reduced by topup amount and gas', async function () {
        const topupValue = web3.utils.toWei("0.5", "ether")

        const startBalance = await web3.eth.getBalance(dataConsumerOwner)

        const receipt = await this.MockConsumerContract.topUpGas(dataProvider, { from: dataConsumerOwner, value: topupValue })

        const totalCost = await calculateCost([receipt], topupValue)

        const finalExpectedBalance = new BN(String(startBalance)).sub(totalCost)

        const newBalance = await web3.eth.getBalance(dataConsumerOwner)

        expect(newBalance.toString()).to.equal(finalExpectedBalance.toString())
      } )

      it( 'owner can top up - Router getTotalGasDeposits should be 0.1 ETH', async function () {
        const topupValue = web3.utils.toWei("0.1", "ether")

        await this.MockConsumerContract.topUpGas(dataProvider, { from: dataConsumerOwner, value: topupValue })

        const depositValue = await this.RouterContract.getTotalGasDeposits()

        expect(depositValue.toString()).to.equal(topupValue.toString())
      } )

      it( 'owner can top up - Router getGasDepositsForConsumer should be 0.1 ETH', async function () {
        const topupValue = web3.utils.toWei("0.1", "ether")

        await this.MockConsumerContract.topUpGas(dataProvider, { from: dataConsumerOwner, value: topupValue })

        const depositValue = await this.RouterContract.getGasDepositsForConsumer(this.MockConsumerContract.address)

        expect(depositValue.toString()).to.equal(topupValue.toString())
      } )

      it( 'owner can top up - Router getGasDepositsForConsumerProviders should be 0.1 ETH', async function () {
        const topupValue = web3.utils.toWei("0.1", "ether")

        await this.MockConsumerContract.topUpGas(dataProvider, { from: dataConsumerOwner, value: topupValue })

        const depositValue = await this.RouterContract.getGasDepositsForConsumerProviders(this.MockConsumerContract.address, dataProvider)

        expect(depositValue.toString()).to.equal(topupValue.toString())
      } )
    })

    describe('should fail', function () {

      it( 'only owner can top up - should revert with error', async function () {
        const topupValue = web3.utils.toWei("0.1", "ether")

        // add a data provider
        await this.MockConsumerContract.addDataProvider(dataProvider, 100,  { from: dataConsumerOwner } )

        await expectRevert(
          this.MockConsumerContract.topUpGas(dataProvider, { from: rando, value: topupValue }),
          "Consumer: only owner can do this"
        )
      } )

      it( 'must be authorised provider - should revert with error', async function () {
        const topupValue = web3.utils.toWei("0.1", "ether")

        await expectRevert(
          this.MockConsumerContract.topUpGas(dataProvider, { from: dataConsumerOwner, value: topupValue }),
          "Consumer: _dataProvider does not have role DATA_PROVIDER"
        )
      } )

      it( 'owner requires sufficient ETH balance - should revert with error', async function () {
        const silly = web3.utils.toWei("150", "ether")
        const topupValue = web3.utils.toWei("101", "ether")
        await this.RouterContract.setGasTopUpLimit(silly, { from: admin })
        await this.MockConsumerContract.setGasTopUpLimit(silly, { from: dataConsumerOwner })
        // add a data provider
        await this.MockConsumerContract.addDataProvider(dataProvider, 100,  { from: dataConsumerOwner } )
        await expectRevert(
          this.MockConsumerContract.topUpGas(dataProvider, { from: dataConsumerOwner, value: topupValue}),
          "Consumer: sender has insufficient balance"
        )
      } )

      it( 'owner requires sufficient ETH balance - owner balance should not change', async function () {
        const silly = web3.utils.toWei("150", "ether")
        const topupValue = web3.utils.toWei("101", "ether")
        await this.RouterContract.setGasTopUpLimit(silly, { from: admin })
        await this.MockConsumerContract.setGasTopUpLimit(silly, { from: dataConsumerOwner })

        // add a data provider
        await this.MockConsumerContract.addDataProvider(dataProvider, 100,  { from: dataConsumerOwner } )

        const startBalance = await web3.eth.getBalance(dataConsumerOwner)

        await expectRevert(
          this.MockConsumerContract.topUpGas(dataProvider, { from: dataConsumerOwner, value: topupValue}),
          "Consumer: sender has insufficient balance"
        )

        const newBalance = await web3.eth.getBalance(dataConsumerOwner)

        expect(newBalance.toString()).to.equal(startBalance.toString())
      } )

      it( 'owner requires sufficient ETH balance - router balance should not change', async function () {
        const silly = web3.utils.toWei("150", "ether")
        const topupValue = web3.utils.toWei("101", "ether")
        await this.RouterContract.setGasTopUpLimit(silly, { from: admin })
        await this.MockConsumerContract.setGasTopUpLimit(silly, { from: dataConsumerOwner })

        // add a data provider
        await this.MockConsumerContract.addDataProvider(dataProvider, 100,  { from: dataConsumerOwner } )

        await expectRevert(
          this.MockConsumerContract.topUpGas(dataProvider, { from: dataConsumerOwner, value: topupValue}),
          "Consumer: sender has insufficient balance"
        )

        const routerBalance = await web3.eth.getBalance(this.RouterContract.address)

        expect(routerBalance.toString()).to.equal("0")
      } )

      it( 'amount must be > 0: no value sent - should revert with error', async function () {
        // add a data provider
        await this.MockConsumerContract.addDataProvider(dataProvider, 100,  { from: dataConsumerOwner } )
        await expectRevert(
          this.MockConsumerContract.topUpGas(dataProvider, { from: dataConsumerOwner}),
          "Consumer: amount cannot be zero"
        )
      } )

      it( 'amount must be > 0: value set to 0 - should revert with error', async function () {
        // add a data provider
        await this.MockConsumerContract.addDataProvider(dataProvider, 100,  { from: dataConsumerOwner } )
        await expectRevert(
          this.MockConsumerContract.topUpGas(dataProvider, { from: dataConsumerOwner, value: 0}),
          "Consumer: amount cannot be zero"
        )
      } )

      it( 'cannot exceed own limit - should revert with error', async function () {
        const topupValue = web3.utils.toWei("10", "ether")
        // add a data provider
        await this.MockConsumerContract.addDataProvider(dataProvider, 100,  { from: dataConsumerOwner } )
        await expectRevert(
          this.MockConsumerContract.topUpGas(dataProvider, { from: dataConsumerOwner, value: topupValue}),
          "Consumer: amount cannot exceed own gasTopUpLimit"
        )
      } )

    })

  })
})
