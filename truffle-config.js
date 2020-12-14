require("dotenv").config()
const HDWalletProvider = require('@truffle/hdwallet-provider');

const {
  ETH_PKEY_RINKEBY,
  INFURA_PROJECT_ID_RINKEBY,
  RINKEBY_GAS_PRICE,
  ETH_PKEY_MAINNET,
  INFURA_PROJECT_ID_MAINNET,
  MAINNET_GAS_PRICE } = process.env

module.exports = {
  networks: {
    // ganache-cli
    development: {
     host: "127.0.0.1",     // Localhost (default: none)
     port: 8545,            // Standard Ethereum port (default: none)
     network_id: "*",       // Any network (default: none)
    },
    // truffle develop console
    develop: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
    },
    rinkeby: {
      provider: () => new HDWalletProvider(
        [ETH_PKEY_RINKEBY], `https://rinkeby.infura.io/v3/${INFURA_PROJECT_ID_RINKEBY}`, 0, 1
      ),
      networkId: 4,
      gasPrice: RINKEBY_GAS_PRICE || 10e9
    },
    mainnet: {
      provider: () => new HDWalletProvider(
        [ETH_PKEY_MAINNET], `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID_MAINNET}`, 0, 1
      ),
      network_id: 1,
      gasPrice: MAINNET_GAS_PRICE || 120e9
    }
  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
    // timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.6.12",
      settings: {
        optimizer: {
          enabled: false,
          runs: 200
        }
      }
    }
  }
};
