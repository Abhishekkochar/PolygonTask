//SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MDai is ERC20{

    uint256 public supply = 20000 * 1e18;

    constructor() ERC20("Mock Dai", "mDai"){
        _mint (msg.sender, supply);

    }
}