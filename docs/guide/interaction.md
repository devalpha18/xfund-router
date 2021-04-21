# Contract Initialisation and Data Request Guide

This guide will walk you through the steps required to initialise your contract (add
Tokens and increase the Router's allowance), and also make a data request.

::: warning Note
ensure you have gone though the [implementation](implementation.md) guide
and deployed your smart contract before continuing with this guide.
:::

Run the `truffle` development console, and connect to the Rinkeby testnet:

```bash
npx truffle console --network=rinkeby
```

::: tip Note
See [OoO Data API Guide](ooo_api.md) for the latest **Rinkeby** OoO Finchains data
provider address, used for the `provider` variable below
:::


Within the `truffle` console, load the contract instances, and accounts
ready for interaction

```bash 
truffle(rinkeby)> let accounts = await web3.eth.getAccounts()
truffle(rinkeby)> let consumerOwner = accounts[0]
truffle(rinkeby)> let provider = "0x611661f4B5D82079E924AcE2A6D113fAbd214b14"
truffle(rinkeby)> let myDataConsumer = await MyDataConsumer.deployed()
```

## 1. Contract Initialisation

The following steps need only be done periodically, to ensure all parties have
the correct amount of tokens and gas to pay for data.

Go to [xFUNDMOCK](https://rinkeby.etherscan.io/address/0x245330351344F9301690D5D8De2A07f5F32e1149#writeContract)
on Etherscan, and connect MetaMask **with the account used to deploy the `MyDataConsumer`
smart contract**, then run the `gimme()` function. This is a faucet function, and will
supply your wallet with 10 `xFUNDMOCK` tokens. You may do this once per hour.

Get the deployed address for your `MyDataConsumer` smart contract:

```bash 
truffle(rinkeby)> myDataConsumer.address
```

Next, using either Etherscan, or MetaMask, transfer 5 `xFUNDMOCK` tokens to your
`MyDataConsumer` contract address.

Finally, we need to allow the `Router` smart contract to pay fees on the `MyDataConsumer`
contract's behalf:

```bash 
truffle(rinkeby)> myDataConsumer.increaseRouterAllowance("115792089237316195423570985008687907853269984665640564039457584007913129639935", {from: consumerOwner})
```

## 2. Data Request

Now that the `MyDataConsumer` smart contract has been initialised, we can request data to 
be sent to the smart contract. You may need to top up Consumer contract's
tokens every so often.

First, check the current `price` in your `MyDataConsumer` contract. Run:

```bash
truffle(rinkeby)> let priceBefore = await myDataConsumer.price()
truffle(rinkeby)> priceBefore.toString()
```

The result should be 0.

Next, request some data from the provider. Run:

```bash
truffle(rinkeby)> let endpoint = web3.utils.asciiToHex("BTC.USD.PR.AVI")
truffle(rinkeby)> myDataConsumer.getData(provider, 100000000, endpoint, {from: consumerOwner})
```

The first command encodes the data endpoint (the data we want to get) into a bytes32
value. We are requesting the mean (`PR.AVI`) US dollar (`USD`) price of Bitcoin (`BTC`), with
outliers (very high or very low) values removed (`AVI` as opposed to `AVG`)
from the final mean calculation.

A full list of supported currency pairs is available from the [Finchains API](https://crypto.finchains.io/api/pairs)

It may take a block or two for the request to be fully processed - the provider will listen for
the request, then submit a Tx with the data to the `Router`, which will forward it to
your smart contract.

After 30 seconds or so, run:

```bash
truffle(rinkeby)> let priceAfter = await myDataConsumer.price()
truffle(rinkeby)> priceAfter.toString()
```

If the price is still 0, simply run the following a couple more times:

```bash
truffle(rinkeby)> priceAfter = await myDataConsumer.price()
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
