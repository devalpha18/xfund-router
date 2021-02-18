const BN = require("bn.js")
const Web3 = require("web3")
const { Op } = require("sequelize")
const { watchEvent, fulfillRequest, watchBlocks, getRequestExists } = require("./ethereum")
const { isValidDataRequest, getPriceFromApi } = require("./OoO")
const { getSupportedPairs, updateSupportedPairs } = require("./pairs")
const {
  updateLastHeight,
  updateJobComplete,
  updateJobCancelled,
  updateJobRecieved,
  updateJobFulfilling,
  updateJobWithStatusReason,
} = require("./db/update")

const { REQUEST_STATUS } = require("./consts")

const { Jobs, LastGethBlock } = require("./db/models")

const { WATCH_FROM_BLOCK, WAIT_CONFIRMATIONS } = process.env

const watchIncommingRequests = async (eventToGet, fromBlock) => {
  console.log(new Date(), "BEGIN watchIncommingRequests")
  const waitConfirmations = parseInt(WAIT_CONFIRMATIONS, 10) || 1
  watchEvent(eventToGet, fromBlock, async function processEvent(event, err) {
    if (err) {
      console.error(new Date(), "ERROR watchIncommingRequests.processEvent for event", eventToGet)
      console.error(err.toString())
    } else {
      const requestValid = await isValidDataRequest( event )
      const height = parseInt( event.blockNumber, 10 )
      if ( requestValid ) {
        const requestTxHash = event.transactionHash
        const dataConsumer = event.returnValues.dataConsumer
        const endpoint = Web3.utils.toUtf8( event.returnValues.data )
        const requestId = event.returnValues.requestId
        const gasPriceWei = event.returnValues.gasPrice // already in wei
        const fee = event.returnValues.fee

        console.log( new Date(), "incoming job requestId", requestId, "from", dataConsumer )
        // add to Jobs table
        const heightToFulfill = height + waitConfirmations
        const [ fr, frCreated ] = await Jobs.findOrCreate( {
          where: {
            requestId,
          },
          defaults: {
            requestId,
            requestTxHash,
            requestHeight: height,
            endpoint,
            dataConsumer,
            heightToFulfill,
            gas: gasPriceWei.toString(),
            fee: fee.toString(),
            requestStatus: REQUEST_STATUS.REQUEST_STATUS_OPEN,
          },
        } )

        if ( frCreated ) {
          console.log( new Date(), `Add new job ${endpoint} to queue from ${dataConsumer}. Job #${ fr.id }, process in block ${heightToFulfill}`)
        } else {
          console.log( new Date(), `Job for request ID ${requestId} exists on DB - id: ${fr.id}` )
        }
      }
    }
  })
}

const watchIncommingFulfillments = async (eventToGet, fromBlock) => {
  console.log(new Date(), "BEGIN watchIncommingFulfillments")
  watchEvent(eventToGet, fromBlock, async function processEvent(event, err) {
    if (err) {
      console.error(new Date(), "ERROR watchIncommingFulfillments.processEvent for event", eventToGet)
      console.error(err.toString())
    } else {
      const height = parseInt( event.blockNumber, 10 )
      const requestId = event.returnValues.requestId
      const fulfillTxHash = event.transactionHash
      const gasPayer = event.returnValues.gasPayer

      console.log( new Date(), "incoming fulfillment requestId", requestId)

      const requestRes = await Jobs.findOne({where: {requestId} })

      if(requestRes) {
        await updateJobComplete( requestRes.id, fulfillTxHash, height, gasPayer )
        await updateLastHeight( eventToGet, height )
      }
    }
  })
}

const watchIncommingCancellations = async (eventToGet, fromBlock) => {
  console.log(new Date(), "BEGIN watchIncommingCancellations")
  watchEvent(eventToGet, fromBlock, async function processEvent(event, err) {
    if (err) {
      console.error(new Date(), "ERROR watchIncommingCancellations.processEvent for event", eventToGet)
      console.error(err.toString())
    } else {
      const height = parseInt( event.blockNumber, 10 )
      const requestId = event.returnValues.requestId
      const cancelTxHash = event.transactionHash

      console.log( new Date(), "incoming cancellation requestId", requestId)

      const requestRes = await Jobs.findOne({where: {requestId} })
      if(requestRes) {
        await updateJobCancelled( requestRes.id, cancelTxHash, height )
        await updateLastHeight( eventToGet, height )
      }
    }
  })
}


