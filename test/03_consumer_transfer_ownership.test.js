const { accounts, contract, web3 } = require('@openzeppelin/test-environment')

const {
  BN,           // Big Number support
  expectRevert,
  expectEvent,
} = require('@openzeppelin/test-helpers')

const { expect } = require('chai')

const MockToken = contract.fromArtifact('MockToken') // Loads a compiled contract
const Router = contract.fromArtifact('Router') // Loads a compiled contract
const MockConsumer = contract.fromArtifact('MockConsumer') // Loads a compiled contract
const ConsumerLib = contract.fromArtifact('ConsumerLib') // Loads a compiled contract

describe('Consumer - transfer ownership tests', function () {
  this.timeout(300000)
  const [admin, dataConsumerOwner, newOwner1, newOwner2, rando, dataProvider] = accounts
  const decimals = 9
  const initSupply = 1000 * (10 ** decimals)
  const salt = web3.utils.soliditySha3(web3.utils.randomHex(32), new Date())

  beforeEach(async function () {
    // admin deploy Token contract
    this.MockTokenContract = await MockToken.new("MockToken", "MockToken", initSupply, decimals, {from: admin})

    // admin deploy Router contract
    this.RouterContract = await Router.new(this.MockTokenContract.address, salt, {from: admin})

    // Deploy ConsumerLib library and link
    this.ConsumerLib = await ConsumerLib.new({from: admin})
    await MockConsumer.detectNetwork();
    await MockConsumer.link("ConsumerLib", this.ConsumerLib.address)

    // dataConsumerOwner deploy Consumer contract
    this.MockConsumerContract = await MockConsumer.new(this.RouterContract.address, {from: dataConsumerOwner})

  })

  it('initial owner should be deployer address', async function () {
    expect(await this.MockConsumerContract.owner()).to.equal(dataConsumerOwner)
  })

  it('owner can transfer ownership - should emit OwnershipTransferred event', async function () {
    expect(await this.MockConsumerContract.owner()).to.equal(dataConsumerOwner)

    const receipt = await this.MockConsumerContract.transferOwnership(newOwner1, {from: dataConsumerOwner})

    expectEvent(receipt, 'OwnershipTransferred', {
      sender: dataConsumerOwner,
      previousOwner: dataConsumerOwner,
      newOwner: newOwner1
    })
  })

  it('owner can transfer ownership - new owner should be newOwner1', async function () {
    expect(await this.MockConsumerContract.owner()).to.equal(dataConsumerOwner)

    await this.MockConsumerContract.transferOwnership(newOwner1, {from: dataConsumerOwner})

    expect(await this.MockConsumerContract.owner()).to.equal(newOwner1)
  })

  it('new owner can also transfer ownership - should emit OwnershipTransferred event for newOwner2', async function () {
    expect(await this.MockConsumerContract.owner()).to.equal(dataConsumerOwner)

    // first transfer from dataConsumerOwner to newOwner1
    await this.MockConsumerContract.transferOwnership(newOwner1, {from: dataConsumerOwner})

    // trasfer from newOwner1 to newOwner2
    const receipt2 = await this.MockConsumerContract.transferOwnership(newOwner2, {from: newOwner1})

    expectEvent(receipt2, 'OwnershipTransferred', {
      sender: newOwner1,
      previousOwner: newOwner1,
      newOwner: newOwner2
    })
  })

  it('new owner can also transfer ownership - owner is newOwner2', async function () {
    expect(await this.MockConsumerContract.owner()).to.equal(dataConsumerOwner)

    // first transfer from dataConsumerOwner to newOwner1
    await this.MockConsumerContract.transferOwnership(newOwner1, {from: dataConsumerOwner})

    // trasfer from newOwner1 to newOwner2
    await this.MockConsumerContract.transferOwnership(newOwner2, {from: newOwner1})

    expect(await this.MockConsumerContract.owner()).to.equal(newOwner2)
  })

  it('owner tokens are withdrawn from contract during ownership transfer', async function () {
    expect(await this.MockConsumerContract.owner()).to.equal(dataConsumerOwner)

    // Admin Transfer 10 Tokens to dataConsumerOwner
    await this.MockTokenContract.transfer(dataConsumerOwner, new BN(10 * (10 ** decimals)), {from: admin})

    // dataConsumerOwner should have 10 Tokens
    const dcBalance1 = await this.MockTokenContract.balanceOf(dataConsumerOwner)
    expect(dcBalance1.toNumber()).to.equal(new BN(10 * (10 ** decimals)).toNumber())

    // dataConsumerOwner Transfer 1 Tokens to MockConsumerContract
    await this.MockTokenContract.transfer(this.MockConsumerContract.address, new BN((10 ** decimals)), {from: dataConsumerOwner})

    // dataConsumerOwner should have 9 tokens, and Consumer contract should have 1 Token
    const dcBalance2 = await this.MockTokenContract.balanceOf(dataConsumerOwner)
    const contractBalance1 = await this.MockTokenContract.balanceOf(this.MockConsumerContract.address)
    expect(dcBalance2.toNumber()).to.equal(new BN(9 * (10 ** decimals)).toNumber())
    expect(contractBalance1.toNumber()).to.equal(new BN((10 ** decimals)).toNumber())

    const receipt = await this.MockConsumerContract.transferOwnership(newOwner1, {from: dataConsumerOwner})

    expectEvent(receipt, 'OwnershipTransferred', {
      sender: dataConsumerOwner,
      previousOwner: dataConsumerOwner,
      newOwner: newOwner1
    })

    expectEvent( receipt, 'Transfer', {
      from: this.MockConsumerContract.address,
      to: dataConsumerOwner,
      value: new BN((10 ** decimals))
    } )

    expectEvent( receipt, 'WithdrawTokensFromContract', {
      sender: dataConsumerOwner,
      from: this.MockConsumerContract.address,
      to: dataConsumerOwner,
      amount: new BN((10 ** decimals))
    } )

    // dataConsumerOwner should have 10 tokens again, and Consumer contract should have zero
    const dcBalance3 = await this.MockTokenContract.balanceOf(dataConsumerOwner)
    const contractBalance2 = await this.MockTokenContract.balanceOf(this.MockConsumerContract.address)
    expect(dcBalance3.toNumber()).to.equal(new BN(10 * (10 ** decimals)).toNumber())
    expect(contractBalance2.toNumber()).to.equal(0)
  })

  it('only owner can transfer ownership', async function () {
    await expectRevert(
      this.MockConsumerContract.transferOwnership(newOwner1, {from: rando}),
      "ConsumerLib: only owner"
    )

    expect(await this.MockConsumerContract.owner()).to.equal(dataConsumerOwner)
  })

  it('tokens remain intact after failed ownership transfer', async function () {
    // Admin Transfer 10 Tokens to dataConsumerOwner
    await this.MockTokenContract.transfer(dataConsumerOwner, new BN(10 * (10 ** decimals)), {from: admin})
    // dataConsumerOwner Transfer 1 Tokens to MockConsumerContract
    await this.MockTokenContract.transfer(this.MockConsumerContract.address, new BN((10 ** decimals)), {from: dataConsumerOwner})

    await expectRevert(
      this.MockConsumerContract.transferOwnership(newOwner1, {from: rando}),
      "ConsumerLib: only owner"
    )

    expect(await this.MockConsumerContract.owner()).to.equal(dataConsumerOwner)

    // dataConsumerOwner should still have 9 tokens, and Consumer contract should still have 1 Token
    const dcBalance = await this.MockTokenContract.balanceOf(dataConsumerOwner)
    const contractBalance = await this.MockTokenContract.balanceOf(this.MockConsumerContract.address)
    expect(dcBalance.toNumber()).to.equal(new BN(9 * (10 ** decimals)).toNumber())
    expect(contractBalance.toNumber()).to.equal(new BN((10 ** decimals)).toNumber())
  })

  it('router must have zero eth balance before ownership transfer can happen - should revert', async function () {
    const topupValue = web3.utils.toWei("0.1", "ether")
    await this.MockConsumerContract.addDataProvider(dataProvider, 100,  { from: dataConsumerOwner } )
    await this.MockConsumerContract.topUpGas(dataProvider, { from: dataConsumerOwner, value: topupValue })

    await expectRevert(
      this.MockConsumerContract.transferOwnership(newOwner1, {from: dataConsumerOwner}),
      "ConsumerLib: owner must withdraw all gas from router first"
    )
  })

  it('router must have zero eth balance before ownership transfer can happen - router balance remains intact', async function () {
    const topupValue = web3.utils.toWei("0.1", "ether")
    await this.MockConsumerContract.addDataProvider(dataProvider, 100,  { from: dataConsumerOwner } )
    await this.MockConsumerContract.topUpGas(dataProvider, { from: dataConsumerOwner, value: topupValue })

    await expectRevert(
      this.MockConsumerContract.transferOwnership(newOwner1, {from: dataConsumerOwner}),
      "ConsumerLib: owner must withdraw all gas from router first"
    )

    const routerBalance = await web3.eth.getBalance(this.RouterContract.address)

    expect(routerBalance.toString()).to.equal(topupValue.toString())
  })

  it('router must have zero eth balance before ownership transfer can happen - Router getGasDepositsForConsumer should be 0.1 ETH', async function () {
    const topupValue = web3.utils.toWei("0.1", "ether")
    await this.MockConsumerContract.addDataProvider(dataProvider, 100,  { from: dataConsumerOwner } )
    await this.MockConsumerContract.topUpGas(dataProvider, { from: dataConsumerOwner, value: topupValue })

    await expectRevert(
      this.MockConsumerContract.transferOwnership(newOwner1, {from: dataConsumerOwner}),
      "ConsumerLib: owner must withdraw all gas from router first"
    )

    const depositValue = await this.RouterContract.getGasDepositsForConsumer(this.MockConsumerContract.address)

    expect(depositValue.toString()).to.equal(topupValue.toString())
  })

})
