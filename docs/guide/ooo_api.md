# OoO Data API Guide

This guide covers the supported data offered by the Finchains OoO API, which is available
as a data request via the xFUND Router network.

## Providers

The following addresses supply data from the Finchains OoO API:

### Rinkeby TestNet

**Provider Address**: [`0x611661f4B5D82079E924AcE2A6D113fAbd214b14`](https://rinkeby.etherscan.io/address/0x611661f4B5D82079E924AcE2A6D113fAbd214b14)  
**Fee**: 0.1 xFUNDMOCK

### Mainnet

**Provider Address**: TBD  
**Fee**: TBD xFUND

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

`BASE`, `TARGET`, `TYPE`, and `SUBTYPE` are all required parameters.

::: tip NOTE
The data request string should be converted to a `Bytes32` (Hex) value before submitting it to
your smart contract's request function, for example:

```javascript
const endpoint = web3.utils.asciiToHex("BTC.USD.PR.AVI")
```
:::

## Return data

All price data is supplied as `actualPrice * (10 ** 18)` to standardise decimal removal, and
allow integer calculations in smart contracts.

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

The code for the data point being requested, for example `PR`, `EX`, `DS` etc.
The currently implemented types are as follows:

- `PR`: Price, calculated using all available exchange data for the selected pair
- `EX`: Exchange data - returns data from the selected exchange, if available

For Type `EX`, the exchange abbreviation is required in `SUPP1`:

- `BNC`: Binance ([supported pairs](https://crypto.finchains.io/api/exchange/binance/pairs))
- `BFI`: Bitfinex ([supported pairs](https://crypto.finchains.io/api/exchange/bitfinex/pairs))
- `BFO`: Bitforex ([supported pairs](https://crypto.finchains.io/api/exchange/bitforex/pairs))
- `BMR`: Bitmart ([supported pairs](https://crypto.finchains.io/api/exchange/bitmart/pairs))
- `BTS`: Bitstamp ([supported pairs](https://crypto.finchains.io/api/exchange/bitstamp/pairs))
- `BTX`: Bittrex ([supported pairs](https://crypto.finchains.io/api/exchange/bittrex/pairs))
- `CBT`: Coinsbit ([supported pairs](https://crypto.finchains.io/api/exchange/coinsbit/pairs))
- `CRY`: crypto.com ([supported pairs](https://crypto.finchains.io/api/exchange/crypto_com/pairs))
- `DFX`: Digifinex ([supported pairs](https://crypto.finchains.io/api/exchange/digifinex/pairs))
- `GAT`: Gate ([supported pairs](https://crypto.finchains.io/api/exchange/gate/pairs))
- `GDX`: Coinbase ([supported pairs](https://crypto.finchains.io/api/exchange/gdax/pairs))
- `GMN`: Gemini ([supported pairs](https://crypto.finchains.io/api/exchange/gemini/pairs))
- `HUO`: Huobi ([supported pairs](https://crypto.finchains.io/api/exchange/huobi/pairs))
- `KRK`: Kraken ([supported pairs](https://crypto.finchains.io/api/exchange/kraken/pairs))
- `PRB`: Probit ([supported pairs](https://crypto.finchains.io/api/exchange/probit/pairs))

### SUBTYPE

The data sub-type, for example `AVG` (mean), `LAT` (latest), `AVI` (mean with outliers
removed). Some `TYPE`s, for example `EX` _require_ additional 
`SUPPN` data defining Exchanges to query. Some may have _optional_ data defined in `SUPPN`.

The currently implemented types are as follows:

- `AVG`: Mean price calculated from all available exchange Oracles
- `AVI`: Mean price using Median and Interquartile Deviation Method to remove outliers
- `LAT`: Latest price received

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

#### SUBTYPE: `LAT`

**Supported `TYPE`s**: `PR`, `EX`

The latest price submitted by the Oracles. In the case of `EX`, the latest price
received from the selected exchange oracle. In the case of `PR`, the latest price received
from _any_ exchange oracle.

For Type `EX`, the exchange abbreviation is required in `SUPP1`:

- `BNC`: Binance ([supported pairs](https://crypto.finchains.io/api/exchange/binance/pairs))
- `BFI`: Bitfinex ([supported pairs](https://crypto.finchains.io/api/exchange/bitfinex/pairs))
- `BFO`: Bitforex ([supported pairs](https://crypto.finchains.io/api/exchange/bitforex/pairs))
- `BMR`: Bitmart ([supported pairs](https://crypto.finchains.io/api/exchange/bitmart/pairs))
- `BTS`: Bitstamp ([supported pairs](https://crypto.finchains.io/api/exchange/bitstamp/pairs))
- `BTX`: Bittrex ([supported pairs](https://crypto.finchains.io/api/exchange/bittrex/pairs))
- `CBT`: Coinsbit ([supported pairs](https://crypto.finchains.io/api/exchange/coinsbit/pairs))
- `CRY`: crypto.com ([supported pairs](https://crypto.finchains.io/api/exchange/crypto_com/pairs))
- `DFX`: Digifinex ([supported pairs](https://crypto.finchains.io/api/exchange/digifinex/pairs))
- `GAT`: Gate ([supported pairs](https://crypto.finchains.io/api/exchange/gate/pairs))
- `GDX`: Coinbase ([supported pairs](https://crypto.finchains.io/api/exchange/gdax/pairs))
- `GMN`: Gemini ([supported pairs](https://crypto.finchains.io/api/exchange/gemini/pairs))
- `HUO`: Huobi ([supported pairs](https://crypto.finchains.io/api/exchange/huobi/pairs))
- `KRK`: Kraken ([supported pairs](https://crypto.finchains.io/api/exchange/kraken/pairs))
- `PRB`: Probit ([supported pairs](https://crypto.finchains.io/api/exchange/probit/pairs))

### SUPP1

Any supplementary request data, e.g. GDX (coinbase) etc. required for `TYPE.SUBTYPE` queries such as `EX.LAT`,
or timespan values for `AVG` and `AVI` calculations etc.

These are outlined in the respective `TYPE` or `SUBTYPE` definitions above where appropriate.

### SUPP2

Any supplementary request data _in addition_ to `SUPP1`, e.g. `GDX` (coinbase) etc. required
for comparisons on `TYPE`s such as `DS`.

These are outlined in the respective `TYPE` or `SUBTYPE` definitions above where appropriate.

### SUPP3

Any supplementary request data _in addition_ to `SUPP1` and `SUPP2`.

These are outlined in the respective `TYPE` or `SUBTYPE` definitions above where appropriate.

## Examples

Based on the currently implemented API functionality, some examples are as follows:

- `BTC.GBP.PR.AVG`: average BTC/GBP price, calculated from all supported exchanges over 
  the last hour.
- `ETH.USD.PR.AVI`: average ETH/USD price, calculated from all supported exchanges 
  over the last hour, removing outliers (extremely high/low values) from the calculation.
- `ETH.USD.PR.AVI.24H`: average ETH/USD price, calculated from all supported exchanges
  over the last 24 hours, removing outliers (extremely high/low values) from the calculation.
- `BTC.GBP.PR.LAT`: latest BTC/GBP received. Exchange agnostic - returns whatever the latest
  value is available
- `BTC.GBP.EX.LAT.GDX`: latest BTC/GBP price from Coinbase
  