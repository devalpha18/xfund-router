package ooo_api

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/sirupsen/logrus"
	"github.com/spf13/viper"
	"go-ooo/config"
	"go-ooo/database"
	"go-ooo/types"
	"gorm.io/gorm"
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type OOOApi struct {
	baseURL string
	client  *http.Client
	db      *database.DB
	logger  *logrus.Logger
}

func NewApi(db *database.DB, logger *logrus.Logger) *OOOApi {
	return &OOOApi{
		baseURL: viper.GetString(config.JobsOooApiUrl),
		client: &http.Client{
			Timeout: 15 * time.Second,
		},
		db:     db,
		logger: logger,
	}
}

// Request Format BASE.TARGET.TYPE.SUBTYPE[[.SUPP1][.SUPP2][.SUPP3]]
// BASE: base currency, e.g. BTC, ETH etc.
// TARGET: target currency, e.g. GBP, USD
// TYPE: data point being requested, e.g. PR (pair price)
//       some types, e.g. PR require additional SUPPN supplementary data defining Exchanges to query, as defined below
// SUBTYPE: data sub type, e.g. AVG (average), AVC (average, removing outliers using Chauvenet,
//          AVI Mean with IQD (Median and Interquartile Deviation Method to remove outliers)
// SUPP1: any supplementary request data, e.g. 24H
// SUPP2: any supplementary request data, e.g. 3
// SUPP3: any supplementary request data
//
// Examples:
// BTC.GBP.PR.AVG - average BTC/GBP price, calculated from all supported exchanges in the last hour
// BTC.GBP.PR.HI - highest BTC/GBP price, calculated from all supported exchanges in the last hour
// BTC.GBP.PR.AVI - average BTC/GBP price, calculated from all supported exchanges over the last hour, removing outliers
// BTC.GBP.PR.LAT - latest BTC/GBP price submitted to Finchains - latest exchange to submit price (not always the same exchange)
// BTC.GBP.PR.AVI.24H - average BTC/GBP price, calculated from all supported exchanges over the last 24 hours, removing outliers
// BTC.GBP.PR.AVC.24H.3 - average BTC/GBP price, calculated from all supported exchanges over the last 24 hours, removing outliers

func (o *OOOApi) buildQuery(endpoint string) (string, error) {

	base, target, qType, subtype, supp1, supp2, supp3, err := ParseEndpoint(endpoint)

	if err != nil {
		return "", err
	}

	o.logger.WithFields(logrus.Fields{
		"package":  "ooo_api",
		"function": "buildQuery",
		"endpoint": endpoint,
		"base":     base,
		"target":   target,
		"type":     qType,
		"subtype":  subtype,
		"supp1":    supp1,
		"supp2":    supp2,
		"supp3":    supp3,
	}).Debug("build finchains api query")

	// check supported
	supported, _ := o.db.PairIsSupportedByBaseAndTarget(base, target)
	if supported.ID == 0 {
		return "", errors.New("pair not currently supported")
	}

	pair := supported.GetName()
	var apiEndpont string
	var dataType string

	switch qType {
	case "PR":
		apiEndpont = "currency"
		dataType, err = getPriceSubType(subtype, supp1, supp2)
		if err != nil {
			return "", err
		}
		break
	default:
		return "", errors.New("query type not currently supported")
	}

	uri := fmt.Sprintf("%s/%s/%s", apiEndpont, pair, dataType)

	return uri, nil
}

func (o *OOOApi) QueryFinchainsEndpoint(endpoint string, requestId string) (string, error) {
	// check valid

	uri, err := o.buildQuery(endpoint)

	if err != nil {
		return "", err
	}

	o.logger.WithFields(logrus.Fields{
		"package":   "ooo_api",
		"function":  "QueryFinchainsEndpoint",
		"action":    "buildQuery",
		"requestId": requestId,
		"endpoint":  endpoint,
		"uri":       uri,
	}).Debug("OoO API query built")

	req, err := http.NewRequest("GET", fmt.Sprint(o.baseURL, "/", uri), nil)

	if err != nil {
		return "", err
	}

	resp, err := o.client.Do(req)

	if err != nil {
		return "", err
	}

	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)

	if err != nil {
		return "", err
	}

	var result types.OoOAPIPriceQueryResult

	err = json.Unmarshal(body, &result)
	if err != nil {
		return "", err
	}

	return result.Price, nil
}

