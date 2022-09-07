// SPDX-License-Identifier: BUSL-1.1

pragma solidity >=0.7.0;
pragma abicoder v2;

import "../proof/utility/LayerZeroPacket.sol";

interface IValidationLibraryHelperV2 {
    struct ULNLog {
        bytes32 contractAddress;
        bytes32 topicZeroSig;
        bytes data;
    }

    function getVerifyLog(bytes32 hashRoot, uint[] calldata receiptSlotIndex, uint logIndex, bytes[] calldata proof) external pure returns (ULNLog memory);

    function getPacket(bytes calldata data, uint sizeOfSrcAddress, bytes32 ulnAddress) external pure returns (LayerZeroPacket.Packet memory);

    function getUtilsVersion() external view returns (uint8);

    function getProofType() external view returns (uint8);
}
