const { constants, expectRevert } = require("@openzeppelin/test-helpers")

const { expect } = require("chai")

const MockToken = artifacts.require("MockToken") // Loads a compiled contract
const Router = artifacts.require("Router") // Loads a compiled contract

contract("Router - deploy", (accounts) => {
  const [admin, eoa] = accounts
  const decimals = 9
  const initSupply = 1000 * 10 ** decimals

  before(async function () {
    // admin deploy Token contract
    this.MockTokenContract = await MockToken.new("MockToken", "MockToken", initSupply, decimals, {
      from: admin,
    })
  })

  it("can deploy Router with Token - has correct token address", async function () {
    const RouterContract = await Router.new(this.MockTokenContract.address, { from: admin })
    expect(await RouterContract.getTokenAddress()).to.equal(this.MockTokenContract.address)
  })

  it("can deploy Router with Token - deployer has DEFAULT_ADMIN (0x00) role", async function () {
    const RouterContract = await Router.new(this.MockTokenContract.address, { from: admin })
    expect(await RouterContract.hasRole("0x00", admin)).to.equal(true)
  })

  it("must deploy with token", async function () {
    await expectRevert(
      Router.new(constants.ZERO_ADDRESS, { from: admin }),
      "Router: token cannot be zero address",
    )
  })

  it("token address must be a contract", async function () {
    await expectRevert(Router.new(eoa, { from: admin }), "Router: token address must be a contract")
  })
})
