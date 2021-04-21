// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.8.0;

interface IConsumerBase {
    function rawReceiveData(uint256 _price, bytes32 _requestId) external;
}
