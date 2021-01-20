require("dotenv").config()
const arg = require("arg")
const BN = require("bn.js")
const Web3 = require("web3")
const { watchEvent, fulfillRequest, setProviderPaysGas, getRequestExists } = require("./ethereum")
const { processRequest } = require("./oracle")

const args = arg({
  // Types
  "--run": String,
  "--event": String,
  "--test": String,

  // Aliases
  "-r": "--run",
  "-e": "--event",
})

const run = async () => {
  const runWhat = args["--run"]
  const eventToGet = args["--event"] || "DataRequested"

  const { WATCH_FROM_BLOCK, FINCHAINS_API_URL, MIN_FEE } = process.env

  const fromBlock = WATCH_FROM_BLOCK || 0

  const supportedPairsRes = await fetch(`${FINCHAINS_API_URL}/pairs`)
  const supportedPairs = await supportedPairsRes.json()

  switch (runWhat) {
    case "run-oracle":
      console.log(new Date(), "watching", eventToGet, "from block", fromBlock)
      console.log(new Date(), "get supported pairs")
      watchEvent(eventToGet, fromBlock, async function processEvent(event, err) {
        if (err) {
          console.error(new Date(), "ERROR:")
          console.error(err)
        }
        if (event) {
          const height = event.blockNumber
          const txHash = event.transactionHash
          const dataConsumer = event.returnValues.dataConsumer
          const dataProvider = event.returnValues.dataProvider
          const fee = event.returnValues.fee
          const dataToGet = Web3.utils.toUtf8(event.returnValues.data)
          const requestId = event.returnValues.requestId
          const gasPriceWei = event.returnValues.gasPrice // already in wei

          // check it's for us
          if(Web3.utils.toChecksumAddress(dataProvider) === Web3.utils.toChecksumAddress(process.env.WALLET_ADDRESS)) {
            // check request ID exists (has not been fulfiled, cancelled etc.)
            const requestExists = await getRequestExists(requestId)
            if(requestExists) {
              console.log(new Date(), "data requested", dataToGet, "from", dataConsumer)
              // check fees
              if(parseInt(fee) >= parseInt(MIN_FEE)) {
                processRequest( dataToGet, supportedPairs )
                  .then(async (priceToSend) => {
                    if ( priceToSend.gt( new BN( "0" ) ) ) {
                      console.log(new Date(), "fulfillRequest data", priceToSend.toString())
                      const txHash = await fulfillRequest(requestId, priceToSend, dataConsumer, gasPriceWei)
                      console.log(new Date(), "fulfillRequest txHash", txHash)
                    }
                  })
                  .catch((err) => {
                    console.error(new Date(), "ERROR:")
                    console.error(err.toString())
                  })
              } else {
                console.log(new Date(), "fee", fee, "for requestId", requestId, "not enough. MIN_FEE=", MIN_FEE)
              }
            } else {
              console.log(new Date(), "request", requestId, "does not exist. Perhaps already processed or cancelled")
            }
          } else {
            console.log(new Date(), "request", requestId, "not for me (for ", dataProvider, ")")
          }
        }
      })
      break
    case "test-oracle":
      const testString = args["--test"] || "BTC.USD.PRC.AVG"
      console.log("test-oracle")
      console.log("Data requested", testString)
      processRequest( testString, supportedPairs )
        .then(async (priceToSend) => {
          console.log(new Date(), "priceToSend", priceToSend.toString())
        })
        .catch((err) => {
          console.error(new Date(), "ERROR:")
          console.error(err.toString())
        })
      break
    default:
      console.log(new Date(), "nothing to do")
      break
  }
}

run()
