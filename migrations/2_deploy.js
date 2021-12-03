const MockToken = artifacts.require("MockToken")
const Router = artifacts.require("Router")
const MockConsumer = artifacts.require("MockConsumer")
const DemoConsumer = artifacts.require("DemoConsumer2")

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
          // 3. MockConsumer
          return deployer.deploy(MockConsumer, Router.address, MockToken.address)
        })
        .then(function () {
          // 4. MockConsumerCustomRequest
          return deployer.deploy(
            DemoConsumer,
            Router.address,
            MockToken.address,
            "0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d",
            "10000000",
          )
        })
      break
    case "rinkeby":
    case "rinkeby-fork":
      // Router
      deployer.deploy(Router, "0x245330351344f9301690d5d8de2a07f5f32e1149")
      break
    case "mainnet":
    case "mainnet-fork":
      // Router
      deployer.deploy(Router, "0x892A6f9dF0147e5f079b0993F486F9acA3c87881")
      break
  }
}
