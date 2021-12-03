require("dotenv").config()

const DemoConsumer = artifacts.require("DemoConsumer2")
const Router = artifacts.require("Router")

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const args = process.argv.slice(4)

const base = args[0] || "ETH"
const target = args[1] || "GBP"
const qType = args[2] || "PR"
const sType = args[3] || "AVC"
const qTime = args[4] || "24H"

module.exports = async function (callback) {
  const demoConsumer = await DemoConsumer.deployed()
  const accounts = await web3.eth.getAccounts()
  const router = await Router.deployed()
  const consumerOwner = accounts[0]
  const provider = accounts[3]

  let receipt

  const pair = `${base}.${target}`
  let data = `${pair}.${qType}`

  if (qType === "PR") {
    data = `${data}.${sType}.${qTime}`
  }

  if (!data) {
    console.log("invalid query?")
    callback()
  }

  const endpoint = web3.utils.asciiToHex(data)

  try {
    console.log("check fees on Router")
    const fee = await router.getProviderGranularFee(provider, demoConsumer.address)
    console.log("provider fee currently set at", fee.toString())

    console.log("check fees in demoConsumer")
    const currentFee = await demoConsumer.fee()
    console.log("current fee in demoConsumer contract", currentFee.toString())

    if (fee.toString() !== currentFee.toString()) {
      // set new fee
      console.log("provider fee changed. Update demoConsumer contract")
      receipt = await demoConsumer.setFee(fee, { from: consumerOwner })
      console.log("tx hash", receipt.tx)
    }

    const priceBefore = await demoConsumer.getPrice(pair)
    console.log("price before", pair, priceBefore.toString())

    console.log("requesting", data)
    receipt = await demoConsumer.requestData(endpoint, pair, { from: consumerOwner })
    console.log("tx hash", receipt.tx)
    const requestId = receipt.receipt.rawLogs[2].topics[3]
    console.log("requestId", requestId)

    console.log("waiting for fulfilment. This may take 3 - 4 blocks.")
    for (let i = 0; i <= 1000; i += 1) {
      if (i % 10 === 0 && i > 1) {
        console.log("checking status")
        const status = await router.getRequestStatus(requestId)
        const statusInt = parseInt(status, 10)
        const statusTxt = statusInt === 1 ? "requested" : "fulfilled"
        console.log("status:", statusTxt)
        if (statusInt !== 1) {
          console.log("get updated price")
          const priceAfter = await demoConsumer.getPrice(pair)
          console.log(
            "price before",
            pair,
            priceBefore.toString(),
            web3.utils.fromWei(priceBefore.toString()),
          )
          console.log("price after ", pair, priceAfter.toString(), web3.utils.fromWei(priceAfter.toString()))
          break
        }
      }
      process.stdout.write(".")
      await sleep(500)
    }
  } catch (error) {
    console.log(error)
    callback()
  }

  callback()
}
