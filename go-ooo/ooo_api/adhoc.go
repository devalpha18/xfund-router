package ooo_api

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/sirupsen/logrus"
	"go-ooo/utils"
	"io/ioutil"
	"math/big"
	"net/http"
	"time"
)

const MIN_LIQUIDITY = 100000

type GraphQlToken struct {
	Id             string `json:"id,omitempty"`
	Name           string `json:"name,omitempty"`
	Symbol         string `json:"symbol,omitempty"`
	TotalLiquidity string `json:"totalLiquidity,omitempty"`
	TxCount        string `json:"txCount,omitempty"`
}
type GraphQlTokens struct {
	Tokens []GraphQlToken
}
type GraphQlTokenResponse struct {
	Data GraphQlTokens
}

type GraphQlPairContent struct {
	Id                  string
	Token0              GraphQlToken
	Token1              GraphQlToken
	Token0Price         string `json:"token0Price"`
	Token1Price         string `json:"token1Price"`
	ReserveUSD          string `json:"reserveUSD,omitempty"`
	TotalValueLockedUSD string `json:"totalValueLockedUSD,omitempty"`
}

type GraphQlPairs struct {
	Pairs []GraphQlPairContent `json:"pairs,omitempty"`
	Pools []GraphQlPairContent `json:"pools,omitempty"`
}
type GraphQlPairsResponse struct {
	Data GraphQlPairs
}

type GraphQlPair struct {
	Pair GraphQlPairContent `json:"pair,omitempty"`
	Pool GraphQlPairContent `json:"pool,omitempty"`
}
type GraphQlPairResponse struct {
	Data GraphQlPair
}

// currently supported DEXs for ad-hoc queries
func getQlApis() []map[string]string {
	return []map[string]string{
		{
			"name":            "shibaswap",
			"url":             "https://api.thegraph.com/subgraphs/name/shibaswaparmy/exchange",
			"pairs_endpoint":  "pairs",
			"pair_endpoint":   "pair",
			"tokens_endpoint": "tokens",
			"token_order_by":  "txCount",
			"pairs_order_by":  "reserveUSD",
			"chain":           "eth",
		},
		{
			"name":            "sushiswap",
			"url":             "https://api.thegraph.com/subgraphs/name/sushiswap/exchange",
			"pairs_endpoint":  "pairs",
			"pair_endpoint":   "pair",
			"tokens_endpoint": "tokens",
			"token_order_by":  "txCount",
			"pairs_order_by":  "reserveUSD",
			"chain":           "eth",
		},
		{
			"name":            "uniswapv2",
			"url":             "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2",
			"pairs_endpoint":  "pairs",
			"pair_endpoint":   "pair",
			"tokens_endpoint": "tokens",
			"token_order_by":  "txCount",
			"pairs_order_by":  "reserveUSD",
			"chain":           "eth",
		},
		{
			"name":            "uniswapv3",
			"url":             "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3",
			"pairs_endpoint":  "pools",
			"pair_endpoint":   "pool",
			"tokens_endpoint": "tokens",
			"token_order_by":  "txCount",
			"pairs_order_by":  "totalValueLockedUSD",
			"chain":           "eth",
		},
		//{
		//	"name":            "pancakeswap",
		//	"url":             "https://api.thegraph.com/subgraphs/name/pancakeswap/exchange",
		//	"pairs_endpoint":  "pairs",
		//	"pair_endpoint":   "pair",
		//	"tokens_endpoint": "tokens",
		//  "pairs_order_by":  "reserveUSD",
		//  "chain":           "bsc",
		//},
		{
			"name":            "quickswap",
			"url":             "https://api.thegraph.com/subgraphs/name/sameepsi/quickswap05",
			"pairs_endpoint":  "pairs",
			"pair_endpoint":   "pair",
			"tokens_endpoint": "tokens",
			"token_order_by":  "tradeVolumeUSD",
			"pairs_order_by":  "reserveUSD",
			"chain":           "matic",
		},
	}
}

