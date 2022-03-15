// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.7.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract LayerZeroTokenMock is ERC20 {
    constructor() ERC20("LayerZeroTokenMock", "LZTM") {
        _mint(msg.sender, 1_000_000 * 10**18);
    }
}
