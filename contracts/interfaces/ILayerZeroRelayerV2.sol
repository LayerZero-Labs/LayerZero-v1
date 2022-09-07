// SPDX-License-Identifier: BUSL-1.1

pragma solidity >=0.7.0;

interface ILayerZeroRelayerV2 {
    // @notice query price and assign jobs at the same time
    // @param _dstChainId - the destination endpoint identifier
    // @param _outboundProofType - the proof type identifier to specify proof to be relayed
    // @param _userApplication - the source sending contract address. relayers may apply price discrimination to user apps
    // @param _payloadSize - the length of the payload. it is an indicator of gas usage for relaying cross-chain messages
    // @param _adapterParams - optional parameters for extra service plugins, e.g. sending dust tokens at the destination chain
    function assignJob(uint16 _dstChainId, uint16 _outboundProofType, address _userApplication, uint _payloadSize, bytes calldata _adapterParams) external returns (uint price);

    // @notice query the relayer price for relaying the payload and its proof to the destination chain
    // @param _dstChainId - the destination endpoint identifier
    // @param _outboundProofType - the proof type identifier to specify proof to be relayed
    // @param _userApplication - the source sending contract address. relayers may apply price discrimination to user apps
    // @param _payloadSize - the length of the payload. it is an indicator of gas usage for relaying cross-chain messages
    // @param _adapterParams - optional parameters for extra service plugins, e.g. sending dust tokens at the destination chain
    function getFee(uint16 _dstChainId, uint16 _outboundProofType, address _userApplication, uint _payloadSize, bytes calldata _adapterParams) external view returns (uint price);

    // @notice withdraw the accrued fee in ultra light node
    // @param _to - the fee receiver
    // @param _amount - the withdrawal amount
    function withdrawFee(address payable _to, uint _amount) external;
}