const fulfillRequests = async (eventToGet) => {
  console.log(new Date(), "BEGIN fulfillRequests")
  const supportedPairs = await getSupportedPairs()
  watchBlocks(async function processBock(blockHeader, err) {
    if (err) {
      console.error(new Date(), "ERROR fulfillRequests.processBock:")
      console.error(err.toString())
    } else {
      const height = blockHeader.number
      const jobsToProcess = await Jobs.findAll({
        where: {
          heightToFulfill: {
            [Op.lte]: height,
          },
          requestStatus: REQUEST_STATUS.REQUEST_STATUS_OPEN,
        }
      })
      for(let i = 0; i < jobsToProcess.length; i += 1) {
        const id = jobsToProcess[i].id
        // REQUEST_STATUS_RECEIVED
        await updateJobRecieved(id)
      }
      for(let i = 0; i < jobsToProcess.length; i += 1) {
        const id = jobsToProcess[i].id
        const requestId = jobsToProcess[i].requestId
        const dataConsumer = jobsToProcess[i].dataConsumer
        const endpoint = jobsToProcess[i].endpoint
        const fee = jobsToProcess[i].fee // todo - check fee is enough
        const gasPriceWei = jobsToProcess[i].gas

        // check the request still exists and hasn't been cancelled
        const requestExists = await getRequestExists(requestId)
        if(requestExists) {
          let price = new BN(0)
          try {
            price = await getPriceFromApi( endpoint, supportedPairs )
          } catch (err) {
            // todo - handle this to retry getting the data
            await updateJobWithStatusReason(id, REQUEST_STATUS.REQUEST_STATUS_ERROR_PROCESS, err.toString())
            console.error( new Date(), "ERROR getPriceFromApi:" )
            console.error(err.toString())
          }
          if ( price.gt( new BN( "0" ) ) ) {
            console.log( new Date(), "attempt fulfillRequest data requestId", requestId, "data", price.toString() )
            let fulfillTxHash
            try {
              fulfillTxHash = await fulfillRequest( requestId, price, dataConsumer, gasPriceWei )
              console.log( new Date(), "fulfillRequest submitted: requestId", requestId, "txHash", fulfillTxHash )

              // update database
              await updateJobFulfilling(id, price, fulfillTxHash)

            } catch (err) {
              await updateJobWithStatusReason(id, REQUEST_STATUS.REQUEST_STATUS_ERROR_PROCESS, err.toString())
              console.error( new Date(), "ERROR fulfillRequest:" )
              console.error(err.toString())
            }
          }
        } else {
          await updateJobWithStatusReason(id, REQUEST_STATUS.REQUEST_STATUS_ERROR_NOT_EXIST, "request does not exist")
          console.log(new Date(), "fulfillRequests - request", requestId, "does not exist. Perhaps cancelled?")
          return false
        }
      }

      await updateLastHeight(eventToGet, height)
    }
  })
}

const runOracle = async () => {
  const dataRequestEvent = "DataRequested"
  const dataCancelledEvent = "RequestCancelled"
  const dataRequestFulfilledEvent = "RequestFulfilled"

  let fromBlockRequests = WATCH_FROM_BLOCK || 0
  let fromBlockFulfillments = WATCH_FROM_BLOCK || 0
  let fromBlockCancellations = WATCH_FROM_BLOCK || 0

  const currentBlock = await getBlockNumber()

  console.log(new Date(), "current block", currentBlock)

  const fromBlockRequestsRes = await LastGethBlock.findOne({ where: { event: dataRequestEvent } })
  const fromBlockFulfillmentsRes = await LastGethBlock.findOne({ where: { event: dataRequestFulfilledEvent } })
  const fromBlockCancellationsRes = await LastGethBlock.findOne({ where: { event: dataCancelledEvent } })

  if (fromBlockRequestsRes) {
    fromBlockRequests = parseInt( fromBlockRequestsRes.height, 10 ) + 1
  }
  if (fromBlockFulfillmentsRes) {
    fromBlockFulfillments = parseInt( fromBlockFulfillmentsRes.height, 10 ) + 1
    const diff2 = currentBlock - fromBlockFulfillments
    if(diff2 > 10) {
      fromBlockFulfillments = currentBlock - 10
    }
  }
  if (fromBlockCancellationsRes) {
    fromBlockCancellations = parseInt( fromBlockCancellationsRes.height, 10 ) + 1
    const diff3 = currentBlock - fromBlockCancellations
    if(diff3 > 10) {
      fromBlockCancellations = currentBlock - 10
    }
  }
  console.log(new Date(), "watching", dataRequestEvent, "from block", fromBlockRequests)
  console.log(new Date(), "watching", dataRequestFulfilledEvent, "from block", fromBlockFulfillments)
  console.log(new Date(), "watching", dataCancelledEvent, "from block", fromBlockCancellations)
  console.log(new Date(), "get supported pairs")
  await updateSupportedPairs()
  watchIncommingRequests(dataRequestEvent, fromBlockRequests)
  watchIncommingFulfillments(dataRequestFulfilledEvent, fromBlockFulfillments)
  watchIncommingCancellations(dataCancelledEvent, fromBlockCancellations)
  fulfillRequests(dataRequestEvent)
}

module.exports = {
  runOracle
}
