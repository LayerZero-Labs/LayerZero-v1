// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.7.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// this is a MOCK
contract MockToken is ERC20 {
    // this is a MOCK
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {
        _mint(msg.sender, 1000000000000000000000);
    }

    // this is a MOCK
    function mint(address _to, uint _amount) public {
        _mint(_to, _amount);
    }

    //Mocked to imitate what happens if a transfer fails
    function transfer(address recipient, uint amount) public virtual override returns (bool) {
        require(recipient != address(0x1));
        _transfer(_msgSender(), recipient, amount);
        return true;
    }
}
