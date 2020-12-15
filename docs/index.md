# Documentation

## Deployed Contract Addresses

Addresses for the currently deployed contracts, required for interaction and integration

### Testnet (Rinkeby)

xFUND Mock Token: `0xc12678b997ce94e9f3921B65AD144565dC20Aefc`  
Router: `0x7a99f98EfC7C1313E3a8FA4Be36aE2b100a1622F`  
ConsumerLib: `0x36aeb34DC2c0aC64819308c96696803c3FB8d19d`  

### Mainnet (Rinkeby)

xFUND Token: `0x892A6f9dF0147e5f079b0993F486F9acA3c87881`  
Router: TBD  
ConsumerLib: TBD

## Integration Quickstart

In order to request data, and enable data provision in your smart contract, you will need to
import the `Consumer.sol` smart contract and set up two simple functions within your smart contract.

1. Add the package to your project:

```
yarn add @unification-com/xfund-router
```

2. In your smart contract, import `Consumer.sol`:

```solidity
import "@unification-com/xfund-router/contracts/lib/Consumer.sol";
```

3. Extend your contract, adding `is Consumer`:

```solidity
contract MockConsumer is Consumer {
```

4. Ensure your `constructor` function has a parameter to accept the `Router` smart contract
   address, and pass it to the `Consumer`:
   
```solidity
constructor(address _router)
    public Consumer(_router) {
        // other stuff...
    }
```

5. Implement a `requestData` function, for example:

```solidity
function requestData(
    address payable _dataProvider,
    string memory _data,
    uint256 _gasPrice)
    public returns (bytes32 requestId) {
        // call the underlying Consumer.sol lib's submitDataRequest function
        return submitDataRequest(_dataProvider, _data, _gasPrice, this.recieveData.selector);
    }
```

6. Implement a function for data Providers to send data, e.g.

```solidity
function recieveData(
        uint256 _price,
        bytes32 _requestId,
        bytes memory _signature)
    external
    isValidFulfillment(_requestId, _price, _signature)
    returns (bool success) {
        price = _price;
        emit GotSomeData(msg.sender, _requestId, _price);
        deleteRequest(_price, _requestId, _signature);
        return true;
    }
```

7. Link our deployed `ConsumerLib` library contract to your contract

For example, using `truffle`, a very simple migration script for `Rinkeby` testnet 
may look like:

```javascript
// Load the ConsumerLib contract
const ConsumerLib = artifacts.require("ConsumerLib")

// Load my contract which implements ConsumerLib
const MyContract = artifacts.require("MyContract")

module.exports = function(deployer) {
  // Link my contract to the deployed ConsumerLib contract
   MyContract.link("ConsumerLib", "0x36aeb34DC2c0aC64819308c96696803c3FB8d19d")
   deployer.deploy(MockConsumer, "0x7a99f98EfC7C1313E3a8FA4Be36aE2b100a1622F")
}
```

## Initialisation Quickstart

Once integrated, compiled and deployed, you will need to send some transactions to the
Ethereum blockchain in order to initialise the fee payment, data acquisition environment
and provider authorisation. This involves:

1) Increasing the `xFUND` token allowance on the `Router` smart contract, in order for the `Router`
   to accept and pay xFUND fees to data providers. This need only be run once, if the initial
   allowance is set high enough. A function is available in the ConsumerLib contract to facilitate
   this.
2) Transfer some `xFUND` tokens to your smart contract, that is integrating the Consumer Library.
   This allows you to submit data requests, and your contract to pay fees. The required amount 
   of `xFUND` to pay for a request fee is sent to the `Router` with each request. Requests can
   be cancelled by you, and the `xFUND` reclaimed if a request is not fulfilled by a provider.
   Your contract may need periodically topping up with `xFUND`.  
   
   **Note**: The `xFUNDMOCK` Token on Rinkeby testnet has a faucet function, `gimme()` which can be used
   to grab some test tokens.
3) "Topping up" gas payments on the `Router` - a small amount of ETH will be held by the `Router`
   on your behalf in order to reimburse data providers for the cost of sending a Tx to your contract
   and submitting the data to you. This can be periodically topped up in small amounts, and can
   also be withdrawn by you in its entirety at any time. A function is available in the ConsumerLib contract to facilitate
   both topping up and withdrawing.
   
Finally, you will need to authorise a data Provider in your contract. A function is 
available in the ConsumerLib contract to facilitate this.

Once these steps have been run through, you will be able to initialise data requests via your
smart contract.
