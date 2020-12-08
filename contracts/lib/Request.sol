// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

/**
 * @title Library for Request
 * @dev simple lib for Request object used across contracts
 */
contract Request {
    // Struct to hold information about a data request
    struct DataRequest {
        address dataConsumer;
        address payable dataProvider;
        bytes4 callbackFunction;
        uint256 expires;
        uint256 fee;
        uint256 gasPrice;
        bool isSet;
    }

    function generateRequestId(
        address _dataConsumer,
        uint256 _requestNonce,
        address _dataProvider,
        string memory _data,
        bytes4 _callbackFunctionSignature,
        uint256 gasPriceGwei,
        bytes32 _salt
    ) public pure returns (bytes32 requestId) {
        return keccak256(
            abi.encodePacked(
                _dataConsumer,
                _requestNonce,
                _dataProvider,
                _data,
                _callbackFunctionSignature,
                gasPriceGwei,
                _salt
            )
        );
    }
}
