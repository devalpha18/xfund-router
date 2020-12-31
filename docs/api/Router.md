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

<a name="Router-constructor-address-"></a>
### Function `constructor(address _token)`
Contract constructor. Accepts the address for a Token smart contract.

#### Parameters:
- `_token`: address must be for an ERC-20 token (e.g. xFUND)
<a name="Router-setGasTopUpLimit-uint256-"></a>
### Function `setGasTopUpLimit(uint256 _gasTopUpLimit) -> bool success`
setGasTopUpLimit set the max amount of ETH that can be sent
     in a topUpGas Tx. Router admin calls this to set the maximum amount
     a Consumer can send in a single Tx, to prevent large amounts of ETH
     being sent.


#### Parameters:
- `_gasTopUpLimit`: amount in wei

<a name="Router-setProviderPaysGas-bool-"></a>
### Function `setProviderPaysGas(bool _providerPays) -> bool success`
setProviderPaysGas - provider calls for setting who pays gas
     for sending the fulfillRequest Tx

#### Parameters:
- `_providerPays`: bool - true if provider will pay gas

<a name="Router-setProviderMinFee-uint256-"></a>
### Function `setProviderMinFee(uint256 _minFee) -> bool success`
setProviderMinFee - provider calls for setting its minimum fee

#### Parameters:
- `_minFee`: uint256 - minimum fee provider will accept to fulfill request

<a name="Router-topUpGas-address-"></a>
### Function `topUpGas(address _dataProvider) -> bool success`
topUpGas data consumer contract calls this function to top up gas
     Gas is the ETH held by this contract which is used to refund Tx costs
     to the data provider for fulfilling a request.
     To prevent silly amounts of ETH being sent, a sensible limit is imposed.
     Can only top up for authorised providers


#### Parameters:
- `_dataProvider`: address of data provider

<a name="Router-withDrawGasTopUpForProvider-address-"></a>
### Function `withDrawGasTopUpForProvider(address _dataProvider) -> uint256 amountWithdrawn`
withDrawGasTopUpForProvider data consumer contract calls this function to
     withdraw any remaining ETH stored in the Router for gas refunds for a specified
     data provider.
     Consumer contract will then transfer through to the consumer contract's
     owner.

     NOTE - data provider authorisation is not checked, since a consumer needs to
     be able to withdraw for a data provide that has been revoked.


#### Parameters:
- `_dataProvider`: address of data provider

<a name="Router-initialiseRequest-address-payable-uint256-uint256-uint256-uint256-bytes32-bytes32-bytes4-"></a>
### Function `initialiseRequest(address payable _dataProvider, uint256 _fee, uint256 _requestNonce, uint256 _gasPrice, uint256 _expires, bytes32 _requestId, bytes32 _data, bytes4 _callbackFunctionSignature) -> bool success`
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
<a name="Router-fulfillRequest-bytes32-uint256-bytes-"></a>
### Function `fulfillRequest(bytes32 _requestId, uint256 _requestedData, bytes _signature) -> bool`
fulfillRequest - called by data provider to forward data to the Consumer. Only the specified provider
     may fulfil the data request. Gas paid by the provider may also be refunded to the provider.

#### Parameters:
- `_requestId`: the request the provider is sending data for

- `_requestedData`: the data to send

- `_signature`: data provider's signature of the _requestId, _requestedData and Consumer's address
                  this will used to validate the data's origin in the Consumer's contract

#### Return Values:
- success if the execution was successful.
<a name="Router-cancelRequest-bytes32-"></a>
### Function `cancelRequest(bytes32 _requestId) -> bool`
cancelRequest - called by data Consumer to cancel a request. Can only be called once the request's
     expire time is exceeded. Cancelled requests cannot be fulfilled.

#### Parameters:
- `_requestId`: the request the consumer wishes to cancel

#### Return Values:
- success if the execution was successful. Status is checked in the Consumer contract
<a name="Router-grantProviderPermission-address-"></a>
### Function `grantProviderPermission(address _dataProvider) -> bool`
grantProviderPermission - called by Consumer to grant permission to a data provider to send data

#### Parameters:
- `_dataProvider`: address of the data provider to grant access

#### Return Values:
- success if the execution was successful. Status is checked in the Consumer contract
<a name="Router-revokeProviderPermission-address-"></a>
### Function `revokeProviderPermission(address _dataProvider) -> bool`
revokeProviderPermission - called by Consumer to revoke permission for a data provider to send data

#### Parameters:
- `_dataProvider`: address of the data provider to revoke access

