package database

import (
	"errors"
	"fmt"
	"github.com/spf13/viper"
	"go-ooo/config"
	"go-ooo/database/models"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"log"
	"os"
	"time"
)

type DB struct {
	*gorm.DB
}

func NewDb() (*DB, error) {
	gormLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags), // io writer
		logger.Config{
			SlowThreshold:             time.Second, // Slow SQL threshold
			LogLevel:                  logger.Warn, // Log level
			IgnoreRecordNotFoundError: true,        // Ignore ErrRecordNotFound error for logger
			Colorful:                  false,       // Disable color
		},
	)
	switch viper.GetString(config.DatabaseDialect) {
	case "sqlite":
		return NewSqliteDb(gormLogger)
	case "postgres":
		return NewPostgresDb(gormLogger)
	default:
		return nil, errors.New("no db dialect in config")
	}
}

func NewSqliteDb(logger logger.Interface) (*DB, error) {
	db, err := gorm.Open(sqlite.Open(viper.GetString(config.DatabaseStorage)), &gorm.Config{
		Logger: logger,
	})
	return &DB{
		db,
	}, err
}

func NewPostgresDb(logger logger.Interface) (*DB, error) {
	host := viper.GetString(config.DatabaseHost)
	port := viper.GetInt(config.DatabasePort)
	user := viper.GetString(config.DatabaseUser)
	dbName := viper.GetString(config.DatabaseDatabase)
	password := viper.GetString(config.DatabasePassword)
	if host == "" || port == 0 {
		return nil, nil
	}

	dsn := fmt.Sprintf("host=%s port=%d user=%s dbname=%s password=%s sslmode=disable",
		host, port, user, dbName, password)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger,
	})

	if err != nil {
		return nil, err
	}

	return &DB{db}, nil
}

func (d *DB) Migrate() (err error) {
	err = d.AutoMigrate(
		&models.DataRequests{},
		&models.FailedFulfilment{},
		&models.ToBlocks{},
		&models.SupportedPairs{},
		&models.DexTokens{},
		&models.DexPairs{},
		&models.TokenContracts{})

	return
}
