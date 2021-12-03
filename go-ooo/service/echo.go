package service

import (
	"encoding/json"
	"fmt"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/sirupsen/logrus"
	"github.com/spf13/viper"
	"go-ooo/config"
	go_ooo_types "go-ooo/types"
	"net/http"
)

func (s *Service) initEcho() {
	s.logger.WithFields(logrus.Fields{
		"package":  "service",
		"function": "initEcho",
	}).Info("initialise echo")

	s.echoService.Use(middleware.Recover())
	s.echoService.Use(middleware.KeyAuth(func(key string, c echo.Context) (bool, error) {
		return key == s.authToken, nil
	}))

	s.echoService.POST("/admin", s.AddAdminTask)

	s.echoService.Logger.Fatal(s.echoService.Start(fmt.Sprintf("%s:%d", viper.GetString(config.ServeHost), viper.GetInt(config.ServePort))))
}

func (s *Service) AddAdminTask(c echo.Context) error {
	var request go_ooo_types.AdminTask

	json.NewDecoder(c.Request().Body).Decode(&request)

	s.logger.WithFields(logrus.Fields{
		"package":        "service",
		"function":       "AddAdminTask",
		"task":           request.Task,
		"fee_or_amount":  request.FeeOrAmount,
		"to_or_consumer": request.ToOrConsumer,
	}).Info("admin task received")

	s.adminTasks <- request

	for {
		select {
		case tr := <-s.adminTasksResp:
			if tr.Success {
				return c.JSON(http.StatusOK, tr)
			}
			return c.JSON(http.StatusInternalServerError, tr.Error)
		}
	}

}
