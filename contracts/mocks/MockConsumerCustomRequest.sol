// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../lib/ConsumerBase.sol";

contract MockConsumerCustomRequest is ConsumerBase {

    uint256 public price;

    // Can be called when data provider has sent data
    event GotSomeData(address router, bytes32 requestId, bytes32 data, uint256 price);

    event CustomDataRequested(
        bytes32 indexed requestId,
        bytes32 data
    );

    mapping(bytes32 => bytes32) private myCustomRequestStorage;

    constructor(address _router, address _xfund)
    ConsumerBase(_router, _xfund) {
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

    function customRequestData(
        address _dataProvider,
        uint256 _fee,
        bytes32 _data)
    external {
        // call the underlying function
        bytes32 requestId = _requestData(_dataProvider, _fee, _data);
        emit CustomDataRequested(requestId, _data);
        myCustomRequestStorage[requestId] = _data;
    }

    /*
     * @dev recieveData - example end user function to recieve data. This will be called
     *
     * @param _price uint256 result being sent
     * @param _requestId bytes32 request ID of the request being fulfilled
     */
    function receiveData(
        uint256 _price,
        bytes32 _requestId
    )
    internal override {
        price = _price;
        bytes32 data = myCustomRequestStorage[_requestId];
        emit GotSomeData(msg.sender, _requestId, data, _price);
        delete myCustomRequestStorage[_requestId];
    }
}
