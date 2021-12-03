package service

import (
	"fmt"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/sirupsen/logrus"
	"github.com/spf13/viper"
	"go-ooo/config"
	"net/http"
)

func (s *Service) initPrometheus() {

	// just a simple up gauge that can be used in, for example, Grafana
	// for monitoring up status
	srvUp := promauto.NewGauge(prometheus.GaugeOpts{
		Name: "up",
		Help: "Service is up",
	})

	srvUp.Set(1)

	http.Handle("/metrics", promhttp.Handler())

	promListen := fmt.Sprintf(":%s", viper.GetString(config.PrometheusPort))

	s.logger.WithFields(logrus.Fields{
		"package":  "service",
		"function": "initPrometheus",
		"listen":   promListen,
	}).Info("initialise prometheus")

	http.ListenAndServe(promListen, nil)
}
