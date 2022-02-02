# OoO Data API Guide

This guide covers the supported data offered by the Finchains OoO API, which is available
as a data request via the xFUND Router network.

## Data Providers

See [Providers](../providers.md) for a list of Oracles providing data for both Mainnet and Rinkeby, 
along with their associated fees and wallet addresses.

::: tip Note
OoO data providers may wait for 2 - 3 or more block confirmations before processing a request. Depending
on network congestion and gas prices, it may therefore take up to a minute or more for data to be sent to your 
smart contract from the time your request Tx was received by the provider oracle.
:::

## Introduction

Data is acquired via the OoO API using dot-separated strings to define the desired data - for example
"Average BTC/USD Price over 24 hours, with outliers removed" would be requested using
`BTC.USD.PR.AVI.24H`. 

The hex-encoded string is supplied along with the Provider address (as defined above,
depending on Ethereum network) and the `xFUND` fee as parameters to your smart contract, 
using the [requestdata](implementation.md#_3-1-requestdata) function you defined.

The Finchains OoO Data Provider picks up this request, and supplies the data via the 
[recievedata](implementation.md#_3-2-recievedata) function you defined.

## Request String Format

The request format follows `BASE.TARGET.TYPE.SUBTYPE[.SUPP1][.SUPP2][.SUPP3]`

`BASE`, `TARGET`, and `TYPE` are all required parameters. `SUBTYPE` is required for type `PR`

::: tip NOTE
The data request string should be converted to a `Bytes32` (Hex) value before submitting it to
your smart contract's request function, for example:

```javascript
const endpoint = web3.utils.asciiToHex("BTC.USD.PR.AVI")
```
:::

### BASE

The three or four-letter code for the base currency for which the price will be returned, 
e.g. `BTC` (Bitcoin), `ETH` (Ether) etc.

### TARGET

The three or four-letter code for the target currency in which to return the 
price, e.g. `GBP`, `USD`

A full list of supported currency `BASE`/`TARGET` pairs is available from
the [Finchains API](https://crypto.finchains.io/api/pairs). Supported pairs specific
to each exchange are linked below.

### TYPE

The code for the data point being requested, for example `PR` etc.
The currently implemented types are as follows:

- `PR`
- `AD`

### TYPE: `PR`

Price, calculated using all available exchange data for the selected pair. See `SUBTYPE`s for supported
query endpoints.

### TYPE: `AD`

::: tip Note
This `TYPE` endpoint is currently in __beta__ testing and as such is currently only processed by
the Rinkeby testnet OoO provider
:::

Adhoc data requests for pairs not yet supported by Finchains. There are currently no `SUBTYPE`s for `AD` 
endpoint `TYPE`s.

The OoO provider will __attempt__ to query supported DEXs' subgraphs to determine whether the `BASE` and `TARGET` symbols 
are known to the DEX, and also whether the DEX has a liquidity pool representing the pair. If a pair exists, it will 
attempt to retrieve the latest price from each DEX before calculating the mean price from all data found.

::: tip Note
If a DEX is aware of more than one token contract address for a given token symbol, the contract address with the 
highest transaction count will be used for the query.
:::

The currently supported DEXs are:

- Uniswap v2
- Uniswap v3
- Shibaswap
- Sushiswap
- Quickswap

::: danger IMPORTANT
`BASE` and `TARGET` are **CaSe SeNsItIvE** for adhoc queries! `XFUND` is __not__ the same as `xFUND`.
**Always check your request endpoints, and that at least one DEX supports the pair before sending a data request!**
:::

**Example**

The token `JAZZHANDS` is not yet tracked by Finchains, but we'd like to acquire the `WETH` price for `JAZZHANDS`. We know that
`JAZZHANDS/WETH` pair is listed on Uniswap v2 and Shibaswap, so we can use the query endpoint:

`JAZZHANDS.WETH.AD`

The OoO provider will pick up the request, and since it is an `AD` endpoint `TYPE`, will try to find the token contract 
addresses for `JAZZHANDS` and `WETH` instead of querying Finchains' API. From these, it will attempt to discover the 
pair contract addresses for the respective DEXs. If a DEX supports the pair, it will query the latest price from all supported 
DEXes, and calculate the mean price from all results.

### SUBTYPE

Used with `TYPE` endpoint `PR`.

The data sub-type, for example `AVG` (mean), `AVI` (mean with outliers
removed). Some `TYPE`s, _require_ additional `SUPPN` data in the query. Some may have _optional_ data defined in `SUPPN`.

The currently implemented types are as follows:

- [AVG](#subtype-avg): Mean price calculated from all available exchange Oracles
- [AVI](#subtype-avi): Mean price using [Median and Interquartile Deviation Method](http://www.mathwords.com/o/outlier.htm) to remove outliers
- [AVP](#subtype-avp): Mean price with outliers removed using [Peirce's criterion](https://en.wikipedia.org/wiki/Peirce%27s_criterion)
- [AVC](#subtype-avc): Mean price with outliers removed using [Chauvenet's criterion](https://en.wikipedia.org/wiki/Chauvenet%27s_criterion)

#### SUBTYPE: `AVG`

**Supported `TYPE`s**: `PR`

Average (Mean) price, calculated from all available exchange data for a given time
period. 

The default timespan is 1 Hour. The following supported timespans can be supplied
in `SUPP1`:

- `5M`: 5 Minutes
- `10M`: 10 Minutes
- `30M`: 30 Minutes
- `1H`: 1 Hour
- `2H`: 2 Hours
- `6H`: 6 Hours
- `12H`: 12 Hours
- `24H`: 24 Hours
- `48H`: 48 Hours

**Examples**

`BTC.USD.PR.AGV` - Mean BTC/USD price from all available exchanges, using data from the last hour  
`BTC.USD.PR.AGV.30M` - as above, but data from the last 30 minutes

#### SUBTYPE: `AVI`

**Supported `TYPE`s**: `PR`

Average (Mean) price, calculated from all available exchange data for a given time
period, with outliers (very high or very low values) removed form the calculation

The default timespan is 1 Hour. The following supported timespans can be supplied 
in `SUPP1`:

- `5M`: 5 Minutes
- `10M`: 10 Minutes
- `30M`: 30 Minutes
- `1H`: 1 Hour
- `2H`: 2 Hours
- `6H`: 6 Hours
- `12H`: 12 Hours
- `24H`: 24 Hours
- `48H`: 48 Hours

`BTC.USD.PR.AVI` - Mean BTC/USD price with outliers removed, using data from the last hour  
`BTC.USD.PR.AVI.30M` - as above, but data from the last 30 minutes

#### SUBTYPE: `AVP`

**Supported `TYPE`s**: `PR`

Mean price with outliers removed using [Peirce's criterion](https://en.wikipedia.org/wiki/Peirce%27s_criterion)

The default timespan is 1 Hour. The following supported timespans can be supplied
in `SUPP1`:

- `5M`: 5 Minutes
- `10M`: 10 Minutes
- `30M`: 30 Minutes
- `1H`: 1 Hour
- `2H`: 2 Hours
- `6H`: 6 Hours
- `12H`: 12 Hours
- `24H`: 24 Hours
- `48H`: 48 Hours

`BTC.USD.PR.AVP` - Mean BTC/USD price with outliers removed, using data from the last hour  
`BTC.USD.PR.AVP.30M` - as above, but data from the last 30 minutes

#### SUBTYPE: `AVC`

**Supported `TYPE`s**: `PR`

Mean price with outliers removed using [Chauvenet's criterion](https://en.wikipedia.org/wiki/Chauvenet%27s_criterion)

The default timespan is 1 Hour. The following supported timespans can be supplied
in `SUPP1`:

- `5M`: 5 Minutes
- `10M`: 10 Minutes
- `30M`: 30 Minutes
- `1H`: 1 Hour
- `2H`: 2 Hours
- `6H`: 6 Hours
- `12H`: 12 Hours
- `24H`: 24 Hours
- `48H`: 48 Hours

The default value for `dMax` (max standard deviations) is 3. A custom threshold can be
supplied as an integer value in `SUPP2`.

::: danger Important
If a custom `dMax` value is required, then **timespan must also be set in `SUPP1`**
:::

`BTC.USD.PR.AVC` - Mean BTC/USD price with outliers removed, using data from the last hour  
`BTC.USD.PR.AVC.30M` - as above, but data from the last 30 minutes  
`BTC.USD.PR.AVC.24H.2` - as above, but data from the last 24 hours, with `dMax` of 2

### SUPP1

Any supplementary request data, e.g. GDX (coinbase) etc. required for `TYPE.SUBTYPE` queries such as `EX.LAT`,
or timespan values for `AVG` and `AVI` calculations etc.

These are outlined in the respective `TYPE` or `SUBTYPE` definitions above where appropriate.

### SUPP2

Any supplementary request data _in addition_ to `SUPP1`, e.g. `GDX` (coinbase) etc. required
for comparisons on `TYPE`s.

These are outlined in the respective `TYPE` or `SUBTYPE` definitions above where appropriate.

### SUPP3

Any supplementary request data _in addition_ to `SUPP1` and `SUPP2`.

These are outlined in the respective `TYPE` or `SUBTYPE` definitions above where appropriate.

## Return data

All price data is supplied by the Oracle as `actualPrice * (10 ^ 18)` to standardise 
decimal removal, and allow integer calculations in smart contracts.

## Examples

Based on the currently implemented API functionality, some examples are as follows:

- `BTC.GBP.PR.AVG`: average BTC/GBP price, calculated from all supported exchanges over 
  the last hour.
- `ETH.USD.PR.AVI`: average ETH/USD price, calculated from all supported exchanges 
  over the last hour, removing outliers (extremely high/low values) from the calculation.
- `ETH.USD.PR.AVI.24H`: average ETH/USD price, calculated from all supported exchanges
  over the last 24 hours, removing outliers (extremely high/low values) from the calculation.
- `COOL.WETH.AD`: adhoc request for COOL/WETH pair. Will query DEXs for current price and return the mean price.
  