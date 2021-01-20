# Quickstart

## Integration

In order to request data, and enable data provision in your smart contract, you will need to
import the `ConsumerBase.sol` smart contract and set up two simple functions within your smart contract.

1. Add the package to your project:

```
yarn add @unification-com/xfund-router
```

2. In your smart contract, import `ConsumerBase.sol`:

```solidity
import "@unification-com/xfund-router/contracts/v1/lib/ConsumerBase.sol";
```

3. Extend your contract, adding `is Consumer`:

```solidity
contract MockConsumer is ConsumerBase {
```

4. Ensure your `constructor` function has a parameter to accept the `Router` smart contract
   address, and pass it to the `ConsumerBase`:

```solidity
constructor(address _router)
    public ConsumerBase(_router) {
        // other stuff...
    }
```

5. Implement the `receiveData` function for data Providers to send data, e.g.

```solidity
function receiveData(uint256 _price, bytes32 _requestId) internal override {
    price = _price;
}
```

6. Link our deployed `ConsumerLib` library contract to your contract

::: tip Note
See [Contract Addresses](../contracts.md) for the latest contract addresses
:::

For example, using `truffle`, a very simple migration script for `Rinkeby` testnet
may look like:

```javascript
// Load the ConsumerLib contract
const ConsumerLib = artifacts.require("ConsumerLib")

// Load my contract which implements ConsumerLib
const MyContract = artifacts.require("MyContract")

module.exports = function(deployer) {
  // Link MyContract to the deployed ConsumerLib contract
  // Note: below is the Rinkeby Testnet address
  MyContract.link("ConsumerLib", "0xeB11a442B3911A3051470403EdECF0FC5e779bB2")
  // deploy, passing the Router smart contract address
  // Note: below is the Rinkeby Testnet address
  deployer.deploy(MockConsumer, "0x386a4e4E5347ad80486baEAd6EE9922C03F328FA")
}
```

## Initialisation

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
