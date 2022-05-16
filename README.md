# xFUND Router & Data Consumer Solidity Smart Contracts

[![npm version](http://img.shields.io/npm/v/@unification-com/xfund-router.svg?style=flat)](https://npmjs.org/package/@unification-com/xfund-router "View this project on npm")
![sc unit tests](https://github.com/unification-com/xfund-router/actions/workflows/test-contracts.yml/badge.svg)

A suite of smart contracts to enable data from external sources (such as Finchains.io)
to be included in your smart contracts. The suite comprises of:

1) A deployed Router smart contract. This facilitates receiving and forwarding data requests,
   between Consumers and Providers, in addition to processing xFUND payments for data provision.
2) A ConsumerBase smart contract, which is integrated into your own smart contract in 
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

#### Go

Go v1.16+ is required to compile the `go-ooo` application.

### Compile Contracts

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

To run all tests:

```bash
yarn test
```

Test Coverage

```bash
yarn run coverage
```

Running unit test coverage will take a long time. Results are saved to 
`converage.json` and `./coverage`

### Development Environment - Testing & Interaction

The repo contains a complete, self-contained `ganache-cli` development environment, which can be used
to test contracts, developing and testing Consumer contracts and testing the `go-ooo` Provider Oracle app.

**Note**: the NodeJS implementation of the `provider-oracle` is deprecated.

#### Docker Dev Environment

To run the development environment, run

```bash
make dev-env
```

This will run a local `ganache-cli` chain, deploy the Router and demo consumer contract, and also initialise
the accounts with some Dev xFUND. The chain's RPC endpoint will be exposed on `http://127.0.0.1:8545`, and can be
accessed via the `truffle-config`'s `develop` network.

#### Running `go-ooo`

First, build the Go application:

```bash
make build
```

`go-ooo` will need initialising before it can run:

```bash
./go-ooo/build/go-ooo init <network>
```

Where `<network>` is one of `dev`, `rinkeby`, `mainnet` or `polygon`. Using `dev` will configure `go-ooo` for the Docker 
development environment.

This will save the default configuration to `$HOME/.go-ooo`, with the initial values for the `dev` network. 
This config location can be changed using the `--home` flag to specify a custom location, e.g.

```bash
./go-ooo/build/go-ooo init dev --home $HOME/.go-ooo_dev
```

This initialisation script will ask whether you want to import an exisitng private key, or generate a new one. 
You can enter anything for the account name. For the purposes of quick testing, the Docker development environment 
initialises by pre-registering account #3 on the `ganache-cli` chain as a Provider Oracle. The private key to import is:

`0x646f1ce2fdad0e6deeeb5c7e8e5543bdde65e86029e2fd9fc169899c440a7913`

Make a note of the generated decryption password - this will be required to run the application (to decrypt the keystore)
and to execute any admin commands. For the sake of simplicity, save it to `$HOME/.go-ooo/pass.txt`

The application should now have the default configuration saved to `$HOME/.go-ooo/config.toml`. It will use `sqlite` as
the default database, but can easily be configured for PostgreSQL.

#### Registering a new Oracle Provider

If `go-ooo` has been initialised for a network other than `dev`, and using a key other than the pre-defined test key,
then registration as an Oracle Provider is required. First, ensure the wallet being used has funds on the target
chain, then run the registration admin command:

```bash
go-ooo admin register [FEE] --home /path/to/.go-ooo --pass /path/to/pass.txt
```

Where `[FEE]` is your fee, for example `1000000` for 0.001 xFUND.

#### Start the Oracle

Now, you can start the Provider Oracle:

```bash
./go-ooo/build/go-ooo start
```

This will prompt you for the decryption password, and start the application. If you saved the password, you can pass the
path to the file using the `--pass` flag, e.g.

```bash
./go-ooo/build/go-ooo start --home $HOME/.go-ooo_dev --pass $HOME/.go-ooo_dev/pass.txt
```



#### Requesting Data

The development environment is deployed with a pre-configured and deployed demo Consumer contract, along with a script
for requesting and waiting for data. This script can be called using `docker exec`:

```bash
docker exec -it ooo_dev_env /root/xfund-router/request.sh <BASE> <TARGET> <TYPE> [SUBTYPE] [SUPP1] [SUPP2]
```

For example querying Finchains tracked data:

```bash
docker exec -it ooo_dev_env /root/xfund-router/request.sh BTC GBP PR AVC 1H
```

This will request data using the OoO endpoint `BTC.GBP.PR.AVC.1H`, which is the mean GBP price of Bitcoin for the
past hour, using the Chauvenet Criterion to remove statistical outliers.

Or and Ad-Hoc request:

```bash
docker exec -it ooo_dev_env /root/xfund-router/request.sh BONE WETH AD
```

See the [OoO API Guide](docs/guide/ooo_api.md) for more information on endpoint construction.

#### Dev Notes

Verify contracts on Etherscan after deployment - set `ETHERSCAN_API` in `.env`, then run:

```bash 
npx truffle run verify [ContractName] --network=[network]
```
