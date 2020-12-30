# Data Request routing smart contract.


Routes requests for data from Consumers to authorised data providers.
Data providers listen for requests and process data, sending it back to the
Consumer's smart contract.

An ERC-20 Token fee is charged by the provider, and paid for by the consumer
The consumer is also responsible for reimbursing any Tx gas costs incurred
by the data provider for submitting the data to their smart contract (within
a reasonable limit)

This contract uses {AccessControl} to lock permissioned functions using the
different roles.

## Functions:
- [`constructor(address _token)`](#Router-constructor-address-)
- [`setGasTopUpLimit(uint256 _gasTopUpLimit)`](#Router-setGasTopUpLimit-uint256-)
- [`setProviderPaysGas(bool _providerPays)`](#Router-setProviderPaysGas-bool-)
- [`setProviderMinFee(uint256 _minFee)`](#Router-setProviderMinFee-uint256-)
- [`topUpGas(address _dataProvider)`](#Router-topUpGas-address-)
- [`withDrawGasTopUpForProvider(address _dataProvider)`](#Router-withDrawGasTopUpForProvider-address-)
- [`initialiseRequest(address payable _dataProvider, uint256 _fee, uint256 _requestNonce, uint256 _gasPrice, uint256 _expires, bytes32 _requestId, bytes32 _data, bytes4 _callbackFunctionSignature)`](#Router-initialiseRequest-address-payable-uint256-uint256-uint256-uint256-bytes32-bytes32-bytes4-)
- [`fulfillRequest(bytes32 _requestId, uint256 _requestedData, bytes _signature)`](#Router-fulfillRequest-bytes32-uint256-bytes-)
- [`cancelRequest(bytes32 _requestId)`](#Router-cancelRequest-bytes32-)
- [`grantProviderPermission(address _dataProvider)`](#Router-grantProviderPermission-address-)
- [`revokeProviderPermission(address _dataProvider)`](#Router-revokeProviderPermission-address-)
- [`providerIsAuthorised(address _dataConsumer, address _dataProvider)`](#Router-providerIsAuthorised-address-address-)
- [`getTokenAddress()`](#Router-getTokenAddress--)
- [`getDataRequestConsumer(bytes32 _requestId)`](#Router-getDataRequestConsumer-bytes32-)
- [`getDataRequestProvider(bytes32 _requestId)`](#Router-getDataRequestProvider-bytes32-)
- [`getDataRequestExpires(bytes32 _requestId)`](#Router-getDataRequestExpires-bytes32-)
- [`getDataRequestGasPrice(bytes32 _requestId)`](#Router-getDataRequestGasPrice-bytes32-)
- [`getGasTopUpLimit()`](#Router-getGasTopUpLimit--)
- [`requestExists(bytes32 _requestId)`](#Router-requestExists-bytes32-)
- [`getTotalGasDeposits()`](#Router-getTotalGasDeposits--)
- [`getGasDepositsForConsumer(address _dataConsumer)`](#Router-getGasDepositsForConsumer-address-)
- [`getGasDepositsForConsumerProviders(address _dataConsumer, address _dataProvider)`](#Router-getGasDepositsForConsumerProviders-address-address-)
- [`getProviderPaysGas(address _dataProvider)`](#Router-getProviderPaysGas-address-)
- [`getProviderMinFee(address _dataProvider)`](#Router-getProviderMinFee-address-)

## Events:
- [`DataRequested(address dataConsumer, address dataProvider, uint256 fee, bytes32 data, bytes32 requestId, uint256 gasPrice, uint256 expires)`](#Router-DataRequested-address-address-uint256-bytes32-bytes32-uint256-uint256-)
- [`GrantProviderPermission(address dataConsumer, address dataProvider)`](#Router-GrantProviderPermission-address-address-)
- [`RevokeProviderPermission(address dataConsumer, address dataProvider)`](#Router-RevokeProviderPermission-address-address-)
- [`RequestFulfilled(address dataConsumer, address dataProvider, bytes32 requestId, uint256 requestedData, address gasPayer)`](#Router-RequestFulfilled-address-address-bytes32-uint256-address-)
- [`RequestCancelled(address dataConsumer, address dataProvider, bytes32 requestId)`](#Router-RequestCancelled-address-address-bytes32-)
- [`TokenSet(address tokenAddress)`](#Router-TokenSet-address-)
- [`SetGasTopUpLimit(address sender, uint256 oldLimit, uint256 newLimit)`](#Router-SetGasTopUpLimit-address-uint256-uint256-)
- [`SetProviderPaysGas(address dataProvider, bool providerPays)`](#Router-SetProviderPaysGas-address-bool-)
- [`SetProviderMinFee(address dataProvider, uint256 minFee)`](#Router-SetProviderMinFee-address-uint256-)
- [`GasToppedUp(address dataConsumer, address dataProvider, uint256 amount)`](#Router-GasToppedUp-address-address-uint256-)
- [`GasWithdrawnByConsumer(address dataConsumer, address dataProvider, uint256 amount)`](#Router-GasWithdrawnByConsumer-address-address-uint256-)
- [`GasRefundedToProvider(address dataConsumer, address dataProvider, uint256 amount)`](#Router-GasRefundedToProvider-address-address-uint256-)

## Modifiers:
- [`onlyAdmin()`](#Router-onlyAdmin--)

### Function `constructor(address _token)` {#Router-constructor-address-}
Contract constructor. Accepts the address for a Token smart contract.

#### Parameters:
- `_token`: address must be for an ERC-20 token (e.g. xFUND)
### Function `setGasTopUpLimit(uint256 _gasTopUpLimit) -> bool success` {#Router-setGasTopUpLimit-uint256-}
setGasTopUpLimit set the max amount of ETH that can be sent
in a topUpGas Tx. Router admin calls this to set the maximum amount
a Consumer can send in a single Tx, to prevent large amounts of ETH
being sent.


#### Parameters:
- `_gasTopUpLimit`: amount in wei

### Function `setProviderPaysGas(bool _providerPays) -> bool success` {#Router-setProviderPaysGas-bool-}
setProviderPaysGas - provider calls for setting who pays gas
for sending the fulfillRequest Tx

#### Parameters:
- `_providerPays`: bool - true if provider will pay gas

### Function `setProviderMinFee(uint256 _minFee) -> bool success` {#Router-setProviderMinFee-uint256-}
setProviderMinFee - provider calls for setting its minimum fee

#### Parameters:
- `_minFee`: uint256 - minimum fee provider will accept to fulfill request

### Function `topUpGas(address _dataProvider) -> bool success` {#Router-topUpGas-address-}
topUpGas data consumer contract calls this function to top up gas
Gas is the ETH held by this contract which is used to refund Tx costs
to the data provider for fulfilling a request.
To prevent silly amounts of ETH being sent, a sensible limit is imposed.
Can only top up for authorised providers


#### Parameters:
- `_dataProvider`: address of data provider

### Function `withDrawGasTopUpForProvider(address _dataProvider) -> uint256 amountWithdrawn` {#Router-withDrawGasTopUpForProvider-address-}
withDrawGasTopUpForProvider data consumer contract calls this function to
withdraw any remaining ETH stored in the Router for gas refunds for a specified
data provider.
Consumer contract will then transfer through to the consumer contract's
owner.

NOTE - data provider authorisation is not checked, since a consumer needs to
be able to withdraw for a data provide that has been revoked.


#### Parameters:
- `_dataProvider`: address of data provider

### Function `initialiseRequest(address payable _dataProvider, uint256 _fee, uint256 _requestNonce, uint256 _gasPrice, uint256 _expires, bytes32 _requestId, bytes32 _data, bytes4 _callbackFunctionSignature) -> bool success` {#Router-initialiseRequest-address-payable-uint256-uint256-uint256-uint256-bytes32-bytes32-bytes4-}
initialiseRequest - called by Consumer contract to initialise a data request. Can only be called by
     a contract. Daata providers can watch for the DataRequested being emitted, and act on any requests
     for the provider. Only the provider specified in the reqyest may fulfil the request.

#### Parameters:
- `_dataProvider`: address of the data provider. Must be authorised for this consumer

- `_fee`: amount of Tokens to pay for data

- `_requestNonce`: incremented nonce for Consumer to help prevent request replay

- `_data`: type of data being requested. E.g. PRICE.BTC.USD.AVG requests average price for BTC/USD pair

- `_gasPrice`: gas price Consumer is willing to pay for data return. Converted to gwei (10 ** 9) in this method

- `_expires`: unix epoch for fulfillment expiration, after which cancelRequest can be called for refund

- `_requestId`: the generated ID for this request - used to double check request is coming from the Consumer

- `_callbackFunctionSignature`: signature of function to call in the Consumer's contract to send the data

#### Return Values:
- success if the execution was successful. Status is checked in the Consumer contract
### Function `fulfillRequest(bytes32 _requestId, uint256 _requestedData, bytes _signature) -> bool` {#Router-fulfillRequest-bytes32-uint256-bytes-}
fulfillRequest - called by data provider to forward data to the Consumer. Only the specified provider
     may fulfil the data request. Gas paid by the provider may also be refunded to the provider.

#### Parameters:
- `_requestId`: the request the provider is sending data for

- `_requestedData`: the data to send

- `_signature`: data provider's signature of the _requestId, _requestedData and Consumer's address
                  this will used to validate the data's origin in the Consumer's contract

#### Return Values:
- success if the execution was successful.
### Function `cancelRequest(bytes32 _requestId) -> bool` {#Router-cancelRequest-bytes32-}
cancelRequest - called by data Consumer to cancel a request. Can only be called once the request's
     expire time is exceeded. Cancelled requests cannot be fulfilled.

#### Parameters:
- `_requestId`: the request the consumer wishes to cancel

#### Return Values:
- success if the execution was successful. Status is checked in the Consumer contract
### Function `grantProviderPermission(address _dataProvider) -> bool` {#Router-grantProviderPermission-address-}
grantProviderPermission - called by Consumer to grant permission to a data provider to send data

#### Parameters:
- `_dataProvider`: address of the data provider to grant access

#### Return Values:
- success if the execution was successful. Status is checked in the Consumer contract
### Function `revokeProviderPermission(address _dataProvider) -> bool` {#Router-revokeProviderPermission-address-}
revokeProviderPermission - called by Consumer to revoke permission for a data provider to send data

#### Parameters:
- `_dataProvider`: address of the data provider to revoke access

#### Return Values:
- success if the execution was successful. Status is checked in the Consumer contract
### Function `providerIsAuthorised(address _dataConsumer, address _dataProvider) -> bool` {#Router-providerIsAuthorised-address-address-}
providerIsAuthorised - check if provider is authorised for consumer

#### Parameters:
- `_dataConsumer`: address of the data provider

- `_dataProvider`: address of the data provider

#### Return Values:
- success if the execution was successful. Status is checked in the Consumer contract
### Function `getTokenAddress() -> address` {#Router-getTokenAddress--}
getTokenAddress - get the contract address of the Token being used for paying fees

#### Return Values:
- address of the token smart contract
### Function `getDataRequestConsumer(bytes32 _requestId) -> address` {#Router-getDataRequestConsumer-bytes32-}
getDataRequestConsumer - get the dataConsumer for a request

#### Parameters:
- `_requestId`: bytes32 request id

#### Return Values:
- address data consumer contract address
### Function `getDataRequestProvider(bytes32 _requestId) -> address` {#Router-getDataRequestProvider-bytes32-}
getDataRequestProvider - get the dataConsumer for a request

#### Parameters:
- `_requestId`: bytes32 request id

#### Return Values:
- address data provider address
### Function `getDataRequestExpires(bytes32 _requestId) -> uint256` {#Router-getDataRequestExpires-bytes32-}
getDataRequestExpires - get the expire timestamp for a request

#### Parameters:
- `_requestId`: bytes32 request id

#### Return Values:
- uint256 expire timestamp
### Function `getDataRequestGasPrice(bytes32 _requestId) -> uint256` {#Router-getDataRequestGasPrice-bytes32-}
getDataRequestGasPrice - get the max gas price consumer will pay for a request

#### Parameters:
- `_requestId`: bytes32 request id

#### Return Values:
- uint256 expire timestamp
### Function `getGasTopUpLimit() -> uint256` {#Router-getGasTopUpLimit--}
getGasTopUpLimit - get the gas top up limit

#### Return Values:
- uint256 amount in wei
### Function `requestExists(bytes32 _requestId) -> bool` {#Router-requestExists-bytes32-}
requestExists - check a request ID exists

#### Parameters:
- `_requestId`: bytes32 request id

### Function `getTotalGasDeposits() -> uint256` {#Router-getTotalGasDeposits--}
getTotalGasDeposits - get total gas deposited in Router

### Function `getGasDepositsForConsumer(address _dataConsumer) -> uint256` {#Router-getGasDepositsForConsumer-address-}
getGasDepositsForConsumer - get total gas deposited in Router
by a data consumer

#### Parameters:
- `_dataConsumer`: address of data consumer

### Function `getGasDepositsForConsumerProviders(address _dataConsumer, address _dataProvider) -> uint256` {#Router-getGasDepositsForConsumerProviders-address-address-}
getGasDepositsForConsumerProviders - get total gas deposited in Router
by a data consumer for a given data provider

#### Parameters:
- `_dataConsumer`: address of data consumer

- `_dataProvider`: address of data provider

### Function `getProviderPaysGas(address _dataProvider) -> bool` {#Router-getProviderPaysGas-address-}
getProviderPaysGas - returns whether or not the given provider pays gas
for sending the fulfillRequest Tx

#### Parameters:
- `_dataProvider`: address of data provider

### Function `getProviderMinFee(address _dataProvider) -> uint256` {#Router-getProviderMinFee-address-}
getProviderMinFee - returns minimum fee provider will accept to fulfill data request

#### Parameters:
- `_dataProvider`: address of data provider


### Event `DataRequested(address dataConsumer, address dataProvider, uint256 fee, bytes32 data, bytes32 requestId, uint256 gasPrice, uint256 expires)` {#Router-DataRequested-address-address-uint256-bytes32-bytes32-uint256-uint256-}
DataRequested. Emitted when a data request is sent by a Consumer.

#### Parameters:
- `dataConsumer`: address of the Consumer's contract

- `dataProvider`: address of the data provider

- `fee`: amount of xFUND paid for data request

- `data`: data being requested

- `requestId`: the request ID

- `gasPrice`: max gas price the Consumer is willing to pay for data fulfilment

- `expires`: request expire time, after which the Consumer can cancel the request
### Event `GrantProviderPermission(address dataConsumer, address dataProvider)` {#Router-GrantProviderPermission-address-address-}
GrantProviderPermission. Emitted when a Consumer grants permission to a provider
     to fulfil data requests.

#### Parameters:
- `dataConsumer`: address of the Consumer's contract

- `dataProvider`: address of the data provider
### Event `RevokeProviderPermission(address dataConsumer, address dataProvider)` {#Router-RevokeProviderPermission-address-address-}
RevokeProviderPermission. Emitted when a Consumer revokes permission for a provider
     to fulfil data requests.

#### Parameters:
- `dataConsumer`: address of the Consumer's contract

- `dataProvider`: address of the data provider
### Event `RequestFulfilled(address dataConsumer, address dataProvider, bytes32 requestId, uint256 requestedData, address gasPayer)` {#Router-RequestFulfilled-address-address-bytes32-uint256-address-}
RequestFulfilled. Emitted when a provider fulfils a data request

#### Parameters:
- `dataConsumer`: address of the Consumer's contract

- `dataProvider`: address of the data provider

- `requestId`: the request ID being fulfilled

- `requestedData`: the data sent to the Consumer's contract

- `gasPayer`: who paid the gas for fulfilling the request (provider or consumer)
### Event `RequestCancelled(address dataConsumer, address dataProvider, bytes32 requestId)` {#Router-RequestCancelled-address-address-bytes32-}
RequestCancelled. Emitted when a consumer cancels a data request

#### Parameters:
- `dataConsumer`: address of the Consumer's contract

- `dataProvider`: address of the data provider

- `requestId`: the request ID being cancelled
### Event `TokenSet(address tokenAddress)` {#Router-TokenSet-address-}
TokenSet. Emitted once during contract construction

#### Parameters:
- `tokenAddress`: contract address of token being used to pay fees
### Event `SetGasTopUpLimit(address sender, uint256 oldLimit, uint256 newLimit)` {#Router-SetGasTopUpLimit-address-uint256-uint256-}
SetGasTopUpLimit. Emitted when the Router admin changes the gas topup limit
     with the setGasTopUpLimit function

#### Parameters:
- `sender`: address of the admin

- `oldLimit`: old limit

- `newLimit`: new limit
### Event `SetProviderPaysGas(address dataProvider, bool providerPays)` {#Router-SetProviderPaysGas-address-bool-}
SetProviderPaysGas. Emitted when a provider changes their params

#### Parameters:
- `dataProvider`: address of the provider

- `providerPays`: true/false
### Event `SetProviderMinFee(address dataProvider, uint256 minFee)` {#Router-SetProviderMinFee-address-uint256-}
SetProviderMinFee. Emitted when a provider changes their minimum token fee for providing data

#### Parameters:
- `dataProvider`: address of the provider

- `minFee`: new fee value
### Event `GasToppedUp(address dataConsumer, address dataProvider, uint256 amount)` {#Router-GasToppedUp-address-address-uint256-}
GasToppedUp. Emitted when a Consumer calls the topUpGas function to send ETH to top up gas

#### Parameters:
- `dataConsumer`: address of the Consumer's contract

- `dataProvider`: address of the provider who can claim a gas refund

- `amount`: amount of ETH (in wei) being sent
### Event `GasWithdrawnByConsumer(address dataConsumer, address dataProvider, uint256 amount)` {#Router-GasWithdrawnByConsumer-address-address-uint256-}
GasWithdrawnByConsumer. Emitted when a Consumer withdraws any ETH held by the Router for gas refunds
     via the withDrawGasTopUpForProvider function

#### Parameters:
- `dataConsumer`: address of the Consumer's contract

- `dataProvider`: address of the provider who can claim a gas refund

- `amount`: amount of ETH (in wei) being sent
### Event `GasRefundedToProvider(address dataConsumer, address dataProvider, uint256 amount)` {#Router-GasRefundedToProvider-address-address-uint256-}
GasRefundedToProvider. Emitted when a provider fulfils a data request, if the Consumer is to pay
     the gas costs for data fulfilment

#### Parameters:
- `dataConsumer`: address of the Consumer's contract

- `dataProvider`: address of the provider who can claim a gas refund

- `amount`: amount of ETH (in wei) being refunded

### Modifier `onlyAdmin()` {#Router-onlyAdmin--}
onlyAdmin ensure only a Router admin can run the function
