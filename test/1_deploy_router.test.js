const { accounts, contract, web3 } = require('@openzeppelin/test-environment')

const {
  constants,
  expectRevert,
} = require('@openzeppelin/test-helpers')

const { expect } = require('chai')

const MockToken = contract.fromArtifact('MockToken') // Loads a compiled contract
const Router = contract.fromArtifact('Router') // Loads a compiled contract

describe('Router - deploy', function () {
  const [admin, eoa] = accounts
  const decimals = 9
  const initSupply = 1000 * (10 ** decimals)
  const salt = web3.utils.soliditySha3(web3.utils.randomHex(32))

  before(async function () {
    // admin deploy Token contract
    this.MockTokenContract = await MockToken.new("MockToken", "MockToken", initSupply, decimals, {from: admin})
  })

  it('can deploy Router with Token and Salt - has correct token address', async function () {
    const RouterContract = await Router.new(this.MockTokenContract.address, salt, {from: admin})
    expect(await RouterContract.getTokenAddress()).to.equal(this.MockTokenContract.address)
  })

  it('can deploy Router with Token and Salt - has correct salt', async function () {
    const RouterContract = await Router.new(this.MockTokenContract.address, salt, {from: admin})
    expect(await RouterContract.getSalt()).to.equal(salt)
  })

  it('can deploy Router with Token and Salt - deployer has DEFAULT_ADMIN (0x00) role', async function () {
    const RouterContract = await Router.new(this.MockTokenContract.address, salt, {from: admin})
    expect(await RouterContract.hasRole("0x00", admin)).to.equal(true)
  })

  it('must deploy with token', async function () {
    await expectRevert(
      Router.new(constants.ZERO_ADDRESS, salt, {from: admin}),
      "Router: token cannot be zero address"
    )
  })

  it('token address must be a contract', async function () {
    await expectRevert(
      Router.new(eoa, salt, {from: admin}),
      "Router: token address must be a contract"
    )
  })

  it('must supply a salt', async function () {
    await expectRevert(
      Router.new(this.MockTokenContract.address, "0x0", {from: admin}),
      "Router: must include salt"
    )
  })
})
