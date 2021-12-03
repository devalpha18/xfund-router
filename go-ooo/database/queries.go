package database

import (
	"fmt"
	"go-ooo/database/models"
)

/*
  ToBlocks Queries
 */

func (d DB) GetLastBlockNumQueried() (models.ToBlocks, error) {
	toBlock := models.ToBlocks{}
	err := d.Last(&toBlock).Error
	return toBlock, err
}

/*
  DataRequests Queries
 */

func (d *DB) FindByRequestId(requestId string) (models.DataRequests, error) {
	result := models.DataRequests{}
	err := d.Where("request_id = ?", requestId).First(&result).Error
	return result, err
}

func (d *DB) GetPendingJobs() ([]models.DataRequests, error) {
	var jobs = []models.DataRequests{}
	err := d.Where("job_status = ?",
		models.JOB_STATUS_PENDING).Order(fmt.Sprintf("id %s", "asc")).Find(&jobs).Error
	return jobs, err
}

/*
  SupportedPairs queries
*/

func (d *DB) PairIsSupportedByPairName(pair string) (models.SupportedPairs, error) {
	supported := models.SupportedPairs{}
	err := d.Where("name = ?", pair).First(&supported).Error
	return supported, err
}

func (d *DB) PairIsSupportedByBaseAndTarget(base string, target string) (models.SupportedPairs, error) {
	supported := models.SupportedPairs{}
	err := d.Where("base = ? AND target = ?", base, target).First(&supported).Error
	return supported, err
}

func (d *DB) PairsNoLongerSupported(pairs []string) ([]models.SupportedPairs, error) {
	res := []models.SupportedPairs{}
	err := d.Not(map[string]interface{}{"name": pairs}).Find(&res).Error
	return res, err
}

/*
  DexPairs queries
 */

func (d *DB) FindByDexPairName(base string, target string, dexName string) (models.DexPairs, error) {
	pair := fmt.Sprintf("%s-%s", base, target)
	pairRev := fmt.Sprintf("%s-%s", target, base)
	result := models.DexPairs{}
	err := d.Where("(pair = ? OR pair = ?) AND dex_name = ?", pair, pairRev, dexName).First(&result).Error
	return result, err
}

/*
  DexTokens queries
 */

func (d *DB) FindByDexTokenSymbol(symbol string, dexName string) (models.DexTokens, error) {
	result := models.DexTokens{}
	err := d.Where("token_symbol = ? AND dex_name = ?", symbol, dexName).First(&result).Error
	return result, err
}

/*
  TokenContracts queries
 */

func (d *DB) FindByTokenAndAddress(symbol string, address string) (models.TokenContracts, error) {
	result := models.TokenContracts{}
	err := d.Where("token_symbol = ? AND contract_address = ?", symbol, address).First(&result).Error
	return result, err
}

func (d *DB) FindTokenAddressByRowId(id uint) (string, error) {
	result := models.TokenContracts{}
	err := d.Where("id = ?", id).First(&result).Error
	return result.ContractAddress, err
}