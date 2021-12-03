package models

import "gorm.io/gorm"

type TokenContracts struct {
	gorm.Model
	TokenSymbol     string `gorm:"index:idx_token_contracts_symbol_address;index:idx_token_contracts_symbol"`
	ContractAddress string `gorm:"index:idx_token_contracts_symbol_address;index:idx_token_contracts_address"`
}

func (TokenContracts) TableName() string {
	return "token_contracts"
}

func (d *TokenContracts) GetTokenSymbol() string {
	return d.TokenSymbol
}

func (d *TokenContracts) GetContractAddress() string {
	return d.ContractAddress
}
