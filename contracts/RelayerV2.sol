// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.7.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "hardhat-deploy/solc_0.7/proxy/Proxied.sol";

import "./interfaces/ILayerZeroRelayerV2.sol";
import "./interfaces/ILayerZeroUltraLightNodeV2.sol";

contract RelayerV2 is ReentrancyGuard, OwnableUpgradeable, Proxied, ILayerZeroRelayerV2 {
    using SafeERC20 for IERC20;
    using SafeMath for uint;
    using SafeMath for uint128;
    using SafeMath for uint64;

    ILayerZeroUltraLightNodeV2 public uln;
    address public stargateBridgeAddress;

    struct DstPrice {
        uint128 dstPriceRatio; // 10^10
        uint128 dstGasPriceInWei;
    }

    struct DstConfig {
        uint128 dstNativeAmtCap;
        uint64 baseGas;
        uint64 gasPerByte;
    }

    // [_chainId] => DstPriceData. change often
    mapping(uint16 => DstPrice) public dstPriceLookup;
    // [_chainId][_outboundProofType] => DstConfig. change much less often
    mapping(uint16 => mapping(uint16 => DstConfig)) public dstConfigLookup;
    mapping(address => bool) public approvedAddresses;

    event Withdraw(address to, uint amount);
    event ApproveAddress(address addr, bool approved);
    event AssignJob(uint totalFee);
    event ValueTransferFailed(address indexed to, uint indexed quantity);
    event SetDstPrice(uint16 chainId, uint128 dstPriceRatio, uint128 dstGasPriceInWei);
    event SetDstConfig(uint16 chainId, uint16 outboundProofType, uint128 dstNativeAmtCap, uint64 baseGas, uint64 gasPerByte);

    // new pauseable relayer
    bool public paused;

    // owner is always approved
    modifier onlyApproved() {
        if (owner() != msg.sender) {
            require(isApproved(msg.sender), "Relayer: not approved");
        }
        _;
    }

    function initialize(address _uln) public proxied initializer {
        __Ownable_init();
        uln = ILayerZeroUltraLightNodeV2(_uln);
        setApprovedAddress(address(this), true);
    }

    //----------------------------------------------------------------------------------
    // onlyApproved

    function setDstPrice(uint16 _chainId, uint128 _dstPriceRatio, uint128 _dstGasPriceInWei) external onlyApproved {
        dstPriceLookup[_chainId] = DstPrice(_dstPriceRatio, _dstGasPriceInWei);
        emit SetDstPrice(_chainId, _dstPriceRatio, _dstGasPriceInWei);
    }

    function setDstConfig(uint16 _chainId, uint16 _outboundProofType, uint128 _dstNativeAmtCap, uint64 _baseGas, uint64 _gasPerByte) external onlyApproved {
        dstConfigLookup[_chainId][_outboundProofType] = DstConfig(_dstNativeAmtCap, _baseGas, _gasPerByte);
        emit SetDstConfig(_chainId, _outboundProofType, _dstNativeAmtCap, _baseGas, _gasPerByte);
    }

    function setStargateAddress(address _stargateAddress) external onlyApproved {
        stargateBridgeAddress = _stargateAddress;
    }

    //----------------------------------------------------------------------------------
    // onlyOwner

    function setApprovedAddress(address _relayerAddress, bool _approve) public onlyOwner {
        approvedAddresses[_relayerAddress] = _approve;
        emit ApproveAddress(_relayerAddress, _approve);
    }

    function setPause(bool _paused) public onlyOwner {
        paused = _paused;
    }

    // txType 1
    // bytes  [2       32      ]
    // fields [txType  extraGas]
    // txType 2
    // bytes  [2       32        32            bytes[]         ]
    // fields [txType  extraGas  dstNativeAmt  dstNativeAddress]
    // User App Address is not used in this version
    function _getPrices(uint16 _dstChainId, uint16 _outboundProofType, address, bytes memory _adapterParameters) internal view returns (uint basePrice, uint pricePerByte) {
        require(!paused, "Admin: paused");
        // decoding the _adapterParameters - reverts if type 2 and there is no dstNativeAddress
        require(_adapterParameters.length == 34 || _adapterParameters.length > 66, "Relayer: wrong _adapterParameters size");
        uint16 txType;
        uint extraGas;
        assembly {
            txType := mload(add(_adapterParameters, 2))
            extraGas := mload(add(_adapterParameters, 34))
        }
        require(extraGas > 0, "Relayer: gas too low");
        require(txType == 1 || txType == 2, "Relayer: unsupported txType");

        DstPrice storage dstPrice = dstPriceLookup[_dstChainId];
        DstConfig storage dstConfig = dstConfigLookup[_dstChainId][_outboundProofType];

        uint totalRemoteToken; // = baseGas + extraGas + requiredNativeAmount
        if (txType == 2) {
            uint dstNativeAmt;
            assembly {
                dstNativeAmt := mload(add(_adapterParameters, 66))
            }
            require(dstConfig.dstNativeAmtCap >= dstNativeAmt, "Relayer: dstNativeAmt too large");
            totalRemoteToken = totalRemoteToken.add(dstNativeAmt);
        }
        // remoteGasTotal = dstGasPriceInWei * (baseGas + extraGas)
        uint remoteGasTotal = dstPrice.dstGasPriceInWei.mul(dstConfig.baseGas.add(extraGas));

        totalRemoteToken = totalRemoteToken.add(remoteGasTotal);

        // tokenConversionRate = dstPrice / localPrice
        // basePrice = totalRemoteToken * tokenConversionRate
        basePrice = totalRemoteToken.mul(dstPrice.dstPriceRatio).div(10**10);

        // pricePerByte = (dstGasPriceInWei * gasPerBytes) * tokenConversionRate
        pricePerByte = dstPrice.dstGasPriceInWei.mul(dstConfig.gasPerByte).mul(dstPrice.dstPriceRatio).div(10**10);
    }

    function getFee(uint16 _dstChainId, uint16 _outboundProofType, address _userApplication, uint _payloadSize, bytes calldata _adapterParams) external view override returns (uint) {
        require(_payloadSize <= 10000, "Relayer: _payloadSize tooooo big");
        (uint basePrice, uint pricePerByte) = _getPrices(_dstChainId, _outboundProofType, _userApplication, _adapterParams);
        return basePrice.add(_payloadSize.mul(pricePerByte));
    }

    function isApproved(address _relayerAddress) public view returns (bool) {
        return approvedAddresses[_relayerAddress];
    }

    function assignJob(uint16 _dstChainId, uint16 _outboundProofType, address _userApplication, uint _payloadSize, bytes calldata _adapterParams) external override returns (uint) {
        require(msg.sender == address(uln), "Relayer: invalid uln");
        require(_payloadSize <= 10000, "Relayer: _payloadSize tooooo big");
        (uint basePrice, uint pricePerByte) = _getPrices(_dstChainId, _outboundProofType, _userApplication, _adapterParams);
        uint totalFee = basePrice.add(_payloadSize.mul(pricePerByte));
        emit AssignJob(totalFee);
        return totalFee;
    }

    function withdrawFee(address payable _to, uint _amount) external override onlyApproved {
        uint totalFee = uln.accruedNativeFee(address(this));
        require(_amount <= totalFee, "Relayer: not enough fee for withdrawal");
        uln.withdrawNative(_to, _amount);
    }

    function validateTransactionProofV2(uint16 _srcChainId, address _dstAddress, uint _gasLimit, bytes32 _blockHash, bytes32 _data, bytes calldata _transactionProof, address payable _to) external payable onlyApproved nonReentrant {
        (bool sent, ) = _to.call{value: msg.value}("");
        //require(sent, "Relayer: failed to send ether");
        if (!sent) {
            emit ValueTransferFailed(_to, msg.value);
        }
        uln.validateTransactionProof(_srcChainId, _dstAddress, _gasLimit, _blockHash, _data, _transactionProof);
    }

    function validateTransactionProofV1(uint16 _srcChainId, address _dstAddress, uint _gasLimit, bytes32 _blockHash, bytes32 _data, bytes calldata _transactionProof) external onlyApproved nonReentrant {
        uln.validateTransactionProof(_srcChainId, _dstAddress, _gasLimit, _blockHash, _data, _transactionProof);
    }
}
