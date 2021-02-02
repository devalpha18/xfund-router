const arg = require("arg")
const fs = require('fs')

const args = arg({
  // Types
  "--contract": String, // defaults to Router for provider .env output
  "--network": String, // defaults to dev (5777)
  "--what": String, // Default env. env = Router ABI & deployed address. addr = deployed addresses

  // Aliases
  "-c": "--contract",
  "-n": "--network",
  "-w": "--what",
})

const getNetwork = (network) => {
  switch(network) {
    case "rinkeby":
      return 4
    case "dev":
    default:
      return 5777
    case "mainnet":
      return 1
  }
}

const getAbiAndAddressForEnv = (contract, network) => {
  if (!contract) throw new Error('missing required argument: --contract');
  const contractLocation = `build/contracts/${contract}.json`
  const networkId = getNetwork(network)
  fs.readFile(contractLocation, (err, data) => {
    if (err) throw err
    const contractJson = JSON.parse(data)
    const abi = contractJson.abi
    const address = contractJson.networks[networkId].address
    console.log(`CONTRACT_ABI=${JSON.stringify(abi)}`)
    console.log(`CONTRACT_ADDRESS=${address}`)
    console.log(`Contract: ${contract}`)
    console.log(`Network: ${network} (${networkId})`)
  })
}

const getDeployedAddresses = (network) => {
  const networkId = getNetwork(network)
  const contracts = [
    "MockToken",
    "Router",
    "ConsumerLib",
  ]
  console.log(`Network: ${network} (${networkId})`)
  for(let i = 0; i < contracts.length; i += 1) {
    const contract = contracts[i]
    const contractLocation = `build/contracts/${contract}.json`
    fs.readFile(contractLocation, (err, data) => {
      if (err) throw err
      const contractJson = JSON.parse(data)
      const address = contractJson.networks[networkId].address
      console.log(`${contract}=${address}`)
    })
  }
}

const run = () => {
  const contract = args["--contract"] || "Router"
  const network = args["--network"] || "dev"
  const what = args["--what"] || "env"

  switch(what) {
    case "env":
    default:
      getAbiAndAddressForEnv(contract, network)
      break
    case "addr":
      getDeployedAddresses(network)
      break
  }
}

try {
  run()
} catch (err) {
  console.log(err.toString())
}