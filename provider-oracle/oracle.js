require("dotenv").config()
const BN = require("bn.js")
const fetch = require("isomorphic-unfetch")

const pairIsSupported = (supportedPairs, base, target) => {
  for(let i = 0; i < supportedPairs.length; i += 1) {
    const sp = supportedPairs[i]
    if(sp.base === base && sp.target === target) {
      return true
    }
  }
  return false
}

const apiBuilder = (dataToGet) => {
  const dataToGetArray = dataToGet.split(".");
  const base = dataToGetArray[0] // BTC etc
  const target = dataToGetArray[1] // GBP etc
  const type = dataToGetArray[2] // PRC, HI, LOW,
  const subtype = dataToGetArray[3] // AVG, LAT etc.
  const supp1 = dataToGetArray[4]
  const supp2 = dataToGetArray[5]
  const supp3 = dataToGetArray[6]

  const pair = `${base}/${target}`

  // todo - switches on type & subtype.

  const url = `${process.env.FINCHAINS_API_URL}/currency/${pair}/avg/outlier`

  return { url, pair, base, target, type, subtype, supp1, supp2, supp3 }
}

// Request Format BASE.TARGET.TYPE.SUBTYPE[.SUPP1][.SUPP2][.SUPP3]
// BASE: base currency, e.g. BTC, ETH etc.
// TARGET: target currency, e.g. GBP, USD
// TYPE: data point being requested, e.g. PRC (price), HI, LOW (volumes)
// SUBTYPE: data sub type, e.g. AVG (average), LAT (latest),  DSC (discrepancies), EXC (specific exchange data)
//          some sub types, e.g. EXC and DSC require additional data defining Exchanges to query, as defined below
// SUPP1: any supplimentary request data, e.g. GDX (coinbase) etc. required for TYPE queries such as EXC,
//        or IDQ (Median and Interquartile Deviation Method) for removing outliers from AVG calculations etc.
// SUPP2: any supplimentary request data, e.g. GDX (coinbase) etc. required for comparisions on TYPEs such as DSC
// SUPP3: any supplimentary request data
//
// Examples:
// BTC.GBP.PRC.AVG - average BTC/GBP price, calculated from all supported exchanges over the last hour
// BTC.GBP.PRC.AVG.IDQ - average BTC/GBP price, calculated from all supported exchanges over the last hour, removing outliers
// BTC.GBP.PRC.AVG.IDQ.24HR - average BTC/GBP price, calculated from all supported exchanges over the last 24 hours, removing outliers
// BTC.GBP.PRC.EXC.GDX.AVG - average BTC/GBP price from Coinbase
// ETH.USD.PRC.EXC.BNC.LAT - latest ETH/USD price from Binance
// BTC.ETH.PRC.DSC.BNC.GDX - latest BTC/ETH price discrepancy between Coinbase and Binance
const processRequest = async (dataToGet, supportedPairs) => {
  return new Promise((resolve, reject) => {
    const d = apiBuilder(dataToGet)

    if(!pairIsSupported(supportedPairs, d.base, d.target)) {
      reject(new Error(`pair ${d.pair} not currently supported`))
    }

    console.log(new Date(), "get", d.url)

    fetch(d.url)
      .then((r) => r.json())
      .then((data) => {
        // data.price: price * (10 ** 18)
        // data.priceRaw: = actual price
        resolve(new BN(data.price))
      })
      .catch((err) => {
        // return error to the caller
        reject(err)
      })
  })
}

module.exports = {
  processRequest,
}
