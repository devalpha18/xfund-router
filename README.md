# xFUND Router & Data Consumer Solidity Smart Contracts

[![npm version](http://img.shields.io/npm/v/@unification-com/xfund-router.svg?style=flat)](https://npmjs.org/package/@unification-com/xfund-router "View this project on npm")

A suite of smart contracts to enable data from external sources (such as Finchains.io)
to be included in your smart contracts. The suite comprises of:

1) A deployed Router smart contract. This facilitates receiving and forwarding data requests,
   between Consumers and Providers, in addition to processing xFUND payments for data provision.
2) A Consumer Library smart contract, which is integrated into your own smart contract in 
   order for data requests to be initialised (via the Router), and data to be received (from
   a designated Provider)
   
The remainder of this `README` is aimed at developers who wish to develop and test the suite itself.
For an integration guide, and how to use the suite in your own smart contracts, please
see the [Documentation](docs/index.md)

## Development and Testing

### Prerequisites

#### NodeJS
The `openzeppelin/test-environment` packages and dependencies require
NodeJS >= `v8.9.4` and <= `v12.18.3` (excluding `v11`) in order to correctly install. 
We recommend using [nvm](https://github.com/nvm-sh/nvm) to manage NodeJS 
installations.

#### Yarn

[Yarn](https://classic.yarnpkg.com/en/docs/install) is recommended for package management.

### Compile

Run:

```bash
yarn install
```

to install the Node packages and dependencies

Run:
```bash 
npx truffle compile
```

to compile smart contracts

### Unit Tests

**Note**: The unit tests utilise the `openzeppelin/test-environment`, not `truffle test`.

To run all tests:

```bash 
yarn test
```

Running all tests will take a few minutes.

To run individual test files:

```bash
npx mocha test/[TEST_FILE] --exit
```

### Deployment & Interaction

Compile the contracts, if not already compiled:

```
npx truffle compile
```

Run the `truffle` development console:

```bash
npx truffle develop
```

**Note**: Make a not of the address and private key for `account[1]`. This will be
required later for Data Provider interaction.

#### Deploy the smart contracts

Run the `truffle` migrations, within the `development` console:

```bash
truffle(develop)> migrate
```

#### Interaction - as a Consumer

Within the `truffle` development console, load the contract instances, and accounts
ready for interaction

```bash 
truffle(develop)> let accounts = await web3.eth.getAccounts()
truffle(develop)> let mockToken = await MockToken.deployed()
truffle(develop)> let mockConsumer = await MockConsumer.deployed()
truffle(develop)> let router = await Router.deployed()
truffle(develop)> let consumerOwner = accounts[0]
truffle(develop)> let provider = accounts[1]
```

##### Initialisation

1. Grab some tokens from the `MockToken` smart contract for the `consumerOwner`. Run:

```bash
truffle(develop)> mockToken.gimme({from: consumerOwner})
```

2. Increase the `Router` Token allowance for the `MockConsumer` contract, so that the Router
   can hold and forward fees to the provider. Run:
   
```bash
truffle(develop)> mockConsumer.increaseRouterAllowance("115792089237316195423570985008687907853269984665640564039457584007913129639935", {from: consumerOwner})
```

3. Authorise a data provider to fulfil data requests and allow them to send data to your
   `MockConsumer` smart contract. Run:
   
```bash
truffle(develop)> mockConsumer.addDataProvider(provider, 100000000, {from: consumerOwner})
```

This will add the wallet address of the `provider` with a fee of 0.1 MOCKs.

4. Transfer some `MOCK` tokens to your `MockConsumer` smart contract. Run:

```bash
truffle(develop)> mockToken.transfer(mockConsumer.address, 10000000000)
```

This will send 10 MOCKs to the MockConsumer smart contract.

5. Top up gas allowance on the `Router` smart contract. This will send ETH to the
   the `Router`, allowing it to refund any gas the provider spends sending data 
   to your `MockConsumer` contract. It will be assigned to the provider's wallet, and
   can be fully withdrawn at any time. The source of the ETH is the `MockConsumer` contract
   owner (the wallet that deployed the contract). Run:

```bash
truffle(develop)> mockConsumer.topUpGas(provider, {from: consumerOwner, value: 500000000000000000})
```

ETH held by the `Router` can be fully withdrawn at any time, and will only ever be used
to reimburse the specified provider wallet address.

##### Requesting Data

First, check the current `price` in your `MockConsumer` contract. Run:

```bash
truffle(develop)> let priceBefore = await mockConsumer.price()
truffle(develop)> priceBefore.toString()
```

The result should be 0.

Next, request some data from the provider. Run:

```bash
truffle(develop)> mockConsumer.requestData(provider, "PRICE.BTC.USD.AVG", 80, {from: consumerOwner})
```

#### Interaction - as a Provider

A Consumer requests data, but a provider Oracle needs to be running in order to fulfill
requests.

1. Copy `example.provider.env` to a `.env` file, and modify the following values. The
   `CONTRACT_ADDRESS` is the Router smart contract's address, and can be acquired
   by running:
   
```bash 
truffle(develop)> router.address
```

The values for `WALLET_PKEY` and `WALLET_ADDRESS` are whatever you noted down when initialising 
`truffle develop` earlier.

``` 
CONTRACT_ADDRESS=
WALLET_PKEY=
WALLET_ADDRESS=
```

**Note:** the `CONTRACT_ADDRESS` should be the address of the `Router` smart contract.

In a separate terminal, run:

``` 
node provider-oracle/index.js --run=run-oracle
```

This will run, watching the `Router` smart contract for any `DataRequested` events. If
one is emitted, and the `dataProvider` value is the provider's wallet address, it will
grab the data, and call the `Router`'s `fulfillRequest` function, which in turn forwards
the data to the requesting `MockConsumer` smart contract.

``` 
2020-12-11T13:29:24.944Z watching DataRequested
2020-12-11T13:29:24.967Z running watcher
2020-12-11T13:29:24.978Z newBlockHeaders connected 0x1
2020-12-11T13:29:25.025Z get https://crypto.finchains.io/api/currency/BTC/USD/avg
2020-12-11T13:29:26.204Z got block 15
2020-12-11T13:29:26.206Z txHash 0xa21c94a8043ca49c77b2c4228f52fb4d4176753a5a42051c27d10137cb2a4d2c
```

**Note**: The price returned by the Oracle is always standardised to `actualPrice * (10 ** 18)`

##### Check Price in `MockConsumer`

Once the provider has fulfilled the request, the `price` value should have been updated
in the `MockConsumer` smart contract. Run:

```bash
truffle(develop)> let priceAfter = await mockConsumer.price()
truffle(develop)> priceAfter.toString()
```

The result should now be a non-zero
value, e.g. `17884795591666666666666`.

#### Dev Notes

Verify contracts on Etherscan after deployment - set `ETHERSCAN_API` in `.env`, then run:

```bash 
npx truffle run verify [ContractName] --network=[network]
```
