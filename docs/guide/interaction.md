# Contract Initialisation and Data Request Guide

This guide will walk you through the steps required to initialise your contract (add
Tokens, gas top ups, and authorise data providers to fulfil requests), and also 
make a data request.

::: warning Note
ensure you have gone though the [implementation](implementation.md) guide
and deployed your smart contract before continuing with this guide.
:::

Run the `truffle` development console, and connect to the Rinkeby testnet:

```bash
npx truffle console --network=rinkeby
```

Within the `truffle` console, load the contract instances, and accounts
ready for interaction

```bash 
truffle(rinkeby)> let accounts = await web3.eth.getAccounts()
truffle(rinkeby)> let consumerOwner = accounts[0]
truffle(rinkeby)> let provider = "0x611661f4B5D82079E924AcE2A6D113fAbd214b14"
truffle(rinkeby)> let demoConsumer = await DemoConsumer.deployed()
```

## 1. Contract Initialisation

The following steps need only be done periodically, to ensure all parties have
the correct amount of tokens and gas to pay for data.

Go to [xFUNDMOCK](https://rinkeby.etherscan.io/address/0x2dd7aF39Fb46E457A47Fb8D10f135cA6ca77Eb38#writeContract)
on Etherscan, and connect MetaMask **with the account used to deploy the `DemoConsumer`
smart contract**, then run the `gimme()` function. This is a faucet function, and will
supply your wallet with 10 `xFUNDMOCK` tokens. You may do this once per hour.

Get the deployed address for your `DemoConsumer` smart contract:

```bash 
truffle(rinkeby)> demoConsumer.address
```

Next, using either Etherscan, or MetaMask, transfer 5 `xFUNDMOCK` tokens to your
`DemoConsumer` contract address.

Then we need to allow the `Router` smart contract to pay fees on the `DemoConsumer` contract's
behalf:

```bash 
truffle(rinkeby)> demoConsumer.setRouterAllowance("115792089237316195423570985008687907853269984665640564039457584007913129639935", true, {from: consumerOwner})
```

Next, we need to authorise a data provider (in this case `0x611661f4B5D82079E924AcE2A6D113fAbd214b14`)
to supply our `DemoConsumer` smart contract with data. Only authorised provider addresses
can send transactions to supply your contract with data.

```bash 
truffle(rinkeby)> demoConsumer.addDataProvider(provider, 100000000, {from: consumerOwner})
```

This will authorise `0x611661f4B5D82079E924AcE2A6D113fAbd214b14` to send data to your
smart contract, and set their fee to 0.1 `xFUNDMOCK` tokens per request.

Finally, we need top up gas allowance on the `Router` smart contract. This will send
a small amount of ETH to the the `Router` smart contract, allowing it to refund any
gas the provider spends sending data to your `MockConsumer` contract. It will be
assigned to the provider's wallet, and can be fully withdrawn at any time. The
source of the ETH is the `DemoConsumer` contract owner (the wallet that deployed the
contract). Run:

```bash
truffle(rinkeby)> demoConsumer.topUpGas(provider, {from: consumerOwner, value: 500000000000000000})
```

This will send 0.5 ETH (the maximum that the Router will accept in any one transaction),
and lock it to the authorised Provider's address.

ETH held by the `Router` will only ever be used to reimburse the specified and
authorised provider's wallet address.

## 2. Data Request

Now that the `DemoConsumer` smart contract is fully initialised, and we have set up the
authorised data provider and respective payment flows, we can request data to be sent to
the smart contract. You will need to top up the Router's gas, and Consumer contract's
tokens every so often.

First, check the current `price` in your `DemoConsumer` contract. Run:

```bash
truffle(rinkeby)> let priceBefore = await demoConsumer.price()
truffle(rinkeby)> priceBefore.toString()
```

The result should be 0.

Next, request some data from the provider. Run:

```bash
truffle(rinkeby)> let endpoint = web3.utils.asciiToHex("BTC.USD.PR.AVI")
truffle(rinkeby)> demoConsumer.requestData(provider, endpoint, 80, {from: consumerOwner})
```

The first command encodes the data endpoint (the data we want to get) into a bytes32
value. We are requesting the mean (`PR.AVI`) US dollar (`USD`) price of Bitcoin (`BTC`), with
outliers (very high or very low) values removed (`AVI` as opposed to `AVG`) from the final mean calculation.

A full list of supported currency pairs is available from the [Finchains API](https://crypto.finchains.io/api/pairs)

It may take a block or two for the request to be fully processed - the provider will listen for
the request, then submit a Tx with the data to the `Router`, which will forward it to
your smart contract.

After 30 seconds or so, run:

```bash
truffle(rinkeby)> let priceAfter = await demoConsumer.price()
truffle(rinkeby)> priceAfter.toString()
```

If the price is still 0, simply run the following a couple more times:

```bash
truffle(rinkeby)> priceAfter = await demoConsumer.price()
truffle(rinkeby)> priceAfter.toString()
```

The price should now be a non-zero value.

:::tip Note
By default, the OoO sends all price data converted to `actualPrice * (10 ** 18)` in
order to remove any decimals. 

To convert to the actual decimal price, you can for example:

```bash
truffle(rinkeby)> let actualPrice = web3.utils.fromWei(priceAfter)
truffle(rinkeby)> actualPrice.toString()
```

:::

Next - see what data can be requested via the [Finchains OoO API](ooo_api.md).
