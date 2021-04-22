// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../lib/ConsumerBase.sol";

contract MockConsumer is ConsumerBase {

    uint256 public price;

    // Can be called when data provider has sent data
    event GotSomeData(address router, bytes32 requestId, uint256 price);
    event RequestedSomeData(bytes32 requestId, bytes32 endpoint);

    constructor(address _router, address _xfund)
    ConsumerBase(_router, _xfund) {
        price = 0;
    }

    function increaseRouterAllowance(uint256 _amount) external {
        require(_increaseRouterAllowance(_amount));
    }

    /*
     * @dev setPrice is a dummy function used during testing.
     *
     * @param _price uint256 value to be set
     */
    function setPrice(uint256 _price) external {
        price = _price;
    }

    function getData(address _dataProvider, uint256 _fee, bytes32 _data) external {
        bytes32 requestId = _requestData(_dataProvider, _fee, _data);
        emit RequestedSomeData(requestId, _data);
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
        emit GotSomeData(msg.sender, _requestId, _price);
    }
}
