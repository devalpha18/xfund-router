# ConsumerBase smart contract


This contract can be imported by any smart contract wishing to include
off-chain data or data from a different network within it.

The consumer initiates a data request by forwarding the request to the Router
smart contract, from where the data provider(s) pick up and process the
data request, and forward it back to the specified callback function.


## Functions:
- [`constructor(address _router, address _xfund) internal`](#ConsumerBase-constructor-address-address-)
- [`_setRouter(address _router) internal`](#ConsumerBase-_setRouter-address-)
- [`_increaseRouterAllowance(uint256 _amount) internal`](#ConsumerBase-_increaseRouterAllowance-uint256-)
- [`_requestData(address _dataProvider, uint256 _fee, bytes32 _data) internal`](#ConsumerBase-_requestData-address-uint256-bytes32-)
- [`rawReceiveData(uint256 _price, bytes32 _requestId) external`](#ConsumerBase-rawReceiveData-uint256-bytes32-)
- [`receiveData(uint256 _price, bytes32 _requestId) internal`](#ConsumerBase-receiveData-uint256-bytes32-)
- [`getRouterAddress() external`](#ConsumerBase-getRouterAddress--)



<a name="ConsumerBase-constructor-address-address-"></a>
### Function `constructor(address _router, address _xfund) internal `
Contract constructor. Accepts the address for the router smart contract,
and a token allowance for the Router to spend on the consumer's behalf (to pay fees).

The Consumer contract should have enough tokens allocated to it to pay fees
and the Router should be able to use the Tokens to forward fees.


#### Parameters:
- `_router`: address of the deployed Router smart contract

- `_xfund`: address of the deployed xFUND smart contract
<a name="ConsumerBase-_setRouter-address-"></a>
### Function `_setRouter(address _router) internal  -> bool`
No description
#### Parameters:
- `_router`: address of the deployed Router smart contract
<a name="ConsumerBase-_increaseRouterAllowance-uint256-"></a>
### Function `_increaseRouterAllowance(uint256 _amount) internal  -> bool`
No description
#### Parameters:
- `_amount`: uint256 amount to increase allowance by
<a name="ConsumerBase-_requestData-address-uint256-bytes32-"></a>
### Function `_requestData(address _dataProvider, uint256 _fee, bytes32 _data) internal  -> bytes32`
_requestData - initialises a data request. forwards the request to the deployed
Router smart contract.


#### Parameters:
- `_dataProvider`: payable address of the data provider

- `_fee`: uint256 fee to be paid

- `_data`: bytes32 value of data being requested, e.g. PRICE.BTC.USD.AVG requests
average price for BTC/USD pair

#### Return Values:
- requestId bytes32 request ID which can be used to track or cancel the request
<a name="ConsumerBase-rawReceiveData-uint256-bytes32-"></a>
### Function `rawReceiveData(uint256 _price, bytes32 _requestId) external `
rawReceiveData - Called by the Router's fulfillRequest function
in order to fulfil a data request. Data providers call the Router's fulfillRequest function
The request is validated to ensure it has indeed been sent via the Router.

The Router will only call rawReceiveData once it has validated the origin of the data fulfillment.
rawReceiveData then calls the user defined receiveData function to finalise the fulfilment.
Contract developers will need to override the abstract receiveData function defined below.


#### Parameters:
- `_price`: uint256 result being sent

- `_requestId`: bytes32 request ID of the request being fulfilled
has sent the data
<a name="ConsumerBase-receiveData-uint256-bytes32-"></a>
### Function `receiveData(uint256 _price, bytes32 _requestId) internal `
receiveData - should be overridden by contract developers to process the
data fulfilment in their own contract.


#### Parameters:
- `_price`: uint256 result being sent

- `_requestId`: bytes32 request ID of the request being fulfilled
<a name="ConsumerBase-getRouterAddress--"></a>
### Function `getRouterAddress() external  -> address`
getRouterAddress returns the address of the Router smart contract being used




