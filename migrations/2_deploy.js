const MockToken = artifacts.require("MockToken")
const Router = artifacts.require("Router")
const ConsumerLib = artifacts.require("ConsumerLib")
const MockConsumer = artifacts.require("MockConsumer")

module.exports = function(deployer, network) {
  // deployment steps
  switch(network) {
    case "development":
    case "develop":
      // 1. MockToken
      deployer.deploy(MockToken, "MockToken", "MOCK", 10000000000000, 9).then(function(){
        // 2. Router
        return deployer.deploy(Router, MockToken.address, "0x5555b7aed0cddd0ef60bef8afb21a7b282d54789ef7d9fd89037475e6fc16e89")
      }).then(function(){
        // 3. ConsumerLib
        return deployer.deploy(ConsumerLib)
      }).then(function(){
        // 4. MockConsumer
        deployer.link(ConsumerLib, MockConsumer)
        return deployer.deploy(MockConsumer, Router.address)
      })
      break
    case "rinkeby":
      break
    case "mainnet":
      break
  }
  // deployer.deploy(MyContract)
}
