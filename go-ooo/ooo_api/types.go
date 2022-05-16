package ooo_api

type OoOAPIPairsResult struct {
	Name   string
	Base   string
	Target string
}

type OoOAPIPriceQueryResult struct {
	Base          string  `json:"base"`
	Target        string  `json:"target"`
	Pair          string  `json:"pair"`
	Time          string  `json:"time,omitempty"`
	OutlierMethod string  `json:"outlierMethod,omitempty"`
	Price         string  `json:"price"`
	PriceRaw      float64 `json:"priceRaw,omitempty"`
	Dmax          uint64  `json:"dMax,omitempty"`
}

type GraphQlToken struct {
	Id             string `json:"id,omitempty"`
	Name           string `json:"name,omitempty"`
	Symbol         string `json:"symbol,omitempty"`
	TotalLiquidity string `json:"totalLiquidity,omitempty"`
	TxCount        string `json:"txCount,omitempty"`
	Typename       string `json:"__typename,omitempty"`
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
	VolumeUSD           string `json:"volumeUSD,omitempty"`
	TotalValueLockedUSD string `json:"totalValueLockedUSD,omitempty"`
	TxCount             string `json:"txCount,omitempty"`
	Typename            string `json:"__typename,omitempty"`
	UntrackedVolumeUSD  string `json:"untrackedVolumeUSD,omitempty"`
}

type GraphQlAliasedPairPrices struct {
	P0 GraphQlPairContent `json:"p0,omitempty"`
	P1 GraphQlPairContent `json:"p1,omitempty"`
	P2 GraphQlPairContent `json:"p2,omitempty"`
	P3 GraphQlPairContent `json:"p3,omitempty"`
	P4 GraphQlPairContent `json:"p4,omitempty"`
	P5 GraphQlPairContent `json:"p5,omitempty"`
	P6 GraphQlPairContent `json:"p6,omitempty"`
	P7 GraphQlPairContent `json:"p7,omitempty"`
	P8 GraphQlPairContent `json:"p8,omitempty"`
	P9 GraphQlPairContent `json:"p9,omitempty"`
}

type GraphQlPairPricesResponse struct {
	Data GraphQlAliasedPairPrices
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
