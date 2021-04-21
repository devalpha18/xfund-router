# RequestIdBase


A contract used by ConsumerBase and Router to generate requestIds


## Functions:
- [`makeRequestId(address _dataConsumer, address _dataProvider, address _router, uint256 _requestNonce, bytes32 _data) internal`](#RequestIdBase-makeRequestId-address-address-address-uint256-bytes32-)



<a name="RequestIdBase-makeRequestId-address-address-address-uint256-bytes32-"></a>
### Function `makeRequestId(address _dataConsumer, address _dataProvider, address _router, uint256 _requestNonce, bytes32 _data) internal  -> bytes32`
makeRequestId generates a requestId


#### Parameters:
- `_dataConsumer`: address of consumer contract

- `_dataProvider`: address of provider

- `_router`: address of Router contract

- `_requestNonce`: uint256 request nonce

- `_data`: bytes32 hex encoded data endpoint


#### Return Values:
- bytes32 requestId


