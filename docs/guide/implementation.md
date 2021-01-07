# Implementation & Integration Guide

This guide will walk you through all the necessary steps to get a fully working (albeit simple)
smart contract, which can obtain Price data from the Finchains Oracle of Oracles.

This guide will result in something similar to the [Data Consumer Demo](https://github.com/unification-com/data-consumer-demo).

The instructions will outline the steps required to deploy on the Rinkeby testnet, but
will also work with mainnet.

::: danger IMPORTANT
You **do not** need to implement or deploy either the `Router.sol` or `ConsumerLib.sol` 
smart contracts.

These are smart contracts deployed and maintained by the Unification Foundation and are
the core of the xFUND Router network. Your smart contract will only import and build on
the `ConsumerBase.sol` base smart contract, which in turn links to the `ConsumerLib` and interacts
with the `Router` smart contracts.
:::

## 1. Initialise your project & install dependencies

::: tip Note
if you are integrating into an existing project, or are already familiar with 
initialising `NodeJS` and `Truffle` projects, you can skip this section and move on
to [1.2. Install the required dependencies](#_1-2-install-the-required-dependencies).
:::

### 1.1. Initialise your project
Create the directory, and initialise NPM - accept the defaults for the `npm init` command:

```bash 
mkdir consumer_demo && cd consumer_demo
npm init
```

Install truffle, and initialise the Truffle project:

```bash 
npm install truffle --save-dev
npx truffle init
```

You should now have a project structure as follows:

```bash 
contracts
migrations
node_modules
package.json
package-lock.json
test
truffle-config.js
```

### 1.2. Install the required dependencies

We need to install some dependencies for the project - `@unification-com/xfund-router`:

```bash 
npm install @unification-com/xfund-router
```

If you don't have them installed already, we also need `dotenv` and
`@truffle/hdwallet-provider`, both of which will be used to aid deployment and
interaction later:

```bash 
npm install dotenv
npm install @truffle/hdwallet-provider --save-dev
```

## 2. Create the initial Contract

We'll start with a simple contract structure. With a text editor, create `contracts/MyDataConsumer.sol`
with the following contents:

```solidity
// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

contract MyDataConsumer {

    uint256 public price;

    constructor() {
        price = 0;
    }
}
```

This will be the basis for adding the OoO functionality from the `xfund-router` libraries.

The `price` variable is what we would like to be updated by OoO when we request data.

### 2.1 Import the `xfund-router` Library contracts

Next, we need to import the `ConsumerBase.sol` smart contract, which interfaces with the 
`ConsumerLib.sol` library smart contract, and the `Router.sol` smart contract (both of which
have been deployed and are maintained by the Unification Foundation). The `ConsumerBase.sol`
smart contract contains all the required functions for interacting with the system, meaning that
you only need to define a couple of simple functions in your own smart contract in order to
use the OoO system.

::: tip Note
You can view the functions implemented by `ConsumerBase.sol` in the [Data Consumer smaert contract
API documentation](../api/lib/ConsumerBase.md). These functions are also callable from your
smart contract.
:::

First, import the `ConsumerBase.sol` smart contract. After the `pragma` definition, add:

```solidity
import "@unification-com/xfund-router/contracts/lib/ConsumerBase.sol";
```

Then, edit the contract definition, so that it extends `ConsumerBase.sol`:

```solidity
contract MyDataConsumer is ConsumerBase {
```

Finally, modify the `constructor` function to call the `ConsumerBase.sol`'s constructor:

```solidity
    constructor(address _router)
    public ConsumerBase(_router) {
        price = 0;
    }
```

The full `MyDataConsumer.sol` contract code should now look like this:

```solidity
// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "@unification-com/xfund-router/contracts/lib/ConsumerBase.sol";

contract MyDataConsumer is ConsumerBase {

    uint256 public price;

    constructor(address _router)
    public ConsumerBase(_router) {
        price = 0;
    }
}
```

## 3. Define the required `recieveData` smart contract function

`recieveData` will be called by the Data Provider (indirectly - it is actually proxied 
via the Router smart contract) in order to fulfil a data request and send data to 
our smart contract. It should override the abstract `recieveData` function defined
in the `ConsumerBase.sol` base smart contract, and must have the following parameters:

`uint256 _price` - the price data the provider is sending  
`bytes32 _requestId` - the ID of the request being fulfilled. This is passed
in case your contract needs to do some further processing with the request ID.

Add the following function definition to your `MyDataConsumer.sol` contract:

```solidity
    function receiveData(uint256 _price, bytes32 _requestId)
    internal override {
        price = _price;
    }
```

You can optionally also add an event to the function, for example:

Define a new event in the contract:

```solidity
contract MyDataConsumer is ConsumerBase {
    ...
    event GotSomeData(bytes32 requestId, uint256 price);
```

and emit within the `recieveData` function:

```solidity
    function recieveData( ...
        ...
        emit GotSomeData(_requestId, _price);
```

The final `MyDataConsumer.sol` code should now look something like this:

```solidity
// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "@unification-com/xfund-router/contracts/lib/ConsumerBase.sol";

contract MyDataConsumer is ConsumerBase {

    uint256 public price;

    event GotSomeData(bytes32 requestId, uint256 price);

    constructor(address _router)
    public ConsumerBase(_router) {
        price = 0;
    }

    function receiveData(uint256 _price, bytes32 _requestId)
    internal override {
        price = _price;
        // optionally emit an event to the logs
        emit GotSomeData(_requestId, _price);
    }
}
```

## 4. Set up the deployment .env and truffle-config.js

Ensure that you have:

1. an [Infura](https://infura.io/) account and API key
2. a test wallet private key and address with [Test ETH on Rinkeby](https://faucet.rinkeby.io/) testnet

### 4.1 .env

Create a `.env` file in the root of your project, with the following. The `ROUTER_ADDRESS`
and `CONSUMER_LIB_ADDRESS` have been pre-filled for you with the current Ribkeby testnet 
values:

```dotenv
# Private key for wallet used to deploy. This will be the contract owner
# Most functions in ConsumerBase.sol can only be called by the owner
ETH_PKEY=
# Infura API key - used for deployment
INFURA_PROJECT_ID=
# Contract address of the xFUND Router
ROUTER_ADDRESS=0x3c0973B8Bf9bCafaa5e748aC2617b1C19b15dD8B
# Contract address of the deployed ConsumerLib
CONSUMER_LIB_ADDRESS=0xD64127b18F8280F0528Cf5b77402a358cC21612E
```

### 4.2 truffle-config.js

Edit the `truffle-config.js` file in the root of your project with the following, set up
for Rinkeby testnet:

```javascript
require("dotenv").config()
const HDWalletProvider = require('@truffle/hdwallet-provider');

const {
  ETH_PKEY,
  INFURA_PROJECT_ID,
} = process.env

module.exports = {
  networks: {
    develop: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
    },
    rinkeby: {
      provider: () =>
        new HDWalletProvider({
          privateKeys: [ETH_PKEY],
          providerOrUrl: `https://rinkeby.infura.io/v3/${INFURA_PROJECT_ID}`
        }),
      network_id: "4",
      gas: 10000000,
      gasPrice: 100000000000,
      skipDryRun: true,
    }
  },
  compilers: {
    solc: {
      version: "0.6.12",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  }
};
```

## 5. Set up the Truffle migrations scripts

create the following Truffle migration script in `migrations/2_deploy.js`:

```javascript
require("dotenv").config()
const MyDataConsumer = artifacts.require("MyDataConsumer")

const {
  CONSUMER_LIB_ADDRESS,
  ROUTER_ADDRESS,
} = process.env

module.exports = function(deployer) {
  MyDataConsumer.link("ConsumerLib", CONSUMER_LIB_ADDRESS)
  deployer.deploy(MyDataConsumer, ROUTER_ADDRESS)
}
```

This will deploy your contract with the required parameters, and also link your contract
to the already deployed `ConsumerLib.sol` smart contract.

::: danger IMPORTANT
your contract must be linked to the deployed `ConsumerLib.sol` smart contract - either
the version already deployed at the above address by the Unification Foundation, or via your
own deployment. Without the link, the OoO functionality will not work.
:::

## 6. Deploy your contract

Finally, deploy your contract with the following command:

```bash 
npx truffle migrate --network=rinkeby
```

That's it! You're now ready to initialise and interact with your OoO enabled smart contract.

On to [interaction](interaction.md).
