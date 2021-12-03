package app

import (
	"context"
	"github.com/sirupsen/logrus"
	"github.com/spf13/viper"
	"go-ooo/config"
	"go-ooo/database"
	"go-ooo/keystore"
	"go-ooo/service"
	"os"
	"os/signal"
	"syscall"

	"go-ooo/version"
)

type Server struct {
	srv         *service.Service
	logger      *logrus.Logger
	ctx         context.Context
	Vers        version.Info
	keystore    *keystore.Keystorage
	db          *database.DB
	decryptPass string
}

func NewServer(decryptPass string) (*Server, error) {
	ctx := context.Background()
	log := logrus.New()

	return &Server{
		logger:      log,
		ctx:         ctx,
		Vers:        version.NewInfo(),
		decryptPass: decryptPass,
	}, nil
}

func (s *Server) InitServer() {
	s.logger.WithFields(logrus.Fields{
		"package":  "main",
		"function": "main",
	}).Info(s.Vers.StringLine())
	s.initServer()
}

func (s *Server) Run() {
	s.srv.Run()
}

func (s *Server) initServer() {
	s.initLogger()
	s.initDatabase()
	s.initKeystore()
	s.initService()
	s.initSignal()
}

func (s *Server) initLogger() {
	s.logger.SetFormatter(&logrus.TextFormatter{
		//DisableColors: true,
		FullTimestamp: true,
	})

	logLevel := viper.GetString(config.LogLevel)
	logrusLevel := logrus.InfoLevel

	switch logLevel {
	case "info":
		logrusLevel = logrus.InfoLevel
		break
	case "debug":
		logrusLevel = logrus.DebugLevel
		break
	default:
		logrusLevel = logrus.InfoLevel
		break
	}

	s.logger.SetLevel(logrusLevel)
	s.logger.SetOutput(os.Stdout)
}

func (s *Server) initSignal() {
	c := make(chan os.Signal)
	signal.Notify(c, os.Interrupt, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-c
		s.srv.Stop()

		s.logger.WithFields(logrus.Fields{
			"package":  "main",
			"function": "initSignal",
		}).Info("exiting oracle daemon...")

		os.Exit(0)
	}()
}

func (s *Server) initKeystore() {

	s.logger.WithFields(logrus.Fields{
		"package":  "main",
		"function": "initKeystore",
	}).Info("initialise keystore")

	ks, err := keystore.NewKeyStorage(s.logger, viper.GetString(config.KeystorageFile))
	if err != nil {
		s.logger.WithFields(logrus.Fields{
			"package":  "main",
			"function": "start",
			"action":   "open keystorage",
		}).Warning("can't read keystorage, creating a new one...")
	}

	s.keystore = ks

	decryptPassword := ""
	if s.decryptPass != "" {
		decryptPassword = getPasswordFromFileOrFlag(s.decryptPass)
	}

	if decryptPassword == "" || (s.keystore.CheckToken(decryptPassword) != nil) {
		err = s.auth()
		if err != nil {
			panic(err)
		}
	}

	err = s.keystore.SelectPrivateKey(viper.GetString(config.KeystorageAccount))
	if err != nil {
		panic(err)
	}
}

func (s *Server) initDatabase() {

	s.logger.WithFields(logrus.Fields{
		"package":  "main",
		"function": "initDatabase",
	}).Info("initialise database")

	dbConn, err := database.NewDb()
	if err != nil {
		panic(err)
	}
	s.db = dbConn
	err = s.db.Migrate()
	if err != nil {
		panic(err)
	}
}

func (s *Server) initService() {
	s.logger.WithFields(logrus.Fields{
		"package":  "main",
		"function": "initService",
	}).Info("initialise service")

	srv, err := service.NewService(s.ctx, s.logger, []byte(s.keystore.GetSelectedPrivateKey()),
		s.db, s.keystore.KeyStore.GetToken())
	if err != nil {
		panic(err)
	}
	s.srv = srv
}
