package models

import "gorm.io/gorm"

type DexTokens struct {
	gorm.Model
	DexName          string `gorm:"index:idx_dex_tokens_token_symbol;index:idx_dex_tokens_name;index:idx_dex_tokens_dex_chain"`
	TokenSymbol      string `gorm:"index:idx_dex_tokens_token_symbol;index:idx_dex_tokens_symbol"`
	TokenContractsId uint   `gorm:"index:idx_dex_tokens_tokenid_check_date;index:idx_dex_tokens_tokenid"`
	Chain            string `gorm:"index:idx_dex_tokens_chain;index:idx_dex_tokens_dex_chain"`
}

func (DexTokens) TableName() string {
	return "dex_tokens"
}

func (d *DexTokens) GetDexName() string {
	return d.DexName
}

func (d *DexTokens) GetTokenContractsId() uint {
	return d.TokenContractsId
}

func (d *DexTokens) GetChain() string {
	return d.Chain
}
