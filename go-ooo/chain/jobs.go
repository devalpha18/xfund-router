package chain

import (
	"fmt"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	solsha3 "github.com/miguelmota/go-solidity-sha3"
	"github.com/sirupsen/logrus"
	"github.com/spf13/viper"
	"go-ooo/config"
	"go-ooo/database/models"
	"math/big"
)

func (o *OoORouterService) ProcessPendingJobQueue() {

	o.logger.WithFields(logrus.Fields{
		"package":  "chain",
		"function": "ProcessPendingJobQueue",
		"action":   "check job queue",
	}).Info()

	// get pending requests from data_requests table
	requests, err := o.db.GetPendingJobs()

	if err != nil {
		o.logger.WithFields(logrus.Fields{
			"package":  "chain",
			"function": "ProcessPendingJobQueue",
			"action":   "get job queue",
			"num_jobs": len(requests),
		}).Error(err.Error())

		return
	}

	if len(requests) > 0 {
		// for checking sent fulfilments etc.
		currentBlockNum, err := o.client.BlockNumber(o.context)

		if err != nil {
			o.logger.WithFields(logrus.Fields{
				"package":  "chain",
				"function": "ProcessPendingJobQueue",
				"action":   "get block num",
			}).Error(err.Error())

			return
		}

		for _, request := range requests {
			// process
			o.preProcessPendingJob(request, currentBlockNum)
		}
	}
}

func (o *OoORouterService) preProcessPendingJob(job models.DataRequests, currentBlockNum uint64) {
	requestId := job.GetRequestId()
	o.logger.WithFields(logrus.Fields{
		"package":    "chain",
		"function":   "preProcessPendingJob",
		"action":     "preprocess job",
		"request_id": requestId,
		"status":     job.GetRequestStatusString(),
	}).Info()

	// get request Tx receipt from chain
	requestTxReceipt, err := o.client.TransactionReceipt(o.context, common.HexToHash(job.GetRequestTxHash()))
	if err != nil {
		// possibly not in Tx pool yet
		o.logger.WithFields(logrus.Fields{
			"package":    "chain",
			"function":   "preProcessPendingJob",
			"action":     "get tx receipt from chain",
			"request_id": requestId,
			"request_tx": job.GetRequestTxHash(),
		}).Error(err.Error())
		return
	}

	requestBlockDiff := currentBlockNum - requestTxReceipt.BlockNumber.Uint64()
	switch job.GetRequestStatus() {
	case models.REQUEST_STATUS_INITIALISED:
		waitConfirmations := viper.GetUint64(config.JobsWaitConfirmations)
		if requestBlockDiff >= waitConfirmations {
			go func(o *OoORouterService, job models.DataRequests) {
				o.processFulfillmentFetchData(job, currentBlockNum)
			}(o, job)
		} else {
			// log it
			o.logger.WithFields(logrus.Fields{
				"package":       "chain",
				"function":      "preProcessPendingJob",
				"action":        "check confirmations for initialised job",
				"request_id":    requestId,
				"request_block": requestTxReceipt.BlockNumber.Uint64(),
				"current_block": currentBlockNum,
				"block_diff":    requestBlockDiff,
				"wait_config":   waitConfirmations,
			}).Info("not enough block confirmations to fulfill request")
		}
		return
	case models.REQUEST_STATUS_DATA_READY_TO_SEND:
		o.sendFulfillmentTx(job, currentBlockNum)
		return
	case models.REQUEST_STATUS_TX_FAILED:
		o.processSendFailedJob(job, currentBlockNum)
		return
	case models.REQUEST_STATUS_API_ERROR:
		o.processSendFailedJob(job, currentBlockNum)
		return
	case models.REQUEST_STATUS_FETCHING_DATA:
		o.processPossiblyStuckDataFetch(job, currentBlockNum)
		return
	case models.REQUEST_STATUS_TX_SENT:
		o.processPossiblyStuckSentTx(job, currentBlockNum)
		return
	default:
		return
	}

}