func (o *OOOApi) QueryAdhoc(endpoint string, requestId string) (string, error) {
	qlApiUrls := getQlApis()

	base, target, _, _, _, _, _, err := ParseEndpoint(endpoint)

	if err != nil {
		return "", err
	}

	priceCount := 0
	total := big.NewInt(0)

	for _, a := range qlApiUrls {
		price := o.getPrice(base, target, a)
		if price != "" {
			p, e := utils.ParseBigFloat(price)
			if e == nil {
				wei := utils.EtherToWei(p)
				if wei.Cmp(big.NewInt(0)) > 0 {
					total = new(big.Int).Add(total, wei)
					priceCount++
				}
			}
		}
	}

	if total.Cmp(big.NewInt(0)) <= 0 {
		return "", errors.New("cannot calculate mean, price is zero")
	}

	meanPrice := new(big.Int).Div(total, big.NewInt(int64(priceCount)))

	return meanPrice.String(), nil
}

func (o *OOOApi) processPriceData(base string, target string, dexName string, pair GraphQlPairContent) string {
	price := ""

	// check reserve USD and reject if < $100,000
	dexRes := pair.ReserveUSD
	// todo - betterize
	if dexName == "uniswapv3" {
		dexRes = pair.TotalValueLockedUSD
	}

	limit := big.NewFloat(MIN_LIQUIDITY)

	reserve, err := utils.ParseBigFloat(dexRes)

	if err != nil {
		o.logger.WithFields(logrus.Fields{
			"package":  "ooo_api",
			"function": "processPriceData",
			"dex":      dexName,
			"base":     base,
			"target":   target,
			"dexRes":   dexRes,
		}).Error(err.Error())
		return price
	}

	if reserve.Cmp(limit) == -1 {
		o.logger.WithFields(logrus.Fields{
			"package":  "ooo_api",
			"function": "processPriceData",
			"dex":      dexName,
			"base":     base,
			"target":   target,
			"reserve":  reserve.String(),
			"price":    price,
		}).Warn("low liquidity")
		return price
	}

	if base == pair.Token0.Symbol && target == pair.Token1.Symbol {
		price = pair.Token1Price
	}
	if base == pair.Token1.Symbol && target == pair.Token0.Symbol {
		price = pair.Token0Price
	}

	return price
}

func (o *OOOApi) getPrice(base string, target string, api map[string]string) string {

	hasData := false
	price := ""
	var pair GraphQlPairContent
	// check DB for pair contract address
	dbPairRes, _ := o.db.FindByDexPairName(base, target, api["name"])
	if dbPairRes.ID != 0 && dbPairRes.HasPair {
		// pair address is known for this dex. Query directly
		pair = o.getKnownPairPrice(dbPairRes.ContractAddress, api)
		price = o.processPriceData(base, target, api["name"], pair)
		hasData = true
	} else {
		// only run if there's currently no entry in the DB
		// otherwise skip, and let the crawler try to update
		// pair data
		// todo - implement timed crawler...
		// todo - clean up and put in its own function
		if dbPairRes.ID == 0 || (dbPairRes.LastCheckDate > 0 && uint64(time.Now().Unix())-dbPairRes.LastCheckDate > 3600) {
			t0 := ""
			t1 := ""
			// check db for tokens
			dbT0Res, _ := o.db.FindByDexTokenSymbol(base, api["name"])
			if dbT0Res.ID != 0 && dbT0Res.TokenContractsId != 0 {
				t0, _ = o.db.FindTokenAddressByRowId(dbT0Res.TokenContractsId)
			} else {
				t0 = o.getToken(api, base)
				// record in DB
				if t0 != "" {
					t0Id, _ := o.db.FindOrInsertNewTokenContract(base, t0, api["chain"])
					_ = o.db.UpdateOrInsertNewDexToken(base, t0Id.ID, api["name"])
				}
			}
			dbT1Res, _ := o.db.FindByDexTokenSymbol(target, api["name"])
			if dbT1Res.ID != 0 && dbT1Res.TokenContractsId != 0 {
				t1, _ = o.db.FindTokenAddressByRowId(dbT1Res.TokenContractsId)
			} else {
				t1 = o.getToken(api, target)
				// record in DB
				if t1 != "" {
					t1Id, _ := o.db.FindOrInsertNewTokenContract(target, t1, api["chain"])
					_ = o.db.UpdateOrInsertNewDexToken(target, t1Id.ID, api["name"])
				}
			}
			if t0 != "" && t1 != "" {
				pair, hasData = o.getNewPairPrice(t0, t1, base, target, api)
				// record in DB
				if hasData {
					_ = o.db.UpdateOrInsertNewDexPair(pair.Token0.Symbol, pair.Token1.Symbol, pair.Id, api["name"])
				} else {
					_ = o.db.UpdateOrInsertNewDexPair(base, target, "", api["name"])
				}

				price = o.processPriceData(base, target, api["name"], pair)
			}
		}
	}

	if hasData {
		o.logger.WithFields(logrus.Fields{
			"package":       "ooo_api",
			"function":      "getNewPairPrice",
			"action":        "result",
			"url":           api["url"],
			"base":          base,
			"target":        target,
			"pair":          pair.Id,
			"token0_symbol": pair.Token0.Symbol,
			"token1_symbol": pair.Token1.Symbol,
			"token0_id":     pair.Token0.Id,
			"token1_id":     pair.Token1.Id,
			"token_0_price": pair.Token0Price,
			"token_1_price": pair.Token1Price,
			"price":         price,
		}).Debug()

		return price
	}

	return ""
}

