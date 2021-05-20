const BN = require("bn.js")
const BigNumber = require('bignumber.js')
const Web3 = require("web3")
const { serializeError } = require("serialize-error")
const { XFUNDRouter } = require("./router")
const { getPriceFromApi, getxFundPriceInEth } = require("./finchains_api")
const { getSupportedPairs, updateSupportedPairs } = require("./pairs")
const {
  updateLastHeight,
  updateJobComplete,
  updateJobRecieved,
  updateJobFulfilling,
  updateJobWithStatusReason,
} = require("./db/update")
const { getOpenOrStuckJobs, getLastNJobsByAddress } = require("./db/query")

const { REQUEST_STATUS } = require("./consts")

const { Jobs, LastGethBlock } = require("./db/models")

const { WATCH_FROM_BLOCK, WAIT_CONFIRMATIONS } = process.env

class ProviderOracle {
  async initOracle() {
    this.router = new XFUNDRouter()
    await this.router.initWeb3()
    this.currentBlock = await this.router.getBlockNumber()

    this.dataRequestEvent = "DataRequested"
    this.dataRequestFulfilledEvent = "RequestFulfilled"

    this.fromBlockRequests = WATCH_FROM_BLOCK || this.currentBlock
    this.fromBlockFulfillments = WATCH_FROM_BLOCK || this.currentBlock

    console.log(new Date(), "current Eth height", this.currentBlock)

    const fromBlockRequestsRes = await LastGethBlock.findOne({ where: { event: this.dataRequestEvent } })
    const fromBlockFulfillmentsRes = await LastGethBlock.findOne({
      where: { event: this.dataRequestFulfilledEvent },
    })

    if (fromBlockRequestsRes) {
      this.fromBlockRequests = parseInt(fromBlockRequestsRes.height, 10)
    }
    if (fromBlockFulfillmentsRes) {
      this.fromBlockFulfillments = parseInt(fromBlockFulfillmentsRes.height, 10)
    }
    const diff = this.currentBlock - this.fromBlockFulfillments
    if (diff > 128) {
      this.fromBlockFulfillments = this.currentBlock - 128
    }
    console.log(new Date(), "get supported pairs")
    await updateSupportedPairs()
    const analysisData = await this.analysisTransactions('0xB85a55a482DF2b155Ca37f4F30142410FD0d08a6', 100, true)
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
            const { consumer } = event.returnValues
            const endpoint = Web3.utils.toUtf8(event.returnValues.data)
            const { fee } = event.returnValues

            console.log(new Date(), "incoming job requestId", requestId, "from", consumer)
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
                consumer,
                heightToFulfill,
                fee: fee.toString(),
                requestStatus: REQUEST_STATUS.REQUEST_STATUS_OPEN,
              },
            })

            if (frCreated) {
              console.log(
                new Date(),
                `Add new job ${endpoint} to queue from ${consumer}. Job #${fr.id}, process in block ${heightToFulfill}`,
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
          let gasUsed = 0
          let gasPrice = 0

          try {
            const txReceipt = await self.router.getTransactionReceipt(fulfillTxHash)
            const tx = await self.router.getTransaction(fulfillTxHash)
            gasUsed = txReceipt.gasUsed
            gasPrice = tx.gasPrice
          } catch (e) {
            console.log(new Date(), "error getting Tx receipt", e.toString())
          }

          console.log(new Date(), "incoming fulfillment requestId", requestId)

          const requestRes = await Jobs.findOne({ where: { requestId } })

          if (requestRes) {
            await updateJobComplete(requestRes.id, fulfillTxHash, height, gasUsed, gasPrice)
            await updateLastHeight(self.dataRequestFulfilledEvent, height)
          }
        }
      },
    )
  }

  /**
   * Monitors the newBlockHeaders WS subscription. With each new block,
   * it will check the Jobs database to see if any requests are due for processing.
   * It will then check if the request is still valid, and attempt to query the
   * Finchains API for the requested data endpoint. Finally, it will submit a
   * fulfillRequest Tx to the router with the data.
   *
   * If the request does not exist in the Router smart contract, it will attempt to
   * check of the request has previously been fulfilled
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
          const { consumer } = jobsToProcess[i]
          const { endpoint } = jobsToProcess[i]

          // check the request still exists and hasn't been previously fulfilled
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
                fulfillTxHash = await self.router.fulfillRequest(requestId, price, consumer)
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
            // perhaps already fulfilled
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
                await updateJobComplete(id, ev.transactionHash, ev.blockNumber)
              }
            } else {
              console.log(new Date(), "request id does not exist on Router.")
              // unknown request id
              await updateJobWithStatusReason(
                id,
                REQUEST_STATUS.REQUEST_STATUS_ERROR_NOT_EXIST,
                "request does not exist",
              )
            }
          }
        }

        // Update the DB with the last known height checked
        await updateLastHeight(self.dataRequestEvent, height)
      }
    })
  }

   /**
   * Analysis Transaction cost & simulate
   * It will quries the database and summarises data
   *
   * @returns {Promise<JSON>}
   */
  async analysisTransactions(address, numberOfTx, simulation = false, sGasPrice = 1.2, sxFundFee = 0.015) {
    const jobsToAnalysis = await getLastNJobsByAddress(numberOfTx, address);
    const numRows = jobsToAnalysis.length;
    const xFundInETH = await getxFundPriceInEth();
    console.log(new Date(), "xFund2ETH", xFundInETH);

    let xFundTotalFee = new BigNumber(0)
    let ethTotalFee = new BigNumber(0)
    let totalGasCost = new BigNumber(0)

    let gasMin = new BigNumber(Infinity)
    let gasMax = new BigNumber(0)
    let gasSum = new BigNumber(0)
    let gasMean = new BigNumber(0)

    let gasPriceMax = new BigNumber(0)
    let gasPriceMin = new BigNumber(Infinity)
    let gasPriceSum = new BigNumber(0)
    let gasPriceMean = new BigNumber(0)

    let maxGasConsumer = ''
    let minGasConsumer = ''
    
    let profitLossEth = new BigNumber(0)

    for (let i = 0; i < jobsToAnalysis.length; i += 1) {
      const { consumer, gasUsed } = jobsToAnalysis[i]
      let { gasPrice, fee } = jobsToAnalysis[i]
      if (simulation) { // simulate gas price and xFund fee
        gasPrice = new BigNumber(sGasPrice).times(new BigNumber('1e9'))
        fee = new BigNumber(sxFundFee).times(new BigNumber('1e9'))
      }
      
      xFundTotalFee = xFundTotalFee.plus(new BigNumber(fee))
      totalGasCost = totalGasCost.plus(new BigNumber(gasUsed).times(new BigNumber(gasPrice)))
      
      if (gasMin.gt(new BigNumber(gasUsed))){
        gasMin = new BigNumber(gasUsed)
        minGasConsumer = consumer
      }
      if (gasMax.lt(new BigNumber(gasUsed))) {
        gasMax = new BigNumber(gasUsed)
        maxGasConsumer = consumer
      }
      gasSum = gasSum.plus(new BigNumber(gasUsed))

      if (gasPriceMin.gt(new BigNumber(gasPrice)))
        gasPriceMin = new BigNumber(gasPrice)
      if (gasPriceMax.lt(new BigNumber(gasPrice)))
        gasPriceMax = new BigNumber(gasPrice)
      gasPriceSum = gasPriceSum.plus(new BigNumber(gasPrice))
    }

    gasMean = gasSum.div(numRows)
    gasPriceMean = gasPriceSum.div(numRows)
    xFundTotalFee = xFundTotalFee.div(new BigNumber('1e9'))
    ethTotalFee =  new BigNumber(xFundTotalFee).times(xFundInETH)
    let totalGasCostEth = new BigNumber(totalGasCost).div(new BigNumber('1e18'))
    profitLossEth = ethTotalFee.minus(totalGasCostEth)

    console.log(new Date(),
      xFundTotalFee.toString(),  //total xFUND fees earned
      ethTotalFee.toString(),    // total ETH fees earned
      gasSum.toString(),  //total spent on gas for fulfilling requests
      gasMin.toString(),         //lowest gas consumption
      gasMax.toString(),         //highest gas consumption
      gasMean.toString(),        //mean gas consumption
      gasPriceMin.toString(),    //lowest gas price
      gasPriceMax.toString(),    //highest gas price
      gasPriceMean.toString(),   //mean gas price
      maxGasConsumer, //consumer contract consuming the most gas for fulfilments
      minGasConsumer, //consumer contract consuming the least gas for fulfilments
      totalGasCostEth.toString(), // total gas cost in ETH for fulfilling requests
      profitLossEth.toString(),  //profit/loss (ETH fees earned - total gas cost in ETH)
    );

    return {
      xFundTotalFee,  //total xFUND fees earned
      ethTotalFee,    // total ETH fees earned
      gasSum,  //total spent on gas for fulfilling requests
      gasMin,         //lowest gas consumption
      gasMax,         //highest gas consumption
      gasMean,        //mean gas consumption
      gasPriceMin,    //lowest gas price
      gasPriceMax,    //highest gas price
      gasPriceMean,   //mean gas price
      maxGasConsumer, //consumer contract consuming the most gas for fulfilments
      minGasConsumer, //consumer contract consuming the least gas for fulfilments
      totalGasCostEth, // total gas cost in ETH for fulfilling requests
      profitLossEth,  //profit/loss (ETH fees earned - total gas cost in ETH)
    }
  }
}

module.exports = {
  ProviderOracle,
}
