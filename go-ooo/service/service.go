package service

import (
	"context"
	"github.com/labstack/echo/v4"
	"github.com/spf13/viper"
	"go-ooo/chain"
	"go-ooo/config"
	"go-ooo/database"
	"go-ooo/ooo_api"
	go_ooo_types "go-ooo/types"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/sirupsen/logrus"

	"go-ooo/ooo_router"
)

type Service struct {
	contractAddress   common.Address
	client            *ethclient.Client
	contractInstance  *ooo_router.OooRouter
	logger            *logrus.Logger
	db                *database.DB
	ctx               context.Context
	jobTicker         *time.Ticker // periodic jobTicker
	updatePairsTicker *time.Ticker
	oooRouterService  *chain.OoORouterService

	echoService       *echo.Echo
	oooApi            *ooo_api.OOOApi

	adminTasks        chan go_ooo_types.AdminTask
	adminTasksResp    chan go_ooo_types.AdminTaskResponse

	authToken         string
}

func NewService(ctx context.Context, logger *logrus.Logger, oraclePrivateKey []byte,
	db *database.DB, authToken string) (*Service, error) {
	contractAddress := common.HexToAddress(viper.GetString(config.ChainContractAddress))
	client, err := ethclient.Dial(viper.GetString(config.ChainEthWsHost))

	var pollInterval = time.Duration(30)
	checkDuration := viper.GetInt64(config.JobsCheckDuration)
	if checkDuration != 0 {
		pollInterval = time.Duration(checkDuration)
	}

	if err != nil {
		return nil, err
	}

	oooRouterInstance, err := ooo_router.NewOooRouter(contractAddress, client)
	if err != nil {
		return nil, err
	}

	oooApi := ooo_api.NewApi(db, logger)

	oooRouterService, err := chain.NewOoORouter(ctx, logger, client, oooRouterInstance, contractAddress, oraclePrivateKey, db, oooApi)

	if err != nil {
		return nil, err
	}

	return &Service{
		ctx: ctx,
		client: client,
		contractAddress: contractAddress,
	    contractInstance: oooRouterInstance,
		logger: logger,
		db: db,
		// https://stackoverflow.com/questions/16903348/scheduled-polling-task-in-go
		jobTicker:        time.NewTicker(time.Second * pollInterval),
		updatePairsTicker: time.NewTicker(time.Minute * 30),
		oooRouterService: oooRouterService,
		adminTasks:       make(chan go_ooo_types.AdminTask),
		adminTasksResp:   make(chan go_ooo_types.AdminTaskResponse),
		echoService:      echo.New(),
		oooApi:           oooApi,
		authToken:        authToken,
	}, nil
}


func (s *Service) Run() {

	go func(s *Service) {
		s.initEcho()
	}(s)

	go func(s *Service) {
		s.initPrometheus()
	}(s)

	// update supported pairs from the Finchains API
	s.oooApi.UpdateSupportedPairs()

	// pick up from the last block we know about to process
	// any historical events missed. This will run and complete
	// before the event subscriptions initialise in order to
	// process any potentially missed and/or processed requests
	s.oooRouterService.GetHistoricalEvents()

	go func(s *Service) {
		s.oooRouterService.RunEventWatchers()
	}(s)

	for {
		select {
		case <-s.jobTicker.C:
			s.oooRouterService.ProcessPendingJobQueue()
		case <- s.updatePairsTicker.C:
			go func(s *Service) {
				s.oooApi.UpdateSupportedPairs()
			}(s)
		case t := <-s.adminTasks:
			// At any time we can process a request to add a new admin task
			// such as changing fees etc.
			s.adminTasksResp <- s.oooRouterService.ProcessAdminTask(t)
		}
	}
}

func (s *Service) Stop() {
	// clean up and shut down
	s.logger.WithFields(logrus.Fields{
		"package":  "service",
		"function": "Stop",
	}).Info("shutting down jobTicker")

    s.jobTicker.Stop()

	s.logger.WithFields(logrus.Fields{
		"package":  "service",
		"function": "Stop",
	}).Info("shutting down updatePairsTicker")

	s.updatePairsTicker.Stop()

	s.logger.WithFields(logrus.Fields{
		"package":  "service",
		"function": "Stop",
	}).Info("shutting down oooRouterService")

	s.oooRouterService.Shutdown()

	s.logger.WithFields(logrus.Fields{
		"package":  "service",
		"function": "Stop",
	}).Info("shutting down echo")

	err := s.echoService.Shutdown(s.ctx)

	if err != nil {
		s.logger.WithFields(logrus.Fields{
			"package":  "service",
			"function": "Stop",
		}).Error(err.Error())
	}

	err = s.echoService.Close()

	if err != nil {
		s.logger.WithFields(logrus.Fields{
			"package":  "service",
			"function": "Stop",
		}).Error(err.Error())
	}
}
