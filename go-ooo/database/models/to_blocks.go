package models

import "gorm.io/gorm"

type ToBlocks struct {
	gorm.Model
	BlockNum uint64
}

func (ToBlocks) TableName() string {
	return "to_blocks"
}

func (d ToBlocks) GetId() uint {
	return d.ID
}

func (d ToBlocks) GetBlockNum() uint64 {
	return d.BlockNum
}
