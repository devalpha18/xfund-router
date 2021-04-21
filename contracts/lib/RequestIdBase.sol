// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;

contract RequestIdBase {
    function makeRequestId(
        address _dataConsumer,
        address _dataProvider,
        address _router,
        uint256 _requestNonce,
        bytes32 _data) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_dataConsumer, _dataProvider, _router, _requestNonce, _data));
    }
}
