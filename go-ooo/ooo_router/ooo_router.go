// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package ooo_router

import (
	"errors"
	"math/big"
	"strings"

	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/event"
)

// Reference imports to suppress errors if they are not otherwise used.
var (
	_ = errors.New
	_ = big.NewInt
	_ = strings.NewReader
	_ = ethereum.NotFound
	_ = bind.Bind
	_ = common.Big1
	_ = types.BloomLookup
	_ = event.NewSubscription
)

// OooRouterMetaData contains all meta data concerning the OooRouter contract.
var OooRouterMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[{\"internalType\":\"address\",\"name\":\"_token\",\"type\":\"address\"}],\"stateMutability\":\"nonpayable\",\"type\":\"constructor\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"consumer\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"provider\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"uint256\",\"name\":\"fee\",\"type\":\"uint256\"},{\"indexed\":false,\"internalType\":\"bytes32\",\"name\":\"data\",\"type\":\"bytes32\"},{\"indexed\":true,\"internalType\":\"bytes32\",\"name\":\"requestId\",\"type\":\"bytes32\"}],\"name\":\"DataRequested\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"provider\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"uint256\",\"name\":\"minFee\",\"type\":\"uint256\"}],\"name\":\"ProviderRegistered\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"consumer\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"provider\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"bytes32\",\"name\":\"requestId\",\"type\":\"bytes32\"},{\"indexed\":false,\"internalType\":\"uint256\",\"name\":\"requestedData\",\"type\":\"uint256\"}],\"name\":\"RequestFulfilled\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"provider\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"consumer\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"uint256\",\"name\":\"oldFee\",\"type\":\"uint256\"},{\"indexed\":false,\"internalType\":\"uint256\",\"name\":\"newFee\",\"type\":\"uint256\"}],\"name\":\"SetProviderGranularFee\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"provider\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"uint256\",\"name\":\"oldMinFee\",\"type\":\"uint256\"},{\"indexed\":false,\"internalType\":\"uint256\",\"name\":\"newMinFee\",\"type\":\"uint256\"}],\"name\":\"SetProviderMinFee\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"tokenAddress\",\"type\":\"address\"}],\"name\":\"TokenSet\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"provider\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"recipient\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"uint256\",\"name\":\"amount\",\"type\":\"uint256\"}],\"name\":\"WithdrawFees\",\"type\":\"event\"},{\"inputs\":[],\"name\":\"REQUEST_STATUS_NOT_SET\",\"outputs\":[{\"internalType\":\"uint8\",\"name\":\"\",\"type\":\"uint8\"}],\"stateMutability\":\"view\",\"type\":\"function\",\"constant\":true},{\"inputs\":[],\"name\":\"REQUEST_STATUS_REQUESTED\",\"outputs\":[{\"internalType\":\"uint8\",\"name\":\"\",\"type\":\"uint8\"}],\"stateMutability\":\"view\",\"type\":\"function\",\"constant\":true},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"\",\"type\":\"bytes32\"}],\"name\":\"dataRequests\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"consumer\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"provider\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"fee\",\"type\":\"uint256\"},{\"internalType\":\"uint8\",\"name\":\"status\",\"type\":\"uint8\"}],\"stateMutability\":\"view\",\"type\":\"function\",\"constant\":true},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"_minFee\",\"type\":\"uint256\"}],\"name\":\"registerAsProvider\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"success\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"_newMinFee\",\"type\":\"uint256\"}],\"name\":\"setProviderMinFee\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"success\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"_consumer\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"_newFee\",\"type\":\"uint256\"}],\"name\":\"setProviderGranularFee\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"success\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"_recipient\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"_amount\",\"type\":\"uint256\"}],\"name\":\"withdraw\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"_provider\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"_fee\",\"type\":\"uint256\"},{\"internalType\":\"bytes32\",\"name\":\"_data\",\"type\":\"bytes32\"}],\"name\":\"initialiseRequest\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"success\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"_requestId\",\"type\":\"bytes32\"},{\"internalType\":\"uint256\",\"name\":\"_requestedData\",\"type\":\"uint256\"},{\"internalType\":\"bytes\",\"name\":\"_signature\",\"type\":\"bytes\"}],\"name\":\"fulfillRequest\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"getTokenAddress\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\",\"constant\":true},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"_requestId\",\"type\":\"bytes32\"}],\"name\":\"getDataRequestConsumer\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\",\"constant\":true},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"_requestId\",\"type\":\"bytes32\"}],\"name\":\"getDataRequestProvider\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\",\"constant\":true},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"_requestId\",\"type\":\"bytes32\"}],\"name\":\"requestExists\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\",\"constant\":true},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"_requestId\",\"type\":\"bytes32\"}],\"name\":\"getRequestStatus\",\"outputs\":[{\"internalType\":\"uint8\",\"name\":\"\",\"type\":\"uint8\"}],\"stateMutability\":\"view\",\"type\":\"function\",\"constant\":true},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"_provider\",\"type\":\"address\"}],\"name\":\"getProviderMinFee\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\",\"constant\":true},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"_provider\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"_consumer\",\"type\":\"address\"}],\"name\":\"getProviderGranularFee\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\",\"constant\":true},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"_provider\",\"type\":\"address\"}],\"name\":\"getWithdrawableTokens\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\",\"constant\":true}]",
}

// OooRouterABI is the input ABI used to generate the binding from.
// Deprecated: Use OooRouterMetaData.ABI instead.
var OooRouterABI = OooRouterMetaData.ABI

// OooRouter is an auto generated Go binding around an Ethereum contract.
type OooRouter struct {
	OooRouterCaller     // Read-only binding to the contract
	OooRouterTransactor // Write-only binding to the contract
	OooRouterFilterer   // Log filterer for contract events
}

// OooRouterCaller is an auto generated read-only Go binding around an Ethereum contract.
type OooRouterCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// OooRouterTransactor is an auto generated write-only Go binding around an Ethereum contract.
type OooRouterTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// OooRouterFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type OooRouterFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// OooRouterSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type OooRouterSession struct {
	Contract     *OooRouter        // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// OooRouterCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type OooRouterCallerSession struct {
	Contract *OooRouterCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts    // Call options to use throughout this session
}

// OooRouterTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type OooRouterTransactorSession struct {
	Contract     *OooRouterTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts    // Transaction auth options to use throughout this session
}

// OooRouterRaw is an auto generated low-level Go binding around an Ethereum contract.
type OooRouterRaw struct {
	Contract *OooRouter // Generic contract binding to access the raw methods on
}

// OooRouterCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type OooRouterCallerRaw struct {
	Contract *OooRouterCaller // Generic read-only contract binding to access the raw methods on
}

// OooRouterTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type OooRouterTransactorRaw struct {
	Contract *OooRouterTransactor // Generic write-only contract binding to access the raw methods on
}

