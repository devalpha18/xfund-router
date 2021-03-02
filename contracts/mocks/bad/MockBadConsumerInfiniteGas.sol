// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.8.0;

import "../../lib/ConsumerBase.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract MockBadConsumerInfiniteGas is ConsumerBase {
    using SafeMath for uint256;

    uint256 public price;
    bytes32 public requestId;

    // Mirrored Router events for web3 client decoding & testing
    // DataRequested event. Emitted when a data request has been initialised
    event DataRequested(
        address indexed dataConsumer,
        address indexed dataProvider,
        uint64 fee,
        bytes32 data,
        bytes32 indexed requestId,
        uint64 gasPrice,
        uint64 expires
    );

    constructor(address _router)
    ConsumerBase(_router) { }

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
