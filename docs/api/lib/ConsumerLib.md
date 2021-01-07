# ConsumerLib smart contract

Library smart contract containing the core functionality required for a data consumer
to initialise data requests and interact with the Router smart contract. This contract
will be deployed, and allow developers to link it to their own smart contract, via the
ConsumerBase.sol smart contract. There is no need to import this smart contract, since the
ConsumerBase.sol smart contract has the required proxy functions for data request and fulfilment
interaction.

Most of the functions in this contract are proxied by the Consumer smart contract

## Functions:
- [`init(struct ConsumerLib.State self, address _router)`](#ConsumerLib-init-struct-ConsumerLib-State-address-)
- [`addRemoveDataProvider(struct ConsumerLib.State self, address _dataProvider, uint256 _fee, bool _remove)`](#ConsumerLib-addRemoveDataProvider-struct-ConsumerLib-State-address-uint256-bool-)
- [`transferOwnership(struct ConsumerLib.State self, address payable newOwner)`](#ConsumerLib-transferOwnership-struct-ConsumerLib-State-address-payable-)
- [`validateTopUpGas(struct ConsumerLib.State self, address _dataProvider, uint256 _amount)`](#ConsumerLib-validateTopUpGas-struct-ConsumerLib-State-address-uint256-)
- [`withdrawTopUpGas(struct ConsumerLib.State self, address _dataProvider)`](#ConsumerLib-withdrawTopUpGas-struct-ConsumerLib-State-address-)
- [`withdrawEth(struct ConsumerLib.State self, uint256 amount)`](#ConsumerLib-withdrawEth-struct-ConsumerLib-State-uint256-)
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
- [`EthWithdrawn(address receiver, uint256 amount)`](#ConsumerLib-EthWithdrawn-address-uint256-)


<a name="ConsumerLib-init-struct-ConsumerLib-State-address-"></a>
### Function `init(struct ConsumerLib.State self, address _router)`
init - called once during the ConsumerBase.sol's constructor function to initialise the
     contract's data storage

#### Parameters:
- `self`: the Contract's State object

- `_router`: address of the Router smart contract
<a name="ConsumerLib-addRemoveDataProvider-struct-ConsumerLib-State-address-uint256-bool-"></a>
### Function `addRemoveDataProvider(struct ConsumerLib.State self, address _dataProvider, uint256 _fee, bool _remove) -> bool success`
addRemoveDataProvider add a new authorised data provider to this contract, and
     authorise it to provide data via the Router, or de-authorise an existing provider.
     Can also be used to modify a provider's fee for an existing authorised provider.
     If the provider is currently authorised when setting the fee, the Router's
     grantProviderPermission is not called to conserve gas.


#### Parameters:
- `self`: the Contract's State object

- `_dataProvider`: the address of the data provider

- `_fee`: the data provider's fee

- `_remove`: bool set to true to de-authorise

<a name="ConsumerLib-transferOwnership-struct-ConsumerLib-State-address-payable-"></a>
### Function `transferOwnership(struct ConsumerLib.State self, address payable newOwner) -> bool success`
Transfers ownership of the contract to a new account (`newOwner`),
     and withdraws any tokens currentlry held by the contract.
     Can only be called by the current owner.


#### Parameters:
- `self`: the Contract's State object

- `newOwner`: the address of the new owner

<a name="ConsumerLib-validateTopUpGas-struct-ConsumerLib-State-address-uint256-"></a>
### Function `validateTopUpGas(struct ConsumerLib.State self, address _dataProvider, uint256 _amount) -> bool success`
validateTopUpGas called by the underlying ConsumerBase.sol contract in order to
     validate the topUpGas input prior to forwarding ETH and data to the Router.


#### Parameters:
- `_dataProvider`: address of data provider for whom gas will be refunded

- `_amount`: amount of ETH being sent as gas topup

<a name="ConsumerLib-withdrawTopUpGas-struct-ConsumerLib-State-address-"></a>
### Function `withdrawTopUpGas(struct ConsumerLib.State self, address _dataProvider) -> bool success`
withdrawTopUpGas allows the Consumer contract's owner to withdraw any ETH
     held by the Router for the specified data provider. All ETH held will be withdrawn
     from the Router and forwarded to the Consumer contract owner's wallet.this

     NOTE: This function is called by the Consumer's withdrawTopUpGas function


#### Parameters:
- `self`: the Contract's State object

- `_dataProvider`: address of associated data provider for whom ETH will be withdrawn
<a name="ConsumerLib-withdrawEth-struct-ConsumerLib-State-uint256-"></a>
### Function `withdrawEth(struct ConsumerLib.State self, uint256 amount) -> bool success`
withdrawEth allows the Consumer contract's owner to withdraw any ETH
     that has been sent to the Contract, either accidentally or via the
     withdrawTopUpGas function. In the case of the withdrawTopUpGas function, this
     is automatically called as part of that function. ETH is sent to the
     Consumer contract's current owner's wallet.

     NOTE: This function is called by the Consumer's withdrawEth function


#### Parameters:
- `self`: the Contract's State object

- `amount`: amount (in wei) of ETH to be withdrawn
<a name="ConsumerLib-withdrawAllTokens-struct-ConsumerLib-State-"></a>
### Function `withdrawAllTokens(struct ConsumerLib.State self) -> bool success`
withdrawAllTokens allows the token holder (contract owner) to withdraw all
     Tokens held by this contract back to themselves.


#### Parameters:
- `self`: the Contract's State object

<a name="ConsumerLib-setRouterAllowance-struct-ConsumerLib-State-uint256-bool-"></a>
### Function `setRouterAllowance(struct ConsumerLib.State self, uint256 _routerAllowance, bool _increase) -> bool success`
setRouterAllowance allows the token holder (contract owner) to
     increase/decrease the token allowance for the Router, in order for the Router to
     pay fees for data requests


#### Parameters:
- `self`: the Contract's State object

- `_routerAllowance`: the amount of tokens the owner would like to increase/decrease allocation by

- `_increase`: bool true to increase, false to decrease

<a name="ConsumerLib-setRequestVar-struct-ConsumerLib-State-uint8-uint256-"></a>
### Function `setRequestVar(struct ConsumerLib.State self, uint8 _var, uint256 _value) -> bool success`
setRequestVar set the specified variable. Request variables are used
     when initialising a request, and are common settings for requests.

     The variable to be set can be one of:
     1 - gas price limit in gwei the consumer is willing to pay for data processing
     2 - max ETH that can be sent in a gas top up Tx
     3 - request timeout in seconds


#### Parameters:
- `self`: the Contract's State object

- `_var`: uint8 the variable being set.

- `_value`: uint256 the new value

<a name="ConsumerLib-setRouter-struct-ConsumerLib-State-address-"></a>
### Function `setRouter(struct ConsumerLib.State self, address _router) -> bool success`
setRouter set the address of the Router smart contract


#### Parameters:
- `self`: the Contract's State object

- `_router`: on chain address of the router smart contract

<a name="ConsumerLib-submitDataRequest-struct-ConsumerLib-State-address-payable-bytes32-uint256-bytes4-"></a>
### Function `submitDataRequest(struct ConsumerLib.State self, address payable _dataProvider, bytes32 _data, uint256 _gasPrice, bytes4 _callbackFunctionSignature) -> bytes32 requestId`
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
<a name="ConsumerLib-cancelRequest-struct-ConsumerLib-State-bytes32-"></a>
### Function `cancelRequest(struct ConsumerLib.State self, bytes32 _requestId) -> bool success`
cancelRequest submit cancellation to the router for the specified request


#### Parameters:
- `self`: the Contract's State object

- `_requestId`: the id of the request being cancelled

#### Return Values:
- success bool

<a name="ConsumerLib-DataRequestSubmitted-bytes32-"></a>
### Event `DataRequestSubmitted(bytes32 requestId)`
DataRequestSubmitted - emitted when a Consumer initiates a successful data request

#### Parameters:
- `requestId`: request ID
<a name="ConsumerLib-RouterSet-address-address-address-"></a>
### Event `RouterSet(address sender, address oldRouter, address newRouter)`
RouterSet - emitted when the owner updates the Router smart contract address

#### Parameters:
- `sender`: address of the owner

- `oldRouter`: old Router address

- `newRouter`: new Router address
<a name="ConsumerLib-OwnershipTransferred-address-address-address-"></a>
### Event `OwnershipTransferred(address sender, address previousOwner, address newOwner)`
OwnershipTransferred - emitted when the owner transfers ownership of the Consumer contract to
     a new address

#### Parameters:
- `sender`: address of the owner

- `previousOwner`: old owner address

- `newOwner`: new owner address
<a name="ConsumerLib-WithdrawTokensFromContract-address-address-address-uint256-"></a>
### Event `WithdrawTokensFromContract(address sender, address from, address to, uint256 amount)`
WithdrawTokensFromContract - emitted when the owner withdraws any Tokens held by the Consumer contract

#### Parameters:
- `sender`: address of the owner

- `from`: address tokens are being sent from

- `to`: address tokens are being sent to

- `amount`: amount being withdrawn
<a name="ConsumerLib-IncreasedRouterAllowance-address-address-address-uint256-"></a>
### Event `IncreasedRouterAllowance(address sender, address router, address contractAddress, uint256 amount)`
IncreasedRouterAllowance - emitted when the owner increases the Router's token allowance

#### Parameters:
- `sender`: address of the owner

- `router`: address of the Router

- `contractAddress`: address of the Consumer smart contract

- `amount`: amount
<a name="ConsumerLib-DecreasedRouterAllowance-address-address-address-uint256-"></a>
### Event `DecreasedRouterAllowance(address sender, address router, address contractAddress, uint256 amount)`
DecreasedRouterAllowance - emitted when the owner decreases the Router's token allowance

#### Parameters:
- `sender`: address of the owner

- `router`: address of the Router

- `contractAddress`: address of the Consumer smart contract

- `amount`: amount
<a name="ConsumerLib-AddedDataProvider-address-address-uint256-uint256-"></a>
### Event `AddedDataProvider(address sender, address provider, uint256 oldFee, uint256 newFee)`
AddedDataProvider - emitted when the owner adds a new data provider

#### Parameters:
- `sender`: address of the owner

- `provider`: address of the provider

- `oldFee`: old fee to be paid per data request

- `newFee`: new fee to be paid per data request
<a name="ConsumerLib-RemovedDataProvider-address-address-"></a>
### Event `RemovedDataProvider(address sender, address provider)`
RemovedDataProvider - emitted when the owner removes a data provider

#### Parameters:
- `sender`: address of the owner

- `provider`: address of the provider
<a name="ConsumerLib-SetRequestVar-address-uint8-uint256-uint256-"></a>
### Event `SetRequestVar(address sender, uint8 variable, uint256 oldValue, uint256 newValue)`
SetRequestVar - emitted when the owner changes a request variable

#### Parameters:
- `sender`: address of the owner

- `variable`: variable being changed

- `oldValue`: old value

- `newValue`: new value
<a name="ConsumerLib-RequestCancellationSubmitted-address-bytes32-"></a>
### Event `RequestCancellationSubmitted(address sender, bytes32 requestId)`
RequestCancellationSubmitted - emitted when the owner cancels a data request

#### Parameters:
- `sender`: address of the owner

- `requestId`: ID of request being cancelled
<a name="ConsumerLib-PaymentRecieved-address-uint256-"></a>
### Event `PaymentRecieved(address sender, uint256 amount)`
No description
<a name="ConsumerLib-EthWithdrawn-address-uint256-"></a>
### Event `EthWithdrawn(address receiver, uint256 amount)`
No description

