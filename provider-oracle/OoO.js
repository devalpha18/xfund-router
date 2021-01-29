require("dotenv").config()
const BN = require("bn.js")
const fetch = require("isomorphic-unfetch")
const Web3 = require("web3")

const { getRequestExists } = require("./ethereum")

const { FINCHAINS_API_URL, MIN_FEE } = process.env

const isValidDataRequest = async (eventEmitted) => {

  if(!eventEmitted) {
    console.log(new Date(), "no event...")
    return false
  }

  const dataProvider = eventEmitted.returnValues.dataProvider
  const fee = eventEmitted.returnValues.fee
  const requestId = eventEmitted.returnValues.requestId

  // check it's for us
  if(Web3.utils.toChecksumAddress(dataProvider) !== Web3.utils.toChecksumAddress(process.env.WALLET_ADDRESS)) {
    console.log(new Date(), "request", requestId, "not for me (for ", dataProvider, ")")
    return false
  }

  // check request ID exists (has not been fulfiled, cancelled etc.)
  const requestExists = await getRequestExists(requestId)
  if(!requestExists) {
    console.log(new Date(), "request", requestId, "does not exist. Perhaps already processed or cancelled")
    return false
  }

  if(parseInt(fee) < parseInt(MIN_FEE)) {
    console.log(new Date(), "fee", fee, "for requestId", requestId, "not enough. MIN_FEE=", MIN_FEE)
    return false
  }

  return true
}

const pairIsSupported = (supportedPairs, base, target) => {
  for(let i = 0; i < supportedPairs.length; i += 1) {
    const sp = supportedPairs[i]
    if(sp.base === base && sp.target === target) {
      return true
    }
  }
  return false
}

const exchangePairIsSupported = async (exchange, base, target) => {
  console.log(new Date(), "check pair", base, "/", target, "on", exchange)
  return new Promise(async (resolve, reject) => {
    const url = `${FINCHAINS_API_URL}/exchange/${exchange}/pairs`
    console.log(new Date(), "url", url)
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        resolve(pairIsSupported(data, base, target))
      })
      .catch((err) => {
        console.log(err.toString())
        reject(err)
      })
  })
}

const getExchange = (ex) => {
  let exchangeApi
  switch(ex) {
    case "BNC":
      exchangeApi = "binance"
      break
    case "BFI":
      exchangeApi = "bitfinex"
      break
    case "BFO":
      exchangeApi = "bitforex"
      break
    case "BMR":
      exchangeApi = "bitmart"
      break
    case "BTS":
      exchangeApi = "bitstamp"
      break
    case "BTX":
      exchangeApi = "bittrex"
      break
    case "CBT":
      exchangeApi = "coinsbit"
      break
    case "CRY":
      exchangeApi = "crypto_com"
      break
    case "DFX":
      exchangeApi = "digifinex"
      break
    case "GAT":
      exchangeApi = "gate"
      break
    case "GDX":
      exchangeApi = "gdax"
      break
    case "GMN":
      exchangeApi = "gemini"
      break
    case "HUO":
      exchangeApi = "huobi"
      break
    case "KRK":
      exchangeApi = "kraken"
      break
    case "PRB":
      exchangeApi = "probit"
      break
    default:
      exchangeApi = null
      break
  }
  return exchangeApi
}

const cleanseTime = (tm) => {
  switch (tm) {
    case "5M":
    case "10M":
    case "30M":
    case "1H":
    case "2H":
    case "6H":
    case "12H":
    case "24H":
    case "48H":
      return tm
    default:
      return "1H"
  }
}

const cleanseDMax = (_dMax) => {
  let dMax = parseInt(_dMax, 10) || 3
  if(isNaN(dMax) || dMax <= 0) dMax = 3
  return dMax
}


const getPriceSubType = (subtype, supp1, supp2) => {
  let st
  let t = cleanseTime(supp1)
  let s2
  switch(subtype) {
    case "AVG":
    default:
      st = `avg/${t}`
      break
    case "AVI":
      st = `avg/iqd/${t}`
      break
    case "AVP":
      st = `avg/peirce/${t}`
      break
    case "AVC":
      s2 = cleanseDMax(supp2)
      st = `avg/chauvenet/${t}/${s2}`
      break
    case "LAT":
      st = "latest_one"
      break
  }
  return st
}

