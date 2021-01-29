require("dotenv").config()
const arg = require("arg")
const { getSupportedPairs, updateSupportedPairs } = require("./pairs")
const { LastGethBlock } = require("./db/models")
const { runOracle } = require("./core")

const env = process.env.NODE_ENV || 'development'

const args = arg({
  // Types
  "--run": String,
  "--event": String,
  "--test": String,

  // Aliases
  "-r": "--run",
  "-e": "--event",
})

console.log( new Date(), "running in", env)

const run = async () => {
  const runWhat = args["--run"]

  let supportedPairs

  switch (runWhat) {
    case "update-supported-pairs":
      await updateSupportedPairs()
      process.exit(0)
      break
    case "run-oracle":
      runOracle()
      break
    case "test-oracle":
      supportedPairs = await getSupportedPairs()
      const testString = args["--test"] || "BTC.USD.PRC.AVG"
      console.log("test-oracle")
      console.log("Data requested", testString)
      await processRequest( testString, supportedPairs )
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
