// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "../lib/Consumer.sol";

contract MockBadConsumerBadImpl is Consumer {
    uint256 public price;
    uint256 public price2;
    uint256 public price3;
    uint256 arbitraryCounter;

    // Can be called when data provider has sent data
    event GotSomeData(address router, bytes32 requestId, uint256 price);
    event BiggerEvent(address indexed router, bytes32 indexed requestId, uint256 price, bytes32 sigSha, bytes32 someSha);
    event DoneDeletified(bytes32 indexed requestId);
    event Counted(uint256 newCounterVal);

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

    constructor(address _router)
    public Consumer(_router) {
        price = 0;
        arbitraryCounter = 0;
    }

    function setPrice(uint256 _price) public {
        price = _price;
    }

    // Minimal implementation - bad, does not have data validation
    function requestDataNoCheck(
        address payable _dataProvider,
        bytes32 _data,
        uint256 _gasPrice)
    public returns (bytes32 requestId) {
        // call the underlying Consumer.sol lib's submitDataRequest function
        return submitDataRequest(_dataProvider, _data, _gasPrice, this.recieveDataNoCheck.selector);
    }

    function recieveDataNoCheck(
        uint256 _price,
        bytes32 _requestId,
        bytes memory _signature
    )
    external
    returns (bool success) {
        price = _price;
        return true;
    }

    // Has large receiving function
    function requestDataBigFunc(
        address payable _dataProvider,
        bytes32 _data,
        uint256 _gasPrice)
    public returns (bytes32 requestId) {
        // call the underlying Consumer.sol lib's submitDataRequest function
        return submitDataRequest(_dataProvider, _data, _gasPrice, this.recieveDataBigFunc.selector);
    }

    function recieveDataBigFunc(
        uint256 _price,
        bytes32 _requestId,
        bytes memory _signature
    )
    external
    isValidFulfillment(_requestId, _price, _signature)
    returns (bool success) {
        price = _price;
        price2 = _price.mul(2);
        price3 = _price.div(2);
        emit GotSomeData(msg.sender, _requestId, _price);

        bytes32 someSha = keccak256(
            abi.encodePacked(
                price,
                price2,
                price3,
                _requestId,
                _signature
            )
        );

        bytes32 pointlessSigSha = keccak256(abi.encodePacked(_signature));

        emit BiggerEvent(msg.sender, _requestId, _price, pointlessSigSha, someSha);

        for(uint i = 0; i < 100; i++) {
            arbitraryCounter = arbitraryCounter + 1;
        }

        emit Counted(arbitraryCounter);

        deleteRequest(_price, _requestId, _signature);
        emit DoneDeletified(_requestId);
        return true;
    }
}