const apiBuilder = async (dataToGet, supportedPairs) => {
  const dataToGetArray = dataToGet.split(".");
  const base = dataToGetArray[0] // BTC etc
  const target = dataToGetArray[1] // GBP etc
  const type = dataToGetArray[2] // PRC, EXC, DCS,
  const subtype = dataToGetArray[3] // AVG, LAT etc.
  const supp1 = dataToGetArray[4]
  const supp2 = dataToGetArray[5]
  const supp3 = dataToGetArray[6]

  if(!pairIsSupported(supportedPairs, base, target)) {
    throw new Error(`pair ${base}/${target} not currently supported`)
  }

  const pair = `${base}/${target}`
  let apiEndpoint = "currency"
  let dataType = "avg"

  switch(type) {
    case "PR":
    default:
      apiEndpoint = "currency"
      dataType = getPriceSubType(subtype, supp1, supp2)
      break
    case "EX":
      const exchange = getExchange(supp1)
      if(!exchange) {
        throw new Error(`exchange ${supp1} in SUPP1 not currently supported`)
      }

      let exchangeSupportsPair = false
      try {
        exchangeSupportsPair = await exchangePairIsSupported(exchange, base, target)
      } catch (err) {
        throw err
      }
      if(!exchangeSupportsPair) {
        throw new Error(`pair ${pair} not currently supported by exchange ${exchange} (${supp1})`)
      }
      apiEndpoint = `exchange/${exchange}`
      // latest is currently only supported SUBTYPE
      dataType = "latest"
      break
  }

  const url = `${FINCHAINS_API_URL}/${apiEndpoint}/${pair}/${dataType}`

  console.log(new Date(), "get", url)

  return { url, pair, base, target, type, subtype, supp1, supp2, supp3 }
}

// Request Format BASE.TARGET.TYPE.SUBTYPE[[.SUPP1][.SUPP2][.SUPP3]]
// BASE: base currency, e.g. BTC, ETH etc.
// TARGET: target currency, e.g. GBP, USD
// TYPE: data point being requested, e.g. PR (pair price), EX (specific exchange data), DS (discrepancies)
//       some types, e.g. EXC and DSC require additional SUPPN supplementary data defining Exchanges to query, as defined below
// SUBTYPE: data sub type, e.g. AVG (average), LAT (latest), HI (hi price), LOW (low price),
//          AVI Mean with IQD (Median and Interquartile Deviation Method to remove outliers)
// SUPP1: any supplementary request data, e.g. GDX (coinbase) etc. required for TYPE queries such as EXC
// SUPP2: any supplementary request data, e.g. GDX (coinbase) etc. required for comparisons on TYPEs such as DSC
// SUPP3: any supplementary request data
//
// Examples:
// BTC.GBP.PR.AVG - average BTC/GBP price, calculated from all supported exchanges in the last hour
// BTC.GBP.PR.HI - highest BTC/GBP price, calculated from all supported exchanges in the last hour
// BTC.GBP.PR.AVI - average BTC/GBP price, calculated from all supported exchanges over the last hour, removing outliers
// BTC.GBP.PR.LAT - latest BTC/GBP price submitted to Finchains - latest exchange to submit price (not always the same exchange)
// BTC.GBP.PR.AVI.24H - average BTC/GBP price, calculated from all supported exchanges over the last 24 hours, removing outliers
// BTC.GBP.EX.AVG.GDX.24H - average 24 Hour BTC/GBP price from Coinbase
// BTC.GBP.EX.AVI.GDX.24H - average 24 Hour BTC/GBP price from Coinbase, remove outliers
// ETH.USD.EX.LAT.BNC - latest ETH/USD price from Binance
// ETH.USD.EX.HI.DGX.24H - highest ETH/USD price from Coinbase in last 24 hours
// ETH.USD.EX.LOW.DGX.24H - highest ETH/USD price from Coinbase in last 24 hours
const processRequest = async (dataToGet, supportedPairs) => {
  return new Promise((resolve, reject) => {
    apiBuilder(dataToGet, supportedPairs)
      .then((d) => fetch(d.url))
      .then((r) => r.json())
      .then((data) => {
        // Finchains API returns:
        // data.priceRaw: = actual decimal price
        // data.price: priceRaw * (10 ** 18)
        resolve( new BN( data.price ) )
      })
      .catch((err) => {
        // return error to the caller
        reject(err)
      })
  })
}

module.exports = {
  processRequest,
  isValidDataRequest,
}
