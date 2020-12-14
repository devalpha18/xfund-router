// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * Mock token for unit testing
 * @dev {ERC20} token
 */
contract MockToken is ERC20 {

    mapping(address => uint256) gimmes;

    /**
     * See {ERC20-constructor}.
     */
    constructor(string memory name, string memory symbol, uint256 initSupply, uint8 decimals) public ERC20(name, symbol) {
        _setupDecimals(decimals);
        _mint(msg.sender, initSupply);
    }

    function gimme() public {
        uint256 lastGimme = gimmes[msg.sender];
        require(now - lastGimme >= 1 hours, "please wait 1 hour");
        uint256 amount = uint256(10) ** decimals();
        gimmes[msg.sender] = now;
        _mint(msg.sender, amount);
    }
}
