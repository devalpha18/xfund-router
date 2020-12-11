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

## Deploying in Dev environment with `ganache-cli`

For development and testing.

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

Deploy with:

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
