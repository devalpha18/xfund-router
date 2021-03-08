const MockToken = artifacts.require("MockToken")
const Router = artifacts.require("Router")
const ConsumerLib = artifacts.require("ConsumerLib")
const MockConsumer = artifacts.require("MockConsumer")
const MockConsumerCustomRequest = artifacts.require("MockConsumerCustomRequest")

module.exports = function (deployer, network) {
  // deployment steps
  switch (network) {
    default:
    case "development":
    case "develop":
      // 1. MockToken
      deployer
        .deploy(MockToken, "MockToken", "MOCK", 10000000000000, 9)
        .then(function () {
          // 2. Router
          return deployer.deploy(Router, MockToken.address)
        })
        .then(function () {
          // 3. ConsumerLib
          return deployer.deploy(ConsumerLib)
        })
        .then(function () {
          // 4. MockConsumer
          deployer.link(ConsumerLib, MockConsumer)
          return deployer.deploy(MockConsumer, Router.address)
        })
        .then(function () {
          deployer.link(ConsumerLib, MockConsumerCustomRequest)
          return deployer.deploy(MockConsumerCustomRequest, Router.address)
        })
      break
    case "rinkeby":
    case "rinkeby-fork":
      // 1. Router
      deployer.deploy(Router, "0x245330351344f9301690d5d8de2a07f5f32e1149").then(function () {
        // 2. ConsumerLib
        return deployer.deploy(ConsumerLib)
      })
      break
    case "mainnet":
      deployer.deploy(Router, "0x892A6f9dF0147e5f079b0993F486F9acA3c87881").then(function () {
        // 2. ConsumerLib
        return deployer.deploy(ConsumerLib)
      })
      break
  }
}