#### Return Values:
- success if the execution was successful. Status is checked in the Consumer contract
<a name="Router-providerIsAuthorised-address-address-"></a>
### Function `providerIsAuthorised(address _dataConsumer, address _dataProvider) -> bool`
providerIsAuthorised - check if provider is authorised for consumer

#### Parameters:
- `_dataConsumer`: address of the data provider

- `_dataProvider`: address of the data provider

#### Return Values:
- success if the execution was successful. Status is checked in the Consumer contract
<a name="Router-getTokenAddress--"></a>
### Function `getTokenAddress() -> address`
getTokenAddress - get the contract address of the Token being used for paying fees

#### Return Values:
- address of the token smart contract
<a name="Router-getDataRequestConsumer-bytes32-"></a>
### Function `getDataRequestConsumer(bytes32 _requestId) -> address`
getDataRequestConsumer - get the dataConsumer for a request

#### Parameters:
- `_requestId`: bytes32 request id

#### Return Values:
- address data consumer contract address
<a name="Router-getDataRequestProvider-bytes32-"></a>
### Function `getDataRequestProvider(bytes32 _requestId) -> address`
getDataRequestProvider - get the dataConsumer for a request

#### Parameters:
- `_requestId`: bytes32 request id

#### Return Values:
- address data provider address
<a name="Router-getDataRequestExpires-bytes32-"></a>
### Function `getDataRequestExpires(bytes32 _requestId) -> uint256`
getDataRequestExpires - get the expire timestamp for a request

#### Parameters:
- `_requestId`: bytes32 request id

#### Return Values:
- uint256 expire timestamp
<a name="Router-getDataRequestGasPrice-bytes32-"></a>
### Function `getDataRequestGasPrice(bytes32 _requestId) -> uint256`
getDataRequestGasPrice - get the max gas price consumer will pay for a request

#### Parameters:
- `_requestId`: bytes32 request id

#### Return Values:
- uint256 expire timestamp
<a name="Router-getGasTopUpLimit--"></a>
### Function `getGasTopUpLimit() -> uint256`
getGasTopUpLimit - get the gas top up limit

#### Return Values:
- uint256 amount in wei
<a name="Router-requestExists-bytes32-"></a>
### Function `requestExists(bytes32 _requestId) -> bool`
requestExists - check a request ID exists

#### Parameters:
- `_requestId`: bytes32 request id

<a name="Router-getTotalGasDeposits--"></a>
### Function `getTotalGasDeposits() -> uint256`
getTotalGasDeposits - get total gas deposited in Router

<a name="Router-getGasDepositsForConsumer-address-"></a>
### Function `getGasDepositsForConsumer(address _dataConsumer) -> uint256`
getGasDepositsForConsumer - get total gas deposited in Router
     by a data consumer

#### Parameters:
- `_dataConsumer`: address of data consumer

<a name="Router-getGasDepositsForConsumerProviders-address-address-"></a>
### Function `getGasDepositsForConsumerProviders(address _dataConsumer, address _dataProvider) -> uint256`
getGasDepositsForConsumerProviders - get total gas deposited in Router
     by a data consumer for a given data provider

#### Parameters:
- `_dataConsumer`: address of data consumer

- `_dataProvider`: address of data provider

<a name="Router-getProviderPaysGas-address-"></a>
### Function `getProviderPaysGas(address _dataProvider) -> bool`
getProviderPaysGas - returns whether or not the given provider pays gas
     for sending the fulfillRequest Tx

#### Parameters:
- `_dataProvider`: address of data provider

<a name="Router-getProviderMinFee-address-"></a>
### Function `getProviderMinFee(address _dataProvider) -> uint256`
getProviderMinFee - returns minimum fee provider will accept to fulfill data request

#### Parameters:
- `_dataProvider`: address of data provider


<a name="Router-DataRequested-address-address-uint256-bytes32-bytes32-uint256-uint256-"></a>
### Event `DataRequested(address dataConsumer, address dataProvider, uint256 fee, bytes32 data, bytes32 requestId, uint256 gasPrice, uint256 expires)`
DataRequested. Emitted when a data request is sent by a Consumer.

#### Parameters:
- `dataConsumer`: address of the Consumer's contract

- `dataProvider`: address of the data provider

- `fee`: amount of xFUND paid for data request

- `data`: data being requested

- `requestId`: the request ID

- `gasPrice`: max gas price the Consumer is willing to pay for data fulfilment

