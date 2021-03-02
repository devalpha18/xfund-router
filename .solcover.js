module.exports = {
  skipFiles: [ "mocks/bad/MockBadConsumer.sol",
    "mocks/bad/MockBadConsumerBigReceive.sol",
    "mocks/bad/MockBadConsumerInfiniteGas.sol",
    "mocks/MockConsumer.sol",
    "mocks/MockConsumerCustomRequest.sol",
    "mocks/MockToken.sol"],
  providerOptions: {
    mnemonic: "myth like bonus scare over problem client lizard pioneer submit female collect"
  },
  mocha: {
    enableTimeouts: false
  }
}