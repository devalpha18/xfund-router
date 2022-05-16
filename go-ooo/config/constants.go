package config

const JobsOooApiUrl = "jobs.ooo_api_url"
const JobsCheckDuration = "jobs.check_duration"
const JobsWaitConfirmations = "jobs.wait_confirmations"

const ServeHost = "serve.host"
const ServePort = "serve.port"

const KeystorageFile = "keystorage.file"
const KeystorageAccount = "keystorage.account"

const ChainGasLimit = "chain.gas_limit"
const ChainMaxGasPrice = "chain.max_gas_price"
const ChainContractAddress = "chain.contract_address"
const ChainEthHttpHost = "chain.eth_http_host"
const ChainEthWsHost = "chain.eth_ws_host"
const ChainNetworkId = "chain.network_id"
const ChainFirstBlock = "chain.first_block"

const DatabaseDialect = "database.dialect"
const DatabaseStorage = "database.storage"
const DatabaseHost = "database.host"
const DatabasePort = "database.port"
const DatabaseUser = "database.user"
const DatabasePassword = "database.password"
const DatabaseDatabase = "database.database"

const PrometheusPort = "prometheus.port"

const LogLevel = "log.level"

// SubChainEthHttpRpc only used to get the latest block number
const SubChainEthHttpRpc = "subchain.eth_http_rpc"

// SubChainPolygonHttpRpc only used to get the latest block number
const SubChainPolygonHttpRpc = "subchain.polygon_http_rpc"

// SubChainBcsHttpRpc only used to get the latest block number
const SubChainBcsHttpRpc = "subchain.bsc_http_rpc"
