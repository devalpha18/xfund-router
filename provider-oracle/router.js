require("dotenv").config()
const HDWalletProvider = require("@truffle/hdwallet-provider")
const BN = require("bn.js")
const Web3 = require("web3")
const Web3WsProvider = require("web3-providers-ws")

const {
  CONTRACT_ABI,
  CONTRACT_ADDRESS,
  WALLET_PKEY,
  WALLET_ADDRESS,
  WEB3_PROVIDER_HTTP,
  WEB3_PROVIDER_WS,
  MIN_FEE,
  MAX_GAS,
  MAX_GAS_PRICE,
} = process.env

class XFUNDRouter {
  async initWeb3() {
    console.log(new Date(), "init contractHttp")
    this.providerHttp = new HDWalletProvider(WALLET_PKEY, WEB3_PROVIDER_HTTP)
    this.web3Http = await new Web3(this.providerHttp)
    this.contractHttp = await new this.web3Http.eth.Contract(JSON.parse(CONTRACT_ABI), CONTRACT_ADDRESS)

    console.log(new Date(), "init contractWs")

    const wsOptions = {
      timeout: 30000, // ms
      clientConfig: {
        // Useful to keep a connection alive
        keepalive: true,
        keepaliveInterval: 60000, // ms
      },

      // Enable auto reconnection
      reconnect: {
        auto: true,
        delay: 5000, // ms
        maxAttempts: 5,
        onTimeout: false,
      },
    }

    console.log(new Date(), "wsOptions", wsOptions)

    this.providerWs = new Web3WsProvider(WEB3_PROVIDER_WS, wsOptions)
    this.web3Ws = new Web3(this.providerWs)
    this.contractWs = await new this.web3Ws.eth.Contract(JSON.parse(CONTRACT_ABI), CONTRACT_ADDRESS)
    console.log("Web3 initialised")
  }

  setCurrentBlock(height) {
    this.currentBlock = parseInt(height, 10)
  }

  async signData(reqId, priceToSend, consumerContractAddress) {
    const msg = XFUNDRouter.generateSigMsg(reqId, priceToSend, consumerContractAddress)
    return this.web3Http.eth.accounts.sign(msg, WALLET_PKEY)
  }

  static generateSigMsg(requestId, data, consumerAddress) {
    return Web3.utils.soliditySha3(
      { type: "bytes32", value: requestId },
      { type: "uint256", value: data },
      { type: "address", value: consumerAddress },
    )
  }

  async setProviderPaysGas(providerPays) {
    await this.contractHttp.methods
      .setProviderPaysGas(providerPays)
      .send({ from: WALLET_ADDRESS })
      .on("transactionHash", function onTransactionHash(txHash) {
        console.log(new Date(), "Tx sent", txHash)
      })
      .on("error", function onError(err) {
        console.log(new Date(), "Failed", err)
      })
  }

  async fulfillRequest(requestId, priceToSend, consumerContractAddress) {
    const sig = await this.signData(requestId, priceToSend, consumerContractAddress)
    const self = this
    const gasPrice = await this.web3Http.eth.getGasPrice()

    return new Promise((resolve, reject) => {
      this.contractHttp.methods
        .fulfillRequest(requestId, priceToSend, sig.signature)
        .estimateGas({ from: WALLET_ADDRESS })
        .then(function onEstimateGas(gasAmount) {
          const cappedGasAmount = Math.min(gasAmount, MAX_GAS)
          const cappedGasPrice = BN.min(new BN(gasPrice), new BN(1e9).muln(Number(MAX_GAS_PRICE)))
          console.log(new Date(), "gas estimate:", cappedGasAmount)
          console.log(new Date(), "gas price:", cappedGasPrice.toString())
          self.contractHttp.methods
            .fulfillRequest(requestId, priceToSend, sig.signature)
            .send({ from: WALLET_ADDRESS, gas: cappedGasAmount, gasPrice: cappedGasPrice.toString() })
            .on("transactionHash", function onTransactionHash(txHash) {
              resolve(txHash)
            })
            .on("error", function onError(err) {
              reject(err)
            })
        })
        .catch(function onCatch(err) {
          reject(err)
        })
    })
  }

  async getRequestExists(requestId) {
    return new Promise((resolve, reject) => {
      this.contractHttp.methods.requestExists(requestId).call(function onCall(error, result) {
        if (!error) {
          resolve(result)
        } else {
          reject(error)
        }
      })
    })
  }

  async watchBlocks(cb = function () {}) {
    console.log(new Date(), "running block watcher")
    const self = this
    this.web3Ws.eth
      .subscribe("newBlockHeaders")
      .on("connected", function newBlockHeadersConnected(subscriptionId) {
        console.log(new Date(), "watchBlocks newBlockHeaders connected", subscriptionId)
      })
      .on("data", function newBlockHeadersRecieved(blockHeader) {
        console.log(new Date(), "watchBlocks got block", blockHeader.number)
        self.setCurrentBlock(blockHeader.number)
        cb(blockHeader, null)
      })
      .on("error", function newBlockHeadersError(error) {
        cb(null, error)
      })
  }

  async watchEvent(eventName, fromBlock = 0, cb = function () {}) {
    console.log(new Date(), "running watcher for", eventName)

    this.contractWs.events[eventName]({
      fromBlock,
    })
      .on("connected", function onWatchEventConnected(subscriptionId) {
        console.log(new Date(), "watchEvent", eventName, "connected", subscriptionId)
      })
      .on("data", async function onWatchEvent(event) {
        cb(event, null)
      })
      .on("error", function onWatchEventError(error) {
        cb(null, error)
      })
  }

  async getBlockNumber() {
    return this.web3Http.eth.getBlockNumber()
  }

  async getTransactionReceipt(txHash) {
    return this.web3Http.eth.getTransactionReceipt(txHash)
  }

  async getTransaction(txHash) {
    return this.web3Http.eth.getTransaction(txHash)
  }

  async getPastEvents(fromBlock, toBlock, eventName, cb = function () {}) {
    await this.contractHttp.getPastEvents(
      eventName,
      {
        fromBlock,
        toBlock,
      },
      function onGotEvents(error, events) {
        cb(events, error)
      },
    )
  }

  async searchEventsForRequest(fromBlock, toBlock, eventName, requestId) {
    return new Promise((resolve, reject) => {
      this.contractHttp.getPastEvents(
        eventName,
        {
          fromBlock,
          toBlock,
          filter: { requestId },
        },
        function onGotEvents(error, events) {
          if (error) {
            reject(error)
          } else {
            resolve(events)
          }
        },
      )
    })
  }

  async isValidDataRequest(eventEmitted) {
    if (!eventEmitted) {
      console.log(new Date(), "no event...")
      return false
    }

    const { provider } = eventEmitted.returnValues
    const { requestId } = eventEmitted.returnValues

    // check it's for us
    if (Web3.utils.toChecksumAddress(provider) !== Web3.utils.toChecksumAddress(process.env.WALLET_ADDRESS)) {
      console.log(new Date(), "request", requestId, "not for me (for ", provider, ")")
      return false
    }

    // check request ID exists (has not been fulfiled etc.)
    const requestExists = await this.getRequestExists(requestId)
    if (!requestExists) {
      console.log(new Date(), "request", requestId, "does not exist. Perhaps already processed")
      return false
    }

    return true
  }
}

module.exports = {
  XFUNDRouter,
}
