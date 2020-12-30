# Documentation

This documentation covers the xFUND Router and OoO (Oracle of Oracles) functionality,
including how to integrate the `Consumer` smart contract into your own smart contract and
how to interact with the system in order to request and receive data in your smart contract.

## Guides

1. [Quickstart](./guide/quickstart.md) - a quick introduction to getting set up
2. [Implementation Guide](./guide/index.md) - a complete guide to integration and interaction

## Contract APIs

API documentation covering the functions and events within each of the three main
smart contracts used by the system.

1. [Router.sol](./api/Router.md) - the contract which controls data request and fulfilment
   routing between Consumers and Providers. This contract also handles fee payment and gas
   refunds. Deployed and maintained by the Unification Foundation
2. [ConsumerLib.sol](./api/lib/ConsumerLib.md) - the Library contract containing all the required
   functionality to interact with the system. Deployed and maintained by the Unification Foundation.
   Developers need to link this deployed library to their own smart contract, as well as
   importing the `Consumer.sol` smart contract
3. [Consumer.sol](./api/lib/Consumer.md) - the Consumer smart contract developers will need
   to import into their own smart contract in order to interact with the system. Contains the
   proxy functions required to utilise the `ConsumerLib.sol` library smart contract, which 
   must be linked to the this contract during deployment

## Deployed Contract Addresses

Addresses for the currently deployed contracts, required for interaction and integration

### Testnet (Rinkeby)

xFUND Mock Token: [`0xF5eBB01E4A97DBc6f35FF5bC325A69c5eEd9D6b6`](https://rinkeby.etherscan.io/address/0xF5eBB01E4A97DBc6f35FF5bC325A69c5eEd9D6b6#code)  
Router: [`0x17ebd1dd73Fe06dC9b7Aae9760f9ffc9b6dD0970`](https://rinkeby.etherscan.io/address/0x17ebd1dd73Fe06dC9b7Aae9760f9ffc9b6dD0970#code)  
ConsumerLib: [`0xaEd88Fe9a21Ef675A928c3347dDaFA273EED3fD7`](https://rinkeby.etherscan.io/address/0xaEd88Fe9a21Ef675A928c3347dDaFA273EED3fD7#code)  
Finchains Data Provider Oracle Address: [`0x611661f4B5D82079E924AcE2A6D113fAbd214b14`](https://rinkeby.etherscan.io/address/0x611661f4B5D82079E924AcE2A6D113fAbd214b14)

### Mainnet

xFUND Token: [`0x892A6f9dF0147e5f079b0993F486F9acA3c87881`](https://etherscan.io/address/0x892A6f9dF0147e5f079b0993F486F9acA3c87881#code)  
Router: TBD  
ConsumerLib: TBD
Finchains Data Provider Oracle Address: TBD
