# Router smart contract


Routes requests for data from Consumers to data providers.
Data providers listen for requests and process data, sending it back to the
Consumer's smart contract.

An ERC-20 Token fee is charged by the provider, and paid for by the consumer


## Functions:
- [`constructor(address _token) public`](#Router-constructor-address-)
- [`registerAsProvider(uint256 _minFee) external`](#Router-registerAsProvider-uint256-)
- [`setProviderMinFee(uint256 _newMinFee) external`](#Router-setProviderMinFee-uint256-)
- [`setProviderGranularFee(address _consumer, uint256 _newFee) external`](#Router-setProviderGranularFee-address-uint256-)
- [`withdraw(address _recipient, uint256 _amount) external`](#Router-withdraw-address-uint256-)
- [`initialiseRequest(address _provider, uint256 _fee, bytes32 _data) external`](#Router-initialiseRequest-address-uint256-bytes32-)
- [`fulfillRequest(bytes32 _requestId, uint256 _requestedData, bytes _signature) external`](#Router-fulfillRequest-bytes32-uint256-bytes-)
- [`getTokenAddress() external`](#Router-getTokenAddress--)
- [`getDataRequestConsumer(bytes32 _requestId) external`](#Router-getDataRequestConsumer-bytes32-)
- [`getDataRequestProvider(bytes32 _requestId) external`](#Router-getDataRequestProvider-bytes32-)
- [`requestExists(bytes32 _requestId) external`](#Router-requestExists-bytes32-)
- [`getRequestStatus(bytes32 _requestId) external`](#Router-getRequestStatus-bytes32-)
- [`getProviderMinFee(address _provider) external`](#Router-getProviderMinFee-address-)
- [`getProviderGranularFee(address _provider, address _consumer) external`](#Router-getProviderGranularFee-address-address-)
- [`getWithdrawableTokens(address _provider) external`](#Router-getWithdrawableTokens-address-)

## Events:
- [`DataRequested(address consumer, address provider, uint256 fee, bytes32 data, bytes32 requestId)`](#Router-DataRequested-address-address-uint256-bytes32-bytes32-)
- [`RequestFulfilled(address consumer, address provider, bytes32 requestId, uint256 requestedData)`](#Router-RequestFulfilled-address-address-bytes32-uint256-)
- [`TokenSet(address tokenAddress)`](#Router-TokenSet-address-)
- [`ProviderRegistered(address provider, uint256 minFee)`](#Router-ProviderRegistered-address-uint256-)
- [`SetProviderMinFee(address provider, uint256 oldMinFee, uint256 newMinFee)`](#Router-SetProviderMinFee-address-uint256-uint256-)
- [`SetProviderGranularFee(address provider, address consumer, uint256 oldFee, uint256 newFee)`](#Router-SetProviderGranularFee-address-address-uint256-uint256-)
- [`WithdrawFees(address provider, address recipient, uint256 amount)`](#Router-WithdrawFees-address-address-uint256-)

## Modifiers:
- [`paidSufficientFee(uint256 _feePaid, address _provider)`](#Router-paidSufficientFee-uint256-address-)
- [`hasAvailableTokens(uint256 _amount)`](#Router-hasAvailableTokens-uint256-)

<a name="Router-constructor-address-"></a>
### Function `constructor(address _token) public `
Contract constructor. Accepts the address for a Token smart contract.

#### Parameters:
- `_token`: address must be for an ERC-20 token (e.g. xFUND)
<a name="Router-registerAsProvider-uint256-"></a>
### Function `registerAsProvider(uint256 _minFee) external  -> bool success`
registerAsProvider - register as a provider

#### Parameters:
- `_minFee`: uint256 - minimum fee provider will accept to fulfill request

<a name="Router-setProviderMinFee-uint256-"></a>
### Function `setProviderMinFee(uint256 _newMinFee) external  -> bool success`
setProviderMinFee - provider calls for setting its minimum fee

#### Parameters:
- `_newMinFee`: uint256 - minimum fee provider will accept to fulfill request

<a name="Router-setProviderGranularFee-address-uint256-"></a>
### Function `setProviderGranularFee(address _consumer, uint256 _newFee) external  -> bool success`
setProviderGranularFee - provider calls for setting its fee for the selected consumer

#### Parameters:
- `_consumer`: address of consumer contract

- `_newFee`: uint256 - minimum fee provider will accept to fulfill request

<a name="Router-withdraw-address-uint256-"></a>
### Function `withdraw(address _recipient, uint256 _amount) external `
Allows the provider to withdraw their xFUND

#### Parameters:
- `_recipient`: is the address the funds will be sent to

- `_amount`: is the amount of xFUND transferred from the Coordinator contract
<a name="Router-initialiseRequest-address-uint256-bytes32-"></a>
### Function `initialiseRequest(address _provider, uint256 _fee, bytes32 _data) external  -> bool success`
initialiseRequest - called by Consumer contract to initialise a data request. Can only be called by
a contract. Daata providers can watch for the DataRequested being emitted, and act on any requests
for the provider. Only the provider specified in the request may fulfil the request.

#### Parameters:
- `_provider`: address of the data provider.

- `_fee`: amount of Tokens to pay for data

- `_data`: type of data being requested. E.g. PRICE.BTC.USD.AVG requests average price for BTC/USD pair

#### Return Values:
- success if the execution was successful. Status is checked in the Consumer contract
<a name="Router-fulfillRequest-bytes32-uint256-bytes-"></a>
### Function `fulfillRequest(bytes32 _requestId, uint256 _requestedData, bytes _signature) external  -> bool`
fulfillRequest - called by data provider to forward data to the Consumer. Only the specified provider
may fulfil the data request.

#### Parameters:
- `_requestId`: the request the provider is sending data for

- `_requestedData`: the data to send

- `_signature`: data provider's signature of the _requestId, _requestedData and Consumer's address
this will used to validate the data's origin in the Consumer's contract

#### Return Values:
- success if the execution was successful.
<a name="Router-getTokenAddress--"></a>
### Function `getTokenAddress() external  -> address`
getTokenAddress - get the contract address of the Token being used for paying fees

#### Return Values:
- address of the token smart contract
<a name="Router-getDataRequestConsumer-bytes32-"></a>
### Function `getDataRequestConsumer(bytes32 _requestId) external  -> address`
getDataRequestConsumer - get the consumer for a request

#### Parameters:
- `_requestId`: bytes32 request id

#### Return Values:
- address data consumer contract address
<a name="Router-getDataRequestProvider-bytes32-"></a>
### Function `getDataRequestProvider(bytes32 _requestId) external  -> address`
getDataRequestProvider - get the consumer for a request

#### Parameters:
- `_requestId`: bytes32 request id

#### Return Values:
- address data provider address
<a name="Router-requestExists-bytes32-"></a>
### Function `requestExists(bytes32 _requestId) external  -> bool`
requestExists - check a request ID exists

#### Parameters:
- `_requestId`: bytes32 request id

<a name="Router-getRequestStatus-bytes32-"></a>
### Function `getRequestStatus(bytes32 _requestId) external  -> uint8`
getRequestStatus - check a request status
0 = does not exist/not yet initialised
1 = Request initialised

#### Parameters:
- `_requestId`: bytes32 request id

<a name="Router-getProviderMinFee-address-"></a>
### Function `getProviderMinFee(address _provider) external  -> uint256`
getProviderMinFee - returns minimum fee provider will accept to fulfill data request

#### Parameters:
- `_provider`: address of data provider

<a name="Router-getProviderGranularFee-address-address-"></a>
### Function `getProviderGranularFee(address _provider, address _consumer) external  -> uint256`
getProviderGranularFee - returns fee provider will accept to fulfill data request
for the given consumer

#### Parameters:
- `_provider`: address of data provider

- `_consumer`: address of consumer contract

<a name="Router-getWithdrawableTokens-address-"></a>
### Function `getWithdrawableTokens(address _provider) external  -> uint256`
getWithdrawableTokens - returns withdrawable tokens for the given provider

#### Parameters:
- `_provider`: address of data provider


<a name="Router-DataRequested-address-address-uint256-bytes32-bytes32-"></a>
### Event `DataRequested(address consumer, address provider, uint256 fee, bytes32 data, bytes32 requestId)`
DataRequested. Emitted when a data request is sent by a Consumer.

#### Parameters:
- `consumer`: address of the Consumer's contract

- `provider`: address of the data provider

- `fee`: amount of xFUND paid for data request

- `data`: data being requested

- `requestId`: the request ID
<a name="Router-RequestFulfilled-address-address-bytes32-uint256-"></a>
### Event `RequestFulfilled(address consumer, address provider, bytes32 requestId, uint256 requestedData)`
RequestFulfilled. Emitted when a provider fulfils a data request

#### Parameters:
- `consumer`: address of the Consumer's contract

- `provider`: address of the data provider

- `requestId`: the request ID being fulfilled

- `requestedData`: the data sent to the Consumer's contract
<a name="Router-TokenSet-address-"></a>
### Event `TokenSet(address tokenAddress)`
TokenSet. Emitted once during contract construction

#### Parameters:
- `tokenAddress`: contract address of token being used to pay fees
<a name="Router-ProviderRegistered-address-uint256-"></a>
### Event `ProviderRegistered(address provider, uint256 minFee)`
ProviderRegistered. Emitted when a provider registers

#### Parameters:
- `provider`: address of the provider

- `minFee`: new fee value
<a name="Router-SetProviderMinFee-address-uint256-uint256-"></a>
### Event `SetProviderMinFee(address provider, uint256 oldMinFee, uint256 newMinFee)`
SetProviderMinFee. Emitted when a provider changes their minimum token fee for providing data

#### Parameters:
- `provider`: address of the provider

- `oldMinFee`: old fee value

- `newMinFee`: new fee value
<a name="Router-SetProviderGranularFee-address-address-uint256-uint256-"></a>
### Event `SetProviderGranularFee(address provider, address consumer, uint256 oldFee, uint256 newFee)`
SetProviderGranularFee. Emitted when a provider changes their token fee for providing data
to a selected consumer contract

#### Parameters:
- `provider`: address of the provider

- `consumer`: address of the consumer

- `oldFee`: old fee value

- `newFee`: new fee value
<a name="Router-WithdrawFees-address-address-uint256-"></a>
### Event `WithdrawFees(address provider, address recipient, uint256 amount)`
WithdrawFees. Emitted when a provider withdraws their accumulated fees

#### Parameters:
- `provider`: address of the provider withdrawing

- `recipient`: address of the recipient

- `amount`: uint256 amount being withdrawn

<a name="Router-paidSufficientFee-uint256-address-"></a>
### Modifier `paidSufficientFee(uint256 _feePaid, address _provider)`
Reverts if amount is not at least what the provider has set as their min fee

#### Parameters:
- `_feePaid`: The payment for the request

- `_provider`: address of the provider
<a name="Router-hasAvailableTokens-uint256-"></a>
### Modifier `hasAvailableTokens(uint256 _amount)`
Reverts if amount requested is greater than withdrawable balance

#### Parameters:
- `_amount`: The given amount to compare to `withdrawableTokens`
