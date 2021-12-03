package models

import (
	"gorm.io/gorm"
)

type DexPairs struct {
	gorm.Model
	DexName         string `gorm:"index:idx_dex_pair;index:idx_dex_pair_dex_name"`
	Pair            string `gorm:"index:idx_dex_pair;index:idx_dex_pair_pair"`
	T0              string `gorm:"index"`
	T1              string `gorm:"index"`
	ContractAddress string `gorm:"index"`
	HasPair         bool   `gorm:"index:idx_checked_has_pair;index:idx_has_pair"`
	LastCheckDate   uint64 `gorm:"index:idx_checked_has_pair;index:idx_pair_last_check_date"`
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

func (d *DexPairs) GetBase() string {
	return d.T0
}

func (d *DexPairs) GetTarget() string {
	return d.T1
}

func (d *DexPairs) GetContractAddress() string {
	return d.ContractAddress
}

func (d *DexPairs) GetHasPair() bool {
	return d.HasPair
}

func (d *DexPairs) GetLastCheckDate() uint64 {
	return d.LastCheckDate
}
