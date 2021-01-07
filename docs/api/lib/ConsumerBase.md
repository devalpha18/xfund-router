# Data Consumer smart contract


This contract can be imported by any smart contract wishing to include
off-chain data or data from a different network within it.

The consumer initiates a data request by forwarding the request to the Router
smart contract, from where the data provider(s) pick up and process the
data request, and forward it back to the specified callback function.

Most of the functions in this contract are proxy functions to the ConsumerLib
smart contract

## Functions:
- [`constructor(address _router)`](#ConsumerBase-constructor-address-)
- [`receive()`](#ConsumerBase-receive--)
- [`withdrawAllTokens()`](#ConsumerBase-withdrawAllTokens--)
- [`transferOwnership(address payable _newOwner)`](#ConsumerBase-transferOwnership-address-payable-)
- [`setRouterAllowance(uint256 _routerAllowance, bool _increase)`](#ConsumerBase-setRouterAllowance-uint256-bool-)
- [`addRemoveDataProvider(address _dataProvider, uint256 _fee, bool _remove)`](#ConsumerBase-addRemoveDataProvider-address-uint256-bool-)
- [`setRequestVar(uint8 _var, uint256 _value)`](#ConsumerBase-setRequestVar-uint8-uint256-)
- [`setRouter(address _router)`](#ConsumerBase-setRouter-address-)
- [`topUpGas(address _dataProvider)`](#ConsumerBase-topUpGas-address-)
- [`withdrawTopUpGas(address _dataProvider)`](#ConsumerBase-withdrawTopUpGas-address-)
- [`withdrawEth(uint256 _amount)`](#ConsumerBase-withdrawEth-uint256-)
- [`requestData(address payable _dataProvider, bytes32 _data, uint256 _gasPrice)`](#ConsumerBase-requestData-address-payable-bytes32-uint256-)
- [`rawReceiveData(uint256 _price, bytes32 _requestId, bytes _signature)`](#ConsumerBase-rawReceiveData-uint256-bytes32-bytes-)
- [`cancelRequest(bytes32 _requestId)`](#ConsumerBase-cancelRequest-bytes32-)
- [`getRouterAddress()`](#ConsumerBase-getRouterAddress--)
- [`getDataProviderFee(address _dataProvider)`](#ConsumerBase-getDataProviderFee-address-)
- [`owner()`](#ConsumerBase-owner--)
- [`getRequestVar(uint8 _var)`](#ConsumerBase-getRequestVar-uint8-)

## Events:
- [`PaymentRecieved(address sender, uint256 amount)`](#ConsumerBase-PaymentRecieved-address-uint256-)


<a name="ConsumerBase-constructor-address-"></a>
### Function `constructor(address _router)`
Contract constructor. Accepts the address for the router smart contract,
     and a token allowance for the Router to spend on the consumer's behalf (to pay fees).

     The Consumer contract should have enough tokens allocated to it to pay fees
     and the Router should be able to use the Tokens to forward fees.


#### Parameters:
- `_router`: address of the deployed Router smart contract
<a name="ConsumerBase-receive--"></a>
### Function `receive()`
fallback payable function, which emits an event if ETH is received either via
     the withdrawTopUpGas function, or accidentally.
<a name="ConsumerBase-withdrawAllTokens--"></a>
### Function `withdrawAllTokens()`
withdrawAllTokens allows the token holder (contract owner) to withdraw all
     Tokens held by this contract back to themselves.
     Can only be called by the current owner.
     Note: Contract ownership is checked in the underlying ConsumerLib function
<a name="ConsumerBase-transferOwnership-address-payable-"></a>
### Function `transferOwnership(address payable _newOwner)`
Transfers ownership of the contract to a new account (`newOwner`),
     and withdraws any tokens currently held by the contract. Can only be run if the
     current owner has no ETH held by the Router.
     Can only be called by the current owner.
     Note: Contract ownership is checked in the underlying ConsumerLib function

#### Parameters:
- `_newOwner`: address of the new contract owner
<a name="ConsumerBase-setRouterAllowance-uint256-bool-"></a>
### Function `setRouterAllowance(uint256 _routerAllowance, bool _increase)`
setRouterAllowance allows the token holder (contract owner) to
     increase/decrease the token allowance for the Router, in order for the Router to
     pay fees for data requests
     Can only be called by the current owner.
     Note: Contract ownership is checked in the underlying ConsumerLib function


#### Parameters:
- `_routerAllowance`: the amount of tokens the owner would like to increase/decrease allocation by

- `_increase`: bool true to increase, false to decrease
<a name="ConsumerBase-addRemoveDataProvider-address-uint256-bool-"></a>
### Function `addRemoveDataProvider(address _dataProvider, uint256 _fee, bool _remove)`
addRemoveDataProvider add a new authorised data provider to this contract, and
     authorise it to provide data via the Router, set new fees, or remove
     a currently authorised provider. Fees are set here to reduce gas costs when
     requesting data, and to remove the need to specify the fee with every request
     Can only be called by the current owner.
     Note: Contract ownership is checked in the underlying ConsumerLib function


#### Parameters:
- `_dataProvider`: the address of the data provider

- `_fee`: the data provider's fee

- `_remove`: bool set to true to de-authorise
<a name="ConsumerBase-setRequestVar-uint8-uint256-"></a>
### Function `setRequestVar(uint8 _var, uint256 _value)`
setRequestVar set the specified variable. Request variables are used
     when initialising a request, and are common settings for requests.

     The variable to be set can be one of:
     1 - max gas price limit in gwei the consumer is willing to pay for data processing
     2 - max ETH that can be sent in a gas top up Tx
     3 - request timeout in seconds

     Can only be called by the current owner.
     Note: Contract ownership is checked in the underlying ConsumerLib function


#### Parameters:
- `_var`: bytes32 the variable being set.

- `_value`: uint256 the new value
<a name="ConsumerBase-setRouter-address-"></a>
### Function `setRouter(address _router)`
setRouter set the address of the Router smart contract
     Can only be called by the current owner.
     Note: Contract ownership is checked in the underlying ConsumerLib function


#### Parameters:
- `_router`: on chain address of the router smart contract
<a name="ConsumerBase-topUpGas-address-"></a>
### Function `topUpGas(address _dataProvider)`
topUpGas send ETH to the Router for refunding gas costs to data providers
     for fulfilling data requests. The ETH sent will only be used for the data
     provider specified, and can be withdrawn at any time via the withdrawTopUpGas
     function. ConsumerLib handles any input validation.

     ETH sent is forwarded to the Router smart contract, and held there. It is "assigned"
     to the specified data provider's address.

     NOTE: this is a payable function, and a value must be sent when calling it.
     The value sent cannot exceed either this contract's own gasTopUpLimitm or the
     Router's topup limit. This is a safeguarde to prevent any accidental large amounts
     being sent.
     Can only be called by the current owner.
     Note: since Library contracts cannot have payable functions, the whole function
     is defined here, along with contract ownership checks.


#### Parameters:
- `_dataProvider`: address of data provider for whom gas will be refunded
<a name="ConsumerBase-withdrawTopUpGas-address-"></a>
### Function `withdrawTopUpGas(address _dataProvider)`
withdrawTopUpGas allows the Consumer contract's owner to withdraw any ETH
     held by the Router for the specified data provider. All ETH held will be withdrawn
     from the Router and forwarded to the Consumer contract owner's wallet.this

     NOTE: This function calls the ConsumerLib's underlying withdrawTopUpGas function
     Can only be called by the current owner.
     Note: Contract ownership is checked in the underlying ConsumerLib function


#### Parameters:
- `_dataProvider`: address of associated data provider for whom ETH will be withdrawn
<a name="ConsumerBase-withdrawEth-uint256-"></a>
### Function `withdrawEth(uint256 _amount)`
withdrawEth allows the Consumer contract's owner to withdraw any ETH
     that has been sent to the Contract, either accidentally or via the
     withdrawTopUpGas function. In the case of the withdrawTopUpGas function, this
     is automatically called as part of that function. ETH is sent to the
     Consumer contract's current owner's wallet.
     Can only be called by the current owner.
     Note: Contract ownership is checked in the underlying ConsumerLib function

     NOTE: This function calls the ConsumerLib's underlying withdrawEth function


#### Parameters:
- `_amount`: amount (in wei) of ETH to be withdrawn
<a name="ConsumerBase-requestData-address-payable-bytes32-uint256-"></a>
### Function `requestData(address payable _dataProvider, bytes32 _data, uint256 _gasPrice) -> bytes32 requestId`
No description
<a name="ConsumerBase-rawReceiveData-uint256-bytes32-bytes-"></a>
### Function `rawReceiveData(uint256 _price, bytes32 _requestId, bytes _signature)`
No description
<a name="ConsumerBase-cancelRequest-bytes32-"></a>
### Function `cancelRequest(bytes32 _requestId)`
cancelRequest submit cancellation to the router for the specified request
     Can only be called by the current owner.
     Note: Contract ownership is checked in the underlying ConsumerLib function


#### Parameters:
- `_requestId`: the id of the request being cancelled
<a name="ConsumerBase-getRouterAddress--"></a>
### Function `getRouterAddress() -> address`
getRouterAddress returns the address of the Router smart contract being used


<a name="ConsumerBase-getDataProviderFee-address-"></a>
### Function `getDataProviderFee(address _dataProvider) -> uint256`
getDataProviderFee returns the fee currently set for the given provider


<a name="ConsumerBase-owner--"></a>
### Function `owner() -> address`
owner returns the address of the Consumer contract's owner


<a name="ConsumerBase-getRequestVar-uint8-"></a>
### Function `getRequestVar(uint8 _var) -> uint256`
getRequestVar returns requested variable

     The variable to be set can be one of:
     1 - max gas price limit in gwei the consumer is willing to pay for data processing
     2 - max ETH that can be sent in a gas top up Tx
     3 - request timeout in seconds


#### Parameters:
- `_var`: uint8 var to get


<a name="ConsumerBase-PaymentRecieved-address-uint256-"></a>
### Event `PaymentRecieved(address sender, uint256 amount)`
PaymentRecieved - emitted when ETH is sent to this contract address, either via the
     withdrawTopUpGas function (the Router sends ETH stored for gas refunds), or accidentally

#### Parameters:
- `sender`: address of sender

- `amount`: amount sent (wei)