// NewOooRouter creates a new instance of OooRouter, bound to a specific deployed contract.
func NewOooRouter(address common.Address, backend bind.ContractBackend) (*OooRouter, error) {
	contract, err := bindOooRouter(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &OooRouter{OooRouterCaller: OooRouterCaller{contract: contract}, OooRouterTransactor: OooRouterTransactor{contract: contract}, OooRouterFilterer: OooRouterFilterer{contract: contract}}, nil
}

// NewOooRouterCaller creates a new read-only instance of OooRouter, bound to a specific deployed contract.
func NewOooRouterCaller(address common.Address, caller bind.ContractCaller) (*OooRouterCaller, error) {
	contract, err := bindOooRouter(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &OooRouterCaller{contract: contract}, nil
}

// NewOooRouterTransactor creates a new write-only instance of OooRouter, bound to a specific deployed contract.
func NewOooRouterTransactor(address common.Address, transactor bind.ContractTransactor) (*OooRouterTransactor, error) {
	contract, err := bindOooRouter(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &OooRouterTransactor{contract: contract}, nil
}

// NewOooRouterFilterer creates a new log filterer instance of OooRouter, bound to a specific deployed contract.
func NewOooRouterFilterer(address common.Address, filterer bind.ContractFilterer) (*OooRouterFilterer, error) {
	contract, err := bindOooRouter(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &OooRouterFilterer{contract: contract}, nil
}

// bindOooRouter binds a generic wrapper to an already deployed contract.
func bindOooRouter(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := abi.JSON(strings.NewReader(OooRouterABI))
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_OooRouter *OooRouterRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _OooRouter.Contract.OooRouterCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_OooRouter *OooRouterRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _OooRouter.Contract.OooRouterTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_OooRouter *OooRouterRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _OooRouter.Contract.OooRouterTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_OooRouter *OooRouterCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _OooRouter.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_OooRouter *OooRouterTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _OooRouter.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_OooRouter *OooRouterTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _OooRouter.Contract.contract.Transact(opts, method, params...)
}

// REQUESTSTATUSNOTSET is a free data retrieval call binding the contract method 0x7ff28fa7.
//
// Solidity: function REQUEST_STATUS_NOT_SET() view returns(uint8)
func (_OooRouter *OooRouterCaller) REQUESTSTATUSNOTSET(opts *bind.CallOpts) (uint8, error) {
	var out []interface{}
	err := _OooRouter.contract.Call(opts, &out, "REQUEST_STATUS_NOT_SET")

	if err != nil {
		return *new(uint8), err
	}

	out0 := *abi.ConvertType(out[0], new(uint8)).(*uint8)

	return out0, err

}

// REQUESTSTATUSNOTSET is a free data retrieval call binding the contract method 0x7ff28fa7.
//
// Solidity: function REQUEST_STATUS_NOT_SET() view returns(uint8)
func (_OooRouter *OooRouterSession) REQUESTSTATUSNOTSET() (uint8, error) {
	return _OooRouter.Contract.REQUESTSTATUSNOTSET(&_OooRouter.CallOpts)
}

// REQUESTSTATUSNOTSET is a free data retrieval call binding the contract method 0x7ff28fa7.
//
// Solidity: function REQUEST_STATUS_NOT_SET() view returns(uint8)
func (_OooRouter *OooRouterCallerSession) REQUESTSTATUSNOTSET() (uint8, error) {
	return _OooRouter.Contract.REQUESTSTATUSNOTSET(&_OooRouter.CallOpts)
}

// REQUESTSTATUSREQUESTED is a free data retrieval call binding the contract method 0x5232ef42.
//
// Solidity: function REQUEST_STATUS_REQUESTED() view returns(uint8)
func (_OooRouter *OooRouterCaller) REQUESTSTATUSREQUESTED(opts *bind.CallOpts) (uint8, error) {
	var out []interface{}
	err := _OooRouter.contract.Call(opts, &out, "REQUEST_STATUS_REQUESTED")

	if err != nil {
		return *new(uint8), err
	}

	out0 := *abi.ConvertType(out[0], new(uint8)).(*uint8)

	return out0, err

}

// REQUESTSTATUSREQUESTED is a free data retrieval call binding the contract method 0x5232ef42.
//
// Solidity: function REQUEST_STATUS_REQUESTED() view returns(uint8)
func (_OooRouter *OooRouterSession) REQUESTSTATUSREQUESTED() (uint8, error) {
	return _OooRouter.Contract.REQUESTSTATUSREQUESTED(&_OooRouter.CallOpts)
}

// REQUESTSTATUSREQUESTED is a free data retrieval call binding the contract method 0x5232ef42.
//
// Solidity: function REQUEST_STATUS_REQUESTED() view returns(uint8)
func (_OooRouter *OooRouterCallerSession) REQUESTSTATUSREQUESTED() (uint8, error) {
	return _OooRouter.Contract.REQUESTSTATUSREQUESTED(&_OooRouter.CallOpts)
}

// DataRequests is a free data retrieval call binding the contract method 0x28e7d709.
//
// Solidity: function dataRequests(bytes32 ) view returns(address consumer, address provider, uint256 fee, uint8 status)
func (_OooRouter *OooRouterCaller) DataRequests(opts *bind.CallOpts, arg0 [32]byte) (struct {
	Consumer common.Address
	Provider common.Address
	Fee      *big.Int
	Status   uint8
}, error) {
	var out []interface{}
	err := _OooRouter.contract.Call(opts, &out, "dataRequests", arg0)

	outstruct := new(struct {
		Consumer common.Address
		Provider common.Address
		Fee      *big.Int
		Status   uint8
	})
	if err != nil {
		return *outstruct, err
	}

	outstruct.Consumer = *abi.ConvertType(out[0], new(common.Address)).(*common.Address)
	outstruct.Provider = *abi.ConvertType(out[1], new(common.Address)).(*common.Address)
	outstruct.Fee = *abi.ConvertType(out[2], new(*big.Int)).(**big.Int)
	outstruct.Status = *abi.ConvertType(out[3], new(uint8)).(*uint8)

	return *outstruct, err

}

// DataRequests is a free data retrieval call binding the contract method 0x28e7d709.
//
// Solidity: function dataRequests(bytes32 ) view returns(address consumer, address provider, uint256 fee, uint8 status)
func (_OooRouter *OooRouterSession) DataRequests(arg0 [32]byte) (struct {
	Consumer common.Address
	Provider common.Address
	Fee      *big.Int
	Status   uint8
}, error) {
	return _OooRouter.Contract.DataRequests(&_OooRouter.CallOpts, arg0)
}

// DataRequests is a free data retrieval call binding the contract method 0x28e7d709.
//
// Solidity: function dataRequests(bytes32 ) view returns(address consumer, address provider, uint256 fee, uint8 status)
func (_OooRouter *OooRouterCallerSession) DataRequests(arg0 [32]byte) (struct {
	Consumer common.Address
	Provider common.Address
	Fee      *big.Int
	Status   uint8
}, error) {
	return _OooRouter.Contract.DataRequests(&_OooRouter.CallOpts, arg0)
}

// GetDataRequestConsumer is a free data retrieval call binding the contract method 0x1a5d1473.
//
// Solidity: function getDataRequestConsumer(bytes32 _requestId) view returns(address)
func (_OooRouter *OooRouterCaller) GetDataRequestConsumer(opts *bind.CallOpts, _requestId [32]byte) (common.Address, error) {
	var out []interface{}
	err := _OooRouter.contract.Call(opts, &out, "getDataRequestConsumer", _requestId)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetDataRequestConsumer is a free data retrieval call binding the contract method 0x1a5d1473.
//
// Solidity: function getDataRequestConsumer(bytes32 _requestId) view returns(address)
func (_OooRouter *OooRouterSession) GetDataRequestConsumer(_requestId [32]byte) (common.Address, error) {
	return _OooRouter.Contract.GetDataRequestConsumer(&_OooRouter.CallOpts, _requestId)
}

// GetDataRequestConsumer is a free data retrieval call binding the contract method 0x1a5d1473.
//
// Solidity: function getDataRequestConsumer(bytes32 _requestId) view returns(address)
func (_OooRouter *OooRouterCallerSession) GetDataRequestConsumer(_requestId [32]byte) (common.Address, error) {
	return _OooRouter.Contract.GetDataRequestConsumer(&_OooRouter.CallOpts, _requestId)
}

// GetDataRequestProvider is a free data retrieval call binding the contract method 0x2de0cd24.
//
// Solidity: function getDataRequestProvider(bytes32 _requestId) view returns(address)
func (_OooRouter *OooRouterCaller) GetDataRequestProvider(opts *bind.CallOpts, _requestId [32]byte) (common.Address, error) {
	var out []interface{}
	err := _OooRouter.contract.Call(opts, &out, "getDataRequestProvider", _requestId)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetDataRequestProvider is a free data retrieval call binding the contract method 0x2de0cd24.
//
// Solidity: function getDataRequestProvider(bytes32 _requestId) view returns(address)
func (_OooRouter *OooRouterSession) GetDataRequestProvider(_requestId [32]byte) (common.Address, error) {
	return _OooRouter.Contract.GetDataRequestProvider(&_OooRouter.CallOpts, _requestId)
}

// GetDataRequestProvider is a free data retrieval call binding the contract method 0x2de0cd24.
//
// Solidity: function getDataRequestProvider(bytes32 _requestId) view returns(address)
func (_OooRouter *OooRouterCallerSession) GetDataRequestProvider(_requestId [32]byte) (common.Address, error) {
	return _OooRouter.Contract.GetDataRequestProvider(&_OooRouter.CallOpts, _requestId)
}

// GetProviderGranularFee is a free data retrieval call binding the contract method 0x01f1432d.
//
// Solidity: function getProviderGranularFee(address _provider, address _consumer) view returns(uint256)
func (_OooRouter *OooRouterCaller) GetProviderGranularFee(opts *bind.CallOpts, _provider common.Address, _consumer common.Address) (*big.Int, error) {
	var out []interface{}
	err := _OooRouter.contract.Call(opts, &out, "getProviderGranularFee", _provider, _consumer)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetProviderGranularFee is a free data retrieval call binding the contract method 0x01f1432d.
//
// Solidity: function getProviderGranularFee(address _provider, address _consumer) view returns(uint256)
func (_OooRouter *OooRouterSession) GetProviderGranularFee(_provider common.Address, _consumer common.Address) (*big.Int, error) {
	return _OooRouter.Contract.GetProviderGranularFee(&_OooRouter.CallOpts, _provider, _consumer)
}

// GetProviderGranularFee is a free data retrieval call binding the contract method 0x01f1432d.
//
// Solidity: function getProviderGranularFee(address _provider, address _consumer) view returns(uint256)
func (_OooRouter *OooRouterCallerSession) GetProviderGranularFee(_provider common.Address, _consumer common.Address) (*big.Int, error) {
	return _OooRouter.Contract.GetProviderGranularFee(&_OooRouter.CallOpts, _provider, _consumer)
}

// GetProviderMinFee is a free data retrieval call binding the contract method 0x11f8edd9.
//
// Solidity: function getProviderMinFee(address _provider) view returns(uint256)
func (_OooRouter *OooRouterCaller) GetProviderMinFee(opts *bind.CallOpts, _provider common.Address) (*big.Int, error) {
	var out []interface{}
	err := _OooRouter.contract.Call(opts, &out, "getProviderMinFee", _provider)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetProviderMinFee is a free data retrieval call binding the contract method 0x11f8edd9.
//
// Solidity: function getProviderMinFee(address _provider) view returns(uint256)
func (_OooRouter *OooRouterSession) GetProviderMinFee(_provider common.Address) (*big.Int, error) {
	return _OooRouter.Contract.GetProviderMinFee(&_OooRouter.CallOpts, _provider)
}

// GetProviderMinFee is a free data retrieval call binding the contract method 0x11f8edd9.
//
// Solidity: function getProviderMinFee(address _provider) view returns(uint256)
func (_OooRouter *OooRouterCallerSession) GetProviderMinFee(_provider common.Address) (*big.Int, error) {
	return _OooRouter.Contract.GetProviderMinFee(&_OooRouter.CallOpts, _provider)
}

// GetRequestStatus is a free data retrieval call binding the contract method 0x45d07664.
//
// Solidity: function getRequestStatus(bytes32 _requestId) view returns(uint8)
func (_OooRouter *OooRouterCaller) GetRequestStatus(opts *bind.CallOpts, _requestId [32]byte) (uint8, error) {
	var out []interface{}
	err := _OooRouter.contract.Call(opts, &out, "getRequestStatus", _requestId)

	if err != nil {
		return *new(uint8), err
	}

	out0 := *abi.ConvertType(out[0], new(uint8)).(*uint8)

	return out0, err

}

// GetRequestStatus is a free data retrieval call binding the contract method 0x45d07664.
//
// Solidity: function getRequestStatus(bytes32 _requestId) view returns(uint8)
func (_OooRouter *OooRouterSession) GetRequestStatus(_requestId [32]byte) (uint8, error) {
	return _OooRouter.Contract.GetRequestStatus(&_OooRouter.CallOpts, _requestId)
}

// GetRequestStatus is a free data retrieval call binding the contract method 0x45d07664.
//
// Solidity: function getRequestStatus(bytes32 _requestId) view returns(uint8)
func (_OooRouter *OooRouterCallerSession) GetRequestStatus(_requestId [32]byte) (uint8, error) {
	return _OooRouter.Contract.GetRequestStatus(&_OooRouter.CallOpts, _requestId)
}

// GetTokenAddress is a free data retrieval call binding the contract method 0x10fe9ae8.
//
// Solidity: function getTokenAddress() view returns(address)
func (_OooRouter *OooRouterCaller) GetTokenAddress(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _OooRouter.contract.Call(opts, &out, "getTokenAddress")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetTokenAddress is a free data retrieval call binding the contract method 0x10fe9ae8.
//
// Solidity: function getTokenAddress() view returns(address)
func (_OooRouter *OooRouterSession) GetTokenAddress() (common.Address, error) {
	return _OooRouter.Contract.GetTokenAddress(&_OooRouter.CallOpts)
}

// GetTokenAddress is a free data retrieval call binding the contract method 0x10fe9ae8.
//
// Solidity: function getTokenAddress() view returns(address)
func (_OooRouter *OooRouterCallerSession) GetTokenAddress() (common.Address, error) {
	return _OooRouter.Contract.GetTokenAddress(&_OooRouter.CallOpts)
}

// GetWithdrawableTokens is a free data retrieval call binding the contract method 0x38dcb96f.
//
// Solidity: function getWithdrawableTokens(address _provider) view returns(uint256)
func (_OooRouter *OooRouterCaller) GetWithdrawableTokens(opts *bind.CallOpts, _provider common.Address) (*big.Int, error) {
	var out []interface{}
	err := _OooRouter.contract.Call(opts, &out, "getWithdrawableTokens", _provider)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetWithdrawableTokens is a free data retrieval call binding the contract method 0x38dcb96f.
//
// Solidity: function getWithdrawableTokens(address _provider) view returns(uint256)
func (_OooRouter *OooRouterSession) GetWithdrawableTokens(_provider common.Address) (*big.Int, error) {
	return _OooRouter.Contract.GetWithdrawableTokens(&_OooRouter.CallOpts, _provider)
}

// GetWithdrawableTokens is a free data retrieval call binding the contract method 0x38dcb96f.
//
// Solidity: function getWithdrawableTokens(address _provider) view returns(uint256)
func (_OooRouter *OooRouterCallerSession) GetWithdrawableTokens(_provider common.Address) (*big.Int, error) {
	return _OooRouter.Contract.GetWithdrawableTokens(&_OooRouter.CallOpts, _provider)
}

// RequestExists is a free data retrieval call binding the contract method 0x1b74d046.
//
// Solidity: function requestExists(bytes32 _requestId) view returns(bool)
func (_OooRouter *OooRouterCaller) RequestExists(opts *bind.CallOpts, _requestId [32]byte) (bool, error) {
	var out []interface{}
	err := _OooRouter.contract.Call(opts, &out, "requestExists", _requestId)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// RequestExists is a free data retrieval call binding the contract method 0x1b74d046.
//
// Solidity: function requestExists(bytes32 _requestId) view returns(bool)
func (_OooRouter *OooRouterSession) RequestExists(_requestId [32]byte) (bool, error) {
	return _OooRouter.Contract.RequestExists(&_OooRouter.CallOpts, _requestId)
}

// RequestExists is a free data retrieval call binding the contract method 0x1b74d046.
//
// Solidity: function requestExists(bytes32 _requestId) view returns(bool)
func (_OooRouter *OooRouterCallerSession) RequestExists(_requestId [32]byte) (bool, error) {
	return _OooRouter.Contract.RequestExists(&_OooRouter.CallOpts, _requestId)
}

// FulfillRequest is a paid mutator transaction binding the contract method 0x6f171812.
//
// Solidity: function fulfillRequest(bytes32 _requestId, uint256 _requestedData, bytes _signature) returns(bool)
func (_OooRouter *OooRouterTransactor) FulfillRequest(opts *bind.TransactOpts, _requestId [32]byte, _requestedData *big.Int, _signature []byte) (*types.Transaction, error) {
	return _OooRouter.contract.Transact(opts, "fulfillRequest", _requestId, _requestedData, _signature)
}

// FulfillRequest is a paid mutator transaction binding the contract method 0x6f171812.
//
// Solidity: function fulfillRequest(bytes32 _requestId, uint256 _requestedData, bytes _signature) returns(bool)
func (_OooRouter *OooRouterSession) FulfillRequest(_requestId [32]byte, _requestedData *big.Int, _signature []byte) (*types.Transaction, error) {
	return _OooRouter.Contract.FulfillRequest(&_OooRouter.TransactOpts, _requestId, _requestedData, _signature)
}

// FulfillRequest is a paid mutator transaction binding the contract method 0x6f171812.
//
// Solidity: function fulfillRequest(bytes32 _requestId, uint256 _requestedData, bytes _signature) returns(bool)
func (_OooRouter *OooRouterTransactorSession) FulfillRequest(_requestId [32]byte, _requestedData *big.Int, _signature []byte) (*types.Transaction, error) {
	return _OooRouter.Contract.FulfillRequest(&_OooRouter.TransactOpts, _requestId, _requestedData, _signature)
}

// InitialiseRequest is a paid mutator transaction binding the contract method 0xffe0982e.
//
// Solidity: function initialiseRequest(address _provider, uint256 _fee, bytes32 _data) returns(bool success)
func (_OooRouter *OooRouterTransactor) InitialiseRequest(opts *bind.TransactOpts, _provider common.Address, _fee *big.Int, _data [32]byte) (*types.Transaction, error) {
	return _OooRouter.contract.Transact(opts, "initialiseRequest", _provider, _fee, _data)
}

// InitialiseRequest is a paid mutator transaction binding the contract method 0xffe0982e.
//
// Solidity: function initialiseRequest(address _provider, uint256 _fee, bytes32 _data) returns(bool success)
func (_OooRouter *OooRouterSession) InitialiseRequest(_provider common.Address, _fee *big.Int, _data [32]byte) (*types.Transaction, error) {
	return _OooRouter.Contract.InitialiseRequest(&_OooRouter.TransactOpts, _provider, _fee, _data)
}

// InitialiseRequest is a paid mutator transaction binding the contract method 0xffe0982e.
//
// Solidity: function initialiseRequest(address _provider, uint256 _fee, bytes32 _data) returns(bool success)
func (_OooRouter *OooRouterTransactorSession) InitialiseRequest(_provider common.Address, _fee *big.Int, _data [32]byte) (*types.Transaction, error) {
	return _OooRouter.Contract.InitialiseRequest(&_OooRouter.TransactOpts, _provider, _fee, _data)
}

// RegisterAsProvider is a paid mutator transaction binding the contract method 0xf515b600.
//
// Solidity: function registerAsProvider(uint256 _minFee) returns(bool success)
func (_OooRouter *OooRouterTransactor) RegisterAsProvider(opts *bind.TransactOpts, _minFee *big.Int) (*types.Transaction, error) {
	return _OooRouter.contract.Transact(opts, "registerAsProvider", _minFee)
}

// RegisterAsProvider is a paid mutator transaction binding the contract method 0xf515b600.
//
// Solidity: function registerAsProvider(uint256 _minFee) returns(bool success)
func (_OooRouter *OooRouterSession) RegisterAsProvider(_minFee *big.Int) (*types.Transaction, error) {
	return _OooRouter.Contract.RegisterAsProvider(&_OooRouter.TransactOpts, _minFee)
}

// RegisterAsProvider is a paid mutator transaction binding the contract method 0xf515b600.
//
// Solidity: function registerAsProvider(uint256 _minFee) returns(bool success)
func (_OooRouter *OooRouterTransactorSession) RegisterAsProvider(_minFee *big.Int) (*types.Transaction, error) {
	return _OooRouter.Contract.RegisterAsProvider(&_OooRouter.TransactOpts, _minFee)
}

// SetProviderGranularFee is a paid mutator transaction binding the contract method 0xf530411a.
//
// Solidity: function setProviderGranularFee(address _consumer, uint256 _newFee) returns(bool success)
func (_OooRouter *OooRouterTransactor) SetProviderGranularFee(opts *bind.TransactOpts, _consumer common.Address, _newFee *big.Int) (*types.Transaction, error) {
	return _OooRouter.contract.Transact(opts, "setProviderGranularFee", _consumer, _newFee)
}

// SetProviderGranularFee is a paid mutator transaction binding the contract method 0xf530411a.
//
// Solidity: function setProviderGranularFee(address _consumer, uint256 _newFee) returns(bool success)
func (_OooRouter *OooRouterSession) SetProviderGranularFee(_consumer common.Address, _newFee *big.Int) (*types.Transaction, error) {
	return _OooRouter.Contract.SetProviderGranularFee(&_OooRouter.TransactOpts, _consumer, _newFee)
}

// SetProviderGranularFee is a paid mutator transaction binding the contract method 0xf530411a.
//
// Solidity: function setProviderGranularFee(address _consumer, uint256 _newFee) returns(bool success)
func (_OooRouter *OooRouterTransactorSession) SetProviderGranularFee(_consumer common.Address, _newFee *big.Int) (*types.Transaction, error) {
	return _OooRouter.Contract.SetProviderGranularFee(&_OooRouter.TransactOpts, _consumer, _newFee)
}

// SetProviderMinFee is a paid mutator transaction binding the contract method 0xf1bbc76a.
//
// Solidity: function setProviderMinFee(uint256 _newMinFee) returns(bool success)
func (_OooRouter *OooRouterTransactor) SetProviderMinFee(opts *bind.TransactOpts, _newMinFee *big.Int) (*types.Transaction, error) {
	return _OooRouter.contract.Transact(opts, "setProviderMinFee", _newMinFee)
}

// SetProviderMinFee is a paid mutator transaction binding the contract method 0xf1bbc76a.
//
// Solidity: function setProviderMinFee(uint256 _newMinFee) returns(bool success)
func (_OooRouter *OooRouterSession) SetProviderMinFee(_newMinFee *big.Int) (*types.Transaction, error) {
	return _OooRouter.Contract.SetProviderMinFee(&_OooRouter.TransactOpts, _newMinFee)
}

// SetProviderMinFee is a paid mutator transaction binding the contract method 0xf1bbc76a.
//
// Solidity: function setProviderMinFee(uint256 _newMinFee) returns(bool success)
func (_OooRouter *OooRouterTransactorSession) SetProviderMinFee(_newMinFee *big.Int) (*types.Transaction, error) {
	return _OooRouter.Contract.SetProviderMinFee(&_OooRouter.TransactOpts, _newMinFee)
}

// Withdraw is a paid mutator transaction binding the contract method 0xf3fef3a3.
//
// Solidity: function withdraw(address _recipient, uint256 _amount) returns()
func (_OooRouter *OooRouterTransactor) Withdraw(opts *bind.TransactOpts, _recipient common.Address, _amount *big.Int) (*types.Transaction, error) {
	return _OooRouter.contract.Transact(opts, "withdraw", _recipient, _amount)
}

// Withdraw is a paid mutator transaction binding the contract method 0xf3fef3a3.
//
// Solidity: function withdraw(address _recipient, uint256 _amount) returns()
func (_OooRouter *OooRouterSession) Withdraw(_recipient common.Address, _amount *big.Int) (*types.Transaction, error) {
	return _OooRouter.Contract.Withdraw(&_OooRouter.TransactOpts, _recipient, _amount)
}

// Withdraw is a paid mutator transaction binding the contract method 0xf3fef3a3.
//
// Solidity: function withdraw(address _recipient, uint256 _amount) returns()
func (_OooRouter *OooRouterTransactorSession) Withdraw(_recipient common.Address, _amount *big.Int) (*types.Transaction, error) {
	return _OooRouter.Contract.Withdraw(&_OooRouter.TransactOpts, _recipient, _amount)
}

// OooRouterDataRequestedIterator is returned from FilterDataRequested and is used to iterate over the raw logs and unpacked data for DataRequested events raised by the OooRouter contract.
type OooRouterDataRequestedIterator struct {
	Event *OooRouterDataRequested // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *OooRouterDataRequestedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(OooRouterDataRequested)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(OooRouterDataRequested)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *OooRouterDataRequestedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *OooRouterDataRequestedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// OooRouterDataRequested represents a DataRequested event raised by the OooRouter contract.
type OooRouterDataRequested struct {
	Consumer  common.Address
	Provider  common.Address
	Fee       *big.Int
	Data      [32]byte
	RequestId [32]byte
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterDataRequested is a free log retrieval operation binding the contract event 0x547392811f4eab1074705e8d6a5a91322c67e4565b3781b385e03f649f1b38cb.
//
// Solidity: event DataRequested(address indexed consumer, address indexed provider, uint256 fee, bytes32 data, bytes32 indexed requestId)
func (_OooRouter *OooRouterFilterer) FilterDataRequested(opts *bind.FilterOpts, consumer []common.Address, provider []common.Address, requestId [][32]byte) (*OooRouterDataRequestedIterator, error) {

	var consumerRule []interface{}
	for _, consumerItem := range consumer {
		consumerRule = append(consumerRule, consumerItem)
	}
	var providerRule []interface{}
	for _, providerItem := range provider {
		providerRule = append(providerRule, providerItem)
	}

	var requestIdRule []interface{}
	for _, requestIdItem := range requestId {
		requestIdRule = append(requestIdRule, requestIdItem)
	}

	logs, sub, err := _OooRouter.contract.FilterLogs(opts, "DataRequested", consumerRule, providerRule, requestIdRule)
	if err != nil {
		return nil, err
	}
	return &OooRouterDataRequestedIterator{contract: _OooRouter.contract, event: "DataRequested", logs: logs, sub: sub}, nil
}

// WatchDataRequested is a free log subscription operation binding the contract event 0x547392811f4eab1074705e8d6a5a91322c67e4565b3781b385e03f649f1b38cb.
//
// Solidity: event DataRequested(address indexed consumer, address indexed provider, uint256 fee, bytes32 data, bytes32 indexed requestId)
func (_OooRouter *OooRouterFilterer) WatchDataRequested(opts *bind.WatchOpts, sink chan<- *OooRouterDataRequested, consumer []common.Address, provider []common.Address, requestId [][32]byte) (event.Subscription, error) {

	var consumerRule []interface{}
	for _, consumerItem := range consumer {
		consumerRule = append(consumerRule, consumerItem)
	}
	var providerRule []interface{}
	for _, providerItem := range provider {
		providerRule = append(providerRule, providerItem)
	}

	var requestIdRule []interface{}
	for _, requestIdItem := range requestId {
		requestIdRule = append(requestIdRule, requestIdItem)
	}

	logs, sub, err := _OooRouter.contract.WatchLogs(opts, "DataRequested", consumerRule, providerRule, requestIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(OooRouterDataRequested)
				if err := _OooRouter.contract.UnpackLog(event, "DataRequested", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseDataRequested is a log parse operation binding the contract event 0x547392811f4eab1074705e8d6a5a91322c67e4565b3781b385e03f649f1b38cb.
//
// Solidity: event DataRequested(address indexed consumer, address indexed provider, uint256 fee, bytes32 data, bytes32 indexed requestId)
func (_OooRouter *OooRouterFilterer) ParseDataRequested(log types.Log) (*OooRouterDataRequested, error) {
	event := new(OooRouterDataRequested)
	if err := _OooRouter.contract.UnpackLog(event, "DataRequested", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// OooRouterProviderRegisteredIterator is returned from FilterProviderRegistered and is used to iterate over the raw logs and unpacked data for ProviderRegistered events raised by the OooRouter contract.
type OooRouterProviderRegisteredIterator struct {
	Event *OooRouterProviderRegistered // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *OooRouterProviderRegisteredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(OooRouterProviderRegistered)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(OooRouterProviderRegistered)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *OooRouterProviderRegisteredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *OooRouterProviderRegisteredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// OooRouterProviderRegistered represents a ProviderRegistered event raised by the OooRouter contract.
type OooRouterProviderRegistered struct {
	Provider common.Address
	MinFee   *big.Int
	Raw      types.Log // Blockchain specific contextual infos
}

// FilterProviderRegistered is a free log retrieval operation binding the contract event 0x90c9734131c1e4fb36cde2d71e6feb93fb258f71be8a85411c173d25e1516e80.
//
// Solidity: event ProviderRegistered(address indexed provider, uint256 minFee)
func (_OooRouter *OooRouterFilterer) FilterProviderRegistered(opts *bind.FilterOpts, provider []common.Address) (*OooRouterProviderRegisteredIterator, error) {

	var providerRule []interface{}
	for _, providerItem := range provider {
		providerRule = append(providerRule, providerItem)
	}

	logs, sub, err := _OooRouter.contract.FilterLogs(opts, "ProviderRegistered", providerRule)
	if err != nil {
		return nil, err
	}
	return &OooRouterProviderRegisteredIterator{contract: _OooRouter.contract, event: "ProviderRegistered", logs: logs, sub: sub}, nil
}

// WatchProviderRegistered is a free log subscription operation binding the contract event 0x90c9734131c1e4fb36cde2d71e6feb93fb258f71be8a85411c173d25e1516e80.
//
// Solidity: event ProviderRegistered(address indexed provider, uint256 minFee)
func (_OooRouter *OooRouterFilterer) WatchProviderRegistered(opts *bind.WatchOpts, sink chan<- *OooRouterProviderRegistered, provider []common.Address) (event.Subscription, error) {

	var providerRule []interface{}
	for _, providerItem := range provider {
		providerRule = append(providerRule, providerItem)
	}

	logs, sub, err := _OooRouter.contract.WatchLogs(opts, "ProviderRegistered", providerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(OooRouterProviderRegistered)
				if err := _OooRouter.contract.UnpackLog(event, "ProviderRegistered", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseProviderRegistered is a log parse operation binding the contract event 0x90c9734131c1e4fb36cde2d71e6feb93fb258f71be8a85411c173d25e1516e80.
//
// Solidity: event ProviderRegistered(address indexed provider, uint256 minFee)
func (_OooRouter *OooRouterFilterer) ParseProviderRegistered(log types.Log) (*OooRouterProviderRegistered, error) {
	event := new(OooRouterProviderRegistered)
	if err := _OooRouter.contract.UnpackLog(event, "ProviderRegistered", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// OooRouterRequestFulfilledIterator is returned from FilterRequestFulfilled and is used to iterate over the raw logs and unpacked data for RequestFulfilled events raised by the OooRouter contract.
type OooRouterRequestFulfilledIterator struct {
	Event *OooRouterRequestFulfilled // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *OooRouterRequestFulfilledIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(OooRouterRequestFulfilled)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(OooRouterRequestFulfilled)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *OooRouterRequestFulfilledIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *OooRouterRequestFulfilledIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// OooRouterRequestFulfilled represents a RequestFulfilled event raised by the OooRouter contract.
type OooRouterRequestFulfilled struct {
	Consumer      common.Address
	Provider      common.Address
	RequestId     [32]byte
	RequestedData *big.Int
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterRequestFulfilled is a free log retrieval operation binding the contract event 0xf583670c1cbc98b1818384b70c30a178114600cb3ae010c993699941635ddc12.
//
// Solidity: event RequestFulfilled(address indexed consumer, address indexed provider, bytes32 indexed requestId, uint256 requestedData)
func (_OooRouter *OooRouterFilterer) FilterRequestFulfilled(opts *bind.FilterOpts, consumer []common.Address, provider []common.Address, requestId [][32]byte) (*OooRouterRequestFulfilledIterator, error) {

	var consumerRule []interface{}
	for _, consumerItem := range consumer {
		consumerRule = append(consumerRule, consumerItem)
	}
	var providerRule []interface{}
	for _, providerItem := range provider {
		providerRule = append(providerRule, providerItem)
	}
	var requestIdRule []interface{}
	for _, requestIdItem := range requestId {
		requestIdRule = append(requestIdRule, requestIdItem)
	}

	logs, sub, err := _OooRouter.contract.FilterLogs(opts, "RequestFulfilled", consumerRule, providerRule, requestIdRule)
	if err != nil {
		return nil, err
	}
	return &OooRouterRequestFulfilledIterator{contract: _OooRouter.contract, event: "RequestFulfilled", logs: logs, sub: sub}, nil
}

// WatchRequestFulfilled is a free log subscription operation binding the contract event 0xf583670c1cbc98b1818384b70c30a178114600cb3ae010c993699941635ddc12.
//
// Solidity: event RequestFulfilled(address indexed consumer, address indexed provider, bytes32 indexed requestId, uint256 requestedData)
func (_OooRouter *OooRouterFilterer) WatchRequestFulfilled(opts *bind.WatchOpts, sink chan<- *OooRouterRequestFulfilled, consumer []common.Address, provider []common.Address, requestId [][32]byte) (event.Subscription, error) {

	var consumerRule []interface{}
	for _, consumerItem := range consumer {
		consumerRule = append(consumerRule, consumerItem)
	}
	var providerRule []interface{}
	for _, providerItem := range provider {
		providerRule = append(providerRule, providerItem)
	}
	var requestIdRule []interface{}
	for _, requestIdItem := range requestId {
		requestIdRule = append(requestIdRule, requestIdItem)
	}

	logs, sub, err := _OooRouter.contract.WatchLogs(opts, "RequestFulfilled", consumerRule, providerRule, requestIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(OooRouterRequestFulfilled)
				if err := _OooRouter.contract.UnpackLog(event, "RequestFulfilled", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseRequestFulfilled is a log parse operation binding the contract event 0xf583670c1cbc98b1818384b70c30a178114600cb3ae010c993699941635ddc12.
//
// Solidity: event RequestFulfilled(address indexed consumer, address indexed provider, bytes32 indexed requestId, uint256 requestedData)
func (_OooRouter *OooRouterFilterer) ParseRequestFulfilled(log types.Log) (*OooRouterRequestFulfilled, error) {
	event := new(OooRouterRequestFulfilled)
	if err := _OooRouter.contract.UnpackLog(event, "RequestFulfilled", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// OooRouterSetProviderGranularFeeIterator is returned from FilterSetProviderGranularFee and is used to iterate over the raw logs and unpacked data for SetProviderGranularFee events raised by the OooRouter contract.
type OooRouterSetProviderGranularFeeIterator struct {
	Event *OooRouterSetProviderGranularFee // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *OooRouterSetProviderGranularFeeIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(OooRouterSetProviderGranularFee)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(OooRouterSetProviderGranularFee)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *OooRouterSetProviderGranularFeeIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *OooRouterSetProviderGranularFeeIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// OooRouterSetProviderGranularFee represents a SetProviderGranularFee event raised by the OooRouter contract.
type OooRouterSetProviderGranularFee struct {
	Provider common.Address
	Consumer common.Address
	OldFee   *big.Int
	NewFee   *big.Int
	Raw      types.Log // Blockchain specific contextual infos
}

// FilterSetProviderGranularFee is a free log retrieval operation binding the contract event 0x36c5f9c4314e16078da10914c2c4431b9ca89c620da3c581bb73d402a01da06d.
//
// Solidity: event SetProviderGranularFee(address indexed provider, address indexed consumer, uint256 oldFee, uint256 newFee)
func (_OooRouter *OooRouterFilterer) FilterSetProviderGranularFee(opts *bind.FilterOpts, provider []common.Address, consumer []common.Address) (*OooRouterSetProviderGranularFeeIterator, error) {

	var providerRule []interface{}
	for _, providerItem := range provider {
		providerRule = append(providerRule, providerItem)
	}
	var consumerRule []interface{}
	for _, consumerItem := range consumer {
		consumerRule = append(consumerRule, consumerItem)
	}

	logs, sub, err := _OooRouter.contract.FilterLogs(opts, "SetProviderGranularFee", providerRule, consumerRule)
	if err != nil {
		return nil, err
	}
	return &OooRouterSetProviderGranularFeeIterator{contract: _OooRouter.contract, event: "SetProviderGranularFee", logs: logs, sub: sub}, nil
}

// WatchSetProviderGranularFee is a free log subscription operation binding the contract event 0x36c5f9c4314e16078da10914c2c4431b9ca89c620da3c581bb73d402a01da06d.
//
// Solidity: event SetProviderGranularFee(address indexed provider, address indexed consumer, uint256 oldFee, uint256 newFee)
func (_OooRouter *OooRouterFilterer) WatchSetProviderGranularFee(opts *bind.WatchOpts, sink chan<- *OooRouterSetProviderGranularFee, provider []common.Address, consumer []common.Address) (event.Subscription, error) {

	var providerRule []interface{}
	for _, providerItem := range provider {
		providerRule = append(providerRule, providerItem)
	}
	var consumerRule []interface{}
	for _, consumerItem := range consumer {
		consumerRule = append(consumerRule, consumerItem)
	}

	logs, sub, err := _OooRouter.contract.WatchLogs(opts, "SetProviderGranularFee", providerRule, consumerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(OooRouterSetProviderGranularFee)
				if err := _OooRouter.contract.UnpackLog(event, "SetProviderGranularFee", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseSetProviderGranularFee is a log parse operation binding the contract event 0x36c5f9c4314e16078da10914c2c4431b9ca89c620da3c581bb73d402a01da06d.
//
// Solidity: event SetProviderGranularFee(address indexed provider, address indexed consumer, uint256 oldFee, uint256 newFee)
func (_OooRouter *OooRouterFilterer) ParseSetProviderGranularFee(log types.Log) (*OooRouterSetProviderGranularFee, error) {
	event := new(OooRouterSetProviderGranularFee)
	if err := _OooRouter.contract.UnpackLog(event, "SetProviderGranularFee", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// OooRouterSetProviderMinFeeIterator is returned from FilterSetProviderMinFee and is used to iterate over the raw logs and unpacked data for SetProviderMinFee events raised by the OooRouter contract.
type OooRouterSetProviderMinFeeIterator struct {
	Event *OooRouterSetProviderMinFee // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *OooRouterSetProviderMinFeeIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(OooRouterSetProviderMinFee)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(OooRouterSetProviderMinFee)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *OooRouterSetProviderMinFeeIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *OooRouterSetProviderMinFeeIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// OooRouterSetProviderMinFee represents a SetProviderMinFee event raised by the OooRouter contract.
type OooRouterSetProviderMinFee struct {
	Provider  common.Address
	OldMinFee *big.Int
	NewMinFee *big.Int
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterSetProviderMinFee is a free log retrieval operation binding the contract event 0xdd72a509f9596098442d5d8b5404752e038a5c99e14fe53b8a285f15cc20e757.
//
// Solidity: event SetProviderMinFee(address indexed provider, uint256 oldMinFee, uint256 newMinFee)
func (_OooRouter *OooRouterFilterer) FilterSetProviderMinFee(opts *bind.FilterOpts, provider []common.Address) (*OooRouterSetProviderMinFeeIterator, error) {

	var providerRule []interface{}
	for _, providerItem := range provider {
		providerRule = append(providerRule, providerItem)
	}

	logs, sub, err := _OooRouter.contract.FilterLogs(opts, "SetProviderMinFee", providerRule)
	if err != nil {
		return nil, err
	}
	return &OooRouterSetProviderMinFeeIterator{contract: _OooRouter.contract, event: "SetProviderMinFee", logs: logs, sub: sub}, nil
}

// WatchSetProviderMinFee is a free log subscription operation binding the contract event 0xdd72a509f9596098442d5d8b5404752e038a5c99e14fe53b8a285f15cc20e757.
//
// Solidity: event SetProviderMinFee(address indexed provider, uint256 oldMinFee, uint256 newMinFee)
func (_OooRouter *OooRouterFilterer) WatchSetProviderMinFee(opts *bind.WatchOpts, sink chan<- *OooRouterSetProviderMinFee, provider []common.Address) (event.Subscription, error) {

	var providerRule []interface{}
	for _, providerItem := range provider {
		providerRule = append(providerRule, providerItem)
	}

	logs, sub, err := _OooRouter.contract.WatchLogs(opts, "SetProviderMinFee", providerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(OooRouterSetProviderMinFee)
				if err := _OooRouter.contract.UnpackLog(event, "SetProviderMinFee", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseSetProviderMinFee is a log parse operation binding the contract event 0xdd72a509f9596098442d5d8b5404752e038a5c99e14fe53b8a285f15cc20e757.
//
// Solidity: event SetProviderMinFee(address indexed provider, uint256 oldMinFee, uint256 newMinFee)
func (_OooRouter *OooRouterFilterer) ParseSetProviderMinFee(log types.Log) (*OooRouterSetProviderMinFee, error) {
	event := new(OooRouterSetProviderMinFee)
	if err := _OooRouter.contract.UnpackLog(event, "SetProviderMinFee", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// OooRouterTokenSetIterator is returned from FilterTokenSet and is used to iterate over the raw logs and unpacked data for TokenSet events raised by the OooRouter contract.
type OooRouterTokenSetIterator struct {
	Event *OooRouterTokenSet // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *OooRouterTokenSetIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(OooRouterTokenSet)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(OooRouterTokenSet)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *OooRouterTokenSetIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *OooRouterTokenSetIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// OooRouterTokenSet represents a TokenSet event raised by the OooRouter contract.
type OooRouterTokenSet struct {
	TokenAddress common.Address
	Raw          types.Log // Blockchain specific contextual infos
}

// FilterTokenSet is a free log retrieval operation binding the contract event 0xa07c91c183e42229e705a9795a1c06d76528b673788b849597364528c96eefb7.
//
// Solidity: event TokenSet(address tokenAddress)
func (_OooRouter *OooRouterFilterer) FilterTokenSet(opts *bind.FilterOpts) (*OooRouterTokenSetIterator, error) {

	logs, sub, err := _OooRouter.contract.FilterLogs(opts, "TokenSet")
	if err != nil {
		return nil, err
	}
	return &OooRouterTokenSetIterator{contract: _OooRouter.contract, event: "TokenSet", logs: logs, sub: sub}, nil
}

// WatchTokenSet is a free log subscription operation binding the contract event 0xa07c91c183e42229e705a9795a1c06d76528b673788b849597364528c96eefb7.
//
// Solidity: event TokenSet(address tokenAddress)
func (_OooRouter *OooRouterFilterer) WatchTokenSet(opts *bind.WatchOpts, sink chan<- *OooRouterTokenSet) (event.Subscription, error) {

	logs, sub, err := _OooRouter.contract.WatchLogs(opts, "TokenSet")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(OooRouterTokenSet)
				if err := _OooRouter.contract.UnpackLog(event, "TokenSet", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseTokenSet is a log parse operation binding the contract event 0xa07c91c183e42229e705a9795a1c06d76528b673788b849597364528c96eefb7.
//
// Solidity: event TokenSet(address tokenAddress)
func (_OooRouter *OooRouterFilterer) ParseTokenSet(log types.Log) (*OooRouterTokenSet, error) {
	event := new(OooRouterTokenSet)
	if err := _OooRouter.contract.UnpackLog(event, "TokenSet", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// OooRouterWithdrawFeesIterator is returned from FilterWithdrawFees and is used to iterate over the raw logs and unpacked data for WithdrawFees events raised by the OooRouter contract.
type OooRouterWithdrawFeesIterator struct {
	Event *OooRouterWithdrawFees // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *OooRouterWithdrawFeesIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(OooRouterWithdrawFees)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(OooRouterWithdrawFees)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *OooRouterWithdrawFeesIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *OooRouterWithdrawFeesIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// OooRouterWithdrawFees represents a WithdrawFees event raised by the OooRouter contract.
type OooRouterWithdrawFees struct {
	Provider  common.Address
	Recipient common.Address
	Amount    *big.Int
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterWithdrawFees is a free log retrieval operation binding the contract event 0x4f1b51dd7a2fcb861aa2670f668be66835c4ee12b4bbbf037e4d0018f39819e4.
//
// Solidity: event WithdrawFees(address indexed provider, address indexed recipient, uint256 amount)
func (_OooRouter *OooRouterFilterer) FilterWithdrawFees(opts *bind.FilterOpts, provider []common.Address, recipient []common.Address) (*OooRouterWithdrawFeesIterator, error) {

	var providerRule []interface{}
	for _, providerItem := range provider {
		providerRule = append(providerRule, providerItem)
	}
	var recipientRule []interface{}
	for _, recipientItem := range recipient {
		recipientRule = append(recipientRule, recipientItem)
	}

	logs, sub, err := _OooRouter.contract.FilterLogs(opts, "WithdrawFees", providerRule, recipientRule)
	if err != nil {
		return nil, err
	}
	return &OooRouterWithdrawFeesIterator{contract: _OooRouter.contract, event: "WithdrawFees", logs: logs, sub: sub}, nil
}

// WatchWithdrawFees is a free log subscription operation binding the contract event 0x4f1b51dd7a2fcb861aa2670f668be66835c4ee12b4bbbf037e4d0018f39819e4.
//
// Solidity: event WithdrawFees(address indexed provider, address indexed recipient, uint256 amount)
func (_OooRouter *OooRouterFilterer) WatchWithdrawFees(opts *bind.WatchOpts, sink chan<- *OooRouterWithdrawFees, provider []common.Address, recipient []common.Address) (event.Subscription, error) {

	var providerRule []interface{}
	for _, providerItem := range provider {
		providerRule = append(providerRule, providerItem)
	}
	var recipientRule []interface{}
	for _, recipientItem := range recipient {
		recipientRule = append(recipientRule, recipientItem)
	}

	logs, sub, err := _OooRouter.contract.WatchLogs(opts, "WithdrawFees", providerRule, recipientRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(OooRouterWithdrawFees)
				if err := _OooRouter.contract.UnpackLog(event, "WithdrawFees", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseWithdrawFees is a log parse operation binding the contract event 0x4f1b51dd7a2fcb861aa2670f668be66835c4ee12b4bbbf037e4d0018f39819e4.
//
// Solidity: event WithdrawFees(address indexed provider, address indexed recipient, uint256 amount)
func (_OooRouter *OooRouterFilterer) ParseWithdrawFees(log types.Log) (*OooRouterWithdrawFees, error) {
	event := new(OooRouterWithdrawFees)
	if err := _OooRouter.contract.UnpackLog(event, "WithdrawFees", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
