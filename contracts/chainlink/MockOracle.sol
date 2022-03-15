// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.7.6;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ERC677Receiver.sol";

contract MockOracle is ERC677Receiver {
    constructor() {}

    function onTokenTransfer(address _sender, uint _value, bytes memory _data) external override {}
}
