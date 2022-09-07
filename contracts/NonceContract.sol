// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.7.6;

import "./interfaces/ILayerZeroEndpoint.sol";

contract NonceContract {
    ILayerZeroEndpoint public immutable endpoint;
    // outboundNonce = [dstChainId][remoteAddress + localAddress]
    mapping(uint16 => mapping(bytes => uint64)) public outboundNonce;

    constructor(address _endpoint) {
        endpoint = ILayerZeroEndpoint(_endpoint);
    }

    function increment(uint16 _chainId, address _ua, bytes calldata _path) external returns (uint64) {
        require(endpoint.getSendLibraryAddress(_ua) == msg.sender, "NonceContract: msg.sender is not valid sendlibrary");
        return ++outboundNonce[_chainId][_path];
    }
}
