// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "../lib/Consumer.sol";

contract MockConsumer is Consumer {

    uint256 public price = 0;

    event GotSomeData(address router, bytes32 requestId, uint256 price);

    constructor(address _router)
    public Consumer(_router) {
    }

    function requestData(
        address _dataProvider,
        string memory _data,
        uint256 _gasPrice)
    public returns (bytes32 requestId) {
        return submitDataRequest(_dataProvider, _data, _gasPrice, this.recieveData.selector);
    }

    function recieveData(
        uint256 _price,
        bytes32 _requestId,
        bytes memory _signature
    )
    public
    isValidFulfillment(_requestId, _price, _signature)
    returns (bool success) {
        price = _price;
        emit GotSomeData(msg.sender, _requestId, _price);
        delete dataRequests[_requestId];
        return true;
    }
}
