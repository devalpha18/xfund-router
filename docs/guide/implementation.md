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
the `Consumer.sol` base smart contract, which in turn links to the `ConsumerLib` and interacts
with the `Router` smart contracts.
:::

## 1. Initialise your project & install dependencies

::: tip Note
if you are integrating into an existing project, or are already familiar with 
initialising `NodeJS` and `Truffle` projects, you can skip this section and move on
to [2.1 Import the xfund-router Library contracts](#_2-1-import-the-xfund-router-library-contracts).
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

We need to install some dependencies for the project - `dotenv`, `@unification-com/xfund-router`
and `@truffle/hdwallet-provider`:

```bash 
npm install @unification-com/xfund-router dotenv
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

Next, we need to import the `Consumer.sol` smart contract, which interfaces with the 
`ConsumerLib.sol` library smart contract, and the `Router.sol` smart contract (both of which
have been deployed and are maintained by the Unification Foundation). The `Consumer.sol`
smart contract contains all the required functions for interacting with the system, meaning that
you only need to define a couple of simple functions in your own smart contract in order to
use the OoO system.

::: tip Note
You can view the functions implemented by `Consumer.sol` in the [Data Consumer smaert contract
API documentation](../api/lib/Consumer.md). These functions are also callable from your
smart contract.
:::

First, import the `Consumer.sol` smart contract. After the `pragma` definition, add:

```solidity
import "@unification-com/xfund-router/contracts/lib/Consumer.sol";
```

Then, edit the contract definition, so that it extends `Consumer.sol`:

```solidity
contract MyDataConsumer is Consumer {
```

Finally, modify the `constructor` function to call the `Consumer.sol`'s constructor:

```solidity
    constructor(address _router)
    public Consumer(_router) {
        price = 0;
    }
```

The full `MyDataConsumer.sol` contract code should now look like this:

```solidity
// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "@unification-com/xfund-router/contracts/lib/Consumer.sol";

contract MyDataConsumer is Consumer {

    uint256 public price;

    constructor(address _router)
    public Consumer(_router) {
        price = 0;
    }
}
```

## 3. Define the required smart contract functions

Next, we need to add a couple of functions which we will use to request data, and which
a Data Provider will use to fulfil the request and send data to our smart contract.

The functions can be called anything, but for simplicity, we'll call them `requestData` and
`recieveData`.

### 3.1 requestData

`requestData`: we will call this function to request data from a data provider. It passes
the data request on to the Router, which Data Providers watch for events being emitted. When a provider
sees a data request for them, they can act on it and supply the data. This function must have
the following parameters - although the names do not matter:

`address payable _dataProvider` - the wallet address provider we are requesting data from  
`bytes32 _data`, - the data we are requesting  
`uint256 _gasPrice` - the maximum price we are willing to pay for the provider to fulfil the request

The `requestData` function must also, at the very least, call `Consumer.sol`'s `submitDataRequest`
function, which validates the request and forwards it to the Router smart contract.

Add the following function definition to your `MyDataConsumer.sol` contract:

```solidity
    function requestData(
        address payable _dataProvider,
        bytes32 _data,
        uint256 _gasPrice)
    public returns (bytes32 requestId) {
        // call the underlying Consumer.sol's submitDataRequest function
        return submitDataRequest(_dataProvider, _data, _gasPrice, this.recieveData.selector);
    }
```

The return value is optional.

::: tip Note
`this.recieveData.selector` is an encoded value automatically calculated. This is ultimately
passed to the Router, and is what the data provider will call when fulfilling a request. If
you are naming the Receiver function something other than `recieveData`, then this will need
modifying to reflect that, e.g. `this.myOwnFunction.selector`
:::

::: danger IMPORTANT
`_data` is passed to the `ConsumerLib.sol`'s `submitDataRequest` function which 
accepts a `bytes32` value. This in turn forwards it to the Router, and ultimately
the Data Provider, which decodes the Hex input back to the string.

As such the data request string should be converted to a `hex` value before 
calling your smart contract's `requestData` function and passing the value. 

For example, when requesting `BTC.USD.PRC.AVG.IDG`, this can be done with:

```javascript
const endpoint = web3.utils.asciiToHex("BTC.USD.PRC.AVG.IDQ")
```

will resulting value for `endpoint` is `0x4254432e5553442e5052432e4156472e494451` - the 
actual `_data` value that should be sent to the `requestData` function when calling it.
:::

### 3.2 recieveData

`recieveData` will be called by the Data Provider (indirectly - it is actually proxied 
via the Router smart contract) in order to fulfil a data request and send data to our smart contract.
It must have the following parameters - although the names do not matter:

`uint256 _price` - the price data the provider is sending  
`bytes32 _requestId` - the ID of the request being fulfilled  
`bytes memory _signature` - the provider's signature containing the data, request ID etc.used
to validate the data being sent is actually from the requested provider etc.

::: danger Important
It must also have the `Consumer.sol`'s `isValidFulfillment` modifier, so that the origin
of the data fulfilment can be verified such that only genuine data fulfilments are executed
from authorised providers!
:::

Add the following function definition to your `MyDataConsumer.sol` contract:

```solidity
    function recieveData(
        uint256 _price,
        bytes32 _requestId,
        bytes memory _signature
    )
    external
    // Important: include this modifier!
    isValidFulfillment(_requestId, _price, _signature)
    returns (bool success) {
        // set the new price as sent by the provider
        price = _price;
        // clean up the request ID - it's no longer required to be stored.
        deleteRequest(_price, _requestId, _signature);
        return true;
    }
```

::: warning Note
the `deleteRequest` function call is optional but highly recommended. It is a built
in function in the `Consumer.sol` smart contract, and will clean up the now unused request ID
from your contract's storage.
:::

You can optionally also add an event to the function, for example:

Define a new event in the contract:

```solidity
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

import "@unification-com/xfund-router/contracts/lib/Consumer.sol";

contract MyDataConsumer is Consumer {

    uint256 public price;

    event GotSomeData(bytes32 requestId, uint256 price);

    constructor(address _router)
    public Consumer(_router) {
        price = 0;
    }

    function requestData(
        address payable _dataProvider,
        bytes32 _data,
        uint256 _gasPrice)
    public returns (bytes32 requestId) {
        // call the underlying Consumer.sol's submitDataRequest function
        return submitDataRequest(_dataProvider, _data, _gasPrice, this.recieveData.selector);
    }

    function recieveData(
        uint256 _price,
        bytes32 _requestId,
        bytes memory _signature
    )
    external
    // Important: include this modifier!
    isValidFulfillment(_requestId, _price, _signature)
    returns (bool success) {
        // set the new price as sent by the provider
        price = _price;

        // optionally emit an event to the logs
        emit GotSomeData(_requestId, _price);

        // clean up the request ID - it's no longer required to be stored.
        deleteRequest(_price, _requestId, _signature);
        return true;
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
# Most functions in Consumer.sol can only be called by the owner
ETH_PKEY=
# Infura API key - used for deployment
INFURA_PROJECT_ID=
# Contract address of the xFUND Router
ROUTER_ADDRESS=0xa73863Af7c7ff1D7f0c1324f609bdd306868Bb98
# Contract address of the deployed ConsumerLib
CONSUMER_LIB_ADDRESS=0x5AB9426a904a14116E94F0269604f0785c03ED7D
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
