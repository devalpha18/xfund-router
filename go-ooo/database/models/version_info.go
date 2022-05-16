package models

import "gorm.io/gorm"

const VERSION_TYPE_DB_SCHEMA = "db_schema"

type VersionInfo struct {
	gorm.Model
	VersionType    string
	CurrentVersion uint64
}

func (VersionInfo) TableName() string {
	return "version_info"
}

func (d VersionInfo) GetId() uint {
	return d.ID
}

func (d VersionInfo) GetVersionType() string {
	return d.VersionType
}

func (d VersionInfo) GetCurrentVersion() uint64 {
	return d.CurrentVersion
}
