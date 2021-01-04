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
`BTC.USD.PRC.AVG.IDQ`. 

The hex-encoded string is supplied along with the Provider address (as defined above,
depending on Ethereum network) and the `xFUND` fee as parameters to your smart contract, 
using the [requestdata](implementation.md#_3-1-requestdata) function you defined.

The Finchains OoO Data Provider picks up this request, and supplies the data via the 
[recievedata](implementation.md#_3-2-recievedata) function you defined.

::: danger IMPORTANT
Currently, the data available via Finchains' OoO is the mean `AVG` price `PRC` for all
supported `BASE`s and `TARGET`s for the last hour, with optional `IDQ` calculation:

`[BASE].[TARGET].PRC.AVG[.IDQ]`
:::

## Request String Format

The request format follows `BASE.TARGET.TYPE.SUBTYPE[.SUPP1][.SUPP2][.SUPP3][.POWER]`

`BASE`, `TARGET`, `TYPE`, and `SUBTYPE` are all required parameters.

::: tip NOTE
The data request string should be converted to a `Bytes32` (Hex) value before submitting it to
your smart contract's request function, for example:

```javascript
const endpoint = web3.utils.asciiToHex("BTC.USD.PRC.AVG.IDQ")
```
:::

### BASE

The three or four-letter code for the base currency for which the price will be returned, 
e.g. `BTC` (Bitcoin), `ETH` (Ether) etc.

### TARGET

The three or four-letter code for the target currency in which to return the 
price, e.g. `GBP`, `USD`

A full list of supported currency `BASE`/`TARGET` pairs is available from
the [Finchains API](https://crypto.finchains.io/api/pairs)

### TYPE

The code for the data point being requested, for example `PRC`, `HI`, `LOW` etc.
The currently implemented types are as follows:

- `PRC`: Price

### SUBTYPE

The data sub-type, for example `AVG` (average), `LAT` (latest), `DSC` (discrepancies), 
`EXC` (specific exchange data). Some `SUBTYPE`s, for example `EXC` _require_ additional 
`SUPPN` data defining Exchanges to query. Some may have _optional_ data defined in `SUPPN`.

The currently implemented types are as follows:

#### SUBTYPE: `AVG`

Average (Mean) price, calculated from all available exchange data for a given time
period. 

May have the following _optional_ parameters in `SUPP1`:

  - `IDG`: Median and Interquartile Deviation Method - removes outliers (extremely high, or low values) 
    from `AVG` calculations.


### SUPP1

Any supplementary request data, e.g. GDX (coinbase) etc. required for `SUBTYPE` queries such as EXC,
or `IDQ` (Median and Interquartile Deviation Method) for removing outliers from `AVG` calculations etc.
These are outlined in the `SUBTYPE` definitions above.


### SUPP2

Any supplementary request data _in addition_ to `SUPP1`, e.g. `GDX` (coinbase) etc. required
for comparisons on TYPEs such as `DSC`.

These are outlined in the `SUBTYPE` definitions above.

### SUPP3

Any supplementary request data _in addition_ to `SUPP1` and `SUPP2`.

These are outlined in the `SUBTYPE` definitions above.

### POWER

The _optional_ multiplier used to remove decimals, i.e. `price * (10 ** POWER)`.
The default is 18, and the default data returned is `price * (10 ** 18)`. 

Must be between 2 - 18 and **must always be the last part** of the request string.

## Examples

Based on the currently implemented API functionality, some examples are as follows:

- `BTC.GBP.PRC.AVG`: average BTC/GBP price, calculated from all supported exchanges over 
  the last hour.
- `ETH.USD.PRC.AVG.IDQ`: average ETH/USD price, calculated from all supported exchanges 
  over the last hour, removing outliers (extremely high/low values) from the calculation.
- `ETH.USD.PRC.AVG.IDQ.9`: as above, with `price * (10 ** 9)`. E.g. 983.905515537 will be returned
  as 983905515537.