func (o *OOOApi) getKnownPairPrice(pairAddress string, api map[string]string) GraphQlPairContent {
	o.logger.WithFields(logrus.Fields{
		"package":      "ooo_api",
		"function":     "getKnownPairPrice",
		"dex":          api["name"],
		"url":          api["url"],
		"pair_address": pairAddress,
	}).Debug()

	query := generateKnownPairQuery(pairAddress, api["pair_endpoint"], api["pairs_order_by"])

	var decodedResponse GraphQlPairResponse

	o.runQuery(query, api["url"], &decodedResponse)

	// todo - betterize
	if api["name"] == "uniswapv3" {
		return decodedResponse.Data.Pool
	}
	return decodedResponse.Data.Pair
}

func (o *OOOApi) getNewPairPrice(t0 string, t1 string, base string, target string, api map[string]string) (GraphQlPairContent, bool) {

	o.logger.WithFields(logrus.Fields{
		"package":  "ooo_api",
		"function": "getNewPairPrice",
		"dex":      api["name"],
		"url":      api["url"],
		"t0":       t0,
		"t1":       t1,
		"base":     base,
		"target":   target,
	}).Debug()

	query := generateNewPairQuery(t0, t1, api["pairs_endpoint"], api["pairs_order_by"])

	var decodedResponse GraphQlPairsResponse

	o.runQuery(query, api["url"], &decodedResponse)

	if len(decodedResponse.Data.Pairs) == 0 && len(decodedResponse.Data.Pools) == 0 {
		o.logger.WithFields(logrus.Fields{
			"package":  "ooo_api",
			"function": "getNewPairPrice",
			"dex":      api["name"],
			"url":      api["url"],
			"base":     base,
			"target":   target,
		}).Warn("pair not found")
		return GraphQlPairContent{}, false
	}

	if len(decodedResponse.Data.Pairs) > 0 {
		return decodedResponse.Data.Pairs[0], true
	}

	if len(decodedResponse.Data.Pools) > 0 {
		return decodedResponse.Data.Pools[0], true
	}

	return GraphQlPairContent{}, false
}

