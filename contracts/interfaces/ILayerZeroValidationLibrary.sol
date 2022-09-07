// SPDX-License-Identifier: BUSL-1.1

pragma solidity >=0.7.0;
pragma abicoder v2;

import "../proof/utility/LayerZeroPacket.sol";

interface ILayerZeroValidationLibrary {
    function validateProof(bytes32 blockData, bytes calldata _data, uint _remoteAddressSize) external returns (LayerZeroPacket.Packet memory packet);
}
