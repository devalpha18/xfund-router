package chain

import (
	"fmt"
	"github.com/ethereum/go-ethereum/common"
	"github.com/sirupsen/logrus"
	go_ooo_types "go-ooo/types"
	"math/big"
)

func (o *OoORouterService) ProcessAdminTask(task go_ooo_types.AdminTask) go_ooo_types.AdminTaskResponse {

	err := o.RenewTransactOpts()
	if err != nil {
		o.logger.WithFields(logrus.Fields{
			"package":  "chain",
			"function": "ProcessAdminTask",
			"action": "RenewTransactOpts",
		}).Error(err.Error())
		return go_ooo_types.AdminTaskResponse{
			AdminTask: task,
			Success: false,
			Error: err.Error(),
		}
	}

	switch task.Task {
	case "register":
		return o.registerAsProvider(task)
	case "set_fee":
		return o.setGlobalFee(task)
	case "set_granular_fee":
		return o.setGranularFee(task)
	case "withdraw":
		return o.withdraw(task)
	case "query_withdrawable":
		return o.queryWithdrawable(task)
	case "query_fees":
		return o.queryFees(task)
	case "query_granular_fees":
		return o.queryGranularFees(task)
	default:
		return go_ooo_types.AdminTaskResponse{
			AdminTask: task,
			Error: "unknown task",
		}
	}
}

func (o *OoORouterService) registerAsProvider(task go_ooo_types.AdminTask) go_ooo_types.AdminTaskResponse {

	var resp go_ooo_types.AdminTaskResponse
	resp.AdminTask = task

	fee := task.FeeOrAmount
	o.logger.WithFields(logrus.Fields{
		"package":  "chain",
		"function": "registerAsProvider",
		"address": o.oracleAddress.Hex(),
		"fee": fee,
	}).Debug("begin register as provider")

	tx, err := o.contractInstance.RegisterAsProvider(o.transactOpts, big.NewInt(int64(fee)))
	if err != nil {
		o.logger.WithFields(logrus.Fields{
			"package":  "chain",
			"function": "registerAsProvider",
		}).Error(err.Error())
		resp.Error = err.Error()
		resp.Success = false
	} else {
		o.logger.WithFields(logrus.Fields{
			"package":  "chain",
			"function": "registerAsProvider",
			"address": o.oracleAddress.Hex(),
			"tx": tx.Hash(),
		}).Info("register as provider tx sent")

		o.setNextTxNonce(tx.Nonce(), false)

		resp.Result = fmt.Sprintf("Sent! Tx Hash: %s", tx.Hash().String())
		resp.Success = true
	}

	return resp
}

func (o *OoORouterService) setGlobalFee(task go_ooo_types.AdminTask) go_ooo_types.AdminTaskResponse {

	var resp go_ooo_types.AdminTaskResponse
	resp.AdminTask = task

	fee := task.FeeOrAmount
	o.logger.WithFields(logrus.Fields{
		"package":  "chain",
		"function": "setGlobalFee",
		"address": o.oracleAddress.Hex(),
		"fee": fee,
	}).Debug("begin set global fee")

	tx, err := o.contractInstance.SetProviderMinFee(o.transactOpts, big.NewInt(int64(fee)))
	if err != nil {
		o.logger.WithFields(logrus.Fields{
			"package":  "chain",
			"function": "setGlobalFee",
			"address": o.oracleAddress.Hex(),
			"fee": fee,
		}).Error(err.Error())
		resp.Success = false
		resp.Error = err.Error()
	} else {
		o.logger.WithFields(logrus.Fields{
			"package":  "chain",
			"function": "setGlobalFee",
			"address": o.oracleAddress.Hex(),
			"fee": fee,
			"tx": tx.Hash(),
		}).Info("set global fee tx sent")

		resp.Result = fmt.Sprintf("Sent! Tx Hash: %s", tx.Hash().String())
		resp.Success = true
		o.setNextTxNonce(tx.Nonce(), false)
	}

	return resp
}

func (o *OoORouterService) setGranularFee(task go_ooo_types.AdminTask) go_ooo_types.AdminTaskResponse {

	var resp go_ooo_types.AdminTaskResponse
	resp.AdminTask = task

	fee := task.FeeOrAmount
	consumer := task.ToOrConsumer
	o.logger.WithFields(logrus.Fields{
		"package":  "chain",
		"function": "setGranularFee",
		"address": o.oracleAddress.Hex(),
		"fee": fee,
		"consumer": consumer,
	}).Debug("begin set granular fee")

	tx, err := o.contractInstance.SetProviderGranularFee(o.transactOpts, common.HexToAddress(consumer), big.NewInt(int64(fee)))
	if err != nil {
		o.logger.WithFields(logrus.Fields{
			"package":  "chain",
			"function": "setGranularFee",
			"address": o.oracleAddress.Hex(),
			"fee": fee,
			"consumer": consumer,
		}).Error(err.Error())
		resp.Error = err.Error()
		resp.Success = false
	} else {
		o.logger.WithFields(logrus.Fields{
			"package":  "chain",
			"function": "setGranularFee",
			"address": o.oracleAddress.Hex(),
			"fee": fee,
			"consumer": consumer,
			"tx": tx.Hash(),
		}).Info("set granular fee tx sent")

		resp.Result = fmt.Sprintf("Sent! Tx Hash: %s", tx.Hash().String())
		resp.Success = true
		o.setNextTxNonce(tx.Nonce(), false)
	}

	return resp
}

