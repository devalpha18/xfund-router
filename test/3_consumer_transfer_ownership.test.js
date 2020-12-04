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

describe('Consumer - transfer ownership tests', function () {
  this.timeout(300000)
  const [admin, dataConsumerOwner, newOwner1, newOwner2, rando] = accounts
  const decimals = 9
  const initSupply = 1000 * (10 ** decimals)
  const salt = web3.utils.soliditySha3(web3.utils.randomHex(32), new Date())

  beforeEach(async function () {
    // admin deploy Token contract
    this.MockTokenContract = await MockToken.new("MockToken", "MockToken", initSupply, decimals, {from: admin})

    // admin deploy Router contract
    this.RouterContract = await Router.new(this.MockTokenContract.address, salt, {from: admin})

    // dataConsumerOwner deploy Consumer contract
    this.MockConsumerContract = await MockConsumer.new(this.RouterContract.address, {from: dataConsumerOwner})

  })

  it('initial owner should be deployer address', async function () {
    expect(await this.MockConsumerContract.owner()).to.equal(dataConsumerOwner)
  })

  it('initial owner should have DEFAULT_ADMIN role', async function () {
    expect(await this.MockConsumerContract.hasRole("0x00", dataConsumerOwner)).to.equal(true)
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


  it('owner can transfer ownership - should emit RoleGranted event for newOwner1', async function () {
    expect(await this.MockConsumerContract.owner()).to.equal(dataConsumerOwner)

    const receipt = await this.MockConsumerContract.transferOwnership(newOwner1, {from: dataConsumerOwner})

    expectEvent(receipt, 'RoleGranted', {
      role: "0x0000000000000000000000000000000000000000000000000000000000000000",
      account: newOwner1,
      sender: dataConsumerOwner
    })
  })


  it('owner can transfer ownership - should emit RoleRevoked event for dataConsumerOwner', async function () {
    expect(await this.MockConsumerContract.owner()).to.equal(dataConsumerOwner)

    const receipt = await this.MockConsumerContract.transferOwnership(newOwner1, {from: dataConsumerOwner})

    expectEvent(receipt, 'RoleRevoked', {
      role: "0x0000000000000000000000000000000000000000000000000000000000000000",
      account: dataConsumerOwner,
      sender: dataConsumerOwner
    })
  })

  it('owner can transfer ownership - new owner should be newOwner1', async function () {
    expect(await this.MockConsumerContract.owner()).to.equal(dataConsumerOwner)

    await this.MockConsumerContract.transferOwnership(newOwner1, {from: dataConsumerOwner})

    expect(await this.MockConsumerContract.owner()).to.equal(newOwner1)
  })

  it('owner can transfer ownership - newOwner1 should have DEFAULT_ADMIN role', async function () {
    expect(await this.MockConsumerContract.owner()).to.equal(dataConsumerOwner)

    await this.MockConsumerContract.transferOwnership(newOwner1, {from: dataConsumerOwner})

    expect(await this.MockConsumerContract.hasRole("0x00", newOwner1)).to.equal(true)
  })

  it('owner can transfer ownership - dataConsumerOwner should no longer have DEFAULT_ADMIN role', async function () {
    expect(await this.MockConsumerContract.owner()).to.equal(dataConsumerOwner)

    await this.MockConsumerContract.transferOwnership(newOwner1, {from: dataConsumerOwner})

    expect(await this.MockConsumerContract.hasRole("0x00", dataConsumerOwner)).to.equal(false)
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

  it('new owner can also transfer ownership - should emit RoleGranted event for newOwner2', async function () {
    expect(await this.MockConsumerContract.owner()).to.equal(dataConsumerOwner)

    // first transfer from dataConsumerOwner to newOwner1
    await this.MockConsumerContract.transferOwnership(newOwner1, {from: dataConsumerOwner})

    // trasfer from newOwner1 to newOwner2
    const receipt2 = await this.MockConsumerContract.transferOwnership(newOwner2, {from: newOwner1})

    expectEvent(receipt2, 'RoleGranted', {
      role: "0x0000000000000000000000000000000000000000000000000000000000000000",
      account: newOwner2,
      sender: newOwner1
    })
  })

  it('new owner can also transfer ownership - should emit RoleRevoked event for newOwner1', async function () {
    expect(await this.MockConsumerContract.owner()).to.equal(dataConsumerOwner)

    // first transfer from dataConsumerOwner to newOwner1
    await this.MockConsumerContract.transferOwnership(newOwner1, {from: dataConsumerOwner})

    // trasfer from newOwner1 to newOwner2
    const receipt2 = await this.MockConsumerContract.transferOwnership(newOwner2, {from: newOwner1})

    expectEvent(receipt2, 'RoleRevoked', {
      role: "0x0000000000000000000000000000000000000000000000000000000000000000",
      account: newOwner1,
      sender: newOwner1
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

  it('new owner can also transfer ownership - newOwner2 has DEFAULT_ADMIN role', async function () {
    expect(await this.MockConsumerContract.owner()).to.equal(dataConsumerOwner)

    // first transfer from dataConsumerOwner to newOwner1
    await this.MockConsumerContract.transferOwnership(newOwner1, {from: dataConsumerOwner})

    // trasfer from newOwner1 to newOwner2
    await this.MockConsumerContract.transferOwnership(newOwner2, {from: newOwner1})

    expect(await this.MockConsumerContract.hasRole("0x00", newOwner2)).to.equal(true)
  })

  it('new owner can also transfer ownership - newOwner1 no longer has DEFAULT_ADMIN role', async function () {
    expect(await this.MockConsumerContract.owner()).to.equal(dataConsumerOwner)

    // first transfer from dataConsumerOwner to newOwner1
    await this.MockConsumerContract.transferOwnership(newOwner1, {from: dataConsumerOwner})

    // trasfer from newOwner1 to newOwner2
    await this.MockConsumerContract.transferOwnership(newOwner2, {from: newOwner1})

    expect(await this.MockConsumerContract.hasRole("0x00", newOwner1)).to.equal(false)
  })

  it('new owner can also transfer ownership - dataConsumerOwner no longer has DEFAULT_ADMIN role', async function () {
    expect(await this.MockConsumerContract.owner()).to.equal(dataConsumerOwner)

    // first transfer from dataConsumerOwner to newOwner1
    await this.MockConsumerContract.transferOwnership(newOwner1, {from: dataConsumerOwner})

    // trasfer from newOwner1 to newOwner2
    await this.MockConsumerContract.transferOwnership(newOwner2, {from: newOwner1})

    expect(await this.MockConsumerContract.hasRole("0x00", dataConsumerOwner)).to.equal(false)
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
      "Consumer: only owner can do this"
    )

    expect(await this.MockConsumerContract.owner()).to.equal(dataConsumerOwner)
    expect(await this.MockConsumerContract.hasRole("0x00", dataConsumerOwner)).to.equal(true)
  })

  it('tokens remain intact after failed ownership transfer', async function () {
    // Admin Transfer 10 Tokens to dataConsumerOwner
    await this.MockTokenContract.transfer(dataConsumerOwner, new BN(10 * (10 ** decimals)), {from: admin})
    // dataConsumerOwner Transfer 1 Tokens to MockConsumerContract
    await this.MockTokenContract.transfer(this.MockConsumerContract.address, new BN((10 ** decimals)), {from: dataConsumerOwner})

    await expectRevert(
      this.MockConsumerContract.transferOwnership(newOwner1, {from: rando}),
      "Consumer: only owner can do this"
    )

    expect(await this.MockConsumerContract.owner()).to.equal(dataConsumerOwner)
    expect(await this.MockConsumerContract.hasRole("0x00", dataConsumerOwner)).to.equal(true)

    // dataConsumerOwner should still have 9 tokens, and Consumer contract should still have 1 Token
    const dcBalance = await this.MockTokenContract.balanceOf(dataConsumerOwner)
    const contractBalance = await this.MockTokenContract.balanceOf(this.MockConsumerContract.address)
    expect(dcBalance.toNumber()).to.equal(new BN(9 * (10 ** decimals)).toNumber())
    expect(contractBalance.toNumber()).to.equal(new BN((10 ** decimals)).toNumber())
  })

})
