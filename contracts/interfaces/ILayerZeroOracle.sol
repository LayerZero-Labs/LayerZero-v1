// SPDX-License-Identifier: BUSL-1.1

pragma solidity >=0.7.0;

interface ILayerZeroOracle {
    // @notice query the oracle price for relaying block information to the destination chain
    // @param _dstChainId the destination endpoint identifier
    // @param _outboundProofType the proof type identifier to specify the data to be relayed
    function getPrice(uint16 _dstChainId, uint16 _outboundProofType) external view returns (uint price);

    // @notice Ultra-Light Node notifies the Oracle of a new block information relaying request
    // @param _dstChainId the destination endpoint identifier
    // @param _outboundProofType the proof type identifier to specify the data to be relayed
    // @param _outboundBlockConfirmations the number of source chain block confirmation needed
    function notifyOracle(uint16 _dstChainId, uint16 _outboundProofType, uint64 _outboundBlockConfirmations) external;

    // @notice query if the address is an approved actor for privileges like data submission and fee withdrawal etc.
    // @param _address the address to be checked
    function isApproved(address _address) external view returns (bool approved);
}
