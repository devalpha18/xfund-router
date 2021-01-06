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

xFUND Mock Token: [`0x8aF5e2b4F5eBd6b7E0E82d73bDDa20b3f589ae2e`](https://rinkeby.etherscan.io/address/0x8aF5e2b4F5eBd6b7E0E82d73bDDa20b3f589ae2e#code)  
Router: [`0x414aE636df82F7D61d1cC694071918eC8B857889`](https://rinkeby.etherscan.io/address/0x414aE636df82F7D61d1cC694071918eC8B857889#code)  
ConsumerLib: [`0xcD10aCBdf6FCd16c6f03d923c13416e08812829C`](https://rinkeby.etherscan.io/address/0xcD10aCBdf6FCd16c6f03d923c13416e08812829C#code)  
Finchains Data Provider Oracle Address: [`0x611661f4B5D82079E924AcE2A6D113fAbd214b14`](https://rinkeby.etherscan.io/address/0x611661f4B5D82079E924AcE2A6D113fAbd214b14)

### Mainnet

xFUND Token: [`0x892A6f9dF0147e5f079b0993F486F9acA3c87881`](https://etherscan.io/address/0x892A6f9dF0147e5f079b0993F486F9acA3c87881#code)  
Router: TBD  
ConsumerLib: TBD
Finchains Data Provider Oracle Address: TBD
