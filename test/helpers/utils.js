const { BN } = require("@openzeppelin/test-helpers")

const signData = async function (reqId, priceToSend, consumerContractAddress, providerPk) {
  const msg = generateSigMsg(reqId, priceToSend, consumerContractAddress)
  return web3.eth.accounts.sign(msg, providerPk)
}

const generateSigMsg = function (requestId, data, consumerAddress) {
  return web3.utils.soliditySha3(
    { type: "bytes32", value: requestId },
    { type: "uint256", value: data },
    { type: "address", value: consumerAddress },
  )
}

const getReqIdFromReceipt = function (receipt) {
  for (let i = 0; i < receipt.logs.length; i += 1) {
    const log = receipt.logs[i]
    if (
      log.event === "DataRequestSubmitted" ||
      log.event === "DataRequested" ||
      log.event === "RequestedSomeData"
    ) {
      return log.args.requestId
    }
  }
  return null
}

const generateRequestId = function (consumerAddress, dataProvider, routerAddress, requestNonce, endpoint) {
  return web3.utils.soliditySha3(
    { type: "address", value: consumerAddress },
    { type: "address", value: dataProvider },
    { type: "address", value: routerAddress },
    { type: "uint256", value: requestNonce.toNumber() },
    { type: "bytes32", value: endpoint },
  )
}

const calculateCost = async function (receipts, value) {
  let totalCost = new BN(value)

  for (let i = 0; i < receipts.length; i += 1) {
    const r = receipts[i]
    const { gasUsed } = r.receipt
    const tx = await web3.eth.getTransaction(r.tx)
    const { gasPrice } = tx
    const gasCost = new BN(gasPrice).mul(new BN(gasUsed))
    totalCost = totalCost.add(gasCost)
  }

  return totalCost
}

const dumpReceiptGasInfo = async function (receipt, gasPrice, dumpAll = true) {
  let refundAmount = new BN(0)
  const gasPriceGwei = gasPrice * 10 ** 9
  console.log("gasPrice", gasPrice)
  console.log("gasPriceGwei", gasPriceGwei)
  console.log(receipt.receipt.gasUsed, "(gasUsed)")
  console.log(receipt.receipt.cumulativeGasUsed, "(cumulativeGasUsed)")

  if (dumpAll) {
    const actualSpent = await calculateCost([receipt], 0)

    for (let i = 0; i < receipt.receipt.logs.length; i += 1) {
      const log = receipt.receipt.logs[i]
      if (log.event === "GasRefundedToProvider") {
        refundAmount = log.args.amount
      }
    }
    const diff = refundAmount.sub(actualSpent)
    console.log(refundAmount.toString(), "(refund amount in wei)")
    console.log(actualSpent.toString(), "(actualSpent in wei)")
    console.log(diff.toString(), "(diff in wei)")

    console.log(web3.utils.fromWei(refundAmount), "(refund amount in ETH)")
    console.log(web3.utils.fromWei(actualSpent), "(actualSpent in ETH)")
    console.log(web3.utils.fromWei(diff), "(diff in ETH)")

    const diffGwei = web3.utils.fromWei(diff, "gwei")
    console.log(diffGwei.toString(), "(diff in gwei)")
    const gasDiff = new BN(diffGwei.toString()).div(new BN(String(gasPrice)))
    console.log(gasDiff.toString(), "(gasDiff)")
  }
}

const estimateGasDiff = async function (receipt, gasPrice) {
  let refundAmount = new BN(0)
  const actualSpent = await calculateCost([receipt], 0)

  for (let i = 0; i < receipt.receipt.logs.length; i += 1) {
    const log = receipt.receipt.logs[i]
    if (log.event === "GasRefundedToProvider") {
      refundAmount = log.args.amount
    }
  }

  const diff = refundAmount.sub(actualSpent)
  const diffGwei = web3.utils.fromWei(diff, "gwei")
  const gasDiff = new BN(diffGwei.toString()).div(new BN(String(gasPrice)))
  return gasDiff
}

const randomPrice = function () {
  const rand = Math.floor(Math.random() * 999999999) + 1
  return web3.utils.toWei(String(rand), "ether")
}

const randomGasPrice = function (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const sleepFor = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

module.exports = {
  signData,
  generateSigMsg,
  getReqIdFromReceipt,
  generateRequestId,
  calculateCost,
  dumpReceiptGasInfo,
  estimateGasDiff,
  randomPrice,
  randomGasPrice,
  sleepFor,
}
