package database

import (
	"fmt"
	"go-ooo/database/models"
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

func (d *DB) UpdateRequestStatus(requestId string, status int, reason string) error {
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
		Name:   name,
		Base:   base,
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
		GasUsed:    gasUsed,
		GasPrice:   gasPrice,
		FailReason: reason,
	}).Error
	return
}

/*
  DexTokens
*/

func (d *DB) FindOrInsertNewDexToken(symbol string, tokenContractsId uint, dexName string, chain string) (models.DexTokens, error) {

	token, err := d.FindByDexTokenAll(symbol, dexName, tokenContractsId)

	if token.ID == 0 {
		return d.InsertNewDexToken(symbol, tokenContractsId, dexName, chain)
	}

	return token, err
}

func (d *DB) InsertNewDexToken(symbol string, tokenContractsId uint, dexName string, chain string) (models.DexTokens, error) {

	data := models.DexTokens{
		DexName:          dexName,
		TokenSymbol:      symbol,
		TokenContractsId: tokenContractsId,
		Chain:            chain,
	}

	err := d.Create(&data).Error

	return data, err
}

/*
  DexPairs
*/

func (d *DB) FindOrInsertNewDexPair(t0Symbol string, t1Symbol string,
	contractAddress string, dexName string, t0DbId uint, t1DbId uint, reserveUsd float64) (models.DexPairs, error) {

	pair, err := d.FindByDexPairName(t0Symbol, t1Symbol, dexName)

	if pair.ID == 0 {
		return d.InsertNewDexPair(t0Symbol, t1Symbol, contractAddress, dexName, t0DbId, t1DbId, reserveUsd)
	}

	return pair, err
}

func (d *DB) InsertNewDexPair(t0Symbol string, t1Symbol string,
	contractAddress string, dexName string, t0DbId uint, t1DbId uint, reserveUsd float64) (models.DexPairs, error) {

	data := models.DexPairs{
		DexName:         dexName,
		Pair:            fmt.Sprintf("%s-%s", t0Symbol, t1Symbol),
		T0DexTokenId:    t0DbId,
		T1DexTokenId:    t1DbId,
		T0Symbol:        t0Symbol,
		T1Symbol:        t1Symbol,
		ContractAddress: contractAddress,
		ReserveUsd:      reserveUsd,
	}

	err := d.Create(&data).Error

	return data, err
}

func (d *DB) UpdateOrInsertNewDexPair(t0Symbol string, t1Symbol string,
	contractAddress string, dexName string, t0DbId uint, t1DbId uint) (err error) {

	pair, err := d.FindByDexPairName(t0Symbol, t1Symbol, dexName)

	if pair.ID == 0 {
		err = d.Create(&models.DexPairs{
			DexName:         dexName,
			Pair:            fmt.Sprintf("%s-%s", t0Symbol, t1Symbol),
			T0DexTokenId:    t0DbId,
			T1DexTokenId:    t1DbId,
			T0Symbol:        t0Symbol,
			T1Symbol:        t1Symbol,
			ContractAddress: contractAddress,
		}).Error
	} else {
		pair.ContractAddress = contractAddress

		// t0Symbol and t1Symbol from contract might differ from the default base/target sent
		// when a pair isn't found on a DEX, so update them also
		pair.Pair = fmt.Sprintf("%s-%s", t0Symbol, t1Symbol)
		pair.T0DexTokenId = t0DbId
		pair.T1DexTokenId = t1DbId
		err = d.Save(&pair).Error
	}

	return
}

/*
  TokenContracts
*/

func (d *DB) FindOrInsertNewTokenContract(symbol string, contractAddress string, chain string) (models.TokenContracts, error) {
	res, err := d.FindByTokenAll(symbol, contractAddress, chain)
	if res.ID == 0 {
		return d.InsertNewTokenContract(symbol, contractAddress, chain)
	}
	return res, err
}

func (d *DB) UpdateOrInsertNewTokenContract(symbol string, contractAddress string, chain string) (models.TokenContracts, error) {
	res, err := d.FindByTokenAndAddress(symbol, contractAddress)
	if res.ID == 0 {
		return d.InsertNewTokenContract(symbol, contractAddress, chain)
	} else {
		res.ContractAddress = contractAddress
		err = d.Save(&res).Error
	}
	return res, err
}

func (d *DB) InsertNewTokenContract(symbol string, contractAddress string, chain string) (models.TokenContracts, error) {

	data := models.TokenContracts{
		TokenSymbol:     symbol,
		ContractAddress: contractAddress,
		Chain:           chain,
	}

	err := d.Create(&data).Error

	return data, err
}

/*
 VersionInfo
*/

func (d *DB) setDbSchemaVersion(newVersion uint64) error {
	currVers, err := d.getCurrentDbSchemaVersion()
	if currVers.ID == 0 {
		err = d.Create(&models.VersionInfo{
			VersionType:    models.VERSION_TYPE_DB_SCHEMA,
			CurrentVersion: newVersion,
		}).Error
	} else {
		currVers.CurrentVersion = newVersion
		err = d.Save(&currVers).Error
	}

	return err
}
