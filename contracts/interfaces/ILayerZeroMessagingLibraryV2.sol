// SPDX-License-Identifier: BUSL-1.1

pragma solidity >=0.7.0;

import "./ILayerZeroUserApplicationConfig.sol";
import "./ILayerZeroMessagingLibrary.sol";

interface ILayerZeroMessagingLibraryV2 is ILayerZeroMessagingLibrary {
    function getOutboundNonce(uint16 _chainId, bytes calldata _path) external view returns (uint64);
}
