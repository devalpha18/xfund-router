package models

import "gorm.io/gorm"

type SupportedPairs struct {
	gorm.Model
	Name   string `gorm:"index"`
	Base   string `gorm:"index"`
	Target string `gorm:"index"`
}

func (SupportedPairs) TableName() string {
	return "supported_pairs"
}

func (d SupportedPairs) GetId() uint {
	return d.ID
}

func (d SupportedPairs) GetName() string {
	return d.Name
}

func (d SupportedPairs) GetBase() string {
	return d.Base
}

func (d SupportedPairs) GetTarget() string {
	return d.Target
}
