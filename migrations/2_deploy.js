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
    case "rinkeby-fork":
      // 1. MockToken
      deployer.deploy(MockToken, "xFUND Mock", "xFUNDMOCK", 100000000000, 9).then(function(){
        // 2. Router
        return deployer.deploy(Router, MockToken.address, "0xd9381bc91017ef68d906dcc8cdecbf8e7ccb063074cce60a5518bd9862a72c0f")
      }).then(function(){
        // 3. ConsumerLib
        return deployer.deploy(ConsumerLib)
      })
      break
    case "mainnet":
      deployer.deploy(Router, "0x892A6f9dF0147e5f079b0993F486F9acA3c87881", "0x9587c8ec4a22393173a167d341439333923c66cb2161b6f0a19deef50f69b1f1")
      deployer.deploy(ConsumerLib)
      break
  }
}
