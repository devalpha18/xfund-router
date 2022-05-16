package models

import (
	"gorm.io/gorm"
)

type DexPairs struct {
	gorm.Model
	DexName         string `gorm:"index:idx_dex_pair;index:idx_dex_pair_dex_name"`
	Pair            string `gorm:"index:idx_dex_pair;index:idx_dex_pair_pair"`
	T0DexTokenId    uint   `gorm:"index:idx_dex_pair_t0;index:idx_dex_pair_t0_t1"`
	T1DexTokenId    uint   `gorm:"index:idx_dex_pair_t1;index:idx_dex_pair_t0_t1"`
	T0Symbol        string `gorm:"index"`
	T1Symbol        string `gorm:"index"`
	ContractAddress string `gorm:"index"`
	ReserveUsd      float64
}

func (DexPairs) TableName() string {
	return "dex_pairs"
}

func (d *DexPairs) GetDexName() string {
	return d.DexName
}

func (d *DexPairs) GetPair() string {
	return d.Pair
}

func (d *DexPairs) GetT0DexTokenId() uint {
	return d.T0DexTokenId
}

func (d *DexPairs) GetT1DexTokenId() uint {
	return d.T1DexTokenId
}

func (d *DexPairs) GetContractAddress() string {
	return d.ContractAddress
}
