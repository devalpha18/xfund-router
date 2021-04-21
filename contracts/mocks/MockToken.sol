// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * Mock token for unit testing
 * @dev {ERC20} token
 */
contract MockToken is ERC20 {
    using SafeMath for uint256;

    uint8 private decs;

    /**
     * See {ERC20-constructor}.
     */
    constructor(string memory name, string memory symbol, uint256 initSupply, uint8 _decs) ERC20(name, symbol) {
        decs = _decs;
        if(initSupply > 0) {
            _mint(msg.sender, initSupply);
        }
    }

    function decimals() public view override returns (uint8) {
        return decs;
    }

    function gimme() external {
        uint256 amount = uint256(10).mul(uint256(10) ** decimals());
        _mint(msg.sender, amount);
    }
}
