require("dotenv").config()
const HDWalletProvider = require("@truffle/hdwallet-provider")
const Web3 = require("web3")

const {
  CONTRACT_ABI,
  CONTRACT_ADDRESS,
  WALLET_PKEY,
  WALLET_ADDRESS,
  WEB3_PROVIDER_HTTP,
  WEB3_PROVIDER_WS,
} = process.env

const signData = async function(reqId, priceToSend, consumerContractAddress, web3) {
  const msg = generateSigMsg(reqId, priceToSend, consumerContractAddress)
  return web3.eth.accounts.sign(msg, WALLET_PKEY)
}

const generateSigMsg = function(requestId, data, consumerAddress) {
  return Web3.utils.soliditySha3(
    { 'type': 'bytes32', 'value': requestId},
    { 'type': 'uint256', 'value': data},
    { 'type': 'address', 'value': consumerAddress}
  )
}

const setProviderPaysGas = async (providerPays) => {
  const provider = new HDWalletProvider(WALLET_PKEY, WEB3_PROVIDER_HTTP)
  const web3 = new Web3(provider)
  const contract = new web3.eth.Contract(JSON.parse(CONTRACT_ABI), CONTRACT_ADDRESS)

  await contract.methods
    .setProviderPaysGas(providerPays)
    .send({ from: WALLET_ADDRESS })
    .on("transactionHash", function (txHash) {
      console.log(new Date(), "Tx sent", txHash)
    })
    .on("error", function (err) {
      console.log(new Date(), "Failed", err)
    })
}

const fulfillRequest = async (requestId, priceToSend, consumerContractAddress, gasPriceWei) => {
  const provider = new HDWalletProvider(WALLET_PKEY, WEB3_PROVIDER_HTTP)
  const web3 = new Web3(provider)
  const contract = new web3.eth.Contract(JSON.parse(CONTRACT_ABI), CONTRACT_ADDRESS)

  const sig = await signData( requestId, priceToSend, consumerContractAddress, web3 )

  // wrap in Promise and return
  return new Promise((resolve, reject) => {
    contract.methods
      .fulfillRequest(requestId, priceToSend, sig.signature)
      .send({ from: WALLET_ADDRESS, gasPrice: gasPriceWei })
      .on("transactionHash", function (txHash) {
        resolve(txHash)
      })
      .on("error", function (err) {
        reject(err)
      })
  })
}

const getRequestExists = async (requestId) => {
  const web3 = new Web3(WEB3_PROVIDER_HTTP)
  const contract = new web3.eth.Contract(JSON.parse(CONTRACT_ABI), CONTRACT_ADDRESS)
  return new Promise((resolve, reject) => {
    contract.methods.requestExists(requestId).call(function (error, result) {
      if (!error) {
        resolve(result)
      } else {
        reject(error)
      }
    })
  })
}

const watchBlocks = async (cb = function () {}) => {
  const web3Ws = new Web3(WEB3_PROVIDER_WS)

  console.log(new Date(), "running block watcher")
  web3Ws.eth
    .subscribe("newBlockHeaders")
    .on("connected", function newBlockHeadersConnected(subscriptionId) {
      console.log(new Date(), "newBlockHeaders connected", subscriptionId)
    })
    .on("data", function newBlockHeadersRecieved(blockHeader) {
      cb(blockHeader, null)
    })
    .on("error", function newBlockHeadersError(error) {
      cb(null, error)
    })
}

const watchEvent = async (eventName, fromBlock = 0, cb = function () {}) => {
  const web3Ws = new Web3(
    new Web3.providers.WebsocketProvider(WEB3_PROVIDER_WS, {
      clientOptions: {
        maxReceivedFrameSize: 100000000,
        maxReceivedMessageSize: 100000000,
      },
    }),
  )
  const watchContract = await new web3Ws.eth.Contract(JSON.parse(CONTRACT_ABI), CONTRACT_ADDRESS)

  // keep ws connection alive
  console.log(new Date(), "running watcher")
  web3Ws.eth
    .subscribe("newBlockHeaders")
    .on("connected", function newBlockHeadersConnected(subscriptionId) {
      console.log(new Date(), "newBlockHeaders connected", subscriptionId)
    })
    .on("data", function newBlockHeadersRecieved(blockHeader) {
      console.log(new Date(), "got block", blockHeader.number)
    })
    .on("error", function newBlockHeadersError(error) {
      console.error(new Date(), "ERROR:")
      console.error(error)
    })

  watchContract.events[eventName]({
    fromBlock,
  })
    .on("data", async function onCurrencyUpdateEvent(event) {
      cb(event, null)
    })
    .on("error", function onCurrencyUpdateError(error) {
      cb(null, error)
    })
}

const getBlockNumber = async () => {
  const web3 = new Web3(WEB3_PROVIDER_HTTP)
  return web3.eth.getBlockNumber()
}

const getPastEvents = async (fromBlock, toBlock, eventName, cb = function () {}) => {
  const web3 = new Web3(WEB3_PROVIDER_HTTP)
  const contract = await new web3.eth.Contract(JSON.parse(CONTRACT_ABI), CONTRACT_ADDRESS)
  await contract.getPastEvents(
    eventName,
    {
      fromBlock,
      toBlock,
    },
    function (error, events) {
      cb(events, error)
    },
  )
}

module.exports = {
  setProviderPaysGas,
  getBlockNumber,
  getPastEvents,
  getRequestExists,
  fulfillRequest,
  watchBlocks,
  watchEvent,
}
