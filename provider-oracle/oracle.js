const BN = require("bn.js")
const Web3 = require("web3")
const { serializeError } = require("serialize-error")
const { XFUNDRouter } = require("./router")
const { getPriceFromApi } = require("./finchains_api")
const { getSupportedPairs, updateSupportedPairs } = require("./pairs")
const {
  updateLastHeight,
  updateJobComplete,
  updateJobCancelled,
  updateJobRecieved,
  updateJobFulfilling,
  updateJobWithStatusReason,
} = require("./db/update")
const { getOpenOrStuckJobs } = require("./db/query")

const { REQUEST_STATUS } = require("./consts")

const { Jobs, LastGethBlock } = require("./db/models")

const { WATCH_FROM_BLOCK, WAIT_CONFIRMATIONS } = process.env

class ProviderOracle {
  async initOracle() {
    this.router = new XFUNDRouter()
    await this.router.initWeb3()
    this.currentBlock = await this.router.getBlockNumber()

    this.dataRequestEvent = "DataRequested"
    this.dataCancelledEvent = "RequestCancelled"
    this.dataRequestFulfilledEvent = "RequestFulfilled"

    this.fromBlockRequests = WATCH_FROM_BLOCK || this.currentBlock
    this.fromBlockFulfillments = WATCH_FROM_BLOCK || this.currentBlock
    this.fromBlockCancellations = WATCH_FROM_BLOCK || this.currentBlock

    console.log(new Date(), "current Eth height", this.currentBlock)

    const fromBlockRequestsRes = await LastGethBlock.findOne({ where: { event: this.dataRequestEvent } })
    const fromBlockFulfillmentsRes = await LastGethBlock.findOne({
      where: { event: this.dataRequestFulfilledEvent },
    })
    const fromBlockCancellationsRes = await LastGethBlock.findOne({
      where: { event: this.dataCancelledEvent },
    })

    if (fromBlockRequestsRes) {
      this.fromBlockRequests = parseInt(fromBlockRequestsRes.height, 10)
    }
    if (fromBlockFulfillmentsRes) {
      this.fromBlockFulfillments = parseInt(fromBlockFulfillmentsRes.height, 10)
    }
    const diff1 = this.currentBlock - this.fromBlockFulfillments
    if (diff1 > 128) {
      this.fromBlockFulfillments = this.currentBlock - 128
    }
    if (fromBlockCancellationsRes) {
      this.fromBlockCancellations = parseInt(fromBlockCancellationsRes.height, 10)
    }
    const diff2 = this.currentBlock - this.fromBlockCancellations
    if (diff2 > 128) {
      this.fromBlockCancellations = this.currentBlock - 128
    }
    console.log(new Date(), "get supported pairs")
    await updateSupportedPairs()
  }

  async runOracle() {
    console.log(new Date(), "watching", this.dataRequestEvent, "from block", this.fromBlockRequests)
    this.watchIncommingRequests()
    console.log(
      new Date(),
      "watching",
      this.dataRequestFulfilledEvent,
      "from block",
      this.fromBlockFulfillments,
    )
    this.watchIncommingFulfillments()
    console.log(new Date(), "watching", this.dataCancelledEvent, "from block", this.fromBlockCancellations)
    this.watchIncommingCancellations()
    console.log(new Date(), "watching blocks for jobs to process from block", this.fromBlockRequests)
    this.fulfillRequests()
  }

