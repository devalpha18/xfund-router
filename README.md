# xFUND Router & Data Consumer Solidity Smart Contracts


## Prerequisites

### NodeJS
The `openzeppelin/test-environment` packages and dependencies require
NodeJS >= `v8.9.4` and <= `v12.18.3` (excluding `v11`) in order to correctly install. 
We recommend using [nvm](https://github.com/nvm-sh/nvm) to manage NodeJS 
installations.

### Yarn

[Yarn](https://classic.yarnpkg.com/en/docs/install) is recommended for package management.

## Compile

Run:

```bash
yarn install
```

to install the Node packages and dependencies

Run:
```bash 
npx oz compile
```

to compile smart contracts

## Unit Tests

To run all tests:

```bash 
yarn test
```

Note - running all tests will take a few minutes.

Or, individual test files:

```bash
npx mocha test/[TEST_FILE] --exit
```

## Development & Testing

### Run `ganache-cli`

If `ganache-cli` is not installed, install with:

```bash
npm install -i ganache-cli
```

Run `ganache-cli` with:

```bash
npx ganache-cli --deterministic
```

The `--deterministic` flag will ensure the same keys and accounts are generated
each time

### Deploy the smart contracts

Compile the contracts, if not already compiled:

```
npx oz compile
```

Deploy each contract specified below with:

```bash
npx oz deploy
```

selecting `development` as the deployment target environment

1. Deploy `MockToken` smart contract
   
e.g.
```
? name: string: MOCK
? symbol: string: MOCK
? initSupply: uint256: 1000000000000000
? decimals: uint8: 9
```

2. Deploy `Router` smart contract, using address for `MockToken`, and unique salt

e.g.

``` 
? _token: address: 0xe78A0F7E598Cc8b0Bb87894B0F60dD2a88d6a8Ab
? _salt: bytes32: 0x5555b7aed0cddd0ef60bef8afb21a7b282d54789ef7d9fd89037475e6fc16e89
```

3. Deploy `MockConsumer`, using the `Router` address as input. This will also automatically
   deploy the `ConsumerLib` smart contract.

e.g.

``` 
? _router: address: 0x5b1869D9A4C187F2EAa108f3062412ecf0526b24
✓ ConsumerLib library uploaded
✓ Deployed instance of MockConsumer
```

### Interaction - as a Consumer

#### Initialisation

1. Grab some tokens from the `MockToken` smart contract.
   
The `gimme` function acts as a faucet, minting 10 tokens. Run:

```
npx oz sent-tx
```

select `development`, `MockToken`, and finally `gimme()`.

2. Increase the `Router` Token allowance for the `MockConsumer` contract, so that the Router
   can hold and forward fees to the provider. Run:
   
``` 
npx oz send-tx
```

select `development`, `MockConsumer`, and finally `increaseRouterAllowance(_routerAllowance: uint256)`.

Enter `115792089237316195423570985008687907853269984665640564039457584007913129639935` as the value

3. Authorise a data provider to fulfil data requests and allow them to send data to your
   `MockConsumer` smart contract. Run:
   
``` 
npx oz send-tx
```

select `development`, `MockConsumer`, and finally `addDataProvider(_dataProvider: address, _fee: uint256)`.

Enter `0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d` and `100000000` (0.1 MOCKs) as the 
address and fee respectively.

4. Transfer some `MOCK` tokens to your `MockConsumer` smart contract. Run:

``` 
npx oz send-tx
```

select `development`, `MockToken` and `transfer(recipient: address, amount: uint256)`

Enter the address of your `MockConsumer` smart contract, and `10000000000` (10 MOCKs)

5. Top up gas allowance on the `Router` smart contract. This will send ETH to the
   the `Router`, allowing it to refund any gas the provider spends sending data 
   to your `MockConsumer` contract. It will be assigned to the provider's wallet, and
   can be fully withdrawn at any time. The source of the ETH is the `MockConsumer` contract
   owner (the wallet that deployed the contract). Run:

``` 
npx oz send-tx --value=500000000000000000
```

select `development`, `MockConsumer` and `topUpGas(_dataProvider: address)`.

Enter the provider's address `0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d`. This will 
forward 0.5 ETH to the `Router` contract, which will hold it on your behalf.

ETH held by the `Router` can be fully withdrawn at any time, and will only ever be used
to reimburse the specified provider wallet address.

#### Requesting Data

First, check the current `price` in your `MockConsumer` contract. Run:

``` 
npx oz call
```

select `development`, `MockConsumer` and `price()`. The result should be 0.

Next, request some data from the provider. Run:

``` 
npx oz send-tx
```

select `development`, `MockConsumer` and `requestData(_dataProvider: address, _data: string, _gasPrice: uint256)`

Enter:

``` 
? _dataProvider: address: 0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d
? _data: string: PRICE.BTC.USD.AVG
? _gasPrice: uint256: 80
```

You should see something like:

``` 
 - Transfer(0x254dffcd3277C0b1660F6d42EFbB754edaBAbC2B, 0x5b1869D9A4C187F2EAa108f3062412ecf0526b24, 100000000)
 - Approval(0x254dffcd3277C0b1660F6d42EFbB754edaBAbC2B, 0x5b1869D9A4C187F2EAa108f3062412ecf0526b24, 115792089237316195423570985008687907853269984665640564039457584007913029639935)
 - DataRequested(0x254dffcd3277C0b1660F6d42EFbB754edaBAbC2B, 0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d, 100000000, PRICE.BTC.USD.AVG, 0x1cc750077c717d6cd1a122b93383bc84b5cadde0f69313564c9488d7618e956c, 80000000000, 1607693356, 0x28482da5)
 - DataRequestSubmitted(0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1, 0x254dffcd3277C0b1660F6d42EFbB754edaBAbC2B, 0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d, 100000000, PRICE.BTC.USD.AVG, 1607693356, 80000000000, 0x1cc750077c717d6cd1a122b93383bc84b5cadde0f69313564c9488d7618e956c, 0x28482da5)
```

### Interaction - as a Provider

A Consumer requests data, but a provider Oracle needs to be running in order to fulfill
requests.

1. Copy `example.provider.env` to a `.env` file, and modify the following values (assuming `ganache-cli` is running with 
   the `--deterministic` flag)
   
``` 
CONTRACT_ADDRESS=0x5b1869D9A4C187F2EAa108f3062412ecf0526b24
WALLET_PKEY=0x646f1ce2fdad0e6deeeb5c7e8e5543bdde65e86029e2fd9fc169899c440a7913
WALLET_ADDRESS=0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d
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

#### Check Price in `MockConsumer`

Once the provider has fulfilled the request, the `price` value should have been updated
in the `MockConsumer` smart contract. Run:

``` 
npx oz call
```

select `development`, `MockConsumer` and `price()`. The result should now be a non-zero
value, e.g. `17884795591666666666666`.