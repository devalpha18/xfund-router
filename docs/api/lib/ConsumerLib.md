# ConsumerLib smart contract

Library smart contract containing the core functionality required for a data consumer
to initialise data requests and interact with the Router smart contract. This contract
will be deployed, and allow developers to link it to their own smart contract, via the
Consumer.sol smart contract. There is no need to import this smart contract, since the
Consumer.sol smart contract has the required proxy functions for data request and fulfilment
interaction.

Most of the functions in this contract are proxied by the Consumer smart contract

## Functions:
- [`init(struct ConsumerLib.State self, address _router)`](#ConsumerLib-init-struct-ConsumerLib-State-address-)
- [`addDataProvider(struct ConsumerLib.State self, address _dataProvider, uint256 _fee)`](#ConsumerLib-addDataProvider-struct-ConsumerLib-State-address-uint256-)
- [`removeDataProvider(struct ConsumerLib.State self, address _dataProvider)`](#ConsumerLib-removeDataProvider-struct-ConsumerLib-State-address-)
- [`transferOwnership(struct ConsumerLib.State self, address payable newOwner)`](#ConsumerLib-transferOwnership-struct-ConsumerLib-State-address-payable-)
- [`withdrawAllTokens(struct ConsumerLib.State self)`](#ConsumerLib-withdrawAllTokens-struct-ConsumerLib-State-)
- [`setRouterAllowance(struct ConsumerLib.State self, uint256 _routerAllowance, bool _increase)`](#ConsumerLib-setRouterAllowance-struct-ConsumerLib-State-uint256-bool-)
- [`setRequestVar(struct ConsumerLib.State self, uint8 _var, uint256 _value)`](#ConsumerLib-setRequestVar-struct-ConsumerLib-State-uint8-uint256-)
- [`setRouter(struct ConsumerLib.State self, address _router)`](#ConsumerLib-setRouter-struct-ConsumerLib-State-address-)
- [`submitDataRequest(struct ConsumerLib.State self, address payable _dataProvider, bytes32 _data, uint256 _gasPrice, bytes4 _callbackFunctionSignature)`](#ConsumerLib-submitDataRequest-struct-ConsumerLib-State-address-payable-bytes32-uint256-bytes4-)
- [`cancelRequest(struct ConsumerLib.State self, bytes32 _requestId)`](#ConsumerLib-cancelRequest-struct-ConsumerLib-State-bytes32-)

## Events:
- [`DataRequestSubmitted(bytes32 requestId)`](#ConsumerLib-DataRequestSubmitted-bytes32-)
- [`RouterSet(address sender, address oldRouter, address newRouter)`](#ConsumerLib-RouterSet-address-address-address-)
- [`OwnershipTransferred(address sender, address previousOwner, address newOwner)`](#ConsumerLib-OwnershipTransferred-address-address-address-)
- [`WithdrawTokensFromContract(address sender, address from, address to, uint256 amount)`](#ConsumerLib-WithdrawTokensFromContract-address-address-address-uint256-)
- [`IncreasedRouterAllowance(address sender, address router, address contractAddress, uint256 amount)`](#ConsumerLib-IncreasedRouterAllowance-address-address-address-uint256-)
- [`DecreasedRouterAllowance(address sender, address router, address contractAddress, uint256 amount)`](#ConsumerLib-DecreasedRouterAllowance-address-address-address-uint256-)
- [`AddedDataProvider(address sender, address provider, uint256 oldFee, uint256 newFee)`](#ConsumerLib-AddedDataProvider-address-address-uint256-uint256-)
- [`RemovedDataProvider(address sender, address provider)`](#ConsumerLib-RemovedDataProvider-address-address-)
- [`SetRequestVar(address sender, uint8 variable, uint256 oldValue, uint256 newValue)`](#ConsumerLib-SetRequestVar-address-uint8-uint256-uint256-)
- [`RequestCancellationSubmitted(address sender, bytes32 requestId)`](#ConsumerLib-RequestCancellationSubmitted-address-bytes32-)
- [`PaymentRecieved(address sender, uint256 amount)`](#ConsumerLib-PaymentRecieved-address-uint256-)


### Function `init(struct ConsumerLib.State self, address _router)` {#ConsumerLib-init-struct-ConsumerLib-State-address-}
init - called once during the Consumer.sol's constructor function to initialise the
     contract's data storage

#### Parameters:
- `self`: the Contract's State object

- `_router`: address of the Router smart contract
### Function `addDataProvider(struct ConsumerLib.State self, address _dataProvider, uint256 _fee) -> bool success` {#ConsumerLib-addDataProvider-struct-ConsumerLib-State-address-uint256-}
addDataProvider add a new authorised data provider to this contract, and
authorise it to provide data via the Router. Can also be used to modify
a provider's fee for an existing authorised provider. If the provider is currently
authorises, the Router's grantProviderPermission is not called to conserve gas.


#### Parameters:
- `_dataProvider`: the address of the data provider

- `_fee`: the data provider's fee

### Function `removeDataProvider(struct ConsumerLib.State self, address _dataProvider) -> bool success` {#ConsumerLib-removeDataProvider-struct-ConsumerLib-State-address-}
removeDataProvider remove a data provider and its authorisation to provide data
for this smart contract from the Router


#### Parameters:
- `_dataProvider`: the address of the data provider

### Function `transferOwnership(struct ConsumerLib.State self, address payable newOwner) -> bool success` {#ConsumerLib-transferOwnership-struct-ConsumerLib-State-address-payable-}
Transfers ownership of the contract to a new account (`newOwner`),
and withdraws any tokens currentlry held by the contract.
Can only be called by the current owner.


#### Parameters:
- `newOwner`: the address of the new owner

### Function `withdrawAllTokens(struct ConsumerLib.State self) -> bool success` {#ConsumerLib-withdrawAllTokens-struct-ConsumerLib-State-}
withdrawAllTokens allows the token holder (contract owner) to withdraw all
Tokens held by this contract back to themselves.


### Function `setRouterAllowance(struct ConsumerLib.State self, uint256 _routerAllowance, bool _increase) -> bool success` {#ConsumerLib-setRouterAllowance-struct-ConsumerLib-State-uint256-bool-}
setRouterAllowance allows the token holder (contract owner) to
increase/decrease the token allowance for the Router, in order for the Router to
pay fees for data requests


#### Parameters:
- `_routerAllowance`: the amount of tokens the owner would like to increase/decrease allocation by

- `_increase`: bool true to increase, false to decrease

### Function `setRequestVar(struct ConsumerLib.State self, uint8 _var, uint256 _value) -> bool success` {#ConsumerLib-setRequestVar-struct-ConsumerLib-State-uint8-uint256-}
setRequestVar set the specified variable. Request variables are used
when initialising a request, and are common settings for requests.

The variable to be set can be one of:
1 - gas price limit in gwei the consumer is willing to pay for data processing
2 - max ETH that can be sent in a gas top up Tx
3 - request timeout in seconds


#### Parameters:
- `_var`: uint8 the variable being set.

- `_value`: uint256 the new value

### Function `setRouter(struct ConsumerLib.State self, address _router) -> bool success` {#ConsumerLib-setRouter-struct-ConsumerLib-State-address-}
setRouter set the address of the Router smart contract


#### Parameters:
- `_router`: on chain address of the router smart contract

### Function `submitDataRequest(struct ConsumerLib.State self, address payable _dataProvider, bytes32 _data, uint256 _gasPrice, bytes4 _callbackFunctionSignature) -> bytes32 requestId` {#ConsumerLib-submitDataRequest-struct-ConsumerLib-State-address-payable-bytes32-uint256-bytes4-}
submitDataRequest submit a new data request to the Router. The router will
verify the data request, and route it to the data provider


#### Parameters:
- `self`: State object

- `_dataProvider`: the address of the data provider to send the request to

- `_data`: type of data being requested. E.g. PRICE.BTC.USD.AVG requests average price for BTC/USD pair

- `_gasPrice`: the gas price the consumer would like the provider to use for sending data back

- `_callbackFunctionSignature`: the callback function the provider should call to send data back

#### Return Values:
- requestId - the bytes32 request id
### Function `cancelRequest(struct ConsumerLib.State self, bytes32 _requestId) -> bool success` {#ConsumerLib-cancelRequest-struct-ConsumerLib-State-bytes32-}
cancelRequest submit cancellation to the router for the specified request


#### Parameters:
- `_requestId`: the id of the request being cancelled

#### Return Values:
- success bool

### Event `DataRequestSubmitted(bytes32 requestId)` {#ConsumerLib-DataRequestSubmitted-bytes32-}
DataRequestSubmitted - emitted when a Consumer initiates a successful data request

#### Parameters:
- `requestId`: request ID
### Event `RouterSet(address sender, address oldRouter, address newRouter)` {#ConsumerLib-RouterSet-address-address-address-}
RouterSet - emitted when the owner updates the Router smart contract address

#### Parameters:
- `sender`: address of the owner

- `oldRouter`: old Router address

- `newRouter`: new Router address
### Event `OwnershipTransferred(address sender, address previousOwner, address newOwner)` {#ConsumerLib-OwnershipTransferred-address-address-address-}
OwnershipTransferred - emitted when the owner transfers ownership of the Consumer contract to
     a new address

#### Parameters:
- `sender`: address of the owner

- `previousOwner`: old owner address

- `newOwner`: new owner address
### Event `WithdrawTokensFromContract(address sender, address from, address to, uint256 amount)` {#ConsumerLib-WithdrawTokensFromContract-address-address-address-uint256-}
WithdrawTokensFromContract - emitted when the owner withdraws any Tokens held by the Consumer contract

#### Parameters:
- `sender`: address of the owner

- `from`: address tokens are being sent from

- `to`: address tokens are being sent to

- `amount`: amount being withdrawn
### Event `IncreasedRouterAllowance(address sender, address router, address contractAddress, uint256 amount)` {#ConsumerLib-IncreasedRouterAllowance-address-address-address-uint256-}
IncreasedRouterAllowance - emitted when the owner increases the Router's token allowance

#### Parameters:
- `sender`: address of the owner

- `router`: address of the Router

- `contractAddress`: address of the Consumer smart contract

- `amount`: amount
### Event `DecreasedRouterAllowance(address sender, address router, address contractAddress, uint256 amount)` {#ConsumerLib-DecreasedRouterAllowance-address-address-address-uint256-}
DecreasedRouterAllowance - emitted when the owner decreases the Router's token allowance

#### Parameters:
- `sender`: address of the owner

- `router`: address of the Router

- `contractAddress`: address of the Consumer smart contract

- `amount`: amount
### Event `AddedDataProvider(address sender, address provider, uint256 oldFee, uint256 newFee)` {#ConsumerLib-AddedDataProvider-address-address-uint256-uint256-}
AddedDataProvider - emitted when the owner adds a new data provider

#### Parameters:
- `sender`: address of the owner

- `provider`: address of the provider

- `oldFee`: old fee to be paid per data request

- `newFee`: new fee to be paid per data request
### Event `RemovedDataProvider(address sender, address provider)` {#ConsumerLib-RemovedDataProvider-address-address-}
RemovedDataProvider - emitted when the owner removes a data provider

#### Parameters:
- `sender`: address of the owner

- `provider`: address of the provider
### Event `SetRequestVar(address sender, uint8 variable, uint256 oldValue, uint256 newValue)` {#ConsumerLib-SetRequestVar-address-uint8-uint256-uint256-}
SetRequestVar - emitted when the owner changes a request variable

#### Parameters:
- `sender`: address of the owner

- `variable`: variable being changed

- `oldValue`: old value

- `newValue`: new value
### Event `RequestCancellationSubmitted(address sender, bytes32 requestId)` {#ConsumerLib-RequestCancellationSubmitted-address-bytes32-}
RequestCancellationSubmitted - emitted when the owner cancels a data request

#### Parameters:
- `sender`: address of the owner

- `requestId`: ID of request being cancelled
### Event `PaymentRecieved(address sender, uint256 amount)` {#ConsumerLib-PaymentRecieved-address-uint256-}
No description

