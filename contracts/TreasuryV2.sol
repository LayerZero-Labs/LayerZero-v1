// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.7.6;

import "./interfaces/ILayerZeroTreasury.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./interfaces/ILayerZeroUltraLightNodeV2.sol";

contract TreasuryV2 is ILayerZeroTreasury, Ownable {
    using SafeMath for uint;

    uint public nativeBP;
    uint public zroFee;
    bool public feeEnabled;
    bool public zroEnabled;

    ILayerZeroUltraLightNodeV2 public uln;

    event NativeBP(uint bp);
    event ZroFee(uint zroFee);
    event FeeEnabled(bool feeEnabled);
    event ZroEnabled(bool zroEnabled);

    constructor(address _ulnv2) {
        uln = ILayerZeroUltraLightNodeV2(_ulnv2);
    }

    function getFees(bool payInZro, uint relayerFee, uint oracleFee) external view override returns (uint) {
        if (feeEnabled) {
            if (payInZro) {
                require(zroEnabled, "LayerZero: ZRO is not enabled");
                return zroFee;
            } else {
                return relayerFee.add(oracleFee).mul(nativeBP).div(10000);
            }
        }
        return 0;
    }

    function setFeeEnabled(bool _feeEnabled) external onlyOwner {
        feeEnabled = _feeEnabled;
        emit FeeEnabled(_feeEnabled);
    }

    function setZroEnabled(bool _zroEnabled) external onlyOwner {
        zroEnabled = _zroEnabled;
        emit ZroEnabled(_zroEnabled);
    }

    function setNativeBP(uint _nativeBP) external onlyOwner {
        nativeBP = _nativeBP;
        emit NativeBP(_nativeBP);
    }

    function setZroFee(uint _zroFee) external onlyOwner {
        zroFee = _zroFee;
        emit ZroFee(_zroFee);
    }

    function withdrawZROFromULN(address _to, uint _amount) external onlyOwner {
        uln.withdrawZRO(_to, _amount);
    }

    function withdrawNativeFromULN(address payable _to, uint _amount) external onlyOwner {
        uln.withdrawNative(_to, _amount);
    }
}
