// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

interface IRouter {
    function initialiseRequest(address, uint256, uint256, string memory, uint256, uint256, bytes32, bytes4) external returns (bool);
    function getTokenAddress() external returns (address);
    function getSalt() external returns (bytes32);
    function getGasTopUpLimit() external returns (uint256);
    function grantProviderPermission(address) external returns (bool);
    function revokeProviderPermission(address) external returns (bool);
    function cancelRequest(bytes32) external returns (bool);
    function topUpGas(address) external payable returns (bool);
    function withDrawGasTopUpForProvider(address) external returns (uint256);
    function getGasDepositsForConsumer(address) external returns (uint256);
    function getProviderMinFee(address) external returns (uint256);
}
