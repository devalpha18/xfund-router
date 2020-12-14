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

  // Aliases
  "-r": "--run",
  "-e": "--event",
})

const run = async () => {
  const runWhat = args["--run"]
  const eventToGet = args["--event"] || "DataRequested"

  const fromBlock = process.env.CONTRACT_DEPLOYMENT_BLOCK || 0

  switch (runWhat) {
    case "run-oracle":
      console.log(new Date(), "watching", eventToGet)
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
          const dataToGet = Web3.utils.hexToAscii(event.returnValues.data)
          const requestId = event.returnValues.requestId
          const gasPriceWei = event.returnValues.gasPrice // already in wei

          // check it's for us
          if(Web3.utils.toChecksumAddress(dataProvider) === Web3.utils.toChecksumAddress(process.env.WALLET_ADDRESS)) {
            const requestExists = await getRequestExists(requestId)
            if(requestExists) {
              await processRequest( dataToGet )
                .then(async (priceToSend) => {
                  if ( priceToSend.gt( new BN( "0" ) ) ) {
                    const txHash = await fulfillRequest(requestId, priceToSend, dataConsumer, gasPriceWei)
                    console.log(new Date(), "txHash", txHash)
                  }
                })
                .catch((err) => {
                  console.error(new Date(), "ERROR:")
                  console.error(err)
                })
            } else {
              console.log(new Date(), "request", requestId, "does not exist. Probably already processed")
            }
          } else {
            console.log(new Date(), "request", requestId, "not for me (for ", dataProvider, ")")
          }
        }
      })
      break
    case "test-oracle":
      console.log("test-oracle")
      processRequest( "PRICE.BTC.USD.AVG" )
        .then(async (priceToSend) => {
          console.log(new Date(), "priceToSend", priceToSend.toString())
        })
        .catch((err) => {
          console.error(new Date(), "ERROR:")
          console.error(err)
        })
      break
    default:
      console.log(new Date(), "nothing to do")
      break
  }
}

run()
