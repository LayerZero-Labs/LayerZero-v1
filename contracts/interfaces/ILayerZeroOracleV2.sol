// SPDX-License-Identifier: BUSL-1.1

pragma solidity >=0.7.0;

interface ILayerZeroOracleV2 {
    // @notice query price and assign jobs at the same time
    // @param _dstChainId - the destination endpoint identifier
    // @param _outboundProofType - the proof type identifier to specify proof to be relayed
    // @param _outboundBlockConfirmation - block confirmation delay before relaying blocks
    // @param _userApplication - the source sending contract address
    function assignJob(uint16 _dstChainId, uint16 _outboundProofType, uint64 _outboundBlockConfirmation, address _userApplication) external returns (uint price);

    // @notice query the oracle price for relaying block information to the destination chain
    // @param _dstChainId the destination endpoint identifier
    // @param _outboundProofType the proof type identifier to specify the data to be relayed
    // @param _outboundBlockConfirmation - block confirmation delay before relaying blocks
    // @param _userApplication - the source sending contract address
    function getFee(uint16 _dstChainId, uint16 _outboundProofType, uint64 _outboundBlockConfirmation, address _userApplication) external view returns (uint price);

    // @notice withdraw the accrued fee in ultra light node
    // @param _to - the fee receiver
    // @param _amount - the withdrawal amount
    function withdrawFee(address payable _to, uint _amount) external;
}
