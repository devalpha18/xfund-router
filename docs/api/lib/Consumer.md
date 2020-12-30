# Data Consumer smart contract


This contract can be imported by any smart contract wishing to include
off-chain data or data from a different network within it.

The consumer initiates a data request by forwarding the request to the Router
smart contract, from where the data provider(s) pick up and process the
data request, and forward it back to the specified callback function.

Most of the functions in this contract are proxy functions to the ConsumerLib
smart contract

## Functions:
- [`constructor(address _router)`](#Consumer-constructor-address-)
- [`receive()`](#Consumer-receive--)
- [`withdrawAllTokens()`](#Consumer-withdrawAllTokens--)
- [`transferOwnership(address payable _newOwner)`](#Consumer-transferOwnership-address-payable-)
- [`setRouterAllowance(uint256 _routerAllowance, bool _increase)`](#Consumer-setRouterAllowance-uint256-bool-)
- [`addDataProvider(address _dataProvider, uint256 _fee)`](#Consumer-addDataProvider-address-uint256-)
- [`removeDataProvider(address _dataProvider)`](#Consumer-removeDataProvider-address-)
- [`setRequestVar(uint8 _var, uint256 _value)`](#Consumer-setRequestVar-uint8-uint256-)
- [`setRouter(address _router)`](#Consumer-setRouter-address-)
- [`topUpGas(address _dataProvider)`](#Consumer-topUpGas-address-)
- [`withdrawTopUpGas(address _dataProvider)`](#Consumer-withdrawTopUpGas-address-)
- [`submitDataRequest(address payable _dataProvider, bytes32 _data, uint256 _gasPrice, bytes4 _callbackFunctionSignature)`](#Consumer-submitDataRequest-address-payable-bytes32-uint256-bytes4-)
- [`cancelRequest(bytes32 _requestId)`](#Consumer-cancelRequest-bytes32-)
- [`deleteRequest(uint256 _price, bytes32 _requestId, bytes _signature)`](#Consumer-deleteRequest-uint256-bytes32-bytes-)
- [`getRouterAddress()`](#Consumer-getRouterAddress--)
- [`getDataProviderFee(address _dataProvider)`](#Consumer-getDataProviderFee-address-)
- [`owner()`](#Consumer-owner--)
- [`getRequestVar(uint8 _var)`](#Consumer-getRequestVar-uint8-)

## Events:
- [`PaymentRecieved(address sender, uint256 amount)`](#Consumer-PaymentRecieved-address-uint256-)

## Modifiers:
- [`isValidFulfillment(bytes32 _requestId, uint256 _price, bytes _signature)`](#Consumer-isValidFulfillment-bytes32-uint256-bytes-)
- [`onlyOwner()`](#Consumer-onlyOwner--)

### Function `constructor(address _router)` {#Consumer-constructor-address-}
Contract constructor. Accepts the address for the router smart contract,
and a token allowance for the Router to spend on the consumer's behalf (to pay fees).

The Consumer contract should have enough tokens allocated to it to pay fees
and the Router should be able to use the Tokens to forward fees.


#### Parameters:
- `_router`: address of the deployed Router smart contract
### Function `receive()` {#Consumer-receive--}
fallback payable function, which emits an event if ETH is accidentally recieved
### Function `withdrawAllTokens()` {#Consumer-withdrawAllTokens--}
withdrawAllTokens allows the token holder (contract owner) to withdraw all
Tokens held by this contract back to themselves.
### Function `transferOwnership(address payable _newOwner)` {#Consumer-transferOwnership-address-payable-}
Transfers ownership of the contract to a new account (`newOwner`),
and withdraws any tokens currently held by the contract. Can only be run if the
current owner has no ETH held by the Router.
Can only be called by the current owner.

#### Parameters:
- `_newOwner`: address of the new contract owner
### Function `setRouterAllowance(uint256 _routerAllowance, bool _increase)` {#Consumer-setRouterAllowance-uint256-bool-}
setRouterAllowance allows the token holder (contract owner) to
increase/decrease the token allowance for the Router, in order for the Router to
pay fees for data requests


#### Parameters:
- `_routerAllowance`: the amount of tokens the owner would like to increase/decrease allocation by

- `_increase`: bool true to increase, false to decrease
### Function `addDataProvider(address _dataProvider, uint256 _fee)` {#Consumer-addDataProvider-address-uint256-}
addDataProvider add a new authorised data provider to this contract, and
authorise it to provide data via the Router


#### Parameters:
- `_dataProvider`: the address of the data provider

- `_fee`: the data provider's fee
### Function `removeDataProvider(address _dataProvider)` {#Consumer-removeDataProvider-address-}
removeDataProvider remove a data provider and its authorisation to provide data
for this smart contract from the Router


#### Parameters:
- `_dataProvider`: the address of the data provider
### Function `setRequestVar(uint8 _var, uint256 _value)` {#Consumer-setRequestVar-uint8-uint256-}
setRequestVar set the specified variable. Request variables are used
when initialising a request, and are common settings for requests.

The variable to be set can be one of:
1 - gas price limit in gwei the consumer is willing to pay for data processing
2 - max ETH that can be sent in a gas top up Tx
3 - request timeout in seconds


#### Parameters:
- `_var`: bytes32 the variable being set.

- `_value`: uint256 the new value
### Function `setRouter(address _router)` {#Consumer-setRouter-address-}
setRouter set the address of the Router smart contract


#### Parameters:
- `_router`: on chain address of the router smart contract
### Function `topUpGas(address _dataProvider)` {#Consumer-topUpGas-address-}
No description
### Function `withdrawTopUpGas(address _dataProvider)` {#Consumer-withdrawTopUpGas-address-}
No description
### Function `submitDataRequest(address payable _dataProvider, bytes32 _data, uint256 _gasPrice, bytes4 _callbackFunctionSignature) -> bytes32 requestId` {#Consumer-submitDataRequest-address-payable-bytes32-uint256-bytes4-}
submitDataRequest submit a new data request to the Router. The router will
verify the data request, and route it to the data provider


#### Parameters:
- `_dataProvider`: the address of the data provider to send the request to

- `_data`: type of data being requested. E.g. PRICE.BTC.USD.AVG requests average price for BTC/USD pair

- `_gasPrice`: the gas price the consumer would like the provider to use for sending data back

- `_callbackFunctionSignature`: the callback function the provider should call to send data back

#### Return Values:
- requestId - the bytes32 request id
### Function `cancelRequest(bytes32 _requestId)` {#Consumer-cancelRequest-bytes32-}
cancelRequest submit cancellation to the router for the specified request


#### Parameters:
- `_requestId`: the id of the request being cancelled
### Function `deleteRequest(uint256 _price, bytes32 _requestId, bytes _signature)` {#Consumer-deleteRequest-uint256-bytes32-bytes-}
deleteRequest delete a request from the contract. This function should be called
by the Consumer's contract once a request has been fulfilled, in order to clean up
any unused request IDs from storage. The _price and _signature params are used to validate
the params prior to deleting the request, as protection.


#### Parameters:
- `_price`: the data being sent in the fulfilment

- `_requestId`: the id of the request being cancelled

- `_signature`: the signature as sent by the provider
### Function `getRouterAddress() -> address` {#Consumer-getRouterAddress--}
getRouterAddress returns the address of the Router smart contract being used


### Function `getDataProviderFee(address _dataProvider) -> uint256` {#Consumer-getDataProviderFee-address-}
getDataProviderFee returns the fee for the given provider


### Function `owner() -> address` {#Consumer-owner--}
owner returns the address of the Consumer contract's owner


### Function `getRequestVar(uint8 _var) -> uint256` {#Consumer-getRequestVar-uint8-}
getRequestVar returns requested variable

The variable to be set can be one of:
1 - gas price limit in gwei the consumer is willing to pay for data processing
2 - max ETH that can be sent in a gas top up Tx
3 - request timeout in seconds


#### Parameters:
- `_var`: uint8 var to get


### Event `PaymentRecieved(address sender, uint256 amount)` {#Consumer-PaymentRecieved-address-uint256-}
PaymentRecieved - only emitted if ETH is accidentally sent to this contract address

#### Parameters:
- `sender`: address of sender

- `amount`: amount sent (wei)

### Modifier `isValidFulfillment(bytes32 _requestId, uint256 _price, bytes _signature)` {#Consumer-isValidFulfillment-bytes32-uint256-bytes-}
isValidFulfillment should be used in the Consumer's contract during data request fulfilment,
     to ensure that the data being sent is valid, and from the provider specified in the data
     request. The modifier will decode the signature sent by the provider, to ensure that it
     is valid.


#### Parameters:
- `_price`: the data being sent in the fulfilment

- `_requestId`: the id of the request being cancelled

- `_signature`: the signature as sent by the provider
### Modifier `onlyOwner()` {#Consumer-onlyOwner--}
onlyOwner used all write functions to ensure only the contract owner can run them.
