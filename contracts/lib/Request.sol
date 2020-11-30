// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

/**
 * @title Library for Request
 * @dev simple lib for Request object used across contracts
 */
library Request {
    // Struct to hold information about a data request
    struct DataRequest {
        address dataConsumer;
        address dataProvider;
        bytes4 callbackFunction;
        bool isSet;
    }
}
