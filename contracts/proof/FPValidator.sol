// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.7.6;
pragma abicoder v2;

import "./utility/LayerZeroPacket.sol";
import "../interfaces/ILayerZeroValidationLibrary.sol";
import "../interfaces/IValidationLibraryHelperV2.sol";

interface IStargate {
    // Stargate objects for abi encoding / decoding
    struct SwapObj {
        uint amount;
        uint eqFee;
        uint eqReward;
        uint lpFee;
        uint protocolFee;
        uint lkbRemove;
    }

    struct CreditObj {
        uint credits;
        uint idealBalance;
    }
}

contract FPValidator is ILayerZeroValidationLibrary, IValidationLibraryHelperV2 {
    uint8 public proofType = 2;
    uint8 public utilsVersion = 1;

    address public immutable stargateBridgeAddress;
    address public immutable stargateTokenAddress;

    constructor(address _stargateBridgeAddress, address _stargateTokenAddress) {
        stargateBridgeAddress = _stargateBridgeAddress;
        stargateTokenAddress = _stargateTokenAddress;
    }

    function validateProof(bytes32 _packetHash, bytes calldata _transactionProof, uint _remoteAddressSize) external view override returns (LayerZeroPacket.Packet memory packet) {
        require(_remoteAddressSize > 0, "ProofLib: invalid address size");
        // _transactionProof = srcUlnAddress (32 bytes) + lzPacket
        require(_transactionProof.length > 32 && keccak256(_transactionProof) == _packetHash, "ProofLib: invalid transaction proof");

        bytes memory ulnAddressBytes = bytes(_transactionProof[0:32]);
        bytes32 ulnAddress;
        assembly {
            ulnAddress := mload(add(ulnAddressBytes, 32))
        }
        packet = LayerZeroPacket.getPacketV3(_transactionProof[32:], _remoteAddressSize, ulnAddress);

        if (packet.dstAddress == stargateBridgeAddress) packet.payload = _secureStgPayload(packet.payload);
        if (packet.dstAddress == stargateTokenAddress) packet.payload = _secureStgTokenPayload(packet.payload);

        return packet;
    }

    function _secureStgTokenPayload(bytes memory _payload) internal pure returns (bytes memory) {
        (bytes memory toAddressBytes, uint qty) = abi.decode(_payload, (bytes, uint));

        address toAddress = address(0);
        if (toAddressBytes.length > 0) {
            assembly {
                toAddress := mload(add(toAddressBytes, 20))
            }
        }

        if (toAddress == address(0)) {
            address deadAddress = address(0x000000000000000000000000000000000000dEaD);
            bytes memory newToAddressBytes = abi.encodePacked(deadAddress);
            return abi.encode(newToAddressBytes, qty);
        }

        // default to return the original payload
        return _payload;
    }

    function _secureStgPayload(bytes memory _payload) internal view returns (bytes memory) {
        // functionType is uint8 even though the encoding will take up the side of uint256
        uint8 functionType;
        assembly {
            functionType := mload(add(_payload, 32))
        }

        // TYPE_SWAP_REMOTE == 1 && only if the payload has a payload
        // only swapRemote inside of stargate can call sgReceive on an user supplied to address
        // thus we do not care about the other type functions even if the toAddress is overly long.
        if (functionType == 1) {
            // decode the _payload with its types
            (, uint srcPoolId, uint dstPoolId, uint dstGasForCall, IStargate.CreditObj memory c, IStargate.SwapObj memory s, bytes memory toAddressBytes, bytes memory contractCallPayload) = abi.decode(_payload, (uint8, uint, uint, uint, IStargate.CreditObj, IStargate.SwapObj, bytes, bytes));

            // if contractCallPayload.length > 0 need to check if the to address is a contract or not
            if (contractCallPayload.length > 0) {
                // otherwise, need to check if the payload can be delivered to the toAddress
                address toAddress = address(0);
                if (toAddressBytes.length > 0) {
                    assembly {
                        toAddress := mload(add(toAddressBytes, 20))
                    }
                }

                // check if the toAddress is a contract. We are not concerned about addresses that pretend to be wallets. because worst case we just delete their payload if being malicious
                // we can guarantee that if a size > 0, then the contract is definitely a contract address in this context
                uint size;
                assembly {
                    size := extcodesize(toAddress)
                }

                if (size == 0) {
                    // size == 0 indicates its not a contract, payload wont be delivered
                    // secure the _payload to make sure funds can be delivered to the toAddress
                    bytes memory newToAddressBytes = abi.encodePacked(toAddress);
                    bytes memory securePayload = abi.encode(functionType, srcPoolId, dstPoolId, dstGasForCall, c, s, newToAddressBytes, bytes(""));
                    return securePayload;
                }
            }
        }

        // default to return the original payload
        return _payload;
    }

    function secureStgTokenPayload(bytes memory _payload) external pure returns (bytes memory) {
        return _secureStgTokenPayload(_payload);
    }

    function secureStgPayload(bytes memory _payload) external view returns (bytes memory) {
        return _secureStgPayload(_payload);
    }

    function getUtilsVersion() external view override returns (uint8) {
        return utilsVersion;
    }

    function getProofType() external view override returns (uint8) {
        return proofType;
    }

    function getVerifyLog(bytes32, uint[] calldata, uint, bytes[] calldata proof) external pure override returns (ULNLog memory log) {}

    function getPacket(bytes memory data, uint sizeOfSrcAddress, bytes32 ulnAddress) external pure override returns (LayerZeroPacket.Packet memory) {
        return LayerZeroPacket.getPacketV3(data, sizeOfSrcAddress, ulnAddress);
    }
}