  /**
   * Watch for any incoming DataRequested events. New requests are added to the
   * Jobs database, and will be processed after process.env.WAIT_CONFIRMATIONS blocks
   *
   * @returns {Promise<void>}
   */
  async watchIncommingRequests() {
    console.log(new Date(), "BEGIN watchIncommingRequests")
    const self = this
    const waitConfirmations = parseInt(WAIT_CONFIRMATIONS, 10) || 1
    await this.router.watchEvent(
      this.dataRequestEvent,
      this.fromBlockRequests,
      async function processEvent(event, err) {
        if (err) {
          console.error(
            new Date(),
            "ERROR watchIncommingRequests.processEvent for event",
            self.dataRequestEvent,
          )
          console.error(JSON.stringify(serializeError(err), null, 2))
        } else {
          const requestValid = await self.router.isValidDataRequest(event)
          const height = parseInt(event.blockNumber, 10)
          const { requestId } = event.returnValues

          if (requestValid) {
            const requestTxHash = event.transactionHash
            const { dataConsumer } = event.returnValues
            const endpoint = Web3.utils.toUtf8(event.returnValues.data)
            const gasPriceWei = event.returnValues.gasPrice // already in wei
            const { fee } = event.returnValues

            console.log(new Date(), "incoming job requestId", requestId, "from", dataConsumer)
            // add to Jobs table
            const heightToFulfill = height + waitConfirmations
            const [fr, frCreated] = await Jobs.findOrCreate({
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
            })

            if (frCreated) {
              console.log(
                new Date(),
                `Add new job ${endpoint} to queue from ${dataConsumer}. Job #${fr.id}, process in block ${heightToFulfill}`,
              )
            } else {
              console.log(new Date(), `Job for request ID ${requestId} exists on DB - id: ${fr.id}`)
            }
          }
        }
      },
    )
  }

  /**
   * Watch for any incoming RequestFulfilled events. This event is emitted when the Oracle
   * has submitted the fulfillRequest contract function, and the Tx was successful. This
   * method will watch for the event and update the Jobs database
   *
   * @returns {Promise<void>}
   */
  async watchIncommingFulfillments() {
    console.log(new Date(), "BEGIN watchIncommingFulfillments")
    const self = this
    await this.router.watchEvent(
      this.dataRequestFulfilledEvent,
      this.fromBlockFulfillments,
      async function processEvent(event, err) {
        if (err) {
          console.error(
            new Date(),
            "ERROR watchIncommingFulfillments.processEvent for event",
            self.dataRequestFulfilledEvent,
          )
          console.error(JSON.stringify(serializeError(err), null, 2))
        } else {
          const height = parseInt(event.blockNumber, 10)
          const { requestId } = event.returnValues
          const fulfillTxHash = event.transactionHash
          const { gasPayer } = event.returnValues

          console.log(new Date(), "incoming fulfillment requestId", requestId)

          const requestRes = await Jobs.findOne({ where: { requestId } })

          if (requestRes) {
            await updateJobComplete(requestRes.id, fulfillTxHash, height, gasPayer)
            await updateLastHeight(self.dataRequestFulfilledEvent, height)
          }
        }
      },
    )
  }

  /**
   * Watch for any RequestCancelled event and update the Jobs database
   *
   * @returns {Promise<void>}
   */
  async watchIncommingCancellations() {
    console.log(new Date(), "BEGIN watchIncommingCancellations")
    const self = this
    await this.router.watchEvent(
      this.dataCancelledEvent,
      this.fromBlockCancellations,
      async function processEvent(event, err) {
        if (err) {
          console.error(
            new Date(),
            "ERROR watchIncommingCancellations.processEvent for event",
            self.dataCancelledEvent,
          )
          console.error(JSON.stringify(serializeError(err), null, 2))
        } else {
          const height = parseInt(event.blockNumber, 10)
          const { requestId } = event.returnValues
          const cancelTxHash = event.transactionHash

          console.log(new Date(), "incoming cancellation requestId", requestId)

          const requestRes = await Jobs.findOne({ where: { requestId } })
          if (requestRes) {
            await updateJobCancelled(requestRes.id, cancelTxHash, height)
            await updateLastHeight(self.dataCancelledEvent, height)
          }
        }
      },
    )
  }