func (o *OoORouterService) processFulfillmentFetchData(job models.DataRequests, currentBlockNum uint64) {

	requestId := job.GetRequestId()

	o.logger.WithFields(logrus.Fields{
		"package":    "chain",
		"function":   "processFulfillmentFetchData",
		"request_id": requestId,
	}).Debug("begin fetching data")

	err := o.RenewTransactOpts()
	if err != nil {
		o.logger.WithFields(logrus.Fields{
			"package":    "chain",
			"function":   "ProcessAdminTask",
			"action":     "RenewTransactOpts",
			"request_id": requestId,
		}).Error(err.Error())
		return
	}

	err = o.db.UpdateRequestStatus(requestId, models.REQUEST_STATUS_FETCHING_DATA, "")

	if err != nil {
		// possibly not in Tx pool yet
		o.logger.WithFields(logrus.Fields{
			"package":    "chain",
			"function":   "processFulfillmentFetchData",
			"action":     "update processing status in db",
			"request_id": requestId,
		}).Error(err.Error())
		return
	}

	err = o.db.IncrementFulfillmentAttempts(requestId)

	if err != nil {
		// possibly not in Tx pool yet
		o.logger.WithFields(logrus.Fields{
			"package":    "chain",
			"function":   "processFulfillmentFetchData",
			"action":     "update fulfilment attempts in db",
			"request_id": requestId,
		}).Error(err.Error())
		return
	}

	err = o.db.UpdateLastDataFetchBlockNumber(requestId, currentBlockNum)

	if err != nil {
		// possibly not in Tx pool yet
		o.logger.WithFields(logrus.Fields{
			"package":    "chain",
			"function":   "processFulfillmentFetchData",
			"action":     "update last fetch blocknum in db",
			"request_id": requestId,
		}).Error(err.Error())
		return
	}

	endpoint := job.GetEndpointDecoded()

	isAdHoc := job.GetIsAdHoc()

	var price string

	if isAdHoc {
		price, err = o.oooApi.QueryAdhoc(endpoint, requestId)
	} else {
		price, err = o.oooApi.QueryFinchainsEndpoint(endpoint, requestId)
	}

	if err != nil {
		o.logger.WithFields(logrus.Fields{
			"package":    "chain",
			"function":   "processFulfillmentFetchData",
			"action":     "run api query",
			"request_id": requestId,
		}).Error(err.Error())
		_ = o.db.UpdateRequestStatus(requestId, models.REQUEST_STATUS_API_ERROR, err.Error())
		return
	}

	if price == "" {
		// no price returned
		o.logger.WithFields(logrus.Fields{
			"package":    "chain",
			"function":   "processFulfillmentFetchData",
			"action":     "query api",
			"request_id": requestId,
		}).Error("empty price returned")
		_ = o.db.UpdateRequestStatus(requestId, models.REQUEST_STATUS_API_ERROR, "empty price returned")
		return
	}

	o.logger.WithFields(logrus.Fields{
		"package":    "chain",
		"function":   "processFulfillmentFetchData",
		"request_id": requestId,
		"endpoint":   job.Endpoint,
		"price":      price,
	}).Debug("price fetched")

	_ = o.db.UpdateDataFetched(requestId, price)

	return
}

func (o *OoORouterService) sendFulfillmentTx(job models.DataRequests, currentBlockNum uint64) {
	requestId := job.GetRequestId()
	price := job.GetPriceResult()

	o.logger.WithFields(logrus.Fields{
		"package":    "chain",
		"function":   "sendFulfillmentTx",
		"request_id": requestId,
	}).Debug("begin send fulfillment transaction")

	// https://ethereum.stackexchange.com/questions/51566/from-golang-sha3-to-solidity-sha3
	priceBigInt := big.NewInt(0)
	priceBigInt.SetString(price, 10)

	reqIdBytes := common.FromHex(requestId)
	reqIdBytes32 := [32]byte{}
	copy(reqIdBytes32[:], reqIdBytes)

	hash := solsha3.SoliditySHA3(
		solsha3.Bytes32(reqIdBytes),
		solsha3.Uint256(price),
		solsha3.Address(job.Consumer),
	)

	msg := fmt.Sprintf("\x19Ethereum Signed Message:\n32%s", hash)
	msgHash := crypto.Keccak256Hash([]byte(msg))

	signatureBytes, err := crypto.Sign(msgHash.Bytes(), o.oraclePrivateKey)

	if err != nil {
		o.logger.WithFields(logrus.Fields{
			"package":    "chain",
			"function":   "sendFulfillmentTx",
			"action":     "sign message",
			"request_id": requestId,
		}).Error(err.Error())
		_ = o.db.UpdateRequestStatus(requestId, models.REQUEST_STATUS_TX_FAILED, err.Error())
		return
	}

	// grr - https://ethereum.stackexchange.com/questions/45580/validating-go-ethereum-key-signature-with-ecrecover
	signatureBytes[64] = uint8(int(signatureBytes[64])) + 27

	tx, err := o.contractInstance.FulfillRequest(o.transactOpts, reqIdBytes32, priceBigInt, signatureBytes)

	if err != nil {
		o.logger.WithFields(logrus.Fields{
			"package":    "chain",
			"function":   "sendFulfillmentTx",
			"action":     "send transaction",
			"request_id": requestId,
		}).Error(err.Error())

		_ = o.db.UpdateRequestStatus(requestId, models.REQUEST_STATUS_TX_FAILED, err.Error())
		return
	}

	o.logger.WithFields(logrus.Fields{
		"package":    "chain",
		"function":   "sendFulfillmentTx",
		"action":     "send transaction",
		"request_id": requestId,
		"tx":         tx.Hash().Hex(),
	}).Info("fulfill tx sent")

	_ = o.db.UpdateRequestStatus(requestId, models.REQUEST_STATUS_TX_SENT, "")
	_ = o.db.UpdateFulfillmentSent(requestId, tx.Hash().Hex(), currentBlockNum)

	o.setNextTxNonce(tx.Nonce(), false)

	_ = o.RenewTransactOpts()
}

