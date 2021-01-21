require("dotenv").config()
const arg = require("arg")
const BN = require("bn.js")
const Web3 = require("web3")
const { watchEvent, fulfillRequest } = require("./ethereum")
const { isValidDataRequest, processRequest } = require("./oracle")
const { getSupportedPairs, updateSupportedPairs } = require("./pairs")
const { FulfilledRequests, LastGethBlock } = require("./db/models")

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

  const { WATCH_FROM_BLOCK } = process.env

  let fromBlock = WATCH_FROM_BLOCK || 0
  const fromBlockRes = await LastGethBlock.findOne({ where: { event: eventToGet } })

  if (fromBlockRes) {
    fromBlock = parseInt( fromBlockRes.height, 10 )
  }

  let supportedPairs

  switch (runWhat) {
    case "update-supported-pairs":
      await updateSupportedPairs()
      process.exit(0)
      break
    case "run-oracle":
      console.log(new Date(), "watching", eventToGet, "from block", fromBlock)
      console.log(new Date(), "get supported pairs")
      watchEvent(eventToGet, fromBlock, async function processEvent(event, err) {
        if (err) {
          console.error(new Date(), "ERROR:")
          console.error(err)
        }
        const requestValid = await isValidDataRequest(event)
        if(requestValid) {
          supportedPairs = await getSupportedPairs()
          const height = event.blockNumber
          const requestTxHash = event.transactionHash
          const dataConsumer = event.returnValues.dataConsumer
          const endpoint = Web3.utils.toUtf8(event.returnValues.data)
          const requestId = event.returnValues.requestId
          const gasPriceWei = event.returnValues.gasPrice // already in wei
          const fee = event.returnValues.fee
          console.log(new Date(), "data requested", endpoint, "from", dataConsumer)

          // check db
          const fulfilledRequest = await FulfilledRequests.findOne({ where: { requestId }})

          if(!fulfilledRequest) {
            processRequest( endpoint, supportedPairs )
              .then( async ( price ) => {
                if ( price.gt( new BN( "0" ) ) ) {
                  console.log( new Date(), "fulfillRequest data requestId", requestId, "data", price.toString() )
                  const fulfillTxHash = await fulfillRequest( requestId, price, dataConsumer, gasPriceWei )
                  console.log( new Date(), "fulfillRequest requestId", requestId, "txHash", fulfillTxHash )
                  // update db
                  await FulfilledRequests.findOrCreate( {
                    where: {
                      requestId,
                    },
                    defaults: {
                      requestId,
                      requestTxHash,
                      fulfillTxHash,
                      endpoint,
                      price: price.toString(),
                      dataConsumer,
                      gas: gasPriceWei.toString(),
                      fee: fee.toString(),
                    },
                  } )

                  const [l, lCreated] = await LastGethBlock.findOrCreate({
                    where: {
                      event: eventToGet,
                    },
                    defaults: {
                      event: eventToGet,
                      height,
                    },
                  })

                  if (!lCreated) {
                    if (height > l.height) {
                      await l.update({ height })
                    }
                  }

                } else {
                  console.log( new Date(), "error getting price for requestId", requestId, "price === 0." )
                }
              } )
              .catch( ( err ) => {
                console.error( new Date(), "ERROR:" )
                console.error( err.toString() )
              } )
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
      process.exit(0)
      break
    default:
      console.log(new Date(), "nothing to do")
      process.exit(0)
      break
  }
}

run()
