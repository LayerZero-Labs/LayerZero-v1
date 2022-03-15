// SPDX-License-Identifier: BUSL-1.1

pragma solidity >=0.7.0;

interface ILayerZeroRelayer {
    // @notice query the relayer price for relaying the payload and its proof to the destination chain
    // @param _dstChainId - the destination endpoint identifier
    // @param _outboundProofType - the proof type identifier to specify proof to be relayed
    // @param _userApplication - the source sending contract address. relayers may apply price discrimination to user apps
    // @param _payloadSize - the length of the payload. it is an indicator of gas usage for relaying cross-chain messages
    // @param _adapterParams - optional parameters for extra service plugins, e.g. sending dust tokens at the destination chain
    function getPrice(uint16 _dstChainId, uint16 _outboundProofType, address _userApplication, uint _payloadSize, bytes calldata _adapterParams) external view returns (uint price);

    // @notice Ultra-Light Node notifies the Oracle of a new block information relaying request
    // @param _dstChainId - the destination endpoint identifier
    // @param _outboundProofType - the proof type identifier to specify the data to be relayed
    // @param _adapterParams - optional parameters for extra service plugins, e.g. sending dust tokens at the destination chain
    function notifyRelayer(uint16 _dstChainId, uint16 _outboundProofType, bytes calldata _adapterParams) external;

    // @notice query if the address is an approved actor for privileges like data submission and fee withdrawal etc.
    // @param _address - the address to be checked
    function isApproved(address _address) external view returns (bool approved);
}