func (o *OoORouterService) processPossiblyStuckDataFetch(job models.DataRequests, currentBlockNum uint64) {
	requestId := job.GetRequestId()
	o.logger.WithFields(logrus.Fields{
		"package":    "chain",
		"function":   "processPossiblyStuckDataFetch",
		"action":     "start",
		"request_id": requestId,
	}).Debug("begin processing possibly stuck data fetch")

	// at some point, we just have to stop trying...
	if job.GetFulfillmentAttempts() >= 3 {
		// too many fails
		o.logger.WithFields(logrus.Fields{
			"package":      "chain",
			"function":     "processPossiblyStuckDataFetch",
			"action":       "check num attempts",
			"request_id":   requestId,
			"num_attempts": job.GetFulfillmentAttempts(),
		}).Warn()

		_ = o.db.UpdateRequestStatus(requestId, models.REQUEST_STATUS_FULFILMENT_FAILED, "too many failed attempts")
		return
	}

	lastFetchBlockDiff := currentBlockNum - job.LastDataFetchBlockNumber

	// still relatively new - ignore
	if lastFetchBlockDiff < 5 {
		o.logger.WithFields(logrus.Fields{
			"package":    "chain",
			"function":   "processPossiblyStuckDataFetch",
			"action":     "check request age",
			"request_id": requestId,
		}).Info("request < 5 blocks. Wait for data fetch timeout")
		return
	}

	requestBlockDiff := currentBlockNum - job.RequestBlockNumber

	// is the request > 1 hour old?
	if requestBlockDiff > 250 {
		o.logger.WithFields(logrus.Fields{
			"package":    "chain",
			"function":   "processPossiblyStuckDataFetch",
			"action":     "check request age",
			"request_id": requestId,
		}).Warn("request too old")
		_ = o.db.UpdateRequestStatus(requestId, models.REQUEST_STATUS_FULFILMENT_FAILED, "request too old")
		return
	}

	// finally, try to re-fetch data for fulfillment
	o.processFulfillmentFetchData(job, currentBlockNum)
}

// processSendFailedJob will try to see why a fulfilment didn't even send, and resend
func (o *OoORouterService) processSendFailedJob(job models.DataRequests, currentBlockNum uint64) {

	requestId := job.GetRequestId()
	o.logger.WithFields(logrus.Fields{
		"package":    "chain",
		"function":   "processSendFailedJob",
		"action":     "start",
		"request_id": requestId,
	}).Debug("begin processing send failed job")

	// Add fail info to failed Tx history table
	_ = o.db.InsertNewFailedFulfilment(requestId, "", 0, 0, job.GetStatusReason())

	// at some point, we just have to stop trying...
	if job.GetFulfillmentAttempts() >= 3 {
		// too many fails
		o.logger.WithFields(logrus.Fields{
			"package":      "chain",
			"function":     "processSendFailedJob",
			"action":       "check num attempts",
			"request_id":   requestId,
			"num_attempts": job.GetFulfillmentAttempts(),
		}).Warn("too many failed attempts")

		_ = o.db.UpdateRequestStatus(requestId, models.REQUEST_STATUS_FULFILMENT_FAILED, "too many failed attempts")
		return
	}

	requestBlockDiff := currentBlockNum - job.RequestBlockNumber

	// is the request > 1 hour old?
	if requestBlockDiff > 250 {
		o.logger.WithFields(logrus.Fields{
			"package":    "chain",
			"function":   "processSendFailedJob",
			"action":     "check request age",
			"request_id": requestId,
		}).Warn("request too old")
		_ = o.db.UpdateRequestStatus(requestId, models.REQUEST_STATUS_FULFILMENT_FAILED, "request too old")
		return
	}

	// finally, try to re-fetch data for fulfillment
	o.processFulfillmentFetchData(job, currentBlockNum)

}

