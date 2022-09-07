// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.7.0;
pragma abicoder v2;

import "./RLPDecode.sol";

library UltraLightNodeEVMDecoder {
    using RLPDecode for RLPDecode.RLPItem;
    using RLPDecode for RLPDecode.Iterator;

    struct Log {
        address contractAddress;
        bytes32 topicZero;
        bytes data;
    }

    function getReceiptLog(bytes memory data, uint logIndex) internal pure returns (Log memory) {
        RLPDecode.Iterator memory it = RLPDecode.toRlpItem(data).iterator();
        uint idx;
        while (it.hasNext()) {
            if (idx == 3) {
                return toReceiptLog(it.next().getItemByIndex(logIndex).toRlpBytes());
            } else it.next();
            idx++;
        }
        revert("no log index in receipt");
    }

    function toReceiptLog(bytes memory data) internal pure returns (Log memory) {
        RLPDecode.Iterator memory it = RLPDecode.toRlpItem(data).iterator();
        Log memory log;

        uint idx;
        while (it.hasNext()) {
            if (idx == 0) {
                log.contractAddress = it.next().toAddress();
            } else if (idx == 1) {
                RLPDecode.RLPItem memory item = it.next().getItemByIndex(0);
                log.topicZero = bytes32(item.toUint());
            } else if (idx == 2) log.data = it.next().toBytes();
            else it.next();
            idx++;
        }
        return log;
    }
}
