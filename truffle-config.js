require("dotenv").config()
const HDWalletProvider = require('@truffle/hdwallet-provider');

const {
  ETH_PKEY_RINKEBY,
  INFURA_PROJECT_ID_RINKEBY,
  ETH_PKEY_MAINNET,
  INFURA_PROJECT_ID_MAINNET,
} = process.env

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
      network_id: 4,
      gasPrice: 100000000000 // 100e9 = 100 gwei
    },
    mainnet: {
      provider: () => new HDWalletProvider(
        [ETH_PKEY_MAINNET], `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID_MAINNET}`, 0, 1
      ),
      network_id: 1,
      gasPrice: 120000000000 // 120e9 = 120 gwei
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
