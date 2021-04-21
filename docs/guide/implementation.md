# Implementation & Integration Guide

This guide will walk you through all the necessary steps to get a fully working (albeit simple)
smart contract, which can obtain Price data from the Finchains Oracle of Oracles.

This guide will result in something similar to the [Data Consumer Demo](https://github.com/unification-com/data-consumer-demo).

The instructions will outline the steps required to deploy on the Rinkeby testnet, but
will also work with mainnet.

::: danger IMPORTANT
You **do not** need to implement or deploy the `Router.sol` smart contract.

This is a smart contract deployed and maintained by the Unification Foundation and is
the core of the xFUND Router network. Your smart contract will only import and build on
the `ConsumerBase.sol` base smart contract, which in turn interacts
with the `Router` smart contract.
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

pragma solidity >=0.7.0 <0.8.0;

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

Next, we need to import the `ConsumerBase.sol` smart contract, which interacts with 
the `Router.sol` smart contract (which has been deployed and is maintained by the Unification 
Foundation). The `ConsumerBase.sol` smart contract contains required functions for 
interacting with the system. You only need to define a couple of functions in your own 
smart contract in order to use the OoO system, which override or extend the underlying
`ConsumerBase` functions.

::: tip Note
You can view the functions implemented by `ConsumerBase.sol` in the [Data Consumer smart contract
API documentation](../api/lib/ConsumerBase.md). There are some additional helper functions which
can be wrapped in functions in your own smart contract.
:::

First, import the `ConsumerBase.sol` smart contract. After the `pragma` definition, add:

```solidity
import "@unification-com/xfund-router/contracts/lib/ConsumerBase.sol";
```

Then, edit the contract definition, so that it extends `ConsumerBase.sol`:

```solidity
contract MyDataConsumer is ConsumerBase {
```

Finally, modify the `constructor` function to call the `ConsumerBase.sol`'s constructor,
passing the contract addresses for `Router` and `xFUND`:

```solidity
    constructor(address _router, address _xfund)
    public ConsumerBase(_router, _xfund) {
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

    constructor(address _router, address _xfund)
    public ConsumerBase(_router, _xfund) {
        price = 0;
    }
}
```

## 3. Define the required `recieveData` smart contract function

`recieveData` will be called by the Data Provider (indirectly - it is actually proxied 
via the `Router` smart contract) in order to fulfil a data request and send data to 
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

## 4. Define a function to initialise a data request

Next, you'll need a function to request data. This needs to call the `ConsumerBase`'s
`_requestData` function, which will forward the request to the `Router`:

```solidity
    function getData(address _provider, uint256 _fee, bytes32 _data) external returns (bytes32) {
        return _requestData(_provider, _fee, _data);
    }
```

## 5. Add a function to allow `Router` to transfer fees

Finally, you'll need a function that calls `ConsumerBase`'s `_increaseRouterAllowance` function.
This function will increase the `Router`s xFUND allowance, allowing it to pay data request fees on 
behalf of your smart contract:

```solidity
    function increaseRouterAllowance(uint256 _amount) external {
        require(_increaseRouterAllowance(_amount));
    }
```

::: danger Note
This function should be protected by a library such as OpenZeppelin's `Ownable`, and have the
`onlyOwner` modifier applied such that only your contract's owner can all the function!
:::


The final `MyDataConsumer.sol` code should now look something like this:

```solidity
// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "@unification-com/xfund-router/contracts/lib/ConsumerBase.sol";

contract MyDataConsumer is ConsumerBase {

    uint256 public price;

    event GotSomeData(bytes32 requestId, uint256 price);

    constructor(address _router, address _xfund)
    public ConsumerBase(_router, _xfund) {
        price = 0;
    }
    
    // Optionally protect with a modifier to limit who can call
    function getData(address _provider, uint256 _fee, bytes32 _data) external returns (bytes32) {
        return _requestData(_provider, _fee, _data);
    }
    
    // Todo - protect with a modifier to limit who can call!
    function increaseRouterAllowance(uint256 _amount) external {
        require(_increaseRouterAllowance(_amount));
    }

    // ConsumerBase ensures only the Router can call this
    function receiveData(uint256 _price, bytes32 _requestId)
    internal override {
        price = _price;
        // optionally emit an event to the logs
        emit GotSomeData(_requestId, _price);
    }
}
```

**Finally, compile your contract:**

```bash
npx truffle compile
```

## 6. Set up the deployment .env and truffle-config.js

Ensure that you have:

1. an [Infura](https://infura.io/) account and API key
2. a test wallet private key and address with [Test ETH on Rinkeby](https://faucet.rinkeby.io/) testnet

### 6.1 .env

::: tip Note
See [Contract Addresses](../contracts.md) for the latest **Rinkeby** contract address
required for the `ROUTER_ADDRESS` and `XFUND_ADDRESS` variables.
:::

Create a `.env` file in the root of your project with the following and set each value
accordingly:

```dotenv
# Private key for wallet used to deploy. This will be the contract owner
# Most functions in ConsumerBase.sol can only be called by the owner
ETH_PKEY=
# Infura API key - used for deployment
INFURA_PROJECT_ID=
# Contract address of the xFUND Router
ROUTER_ADDRESS=
# Contract address of xFUND
XFUND_ADDRESS=
```

### 6.2 truffle-config.js

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

## 7. Set up the Truffle migrations scripts

create the following Truffle migration script in `migrations/2_deploy.js`:

```javascript
require("dotenv").config()
const MyDataConsumer = artifacts.require("MyDataConsumer")

const { ROUTER_ADDRESS, XFUND_ADDRESS } = process.env

module.exports = function(deployer) {
  deployer.deploy(MyDataConsumer, ROUTER_ADDRESS, XFUND_ADDRESS)
}
```

This will deploy your contract with the required parameters.

## 8. Deploy your contract

Finally, deploy your contract with the following command:

```bash 
npx truffle migrate --network=rinkeby
```

That's it! You're now ready to initialise and interact with your OoO enabled smart contract.

On to [interaction](interaction.md).
