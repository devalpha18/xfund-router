require("dotenv").config()
const BN = require("bn.js")
const fetch = require("isomorphic-unfetch")

// PRICE.BTC.USD.AVG
const processRequest = async (dataToGet) => {
  const dataToGetArray = dataToGet.split(".");
  const what = dataToGetArray[0] // PRICE, HIGH, LOW etc.
  const base = dataToGetArray[1]
  const target = dataToGetArray[2]
  const calc = dataToGetArray[3] // AVG, LATEST etc.

  // todo - check base/target is supported.
  // todo - switch on what & calc.

  const URL = `${process.env.FINCHAINS_API_URL}/currency/${base}/${target}/avg`
  console.log(new Date(), "get", URL)

  return new Promise((resolve, reject) => {
    fetch(URL)
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
