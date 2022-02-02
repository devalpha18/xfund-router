package models

import "gorm.io/gorm"

const (
	REQUEST_STATUS_UNKNOWN            = iota // Saywhatnow?
	REQUEST_STATUS_INITIALISED               // Request initialised - used when RandomnessRequest event detected
	REQUEST_STATUS_FETCHING_DATA             // processing has begun - fetching data.
	REQUEST_STATUS_DATA_READY_TO_SEND        // data fetch finished - ready to send Tx
	REQUEST_STATUS_TX_SENT                   // Fulfilment Tx broadcast
	REQUEST_STATUS_API_ERROR                 // Error getting the data from Finchains API
	REQUEST_STATUS_TX_FAILED                 // Fulfilment Tx failed and not broadcast
	REQUEST_STATUS_SUCCESS                   // Fulfilment Tx successful and confirmed in RandomnessRequestFulfilled event
	REQUEST_STATUS_FULFILMENT_FAILED         // Fulfilment failed - too many failed attempts.
)

const (
	JOB_STATUS_UNKNOWN = iota // Saywhatnow?
	JOB_STATUS_PENDING        // global value for pending/currently processing jobs
	JOB_STATUS_SUCCESS        // global status for successful job
	JOB_STATUS_FAIL           // global status for completely failed jobs
)

type DataRequests struct {
	gorm.Model
	Consumer                    string `gorm:"index"`
	Provider                    string `gorm:"index"`
	RequestId                   string `gorm:"uniqueIndex"`
	IsAdhoc                     bool   `gorm:"index"`
	RequestBlockNumber          uint64 `gorm:"index"`
	LastDataFetchBlockNumber    uint64
	RequestTxHash               string `gorm:"index"`
	RequestGasUsed              uint64
	RequestGasPrice             uint64
	Fee                         uint64
	Endpoint                    string
	EndpointDecoded             string
	PriceResult                 string
	LastFulfillSentBlockNumber  uint64 `gorm:"index"`
	FulfillConfirmedBlockNumber uint64 `gorm:"index"`
	FulfillTxHash               string `gorm:"index"`
	FulfillGasUsed              uint64
	FulfillGasPrice             uint64
	FulfillmentAttempts         uint64 `gorm:"default:0"`
	JobStatus                   int    `gorm:"index"`
	RequestStatus               int    `gorm:"index"`
	StatusReason                string
}

func (DataRequests) TableName() string {
	return "data_requests"
}

func (d *DataRequests) GetId() uint {
	return d.ID
}

func (d *DataRequests) GetConsumer() string {
	return d.Consumer
}

func (d *DataRequests) GetProvider() string {
	return d.Provider
}

func (d *DataRequests) GetRequestId() string {
	return d.RequestId
}

func (d *DataRequests) GetIsAdHoc() bool {
	return d.IsAdhoc
}

func (d *DataRequests) GetRequestBlockNumber() uint64 {
	return d.RequestBlockNumber
}

func (d *DataRequests) GetLastDataFetchBlockNumber() uint64 {
	return d.LastDataFetchBlockNumber
}

func (d *DataRequests) GetRequestTxHash() string {
	return d.RequestTxHash
}

func (d *DataRequests) GetRequestGasUsed() uint64 {
	return d.RequestGasUsed
}

func (d *DataRequests) GetRequestGasPrice() uint64 {
	return d.RequestGasPrice
}

func (d *DataRequests) GetFee() uint64 {
	return d.Fee
}

func (d *DataRequests) GetPriceResult() string {
	return d.PriceResult
}

func (d *DataRequests) GetEndpoint() string {
	return d.Endpoint
}

func (d *DataRequests) GetEndpointDecoded() string {
	return d.EndpointDecoded
}

func (d *DataRequests) GetLastFulfillSentBlockNumber() uint64 {
	return d.LastFulfillSentBlockNumber
}

func (d *DataRequests) GetFulfillBlockNumber() uint64 {
	return d.FulfillConfirmedBlockNumber
}

func (d *DataRequests) GetFulfillTxHash() string {
	return d.FulfillTxHash
}

func (d *DataRequests) GetFulfillGasUsed() uint64 {
	return d.FulfillGasUsed
}

func (d *DataRequests) GetFulfillGasPrice() uint64 {
	return d.FulfillGasPrice
}

func (d *DataRequests) GetFulfillmentAttempts() uint64 {
	return d.FulfillmentAttempts
}

func (d *DataRequests) GetRequestStatus() int {
	return d.RequestStatus
}

func (d *DataRequests) GetJobStatus() int {
	return d.JobStatus
}

func (d *DataRequests) GetRequestStatusString() string {
	switch d.RequestStatus {
	case REQUEST_STATUS_UNKNOWN:
	default:
		return "UNKNOWN"
	case REQUEST_STATUS_INITIALISED:
		return "INITIALISED"
	case REQUEST_STATUS_FETCHING_DATA:
		return "FETCHING DATA"
	case REQUEST_STATUS_DATA_READY_TO_SEND:
		return "DATA READY"
	case REQUEST_STATUS_TX_SENT:
		return "SENT"
	case REQUEST_STATUS_API_ERROR:
		return "API REQUEST FAILED"
	case REQUEST_STATUS_TX_FAILED:
		return "TX FAILED"
	case REQUEST_STATUS_SUCCESS:
		return "SUCCESS"
	case REQUEST_STATUS_FULFILMENT_FAILED:
		return "FULFILMENT FAILED"
	}

	return "UNKNOWN"
}

func (d *DataRequests) GetJobStatusString() string {
	switch d.JobStatus {
	case JOB_STATUS_PENDING:
		return "PENDING"
	case JOB_STATUS_SUCCESS:
		return "SUCCESS"
	case JOB_STATUS_FAIL:
		return "FAIL"
	}
	return "UNKNOWN"
}

func (d *DataRequests) GetStatusReason() string {
	return d.StatusReason
}
