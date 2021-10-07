require("dotenv").config()
const arg = require("arg")
const { getSupportedPairs, updateSupportedPairs } = require("./pairs")
const { ProviderOracle } = require("./oracle")
const { getPriceFromApi } = require("./finchains_api")
const { XFUNDRouter } = require( "./router" );

const env = process.env.NODE_ENV || "development"

const args = arg({
  // Types
  "--run": String,
  "--event": String,
  "--test": String,
  "--analyse-address": String,
  "--analyse-num-txs": Number,
  "--analyse-simulate": Boolean,
  "--analyse-sim-gas": Number,
  "--analyse-sim-fee": Number,
  "--new-fee": Number,
  "--new-fee-consumer": String,

  // Aliases
  "-r": "--run",
  "-e": "--event",
})

console.log(new Date(), "running in", env)

const run = async () => {
  const runWhat = args["--run"]
  const testString = args["--test"] || "BTC.USD.PRC.AVG"
  const analyseAddress = args["--analyse-address"] || null
  const analyseNumTxs = args["--analyse-num-txs"] || 100
  const analyseSimulate = args["--analyse-simulate"] || false
  const analyseSimulateGas = args["--analyse-sim-gas"] || 120
  const analyseSimulateXfundFee = args["--analyse-sim-fee"] || 0.01
  const newFee = args["--new-fee"]
  const newFeeConsumer = args["--new-fee-consumer"] || null
  const xfundRouter = new XFUNDRouter()
  await xfundRouter.initWeb3()
  const oracle = new ProviderOracle()

  let supportedPairs
  let gasPrice

  switch (runWhat) {
    case "update-supported-pairs":
      await updateSupportedPairs()
      process.exit(0)
      break
    case "run-oracle":
      await oracle.initOracle(xfundRouter)
      await oracle.runOracle()
      break
    case "analyse":
      await ProviderOracle.analysisTransactions(
        analyseAddress,
        analyseNumTxs,
        analyseSimulate,
        analyseSimulateGas,
        analyseSimulateXfundFee,
      )
      process.exit(0)
      break
    case "get-gas-price":
      gasPrice = await xfundRouter.getCurrentGasPrice()
      console.log("current gas price:", gasPrice)
      process.exit(0)
      break
    case "register-as-provider":
      console.log("register with fee", newFee)
      await xfundRouter.registerAsProvider(newFee)
      process.exit(0)
      break
    case "set-new-fee":
      if (newFee > 0) {
        console.log("set new fee", newFee, newFeeConsumer)
        await xfundRouter.setProviderFee(newFee, newFeeConsumer)
      } else {
        console.log("fee cannot be 0")
      }
      process.exit(0)
      break
    case "test-oracle":
      supportedPairs = await getSupportedPairs()
      console.log("test-oracle")
      console.log("Data requested", testString)
      await getPriceFromApi(testString, supportedPairs)
        .then(async (priceToSend) => {
          console.log(new Date(), "priceToSend", priceToSend.toString())
        })
        .catch((err) => {
          console.error(new Date(), "ERROR:")
          console.error(err.toString())
        })
      process.exit(0)
      break
    default:
      console.log(new Date(), "nothing to do")
      process.exit(0)
      break
  }
}

run()
