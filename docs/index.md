# Documentation

This documentation covers the both the xFUND Router and Finchains' OoO (Oracle of Oracles) 
functionality.

There are documentation and guides covering how to integrate the `Consumer` smart contract 
library (required for interacting with the xFUND Router network) into your own smart 
contract and how to interact with the network in order to request and receive data 
in your smart contract from the Finchains OoO API.

## Guides

1. [Quickstart](./guide/quickstart.md) - a quick introduction to getting set up
2. [Implementation Guide](./guide/index.md) - a complete guide to integration and interaction
3. [Finchains OoO Data API Guide](./guide/ooo_api.md) - a guide to requesting data from the Finchains
   OoO API.

## Contract APIs

API documentation covering the functions and events within each of the three main
smart contracts used by the xFUND Router network.

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

xFUND Mock Token: [`0x2dd7aF39Fb46E457A47Fb8D10f135cA6ca77Eb38`](https://rinkeby.etherscan.io/address/0x2dd7aF39Fb46E457A47Fb8D10f135cA6ca77Eb38#code)  
Router: [`0xa73863Af7c7ff1D7f0c1324f609bdd306868Bb98`](https://rinkeby.etherscan.io/address/0xa73863Af7c7ff1D7f0c1324f609bdd306868Bb98#code)  
ConsumerLib: [`0x5AB9426a904a14116E94F0269604f0785c03ED7D`](https://rinkeby.etherscan.io/address/0x5AB9426a904a14116E94F0269604f0785c03ED7D#code)  
Finchains Data Provider Oracle Address: [`0x611661f4B5D82079E924AcE2A6D113fAbd214b14`](https://rinkeby.etherscan.io/address/0x611661f4B5D82079E924AcE2A6D113fAbd214b14)

### Mainnet

xFUND Token: [`0x892A6f9dF0147e5f079b0993F486F9acA3c87881`](https://etherscan.io/address/0x892A6f9dF0147e5f079b0993F486F9acA3c87881#code)  
Router: TBD  
ConsumerLib: TBD
Finchains Data Provider Oracle Address: TBD
