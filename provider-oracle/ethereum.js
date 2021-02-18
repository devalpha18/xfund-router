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

let providerHttp
let web3Http
let contractHttp
let web3Ws
let contractWs

const initWeb3 = async() => {
  if(!contractHttp) {
    console.log(new Date(), "init contractHttp")
    providerHttp = new HDWalletProvider(WALLET_PKEY, WEB3_PROVIDER_HTTP)
    web3Http = await new Web3(providerHttp)
    contractHttp = await new web3Http.eth.Contract(JSON.parse(CONTRACT_ABI), CONTRACT_ADDRESS)
  }

  if(!contractWs) {
    console.log(new Date(), "init contractWs")
    web3Ws = new Web3(
      new Web3.providers.WebsocketProvider(WEB3_PROVIDER_WS, {
        clientOptions: {
          maxReceivedFrameSize: 100000000,
          maxReceivedMessageSize: 100000000,
        },
        reconnect: {
          auto: true,
          delay: 5000, // ms
          maxAttempts: 5,
          onTimeout: false,
        },
      }),
    )
    contractWs = await new web3Ws.eth.Contract(JSON.parse(CONTRACT_ABI), CONTRACT_ADDRESS)
  }
}

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
  await contractHttp.methods
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
  await initWeb3()
  const sig = await signData( requestId, priceToSend, consumerContractAddress, web3Http )

  return new Promise( ( resolve, reject ) => {
    contractHttp.methods
      .fulfillRequest( requestId, priceToSend, sig.signature )
      .estimateGas( { from: WALLET_ADDRESS, gasPrice: gasPriceWei } )
      .then(function(gasAmount){
        console.log("gas estimate:", gasAmount)
        contractHttp.methods
          .fulfillRequest( requestId, priceToSend, sig.signature )
          .send( { from: WALLET_ADDRESS, gasPrice: gasPriceWei } )
          .on( "transactionHash", function ( txHash ) {
            resolve( txHash )
          } )
          .on( "error", function ( err ) {
            reject( err )
          } )
      })
      .catch(function(err){
        reject( err )
      })
  } )
}

const getRequestExists = async (requestId) => {
  await initWeb3()
  return new Promise((resolve, reject) => {
    contractHttp.methods.requestExists(requestId).call(function (error, result) {
      if (!error) {
        resolve(result)
      } else {
        reject(error)
      }
    })
  })
}

const watchBlocks = async (cb = function () {}) => {
  await initWeb3()
  console.log(new Date(), "running block watcher")
  web3Ws.eth
    .subscribe("newBlockHeaders")
    .on("connected", function newBlockHeadersConnected(subscriptionId) {
      console.log(new Date(), "watchBlocks newBlockHeaders connected", subscriptionId)
    })
    .on("data", function newBlockHeadersRecieved(blockHeader) {
      console.log(new Date(), "watchBlocks got block", blockHeader.number)
      cb(blockHeader, null)
    })
    .on("error", function newBlockHeadersError(error) {
      cb(null, error)
    })
}

const watchEvent = async (eventName, fromBlock = 0, cb = function () {}) => {
  await initWeb3()
  console.log(new Date(), "running watcher for", eventName)

  contractWs.events[eventName]({
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
  await initWeb3()
  const web3 = new Web3(WEB3_PROVIDER_HTTP)
  return web3.eth.getBlockNumber()
}

const getPastEvents = async (fromBlock, toBlock, eventName, cb = function () {}) => {
  await initWeb3()
  await contractHttp.getPastEvents(
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
