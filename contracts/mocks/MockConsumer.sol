// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "../lib/ConsumerBase.sol";

contract MockConsumer is ConsumerBase {

    uint256 public price;

    // Can be called when data provider has sent data
    event GotSomeData(address router, bytes32 requestId, uint256 price);

    /*
     * MIRRORED EVENTS - FOR CLIENT LOG DECODING
     */

    // Mirrored ERC20 events for web3 client decoding & testing
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    // Mirrored ConsumerLib events for web3 client decoding & testing

    event DataRequestSubmitted(bytes32 indexed requestId);
    event RouterSet(address indexed sender, address indexed oldRouter, address indexed newRouter);
    event OwnershipTransferred(address indexed sender, address indexed previousOwner, address indexed newOwner);
    event WithdrawTokensFromContract(address indexed sender, address indexed from, address indexed to, uint256 amount);
    event IncreasedRouterAllowance(address indexed sender, address indexed router, address indexed contractAddress, uint256 amount);
    event DecreasedRouterAllowance(address indexed sender, address indexed router, address indexed contractAddress, uint256 amount);
    event AddedDataProvider(address indexed sender, address indexed provider, uint256 oldFee, uint256 newFee);
    event RemovedDataProvider(address indexed sender, address indexed provider);
    event SetRequestVar(address indexed sender, uint8 variable, uint256 oldValue, uint256 newValue);

    event RequestCancellationSubmitted(address sender, bytes32 requestId);

    event PaymentRecieved(address sender, uint256 amount);
    event EthWithdrawn(address receiver, uint256 amount);


    // Mirrored Router events for web3 client decoding & testing
    // DataRequested event. Emitted when a data request has been initialised
    event DataRequested(
        address indexed dataConsumer,
        address indexed dataProvider,
        uint256 fee,
        bytes32 data,
        bytes32 indexed requestId,
        uint256 gasPrice,
        uint256 expires
    );

    // GrantProviderPermission event. Emitted when a data consumer grants a data provider to provide data
    event GrantProviderPermission(address indexed dataConsumer, address indexed dataProvider);

    // RevokeProviderPermission event. Emitted when a data consumer revokes access for a data provider to provide data
    event RevokeProviderPermission(address indexed dataConsumer, address indexed dataProvider);

    // RequestFulfilled event. Emitted when a data provider has sent the data requested
    event RequestFulfilled(
        address indexed dataConsumer,
        address indexed dataProvider,
        bytes32 indexed requestId,
        uint256 requestedData,
        address gasPayer
    );

    // RequestCancelled event. Emitted when a data consumer cancels a request
    event RequestCancelled(
        address indexed dataConsumer,
        address indexed dataProvider,
        bytes32 indexed requestId
    );

    event GasToppedUp(address indexed dataConsumer, address indexed dataProvider, uint256 amount);
    event GasWithdrawnByConsumer(address indexed dataConsumer, address indexed dataProvider, uint256 amount);
    event GasRefundedToProvider(address indexed dataConsumer, address indexed dataProvider, uint256 amount);

    constructor(address _router)
    public ConsumerBase(_router) {
        price = 0;
    }

    /*
     * @dev setPrice is a dummy function used during testing.
     *
     * @param _price uint256 value to be set
     */
    function setPrice(uint256 _price) external {
        price = _price;
    }

    /*
     * @dev recieveData - example end user function to recieve data. This will be called
     * by the data provider, via the Router's fulfillRequest function.
     *
     * Important: The isValidFulfillment modifier is used to validate the request to ensure it has indeed
     * been sent by the authorised data provider.
     *
     * Note: The receiving function should not be complex, in order to conserve gas. It should accept the
     * result validate it (using the isValidFulfillment modifier) and store it. Optionally, a simple
     * event can be emitted for logging. Finally, storage should be cleaned up by calling the
     * deleteRequest(_price, _requestId, _signature) function.
     *
     * @param _price uint256 result being sent
     * @param _requestId bytes32 request ID of the request being fulfilled
     * @param _signature bytes signature of the data and request info. Signed by provider to ensure only the provider
     *        has sent the data
     * @return requestId bytes32 request ID which can be used to track/cancel the request
     */
    function receiveData(
        uint256 _price,
        bytes32 _requestId
    )
    internal override {
        price = _price;
        emit GotSomeData(msg.sender, _requestId, _price);
    }
}
