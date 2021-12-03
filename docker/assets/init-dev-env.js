const { BN } = require("@openzeppelin/test-helpers")

const MockERC20 = artifacts.require("MockToken")
const Router = artifacts.require("Router")
const DemoConsumer2 = artifacts.require("DemoConsumer2")

module.exports = async function (callback) {
  const token = await MockERC20.deployed()
  const router = await Router.deployed()
  const consumer = await DemoConsumer2.deployed()

  const accounts = await web3.eth.getAccounts()
  const owner = accounts[0]
  const oracle = accounts[3]

  for (let i = 2; i < accounts.length; i += 1) {
    console.log("transfer tokens to", accounts[i])
    try {
      await token.transfer(accounts[i], 100000000000, { from: owner })
    } catch (e) {
      console.error(e)
    }
  }

  console.log("transfer tokens to consumer contract")
  try {
    await token.transfer(consumer.address, 100000000000, { from: owner })
  } catch (e) {
    console.error(e)
  }

  console.log("increase ooo router allowance in consumer contract")

  try {
    await consumer.increaseRouterAllowance(
      "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      { from: owner },
    )
  } catch (e) {
    console.error(e)
  }

  console.log("register oracle")

  try {
    await router.registerAsProvider(10000000, { from: oracle })
  } catch (e) {
    console.error(e)
  }

  console.log("done")

  callback()
}
