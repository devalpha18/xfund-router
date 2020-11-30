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

to compile smart contract

## Unit Tests

Run:

```bash 
npm test
```

## Deploying with `ganache-cli`

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
