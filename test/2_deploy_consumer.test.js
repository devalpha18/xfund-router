const { accounts, contract, web3 } = require('@openzeppelin/test-environment')

const {
  constants,
  expectRevert,
} = require('@openzeppelin/test-helpers')

const { expect } = require('chai')

const MockToken = contract.fromArtifact('MockToken') // Loads a compiled contract
const Router = contract.fromArtifact('Router') // Loads a compiled contract
const MockConsumer = contract.fromArtifact('MockConsumer') // Loads a compiled contract

describe('Consumer - deploy', function () {
  this.timeout(300000)
  const [admin, dataConsumerOwner, eoa] = accounts
  const decimals = 9
  const initSupply = 1000 * (10 ** decimals)
  const salt = web3.utils.soliditySha3(web3.utils.randomHex(32))

  before(async function () {
    // admin deploy Token contract
    this.MockTokenContract = await MockToken.new("MockToken", "MockToken", initSupply, decimals, {from: admin})

    // admin deploy Router contract
    this.RouterContract = await Router.new(this.MockTokenContract.address, salt, {from: admin})

  })

  it('can deploy a Consumer contract with router address - has correct router address', async function () {
    const MockConsumerContract = await MockConsumer.new(this.RouterContract.address, {from: dataConsumerOwner})
    expect(await MockConsumerContract.getRouterAddress()).to.equal(this.RouterContract.address)
  })

  it('can deploy a Consumer contract with router address - owner is deployer', async function () {
    const MockConsumerContract = await MockConsumer.new(this.RouterContract.address, {from: dataConsumerOwner})
    expect(await MockConsumerContract.owner()).to.equal(dataConsumerOwner)
  })

  it('can deploy a Consumer contract with router address - deployer has DEFAULT_ADMIN role', async function () {
    const MockConsumerContract = await MockConsumer.new(this.RouterContract.address, {from: dataConsumerOwner})
    expect(await MockConsumerContract.hasRole("0x00", dataConsumerOwner)).to.equal(true)
  })

  it('must deploy with router', async function () {
    await expectRevert(
      MockConsumer.new(constants.ZERO_ADDRESS, {from: dataConsumerOwner}),
      "Consumer: router cannot be the zero address"
    )
  })

  it('router address must be a contract', async function () {
    await expectRevert(
      MockConsumer.new(eoa, {from: dataConsumerOwner}),
      "Consumer: router address must be a contract"
    )
  })
})
