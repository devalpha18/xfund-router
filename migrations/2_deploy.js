const MockToken = artifacts.require("MockToken")
const Router = artifacts.require("Router")
const ConsumerLib = artifacts.require("ConsumerLib")
const MockConsumer = artifacts.require("MockConsumer")
const MockBadConsumerInfiniteGas = artifacts.require("MockBadConsumerInfiniteGas")
const MockBadConsumerBigReceive = artifacts.require("MockBadConsumerBigReceive")
const MockConsumerCustomRequest = artifacts.require("MockConsumerCustomRequest")

module.exports = function(deployer, network) {
  // deployment steps
  switch(network) {
    case "development":
    case "develop":
      // 1. MockToken
      deployer.deploy(MockToken, "MockToken", "MOCK", 10000000000000, 9).then(function(){
        // 2. Router
        return deployer.deploy(Router, MockToken.address)
      }).then(function(){
        // 3. ConsumerLib
        return deployer.deploy(ConsumerLib)
      }).then(function(){
        // 4. MockConsumer
        deployer.link(ConsumerLib, MockConsumer)
        return deployer.deploy(MockConsumer, Router.address)
      }).then(function() {
        deployer.link(ConsumerLib, MockBadConsumerBigReceive)
        return deployer.deploy(MockBadConsumerBigReceive, Router.address)
      }).then(function() {
        deployer.link(ConsumerLib, MockConsumerCustomRequest)
        return deployer.deploy(MockConsumerCustomRequest, Router.address)
      }).then(function() {
        deployer.link(ConsumerLib, MockBadConsumerInfiniteGas)
        return deployer.deploy(MockBadConsumerInfiniteGas, Router.address)
      })
      break
    case "rinkeby":
    case "rinkeby-fork":
      // 1. MockToken
      deployer.deploy(MockToken, "xFUND Mock", "xFUNDMOCK", 100000000000, 9).then(function(){
        // 2. Router
        return deployer.deploy(Router, MockToken.address)
      }).then(function(){
        // 3. ConsumerLib
        return deployer.deploy(ConsumerLib)
      })
      break
    case "mainnet":
      deployer.deploy(Router, "0x892A6f9dF0147e5f079b0993F486F9acA3c87881")
      deployer.deploy(ConsumerLib)
      break
  }
}