func (o *OoORouterService) processPossiblyStuckSentTx(job models.DataRequests, currentBlockNum uint64) {
	requestId := job.GetRequestId()
	o.logger.WithFields(logrus.Fields{
		"package":    "chain",
		"function":   "processPossiblyStuckSentTx",
		"action":     "start",
		"request_id": requestId,
	}).Debug("begin processing possibly stuck sent tx")

	lastFulfillSentBlockDiff := currentBlockNum - job.GetLastFulfillSentBlockNumber()
	if lastFulfillSentBlockDiff < 3 {
		// too soon - may take a while for Tx to be broadcast/picked up
		o.logger.WithFields(logrus.Fields{
			"package":    "chain",
			"function":   "processPossiblyStuckSentTx",
			"action":     "check block diff since fulfill tx sent",
			"request_id": requestId,
			"block_diff": lastFulfillSentBlockDiff,
		}).Info("not enough blocks since last sent. Wait.")
		return
	}

	fulfilTxHash := common.HexToHash(job.GetFulfillTxHash())
	// check if it's pending
	_, isPending, err := o.client.TransactionByHash(o.context, fulfilTxHash)

	if err != nil {
		// possibly not in Tx pool yet
		o.logger.WithFields(logrus.Fields{
			"package":    "chain",
			"function":   "processPossiblyStuckSentTx",
			"action":     "get fulfill tx",
			"request_id": requestId,
			"tx_hash":    job.GetFulfillTxHash(),
		}).Error(err.Error())
		return
	}

	// no point continuing if it's still pending. Log it and move on.
	if isPending {
		o.logger.WithFields(logrus.Fields{
			"package":    "chain",
			"function":   "processPossiblyStuckSentTx",
			"action":     "check fulfill tx pending",
			"request_id": requestId,
			"tx_hash":    job.GetFulfillTxHash(),
		}).Info("tx still pending - ignore")
		return
	}

	// try and get the receipt
	fulfillReceipt, err := o.client.TransactionReceipt(o.context, fulfilTxHash)
	if err != nil {
		o.logger.WithFields(logrus.Fields{
			"package":    "chain",
			"function":   "processPossiblyStuckSentTx",
			"action":     "get fulfil tx receipt",
			"request_id": job.GetRequestId(),
			"tx_hash":    job.GetFulfillTxHash(),
		}).Error(err.Error())
		return
	}

	if fulfillReceipt.Status == 1 {
		// Tx was successful. double check for RandomnessRequestFulfilled event
		// in case it was missed

		o.logger.WithFields(logrus.Fields{
			"package":    "chain",
			"function":   "processPossiblyStuckSentTx",
			"action":     "check fulfill tx status",
			"request_id": requestId,
		}).Info("tx was successful. check for RequestFulfilled event")
		reqIdBytes := common.FromHex(requestId)
		reqIdBytes32 := [32]byte{}
		copy(reqIdBytes32[:], reqIdBytes)
		reqArr := make([][32]byte, 0, 1)
		reqArr = append(reqArr, reqIdBytes32)
		opts := o.historicalFilterOpts
		opts.Start = job.RequestBlockNumber
		itrFr, err := o.contractInstance.FilterRequestFulfilled(opts, nil, nil, reqArr)
		if err != nil {
			o.logger.WithFields(logrus.Fields{
				"package":  "chain",
				"function": "processPossiblyStuckSentTx",
				"action":   "get FilterRequestFulfilled events",
			}).Error(err.Error())
			return
		}

		for itrFr.Next() {
			event := itrFr.Event
			o.processIncomingFulfilments(event)
		}
		return
	}

	// Tx has failed - process
	// used later to store failed fulfill tx history
	failedGasUsed := job.GetFulfillGasUsed()
	failedGasPrice := job.GetFulfillGasPrice()
	failReason := "tx reverted" // todo - try to get revert reason from receipt

	// Add fail info to failed Tx history table
	_ = o.db.InsertNewFailedFulfilment(requestId, fulfilTxHash.Hex(), failedGasUsed, failedGasPrice, failReason)

	// at some point, we just have to stop trying...
	if job.GetFulfillmentAttempts() >= 3 {
		// too many fails
		o.logger.WithFields(logrus.Fields{
			"package":      "chain",
			"function":     "processSendFailedJob",
			"action":       "check num attempts",
			"request_id":   requestId,
			"num_attempts": job.GetFulfillmentAttempts(),
		}).Warn("too many failed attempts")

		_ = o.db.UpdateRequestStatus(requestId, models.REQUEST_STATUS_FULFILMENT_FAILED, "too many failed attempts")
		return
	}

	requestBlockDiff := currentBlockNum - job.RequestBlockNumber

	// is the request > 1 hour?
	if requestBlockDiff > 250 {
		o.logger.WithFields(logrus.Fields{
			"package":    "chain",
			"function":   "processSendFailedJob",
			"action":     "check request age",
			"request_id": requestId,
		}).Warn("request too old")
		_ = o.db.UpdateRequestStatus(requestId, models.REQUEST_STATUS_FULFILMENT_FAILED, "request too old")
		return
	}

	// finally, try to send a new fulfillment
	o.sendFulfillmentTx(job, currentBlockNum)

	return
}