func (o *OOOApi) UpdateSupportedPairs() {

	o.logger.WithFields(logrus.Fields{
		"package":  "ooo_api",
		"function": "UpdateSupportedPairs",
	}).Info("begin update supported pairs")

	req, err := http.NewRequest("GET", fmt.Sprint(o.baseURL, "/pairs"), nil)

	if err != nil {
		o.logger.WithFields(logrus.Fields{
			"package":  "ooo_api",
			"function": "UpdateSupportedPairs",
			"action":   "generate http request",
		}).Error(err.Error())

		return
	}

	resp, err := o.client.Do(req)

	if err != nil {

		o.logger.WithFields(logrus.Fields{
			"package":  "ooo_api",
			"function": "UpdateSupportedPairs",
			"action":   "run http request",
		}).Error(err.Error())

		return
	}

	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)

	var result []types.OoOAPIPairsResult

	err = json.Unmarshal(body, &result)
	if err != nil {
		o.logger.WithFields(logrus.Fields{
			"package":  "ooo_api",
			"function": "UpdateSupportedPairs",
			"action":   "unmarshel json response",
		}).Error(err.Error())
		return
	}

	currentPairs := make([]string, 0, len(result))

	for _, p := range result {
		dbRes, _ := o.db.PairIsSupportedByPairName(p.Name)
		if dbRes.ID == 0 {
			_ = o.db.AddNewSupportedPair(p.Name, p.Base, p.Target)
		}
		currentPairs = append(currentPairs, p.Name)
	}

	noLongerSupported, err := o.db.PairsNoLongerSupported(currentPairs)

	if err != nil {
		o.logger.WithFields(logrus.Fields{
			"package":  "ooo_api",
			"function": "UpdateSupportedPairs",
			"action":   "get pairs not supported from DB",
		}).Error(err.Error())
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return
		}
	}

	for _, p := range noLongerSupported {
		o.logger.WithFields(logrus.Fields{
			"package":  "ooo_api",
			"function": "UpdateSupportedPairs",
			"action":   "delete pair",
			"pair":     p.Name,
		}).Info("pair no longer supported")

		// delete permanently
		o.db.Unscoped().Delete(&p)
	}
}

func IsAdhoc(endpoint string) (bool, error) {
	_, _, qType, _, _, _, _, err := ParseEndpoint(endpoint)

	if err != nil {
		return false, err
	}

	if qType == "AD" {
		return true, nil
	}

	return false, nil
}

func ParseEndpoint(endpoint string) (base string, target string, qType string,
	subtype string, supp1 string, supp2 string, supp3 string, err error) {
	ep := strings.Split(endpoint, ".")

	if len(ep) < 3 {
		err = errors.New(fmt.Sprintf("incorrect endpoint format: %s", endpoint))
		return
	}

	base = ep[0]   // BTC etc
	target = ep[1] // GBP etc
	qType = ep[2]  // PRC, EXC, DCS,

	if len(ep) > 3 {
		subtype = ep[3] // AVG, LAT etc.
	}
	if len(ep) > 4 {
		supp1 = ep[4]
	}
	if len(ep) > 5 {
		supp2 = ep[5]
	}
	if len(ep) > 6 {
		supp3 = ep[6]
	}

	return
}

func cleanseTime(tm string) string {
	switch tm {
	case "5M":
		return tm
	case "10M":
		return tm
	case "30M":
		return tm
	case "1H":
		return tm
	case "2H":
		return tm
	case "6H":
		return tm
	case "12H":
		return tm
	case "24H":
		return tm
	case "48H":
		return tm
	default:
		return "1H"
	}
}

func cleanseDMax(dMax string) (string, error) {
	defaultDmax := "3"
	dMaxInt, err := strconv.ParseInt(dMax, 10, 64)
	if err != nil {
		return defaultDmax, err
	}

	if dMaxInt <= 0 {
		return defaultDmax, nil
	}
	return strconv.Itoa(int(dMaxInt)), nil
}

func getPriceSubType(subtype string, supp1 string, supp2 string) (string, error) {
	var qStr string
	tm := cleanseTime(supp1)
	s2 := ""
	switch subtype {
	case "AVG":
		qStr = fmt.Sprintf("avg/%s", tm)
		break
	case "AVI":
		qStr = fmt.Sprintf("avg/iqd/%s", tm)
		break
	case "AVP":
		qStr = fmt.Sprintf("avg/peirce/%s", tm)
		break
	case "AVC":
		s2, _ = cleanseDMax(supp2)
		qStr = fmt.Sprintf("avg/chauvenet/%s/%s", tm, s2)
		break
	case "LAT":
		qStr = "latest_one"
		break
	default:
		return "", errors.New("unsupported sub type for PR")
	}

	return qStr, nil
}

func getExchange(ex string) (string, error) {
	switch ex {
	case "BNC":
		return "binance", nil
	case "BFI":
		return "bitfinex", nil
	case "BFO":
		return "bitforex", nil
	case "BMR":
		return "bitmart", nil
	case "BTS":
		return "bitstamp", nil
	case "BTX":
		return "bittrex", nil
	case "CBT":
		return "coinsbit", nil
	case "CRY":
		return "crypto_com", nil
	case "DFX":
		return "digifinex", nil
	case "GAT":
		return "gate", nil
	case "GDX":
		return "gdax", nil
	case "GMN":
		return "gemini", nil
	case "HUO":
		return "huobi", nil
	case "KRK":
		return "kraken", nil
	case "PRB":
		return "probit", nil
	case "PNK":
		return "pancakeswap", nil
	case "QWK":
		return "quickswap", nil
	case "SHB":
		return "shibaswap", nil
	case "SHS":
		return "sushiswap", nil
	case "UN2":
		return "uniswapv2", nil
	case "UN3":
		return "uniswapv3", nil
	default:
		return "", errors.New("exchange not currently supported")
	}
}
