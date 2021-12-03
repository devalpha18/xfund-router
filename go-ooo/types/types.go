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
