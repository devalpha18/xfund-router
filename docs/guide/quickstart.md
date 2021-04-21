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
import "@unification-com/xfund-router/contracts/lib/ConsumerBase.sol";
```

3. Extend your contract, adding `is ConsumerBase`:

```solidity
contract MyConsumer is ConsumerBase {
```

4. Ensure your `constructor` function has a parameter to accept the `Router`  and `xFUND` 
   smart contract addresses, and pass it to the `ConsumerBase`:

```solidity
constructor(address _router, address _xfund)
    public ConsumerBase(_router, _xfund) {
        // other stuff...
    }
```

::: tip Note
See [Contract Addresses](../contracts.md) for the latest contract addresses
:::

5. Implement the `receiveData` function for data Providers to send data, e.g.

```solidity
function receiveData(uint256 _price, bytes32 _requestId) internal override {
    price = _price;
}
```

::: tip Note
Thus must be `internal` and override the `ConsumerBase`'s `receiveData`. 
:::

6. Implement a function to request data, for example:

```solidity
function getData(address _provider, uint256 _fee, bytes32 _data) external returns (bytes32) {
    return _requestData(_provider, _fee, _data);
}
```

7. Deploy. For example, using `truffle`, a very simple migration script for `Rinkeby` testnet
may look like:

```javascript
// Load my contract which implements ConsumerLib
const MyConsumer = artifacts.require("MyConsumer")

module.exports = function(deployer) {
  // deploy, passing the Router and xFUND smart contract addresses
  deployer.deploy(MyConsumer, "0x...ROUTER_ADDRES", "0x...XFUND_ADDRESS")
}
```

## Initialisation

Once integrated, compiled and deployed, you will need to send some transactions to the
Ethereum blockchain in order to initialise the fee payment, and data acquisition environment.
This involves:

1) Increasing the `xFUND` token allowance on the `Router` smart contract, in order for the `Router`
   to accept and pay xFUND fees to data providers. This need only be run once, if the initial
   allowance is set high enough. A function is available in the ConsumerBase contract to facilitate
   this, which can be wrapped around a function in your contract.
2) Transfer some `xFUND` tokens to your smart contract, that is integrating `ConsumerBase`.
   This allows you to submit data requests, and your contract to pay fees. The required amount
   of `xFUND` to pay for a request fee is sent to the `Router` with each request.
   Your contract may need periodically topping up with `xFUND`, depending on how you implement
   fee payment.

   **Note**: The `xFUNDMOCK` Token on Rinkeby testnet has a faucet function, `gimme()` which can be used
   to grab some test tokens.

Once these steps have been run through, you will be able to initialise data requests via your
smart contract.
