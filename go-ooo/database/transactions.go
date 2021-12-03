package database

import (
	"fmt"
	"go-ooo/database/models"
	"time"
)

/*
  DataRequests table
 */

func (d *DB) InsertNewRequest(provider string,
	consumer string, requestId string,
	endpoint string, endpointDecoded string,
	txHash string, gasUsed uint64, gasPrice uint64,
	fee uint64, blockNumber uint64, isAdhoc bool) (err error) {
	err = d.Omit("FulfilTx").Create(&models.DataRequests{
		Provider:            provider,
		Consumer:            consumer,
		RequestId:           requestId,
		Endpoint:            endpoint,
		EndpointDecoded:     endpointDecoded,
		RequestTxHash:       txHash,
		RequestGasUsed:      gasUsed,
		RequestGasPrice:     gasPrice,
		RequestBlockNumber:  blockNumber,
		Fee:                 fee,
		RequestStatus:       models.REQUEST_STATUS_INITIALISED,
		FulfillmentAttempts: 0,
		IsAdhoc:             isAdhoc,
		JobStatus:           models.JOB_STATUS_PENDING,
	}).Error
	return
}

func (d *DB) UpdateFulfillmentSuccess(requestId string, blockNumber uint64,
	txHash string, gasUsed uint64, gasPrice uint64) error {

	req := models.DataRequests{}
	err := d.Where("request_id = ?", requestId).First(&req).Error
	if err != nil {
		return err
	}

	req.RequestStatus = models.REQUEST_STATUS_SUCCESS
	req.JobStatus = models.JOB_STATUS_SUCCESS
	req.FulfillConfirmedBlockNumber = blockNumber
	req.FulfillTxHash = txHash
	req.FulfillGasUsed = gasUsed
	req.FulfillGasPrice = gasPrice

	err = d.Save(&req).Error

	return err
}

func (d *DB) UpdateFulfillmentSent(requestId string, txHash string, blockNumber uint64) error {

	req := models.DataRequests{}
	err := d.Where("request_id = ?", requestId).First(&req).Error
	if err != nil {
		return err
	}

	req.FulfillTxHash = txHash
	req.LastFulfillSentBlockNumber = blockNumber

	err = d.Save(&req).Error

	return err
}

func (d *DB) IncrementFulfillmentAttempts(requestId string) error {
	req := models.DataRequests{}
	err := d.Where("request_id = ?", requestId).First(&req).Error
	if err != nil {
		return err
	}

	req.FulfillmentAttempts = req.FulfillmentAttempts + 1

	err = d.Save(&req).Error

	return err
}

func (d *DB) UpdateRequestStatus(requestId string,status int, reason string) error {
	req := models.DataRequests{}
	err := d.Where("request_id = ?", requestId).First(&req).Error
	if err != nil {
		return err
	}

	req.RequestStatus = status
	req.StatusReason = reason

	if status == models.REQUEST_STATUS_FULFILMENT_FAILED {
		req.JobStatus = models.JOB_STATUS_FAIL
	}

	err = d.Save(&req).Error

	return err
}

func (d *DB) UpdateJobStatus(requestId string, status int) error {
	req := models.DataRequests{}
	err := d.Where("request_id = ?", requestId).First(&req).Error
	if err != nil {
		return err
	}

	req.JobStatus = status

	err = d.Save(&req).Error

	return err
}

func (d *DB) UpdateDataFetched(requestId string, price string) error {
	req := models.DataRequests{}
	err := d.Where("request_id = ?", requestId).First(&req).Error
	if err != nil {
		return err
	}

	req.RequestStatus = models.REQUEST_STATUS_DATA_READY_TO_SEND
	req.PriceResult = price

	err = d.Save(&req).Error

	return err
}

func (d *DB) UpdateLastDataFetchBlockNumber(requestId string, blockNum uint64) error {
	req := models.DataRequests{}
	err := d.Where("request_id = ?", requestId).First(&req).Error
	if err != nil {
		return err
	}

	req.LastDataFetchBlockNumber = blockNum

	err = d.Save(&req).Error

	return err
}

/*
  ToBlocks table
 */

func (d *DB) InsertNewToBlock(toBlock uint64) (err error) {

	last, _ := d.GetLastBlockNumQueried()

	if last.GetBlockNum() < toBlock {
		err = d.Create(&models.ToBlocks{
			BlockNum: toBlock,
		}).Error
	}

	return
}

/*
  SupportedPairs table
 */

func (d *DB) AddNewSupportedPair(name string, base string, target string) (err error) {
	err = d.Create(&models.SupportedPairs{
		Name: name,
		Base: base,
		Target: target,
	}).Error
	return
}

/*
  FailedFulfillments table
 */

func (d *DB) InsertNewFailedFulfilment(requestId string, txHash string, gasUsed uint64, gasPrice uint64, reason string) (err error) {
	err = d.Create(&models.FailedFulfilment{
		RequestId:  requestId,
		TxHash:     txHash,
		GasUsed: gasUsed,
		GasPrice: gasPrice,
		FailReason: reason,
	}).Error
	return
}

/*
  DexTokens
 */

func (d *DB) UpdateOrInsertNewDexToken(symbol string, tokenContractsId uint, dexName string) (err error) {

	token, err := d.FindByDexTokenSymbol(symbol, dexName)

	if token.ID == 0 {
		err = d.Create(&models.DexTokens{
			DexName: dexName,
			TokenSymbol: symbol,
			TokenContractsId: tokenContractsId,
			LastCheckDate: uint64(time.Now().Unix()),
		}).Error
	} else {
		token.TokenContractsId = tokenContractsId
		token.LastCheckDate = uint64(time.Now().Unix())

		err = d.Save(&token).Error
	}
	return
}

/*
  DexPairs
 */

func (d *DB) UpdateOrInsertNewDexPair(t0 string, t1 string,
	contractAddress string, dexName string) (err error) {

	hasPair := false
	if contractAddress != "" {
		hasPair = true
	}

	pair, err := d.FindByDexPairName(t0, t1, dexName)

	if pair.ID == 0 {
		err = d.Create(&models.DexPairs{
			DexName:         dexName,
			Pair:            fmt.Sprintf("%s-%s", t0, t1),
			T0:              t0,
			T1:              t1,
			ContractAddress: contractAddress,
			HasPair:         hasPair,
			LastCheckDate:   uint64(time.Now().Unix()),
		}).Error
	} else {
		pair.ContractAddress = contractAddress
		pair.HasPair = hasPair
		pair.LastCheckDate = uint64(time.Now().Unix())

		// t0 and t1 from contract might differ from the default base/target sent
		// when a pair isn't found on a DEX, so update them also
		pair.Pair = fmt.Sprintf("%s-%s", t0, t1)
		pair.T0 = t0
		pair.T1 = t1
		err = d.Save(&pair).Error
	}

	return
}

/*
  TokenContracts queries
*/

func (d *DB) FindOrInsertNewTokenContract(symbol string, contractAddress string) (models.TokenContracts, error) {
	res, err := d.FindByTokenAndAddress(symbol, contractAddress)
	if res.ID == 0 {
		return d.InsertNewTokenContract(symbol, contractAddress)
	}
	return res, err
}

func (d *DB) InsertNewTokenContract(symbol string, contractAddress string) (models.TokenContracts, error) {

	data := models.TokenContracts{
		TokenSymbol:     symbol,
		ContractAddress: contractAddress,
	}

	err := d.Create(&data).Error

	return data, err
}
