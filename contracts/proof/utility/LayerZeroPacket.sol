// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.7.6;

import "./Buffer.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

library LayerZeroPacket {
    using Buffer for Buffer.buffer;
    using SafeMath for uint;

    struct Packet {
        uint16 srcChainId;
        uint16 dstChainId;
        uint64 nonce;
        address dstAddress;
        bytes srcAddress;
        bytes32 ulnAddress;
        bytes payload;
    }

    function getPacket(
        bytes memory data,
        uint16 srcChain,
        uint sizeOfSrcAddress,
        bytes32 ulnAddress
    ) internal pure returns (LayerZeroPacket.Packet memory) {
        uint16 dstChainId;
        address dstAddress;
        uint size;
        uint64 nonce;

        // The log consists of the destination chain id and then a bytes payload
        //      0--------------------------------------------31
        // 0   |  total bytes size
        // 32  |  destination chain id
        // 64  |  bytes offset
        // 96  |  bytes array size
        // 128 |  payload
        assembly {
            dstChainId := mload(add(data, 32))
            size := mload(add(data, 96)) /// size of the byte array
            nonce := mload(add(data, 104)) // offset to convert to uint64  128  is index -24
            dstAddress := mload(add(data, sub(add(128, sizeOfSrcAddress), 4))) // offset to convert to address 12 -8
        }

        Buffer.buffer memory srcAddressBuffer;
        srcAddressBuffer.init(sizeOfSrcAddress);
        srcAddressBuffer.writeRawBytes(0, data, 136, sizeOfSrcAddress); // 128 + 8

        uint payloadSize = size.sub(28).sub(sizeOfSrcAddress);
        Buffer.buffer memory payloadBuffer;
        payloadBuffer.init(payloadSize);
        payloadBuffer.writeRawBytes(0, data, sizeOfSrcAddress.add(156), payloadSize); // 148 + 8
        return LayerZeroPacket.Packet(srcChain, dstChainId, nonce, dstAddress, srcAddressBuffer.buf, ulnAddress, payloadBuffer.buf);
    }

    function getPacketV2(
        bytes memory data,
        uint sizeOfSrcAddress,
        bytes32 ulnAddress
    ) internal pure returns (LayerZeroPacket.Packet memory) {
        // packet def: abi.encodePacked(nonce, srcChain, srcAddress, dstChain, dstAddress, payload);
        // data def: abi.encode(packet) = offset(32) + length(32) + packet
        //              if from EVM
        // 0 - 31       0 - 31          |  total bytes size
        // 32 - 63      32 - 63         |  location
        // 64 - 95      64 - 95         |  size of the packet
        // 96 - 103     96 - 103        |  nonce
        // 104 - 105    104 - 105       |  srcChainId
        // 106 - P      106 - 125       |  srcAddress, where P = 106 + sizeOfSrcAddress - 1,
        // P+1 - P+2    126 - 127       |  dstChainId
        // P+3 - P+22   128 - 147       |  dstAddress
        // P+23 - END   148 - END       |  payload

        // decode the packet
        uint256 realSize;
        uint64 nonce;
        uint16 srcChain;
        uint16 dstChain;
        address dstAddress;
        assembly {
            realSize := mload(add(data, 64))
            nonce := mload(add(data, 72)) // 104 - 32
            srcChain := mload(add(data, 74)) // 106 - 32
            dstChain := mload(add(data, add(76, sizeOfSrcAddress))) // P + 3 - 32 = 105 + size + 3 - 32 = 76 + size
            dstAddress := mload(add(data, add(96, sizeOfSrcAddress))) // P + 23 - 32 = 105 + size + 23 - 32 = 96 + size
        }

        require(srcChain != 0, "LayerZeroPacket: invalid packet");

        Buffer.buffer memory srcAddressBuffer;
        srcAddressBuffer.init(sizeOfSrcAddress);
        srcAddressBuffer.writeRawBytes(0, data, 106, sizeOfSrcAddress);

        uint nonPayloadSize = sizeOfSrcAddress.add(32);// 2 + 2 + 8 + 20, 32 + 20 = 52 if sizeOfSrcAddress == 20
        uint payloadSize = realSize.sub(nonPayloadSize);
        Buffer.buffer memory payloadBuffer;
        payloadBuffer.init(payloadSize);
        payloadBuffer.writeRawBytes(0, data, nonPayloadSize.add(96), payloadSize);

        return LayerZeroPacket.Packet(srcChain, dstChain, nonce, dstAddress, srcAddressBuffer.buf, ulnAddress, payloadBuffer.buf);
    }

    function getPacketV3(
        bytes memory data,
        uint sizeOfSrcAddress,
        bytes32 ulnAddress
    ) internal pure returns (LayerZeroPacket.Packet memory) {
        // data def: abi.encodePacked(nonce, srcChain, srcAddress, dstChain, dstAddress, payload);
        //              if from EVM
        // 0 - 31       0 - 31          |  total bytes size
        // 32 - 39      32 - 39         |  nonce
        // 40 - 41      40 - 41         |  srcChainId
        // 42 - P       42 - 61         |  srcAddress, where P = 41 + sizeOfSrcAddress,
        // P+1 - P+2    62 - 63         |  dstChainId
        // P+3 - P+22   64 - 83         |  dstAddress
        // P+23 - END   84 - END        |  payload

        // decode the packet
        uint256 realSize = data.length;
        uint nonPayloadSize = sizeOfSrcAddress.add(32);// 2 + 2 + 8 + 20, 32 + 20 = 52 if sizeOfSrcAddress == 20
        require(realSize >= nonPayloadSize, "LayerZeroPacket: invalid packet");
        uint payloadSize = realSize - nonPayloadSize;

        uint64 nonce;
        uint16 srcChain;
        uint16 dstChain;
        address dstAddress;
        assembly {
            nonce := mload(add(data, 8)) // 40 - 32
            srcChain := mload(add(data, 10)) // 42 - 32
            dstChain := mload(add(data, add(12, sizeOfSrcAddress))) // P + 3 - 32 = 41 + size + 3 - 32 = 12 + size
            dstAddress := mload(add(data, add(32, sizeOfSrcAddress))) // P + 23 - 32 = 41 + size + 23 - 32 = 32 + size
        }

        require(srcChain != 0, "LayerZeroPacket: invalid packet");

        Buffer.buffer memory srcAddressBuffer;
        srcAddressBuffer.init(sizeOfSrcAddress);
        srcAddressBuffer.writeRawBytes(0, data, 42, sizeOfSrcAddress);

        Buffer.buffer memory payloadBuffer;
        if (payloadSize > 0) {
            payloadBuffer.init(payloadSize);
            payloadBuffer.writeRawBytes(0, data, nonPayloadSize.add(32), payloadSize);
        }

        return LayerZeroPacket.Packet(srcChain, dstChain, nonce, dstAddress, srcAddressBuffer.buf, ulnAddress, payloadBuffer.buf);
    }
}
