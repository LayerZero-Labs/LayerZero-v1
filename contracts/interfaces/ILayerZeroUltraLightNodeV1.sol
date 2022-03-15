// SPDX-License-Identifier: BUSL-1.1

pragma solidity >=0.7.0;

interface ILayerZeroUltraLightNodeV1 {
    // a Relayer can execute the validateTransactionProof()
    function validateTransactionProof(uint16 _srcChainId, address _dstAddress, uint _gasLimit, bytes32 _lookupHash, bytes calldata _transactionProof) external;

    // an Oracle delivers the block data using updateHash()
    function updateHash(uint16 _remoteChainId, bytes32 _lookupHash, uint _confirmations, bytes32 _data) external;

    // can only withdraw the receivable of the msg.sender
    function withdrawNative(uint8 _type, address _owner, address payable _to, uint _amount) external;

    function withdrawZRO(address _to, uint _amount) external;

    // view functions
    function oracleQuotedAmount(address _oracle) external view returns (uint);

    function relayerQuotedAmount(address _relayer) external view returns (uint);
}
