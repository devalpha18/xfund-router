// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

interface IRouter {
    function initialiseRequest(address, uint256, uint256, string memory, uint256, bytes32, bytes4) external returns (bool);
    function getTokenAddress() external returns (address);
    function getSalt() external returns (bytes32);
    function grantProviderPermission(address) external returns (bool);
    function revokeProviderPermission(address) external returns (bool);
}
