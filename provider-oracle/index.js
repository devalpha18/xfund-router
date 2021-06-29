require("dotenv").config()
const arg = require("arg")
const { getSupportedPairs, updateSupportedPairs } = require("./pairs")
const { ProviderOracle } = require("./oracle")
const { getPriceFromApi } = require("./finchains_api")

const env = process.env.NODE_ENV || "development"

const args = arg({
  // Types
  "--run": String,
  "--event": String,
  "--test": String,

  // Aliases
  "-r": "--run",
  "-e": "--event",
})

console.log(new Date(), "running in", env)

const run = async () => {
  const runWhat = args["--run"]
  const testString = args["--test"] || "BTC.USD.PRC.AVG"
  const oracle = new ProviderOracle()

  let supportedPairs

  switch (runWhat) {
    case "update-supported-pairs":
      await updateSupportedPairs()
      process.exit(0)
      break
    case "run-oracle":
      await oracle.initOracle()
      await oracle.runOracle()
      break
    case "analyse":
      await ProviderOracle.analysisTransactions("0xC89Ce4735882C9F0f0FE26686c53074E09B0D550", 100)
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