- `expires`: request expire time, after which the Consumer can cancel the request
<a name="Router-GrantProviderPermission-address-address-"></a>
### Event `GrantProviderPermission(address dataConsumer, address dataProvider)`
GrantProviderPermission. Emitted when a Consumer grants permission to a provider
     to fulfil data requests.

#### Parameters:
- `dataConsumer`: address of the Consumer's contract

- `dataProvider`: address of the data provider
<a name="Router-RevokeProviderPermission-address-address-"></a>
### Event `RevokeProviderPermission(address dataConsumer, address dataProvider)`
RevokeProviderPermission. Emitted when a Consumer revokes permission for a provider
     to fulfil data requests.

#### Parameters:
- `dataConsumer`: address of the Consumer's contract

- `dataProvider`: address of the data provider
<a name="Router-RequestFulfilled-address-address-bytes32-uint256-address-"></a>
### Event `RequestFulfilled(address dataConsumer, address dataProvider, bytes32 requestId, uint256 requestedData, address gasPayer)`
RequestFulfilled. Emitted when a provider fulfils a data request

#### Parameters:
- `dataConsumer`: address of the Consumer's contract

- `dataProvider`: address of the data provider

- `requestId`: the request ID being fulfilled

- `requestedData`: the data sent to the Consumer's contract

- `gasPayer`: who paid the gas for fulfilling the request (provider or consumer)
<a name="Router-RequestCancelled-address-address-bytes32-"></a>
### Event `RequestCancelled(address dataConsumer, address dataProvider, bytes32 requestId)`
RequestCancelled. Emitted when a consumer cancels a data request

#### Parameters:
- `dataConsumer`: address of the Consumer's contract

- `dataProvider`: address of the data provider

- `requestId`: the request ID being cancelled
<a name="Router-TokenSet-address-"></a>
### Event `TokenSet(address tokenAddress)`
TokenSet. Emitted once during contract construction

#### Parameters:
- `tokenAddress`: contract address of token being used to pay fees
<a name="Router-SetGasTopUpLimit-address-uint256-uint256-"></a>
### Event `SetGasTopUpLimit(address sender, uint256 oldLimit, uint256 newLimit)`
SetGasTopUpLimit. Emitted when the Router admin changes the gas topup limit
     with the setGasTopUpLimit function

#### Parameters:
- `sender`: address of the admin

- `oldLimit`: old limit

- `newLimit`: new limit
<a name="Router-SetProviderPaysGas-address-bool-"></a>
### Event `SetProviderPaysGas(address dataProvider, bool providerPays)`
SetProviderPaysGas. Emitted when a provider changes their params

#### Parameters:
- `dataProvider`: address of the provider

- `providerPays`: true/false
<a name="Router-SetProviderMinFee-address-uint256-"></a>
### Event `SetProviderMinFee(address dataProvider, uint256 minFee)`
SetProviderMinFee. Emitted when a provider changes their minimum token fee for providing data

#### Parameters:
- `dataProvider`: address of the provider

- `minFee`: new fee value
<a name="Router-GasToppedUp-address-address-uint256-"></a>
### Event `GasToppedUp(address dataConsumer, address dataProvider, uint256 amount)`
GasToppedUp. Emitted when a Consumer calls the topUpGas function to send ETH to top up gas

#### Parameters:
- `dataConsumer`: address of the Consumer's contract

- `dataProvider`: address of the provider who can claim a gas refund

- `amount`: amount of ETH (in wei) being sent
<a name="Router-GasWithdrawnByConsumer-address-address-uint256-"></a>
### Event `GasWithdrawnByConsumer(address dataConsumer, address dataProvider, uint256 amount)`
GasWithdrawnByConsumer. Emitted when a Consumer withdraws any ETH held by the Router for gas refunds
     via the withDrawGasTopUpForProvider function

#### Parameters:
- `dataConsumer`: address of the Consumer's contract

- `dataProvider`: address of the provider who can claim a gas refund

- `amount`: amount of ETH (in wei) being sent
<a name="Router-GasRefundedToProvider-address-address-uint256-"></a>
### Event `GasRefundedToProvider(address dataConsumer, address dataProvider, uint256 amount)`
GasRefundedToProvider. Emitted when a provider fulfils a data request, if the Consumer is to pay
     the gas costs for data fulfilment

#### Parameters:
- `dataConsumer`: address of the Consumer's contract

- `dataProvider`: address of the provider who can claim a gas refund

- `amount`: amount of ETH (in wei) being refunded

<a name="Router-onlyAdmin--"></a>
### Modifier `onlyAdmin()`
onlyAdmin ensure only a Router admin can run the function