func (o *OoORouterService) withdraw(task go_ooo_types.AdminTask) go_ooo_types.AdminTaskResponse {
	var resp go_ooo_types.AdminTaskResponse
	resp.AdminTask = task

	amountBig := big.NewInt(0)
	amountBig = amountBig.SetUint64(task.FeeOrAmount)
	recipient := task.ToOrConsumer

	o.logger.WithFields(logrus.Fields{
		"package":  "chain",
		"function": "withdraw",
		"recipient": recipient,
		"amount": task.FeeOrAmount,
	}).Debug("begin withdraw fees")

	available, err := o.contractInstance.GetWithdrawableTokens(o.callOpts, o.oracleAddress)

	if err != nil {
		o.logger.WithFields(logrus.Fields{
			"package":  "chain",
			"function": "setGranularFee",
			"recipient": recipient,
			"amount": task.FeeOrAmount,
		}).Error(err.Error())
		resp.Error = err.Error()
		resp.Success = false
		return resp
	}

	if available.Cmp(amountBig) < 0 {
		resp.Error = fmt.Sprintf("cannot withdraw %s. Only %s available", amountBig.String(), available.String())
		resp.Success = false
		return resp
	}

	tx, err := o.contractInstance.Withdraw(o.transactOpts, common.HexToAddress(recipient), amountBig)
	if err != nil {
		o.logger.WithFields(logrus.Fields{
			"package":  "chain",
			"function": "withdraw",
			"recipient": recipient,
			"amount": task.FeeOrAmount,
		}).Error(err.Error())
		resp.Error = err.Error()
		resp.Success = false
	} else {
		o.logger.WithFields(logrus.Fields{
			"package":  "chain",
			"function": "withdraw",
			"recipient": recipient,
			"amount": task.FeeOrAmount,
			"tx": tx.Hash(),
		}).Info("withdraw tx sent")

		resp.Result = fmt.Sprintf("Sent! Tx Hash: %s", tx.Hash().String())
		resp.Success = true
		o.setNextTxNonce(tx.Nonce(), false)
	}

	return resp
}


func (o *OoORouterService) queryWithdrawable(task go_ooo_types.AdminTask) go_ooo_types.AdminTaskResponse {
	var resp go_ooo_types.AdminTaskResponse
	resp.AdminTask = task

	available, err := o.contractInstance.GetWithdrawableTokens(o.callOpts, o.oracleAddress)

	if err != nil {
		o.logger.WithFields(logrus.Fields{
			"package":  "chain",
			"function": "queryWithdrawable",
		}).Error(err.Error())
		resp.Error = err.Error()
		resp.Success = false
	} else {
		resp.Result = fmt.Sprintf("amount available: %s", available.String())
		resp.Success = true
	}

	return resp
}

func (o *OoORouterService) queryFees(task go_ooo_types.AdminTask) go_ooo_types.AdminTaskResponse {
	var resp go_ooo_types.AdminTaskResponse
	resp.AdminTask = task

	fee, err := o.contractInstance.GetProviderMinFee(o.callOpts, o.oracleAddress)

	if err != nil {
		o.logger.WithFields(logrus.Fields{
			"package":  "chain",
			"function": "queryFees",
		}).Error(err.Error())
		resp.Error = err.Error()
		resp.Success = false
	} else {
		resp.Result = fmt.Sprintf("global fee: %s", fee.String())
		resp.Success = true
	}

	return resp
}

func (o *OoORouterService) queryGranularFees(task go_ooo_types.AdminTask) go_ooo_types.AdminTaskResponse {
	var resp go_ooo_types.AdminTaskResponse
	resp.AdminTask = task

	fee, err := o.contractInstance.GetProviderGranularFee(o.callOpts, o.oracleAddress, common.HexToAddress(task.ToOrConsumer))

	if err != nil {
		o.logger.WithFields(logrus.Fields{
			"package":  "chain",
			"function": "queryGranularFees",
		}).Error(err.Error())
		resp.Error = err.Error()
		resp.Success = false
	} else {
		resp.Result = fmt.Sprintf("granular fee for %s: %s", task.ToOrConsumer, fee.String())
		resp.Success = true
	}

	return resp
}