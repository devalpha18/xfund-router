package types

type AdminTask struct {
	Task         string // register/withdraw/set_fee/set_granular_fee
	FeeOrAmount  uint64 // new fee or amount to withdraw
	ToOrConsumer string // address withdrawing to, or contract address for granular fee
}

type AdminTaskResponse struct {
	AdminTask
	Success bool
	Result  string
	Error   string
}

type AnalyticsSimulationParams struct {
	GasPrice uint64
	XfundFee float64
}

type AnalyticsTask struct {
	Consumer         string
	NumTxs           int
	CurrXfundPrice   float64
	Simulate         bool
	SimulationParams AnalyticsSimulationParams
}

type SimValues struct {
	IfGas  uint64  `json:"if_gas"`
	IfFees float64 `json:"if_fees"`
}

type AnalyticsFilter struct {
	ConsumerContract string `json:"consumer_contract,omitempty"`
	Limit            int    `json:"limit,omitempty"`
}

type IntStats struct {
	Max  uint64 `json:"max"`
	Min  uint64 `json:"min"`
	Mean uint64 `json:"mean"`
}

type FloatStats struct {
	Max  float64 `json:"max"`
	Min  float64 `json:"min"`
	Mean float64 `json:"mean"`
}

type EarningsStats struct {
	CurrentXfundPriceEth float64 `json:"current_xfund_price_eth"`
	TotalFeesEarnedXfund float64 `json:"total_fees_xfund"`
	TotalFeesEarnedEth   float64 `json:"total_fees_eth"`
	TotalCostsEth        float64 `json:"total_cost_eth"`
	ProfitLossEth        float64 `json:"profit_loss_eth"`
}

type AnalyticsData struct {
	GasUsed              IntStats      `json:"gas_used"`
	GasPrice             IntStats      `json:"gas_price"`
	EthCosts             FloatStats    `json:"eth_costs"`
	Earnings             EarningsStats `json:"earnings"`
	MostGasUsedConsumer  string        `json:"most_gas_used_consumer,omitempty"`
	LeastGasUsedConsumer string        `json:"least_gas_used_consumer,omitempty"`
	NumberAnalysed       uint64        `json:"number_requests_analysed"`
}

type AnalyticsResult struct {
	AnalyticsData
	SimValues SimValues       `json:"simulation_values"`
	Filters   AnalyticsFilter `json:"filters"`
}

type AnalyticsTaskResponse struct {
	Task    AnalyticsTask
	Success bool
	Error   string
	Result  AnalyticsResult
}

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

type Prices struct {
	Eth float64 `json:"eth"`
	Usd float64 `json:"usd"`
}
type CoinGeckoResponse struct {
	Xfund Prices `json:"xfund"`
}