  /**
   * Monitors the newBlockHeaders WS subscription. With each new block,
   * it will check the Jobs database to see if any requests are due for processing.
   * It will then check if the request is still valid (e.g.. hasn't been cancelled
   * by the consumer), and attempt to query the Finchains API for the requested data
   * endpoint. Finally, it will submit a fulfillRequest Tx to the router with the
   * data.
   *
   * If the request does not exist in the Router smart contract, it will attempt to
   * check of the request has previously been cancelled or fulfilled
   *
   * @returns {Promise<void>}
   */
  async fulfillRequests() {
    console.log(new Date(), "BEGIN fulfillRequests")
    const self = this
    const supportedPairs = await getSupportedPairs()
    await this.router.watchBlocks(async function processBock(blockHeader, err) {
      if (err) {
        console.error(new Date(), "ERROR fulfillRequests.processBock:")
        console.error(JSON.stringify(serializeError(err), null, 2))
      } else {
        const height = blockHeader.number
        const jobsToProcess = await getOpenOrStuckJobs(height)
        for (let i = 0; i < jobsToProcess.length; i += 1) {
          const { id } = jobsToProcess[i]
          // REQUEST_STATUS_RECEIVED
          await updateJobRecieved(id)
        }
        for (let i = 0; i < jobsToProcess.length; i += 1) {
          const { id } = jobsToProcess[i]
          console.log(new Date(), "process job", id)
          const { requestId } = jobsToProcess[i]
          const { requestHeight } = jobsToProcess[i]
          const { dataConsumer } = jobsToProcess[i]
          const { endpoint } = jobsToProcess[i]
          const gasPriceWei = jobsToProcess[i].gas

          // check the request still exists and hasn't been cancelled or previously fulfilled
          const requestExists = await self.router.getRequestExists(requestId)
          if (requestExists) {
            let price = new BN(0)
            try {
              price = await getPriceFromApi(endpoint, supportedPairs)
            } catch (error) {
              // todo - handle this to retry getting the data
              await updateJobWithStatusReason(
                id,
                REQUEST_STATUS.REQUEST_STATUS_ERROR_PROCESS,
                JSON.stringify(serializeError(error), null, 2),
              )
              console.error(new Date(), "ERROR getPriceFromApi:")
              console.error(JSON.stringify(serializeError(error), null, 2))
            }
            if (price.gt(new BN("0"))) {
              console.log(
                new Date(),
                "attempt fulfillRequest data requestId",
                requestId,
                "data",
                price.toString(),
              )
              let fulfillTxHash
              try {
                fulfillTxHash = await self.router.fulfillRequest(requestId, price, dataConsumer, gasPriceWei)
                console.log(
                  new Date(),
                  "fulfillRequest submitted: requestId",
                  requestId,
                  "txHash",
                  fulfillTxHash,
                )

                // update database
                await updateJobFulfilling(id, price, fulfillTxHash)
              } catch (error) {
                await updateJobWithStatusReason(
                  id,
                  REQUEST_STATUS.REQUEST_STATUS_ERROR_PROCESS,
                  JSON.stringify(serializeError(error), null, 2),
                )
                console.error(new Date(), "ERROR fulfillRequest:")
                console.error(JSON.stringify(serializeError(error), null, 2))
              }
            }
          } else {
            // perhaps cancelled or already fulfilled
            console.log(new Date(), "request id does not exist on Router. Check if previously fulfilled")
            const fulfilled = await self.router.searchEventsForRequest(
              requestHeight,
              self.router.currentBlock,
              self.dataRequestFulfilledEvent,
              requestId,
            )
            if (fulfilled.length > 0) {
              const ev = fulfilled[0]
              if (ev.returnValues.requestId === requestId) {
                console.log(new Date(), "fulfillRequests - request", requestId, "already fulfilled")
                await updateJobComplete(id, ev.transactionHash, ev.blockNumber, ev.returnValues.gasPayer)
              }
            } else {
              console.log(new Date(), "request id does not exist on Router. Check if previously cancelled")
              const cancelled = await self.router.searchEventsForRequest(
                requestHeight,
                self.router.currentBlock,
                self.dataCancelledEvent,
                requestId,
              )

              if (cancelled.length > 0) {
                const ev = cancelled[0]
                if (ev.returnValues.requestId === requestId) {
                  console.log(new Date(), "fulfillRequests - request", requestId, "cancelled")
                  await updateJobCancelled(id, ev.transactionHash, ev.blockNumber)
                }
              } else {
                // unknown request id
                await updateJobWithStatusReason(
                  id,
                  REQUEST_STATUS.REQUEST_STATUS_ERROR_NOT_EXIST,
                  "request does not exist",
                )
              }
            }
          }
        }

        // Update the DB with the last known height checked
        await updateLastHeight(self.dataRequestEvent, height)
      }
    })
  }
}

module.exports = {
  ProviderOracle,
}