// getToken will attempt to get the token address for a symbol
func (o *OOOApi) getToken(api map[string]string, symbol string) string {

	o.logger.WithFields(logrus.Fields{
		"package":  "ooo_api",
		"function": "getToken",
		"dex":      api["name"],
		"url":      api["url"],
		"symbol":   symbol,
	}).Debug()

	query := generateTokenQuery(symbol, api["tokens_endpoint"], api["token_order_by"])

	var decodedResponse GraphQlTokenResponse

	o.runQuery(query, api["url"], &decodedResponse)

	if len(decodedResponse.Data.Tokens) == 0 {
		o.logger.WithFields(logrus.Fields{
			"package":  "ooo_api",
			"function": "getToken",
			"dex":      api["name"],
			"url":      api["url"],
			"symbol":   symbol,
		}).Warn("token not found")
		return ""
	}

	return decodedResponse.Data.Tokens[0].Id
}

// runQuery will run the subgraph query
func (o *OOOApi) runQuery(query interface{}, url string, decodedResponse interface{}) {
	jsonValue, _ := json.Marshal(query)

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonValue))

	if err != nil {
		o.logger.WithFields(logrus.Fields{
			"package":  "ooo_api",
			"function": "runQuery",
		}).Error(err.Error())
		return
	}

	resp, err := o.client.Do(req)

	if err != nil {
		o.logger.WithFields(logrus.Fields{
			"package":  "ooo_api",
			"function": "runQuery",
		}).Error(err.Error())
		return
	}

	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		body, err := ioutil.ReadAll(resp.Body)

		if err != nil {
			o.logger.WithFields(logrus.Fields{
				"package":  "ooo_api",
				"function": "runQuery",
			}).Error(err.Error())
			return
		}

		err = json.Unmarshal(body, &decodedResponse)

		if err != nil {
			o.logger.WithFields(logrus.Fields{
				"package":  "ooo_api",
				"function": "runQuery",
			}).Error(err.Error())
			return
		}
	} else {
		o.logger.WithFields(logrus.Fields{
			"package":  "ooo_api",
			"function": "runQuery",
		}).Error(fmt.Errorf("non-200 OK status code: %v", resp.Status))
		return
	}
	return
}

// generateTokenQuery uses a fuzzy token query to get token ids from symbol names
func generateTokenQuery(symbol string, tokensEndpoint string, tokenOrderBy string) map[string]string {

	// since there may be multiple potentially fake tokens using the same
	// symbol we'll try and grab the one with the most Txs, using
	// orderBy: txCount desc
	jsonData := map[string]string{
		"query": fmt.Sprintf(`
            { 
                %s (
                    first:1,
                    orderBy: %s,
                    orderDirection: desc,
                    where: { symbol: "%s"}){
                    id
                    symbol
                    name
                }
            }
        `, tokensEndpoint, tokenOrderBy, symbol),
	}

	return jsonData
}

// generateNewPairQuery uses a fuzzy token query to get the top pair by txCount
func generateNewPairQuery(t0 string, t1 string, pairEndpoint string, pairOrderBy string) map[string]string {
	jsonData := map[string]string{
		"query": fmt.Sprintf(`
            {
                 %s (
                     first:1
                     orderBy:%s
                     orderDirection: desc
                     where :
                     {
                          token0_in : ["%s", "%s"],
                          token1_in : ["%s", "%s"],
                          %s_gt: "%d"
                     }
                 ) {
                     id
                     token0 {
                         id
                         name
                         symbol
                     }
                     token1 {
                         id
                         name
                         symbol
                     }
                     token0Price
                     token1Price
                     %s
                 }
            }
        `, pairEndpoint, pairOrderBy, t0, t1, t0, t1, pairOrderBy, MIN_LIQUIDITY, pairOrderBy),
	}

	return jsonData
}

func generateKnownPairQuery(pairAddress string, pairEndpoint string, pairOrderBy string) map[string]string {
	jsonData := map[string]string{
		"query": fmt.Sprintf(`
            {
	            %s(id: "%s") {
	                id
	                token0 {
                         id
                         name
                         symbol
                     }
                     token1 {
                         id
                         name
                         symbol
                     }
                     token0Price
                     token1Price
                     %s
                }
	        }
        `, pairEndpoint, pairAddress, pairOrderBy),
	}

	return jsonData
}
