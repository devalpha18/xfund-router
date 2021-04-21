// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.8.0;

import "../../lib/ConsumerBase.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract MockBadConsumerInfiniteGas is ConsumerBase {
    using SafeMath for uint256;

    uint256 public price;
    bytes32 public requestId;

    constructor(address _router, address _xfund)
    ConsumerBase(_router, _xfund) { }

    function getData(address _dataProvider, uint256 _fee, bytes32 _data) external {
        requestData(_dataProvider, _fee, _data);
    }

    function receiveData(
        uint256 _price,
        bytes32 _requestId
    )
    internal override {
        while(true){}
        // will never get here, but stops compiler warnings
        price = _price;
        requestId = _requestId;
    }
}
