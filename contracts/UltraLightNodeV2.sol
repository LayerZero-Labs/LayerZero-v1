// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.7.6;
pragma abicoder v2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "./interfaces/ILayerZeroValidationLibrary.sol";
import "./interfaces/ILayerZeroReceiver.sol";
import "./interfaces/ILayerZeroTreasury.sol";
import "./interfaces/ILayerZeroEndpoint.sol";
// v2
import "./interfaces/ILayerZeroMessagingLibraryV2.sol";
import "./interfaces/ILayerZeroOracleV2.sol";
import "./interfaces/ILayerZeroUltraLightNodeV2.sol";
import "./interfaces/ILayerZeroRelayerV2.sol";
import "./NonceContract.sol";

contract UltraLightNodeV2 is ILayerZeroMessagingLibraryV2, ILayerZeroUltraLightNodeV2, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using SafeMath for uint;

    // Application config
    uint public constant CONFIG_TYPE_INBOUND_PROOF_LIBRARY_VERSION = 1;
    uint public constant CONFIG_TYPE_INBOUND_BLOCK_CONFIRMATIONS = 2;
    uint public constant CONFIG_TYPE_RELAYER = 3;
    uint public constant CONFIG_TYPE_OUTBOUND_PROOF_TYPE = 4;
    uint public constant CONFIG_TYPE_OUTBOUND_BLOCK_CONFIRMATIONS = 5;
    uint public constant CONFIG_TYPE_ORACLE = 6;

    // Token and Contracts
    IERC20 public layerZeroToken;
    ILayerZeroTreasury public treasuryContract;

    mapping(address => uint) public nativeFees;
    uint public treasuryZROFees;

    // User Application
    mapping(address => mapping(uint16 => ApplicationConfiguration)) public appConfig; // app address => chainId => config
    mapping(uint16 => ApplicationConfiguration) public defaultAppConfig; // default UA settings if no version specified
    mapping(uint16 => mapping(uint16 => bytes)) public defaultAdapterParams;

    // Validation
    mapping(uint16 => mapping(uint16 => address)) public inboundProofLibrary; // chainId => library Id => inboundProofLibrary contract
    mapping(uint16 => uint16) public maxInboundProofLibrary; // chainId => inboundProofLibrary
    mapping(uint16 => mapping(uint16 => bool)) public supportedOutboundProof; // chainId => outboundProofType => enabled
    mapping(uint16 => uint) public chainAddressSizeMap;
    mapping(address => mapping(uint16 => mapping(bytes32 => mapping(bytes32 => uint)))) public hashLookup; //[oracle][srcChainId][blockhash][datahash] -> confirmation
    mapping(uint16 => bytes32) public ulnLookup; // remote ulns

    ILayerZeroEndpoint public immutable endpoint;
    uint16 public immutable localChainId;
    NonceContract public immutable nonceContract;

    constructor(address _endpoint, address _nonceContract, uint16 _localChainId) {
        require(_endpoint != address(0x0), "LayerZero: endpoint cannot be zero address");
        require(_nonceContract != address(0x0), "LayerZero: nonceContract cannot be zero address");
        ILayerZeroEndpoint lzEndpoint = ILayerZeroEndpoint(_endpoint);
        localChainId = _localChainId;
        endpoint = lzEndpoint;
        nonceContract = NonceContract(_nonceContract);
    }

    // only the endpoint can call SEND() and setConfig()
    modifier onlyEndpoint() {
        require(address(endpoint) == msg.sender, "LayerZero: only endpoint");
        _;
    }

    //----------------------------------------------------------------------------------
    // PROTOCOL
    function validateTransactionProof(uint16 _srcChainId, address _dstAddress, uint _gasLimit, bytes32 _lookupHash, bytes32 _blockData, bytes calldata _transactionProof) external override {
        // retrieve UA's configuration using the _dstAddress from arguments.
        ApplicationConfiguration memory uaConfig = _getAppConfig(_srcChainId, _dstAddress);

        // assert that the caller == UA's relayer
        require(uaConfig.relayer == msg.sender, "LayerZero: invalid relayer");

        LayerZeroPacket.Packet memory _packet;
        uint remoteAddressSize = chainAddressSizeMap[_srcChainId];
        require(remoteAddressSize != 0, "LayerZero: incorrect remote address size");
        {
            // assert that the data submitted by UA's oracle have no fewer confirmations than UA's configuration
            uint storedConfirmations = hashLookup[uaConfig.oracle][_srcChainId][_lookupHash][_blockData];
            require(storedConfirmations > 0 && storedConfirmations >= uaConfig.inboundBlockConfirmations, "LayerZero: not enough block confirmations");

            // decode
            address inboundProofLib = inboundProofLibrary[_srcChainId][uaConfig.inboundProofLibraryVersion];
            _packet = ILayerZeroValidationLibrary(inboundProofLib).validateProof(_blockData, _transactionProof, remoteAddressSize);
        }

        // packet content assertion
        require(ulnLookup[_srcChainId] == _packet.ulnAddress && _packet.ulnAddress != bytes32(0), "LayerZero: invalid _packet.ulnAddress");
        require(_packet.srcChainId == _srcChainId, "LayerZero: invalid srcChain Id");
        // failsafe because the remoteAddress size being passed into validateProof trims the address this should not hit
        require(_packet.srcAddress.length == remoteAddressSize, "LayerZero: invalid srcAddress size");
        require(_packet.dstChainId == localChainId, "LayerZero: invalid dstChain Id");
        require(_packet.dstAddress == _dstAddress, "LayerZero: invalid dstAddress");

        // if the dst is not a contract, then emit and return early. This will break inbound nonces, but this particular
        // path is already broken and wont ever be able to deliver anyways
        if (!_isContract(_dstAddress)) {
            emit InvalidDst(_packet.srcChainId, _packet.srcAddress, _packet.dstAddress, _packet.nonce, keccak256(_packet.payload));
            return;
        }

        bytes memory pathData = abi.encodePacked(_packet.srcAddress, _packet.dstAddress);
        emit PacketReceived(_packet.srcChainId, _packet.srcAddress, _packet.dstAddress, _packet.nonce, keccak256(_packet.payload));
        endpoint.receivePayload(_srcChainId, pathData, _dstAddress, _packet.nonce, _gasLimit, _packet.payload);
    }

    function send(address _ua, uint64, uint16 _dstChainId, bytes calldata _path, bytes calldata _payload, address payable _refundAddress, address _zroPaymentAddress, bytes calldata _adapterParams) external payable override onlyEndpoint {
        address ua = _ua;
        uint16 dstChainId = _dstChainId;
        require(ulnLookup[dstChainId] != bytes32(0), "LayerZero: dstChainId does not exist");

        bytes memory dstAddress;
        uint64 nonce;
        // code block for solving 'Stack Too Deep'
        {
            uint chainAddressSize = chainAddressSizeMap[dstChainId];
            // path = remoteAddress + localAddress
            require(chainAddressSize != 0 && _path.length == 20 + chainAddressSize, "LayerZero: incorrect remote address size");
            address srcInPath;
            bytes memory path = _path; // copy to memory
            assembly {
                srcInPath := mload(add(add(path, 20), chainAddressSize)) // chainAddressSize + 20
            }
            require(ua == srcInPath, "LayerZero: wrong path data");
            dstAddress = _path[0:chainAddressSize];
            nonce = nonceContract.increment(dstChainId, ua, path);
        }

        bytes memory payload = _payload;
        ApplicationConfiguration memory uaConfig = _getAppConfig(dstChainId, ua);

        // compute all the fees
        uint relayerFee = _handleRelayer(dstChainId, uaConfig, ua, payload.length, _adapterParams);
        uint oracleFee = _handleOracle(dstChainId, uaConfig, ua);
        uint nativeProtocolFee = _handleProtocolFee(relayerFee, oracleFee, ua, _zroPaymentAddress);

        // total native fee, does not include ZRO protocol fee
        uint totalNativeFee = relayerFee.add(oracleFee).add(nativeProtocolFee);

        // assert the user has attached enough native token for this address
        require(totalNativeFee <= msg.value, "LayerZero: not enough native for fees");
        // refund if they send too much
        uint amount = msg.value.sub(totalNativeFee);
        if (amount > 0) {
            (bool success, ) = _refundAddress.call{value: amount}("");
            require(success, "LayerZero: failed to refund");
        }

        // emit the data packet
        bytes memory encodedPayload = abi.encodePacked(nonce, localChainId, ua, dstChainId, dstAddress, payload);
        emit Packet(encodedPayload);
    }

    function _handleRelayer(uint16 _dstChainId, ApplicationConfiguration memory _uaConfig, address _ua, uint _payloadSize, bytes memory _adapterParams) internal returns (uint relayerFee) {
        if (_adapterParams.length == 0) {
            _adapterParams = defaultAdapterParams[_dstChainId][_uaConfig.outboundProofType];
        }
        address relayerAddress = _uaConfig.relayer;
        ILayerZeroRelayerV2 relayer = ILayerZeroRelayerV2(relayerAddress);
        relayerFee = relayer.assignJob(_dstChainId, _uaConfig.outboundProofType, _ua, _payloadSize, _adapterParams);

        _creditNativeFee(relayerAddress, relayerFee);

        // emit the param events
        emit RelayerParams(_adapterParams, _uaConfig.outboundProofType);
    }

    function _handleOracle(uint16 _dstChainId, ApplicationConfiguration memory _uaConfig, address _ua) internal returns (uint oracleFee) {
        address oracleAddress = _uaConfig.oracle;
        oracleFee = ILayerZeroOracleV2(oracleAddress).assignJob(_dstChainId, _uaConfig.outboundProofType, _uaConfig.outboundBlockConfirmations, _ua);

        _creditNativeFee(oracleAddress, oracleFee);
    }

    function _handleProtocolFee(uint _relayerFee, uint _oracleFee, address _ua, address _zroPaymentAddress) internal returns (uint protocolNativeFee) {
        // if no ZRO token or not specifying a payment address, pay in native token
        bool payInNative = _zroPaymentAddress == address(0x0) || address(layerZeroToken) == address(0x0);
        uint protocolFee = treasuryContract.getFees(!payInNative, _relayerFee, _oracleFee);

        if (protocolFee > 0) {
            if (payInNative) {
                address treasuryAddress = address(treasuryContract);
                _creditNativeFee(treasuryAddress, protocolFee);
                protocolNativeFee = protocolFee;
            } else {
                // zro payment address must equal the ua or the tx.origin otherwise the transaction reverts
                require(_zroPaymentAddress == _ua || _zroPaymentAddress == tx.origin, "LayerZero: must be paid by sender or origin");

                // transfer the LayerZero token to this contract from the payee
                layerZeroToken.safeTransferFrom(_zroPaymentAddress, address(this), protocolFee);

                treasuryZROFees = treasuryZROFees.add(protocolFee);
            }
        }
    }

    function _creditNativeFee(address _receiver, uint _amount) internal {
        nativeFees[_receiver] = nativeFees[_receiver].add(_amount);
    }

    // Can be called by any address to update a block header
    // can only upload new block data or the same block data with more confirmations
    function updateHash(uint16 _srcChainId, bytes32 _lookupHash, uint _confirmations, bytes32 _blockData) external override {
        uint storedConfirmations = hashLookup[msg.sender][_srcChainId][_lookupHash][_blockData];

        // if it has a record, requires a larger confirmation.
        require(storedConfirmations < _confirmations, "LayerZero: oracle data can only update if it has more confirmations");

        // set the new information into storage
        hashLookup[msg.sender][_srcChainId][_lookupHash][_blockData] = _confirmations;

        emit HashReceived(_srcChainId, msg.sender, _lookupHash, _blockData, _confirmations);
    }

    //----------------------------------------------------------------------------------
    // Other Library Interfaces

    // default to DEFAULT setting if ZERO value
    function getAppConfig(uint16 _remoteChainId, address _ua) external view override returns (ApplicationConfiguration memory) {
        return _getAppConfig(_remoteChainId, _ua);
    }

    function _getAppConfig(uint16 _remoteChainId, address _ua) internal view returns (ApplicationConfiguration memory) {
        ApplicationConfiguration memory config = appConfig[_ua][_remoteChainId];
        ApplicationConfiguration storage defaultConfig = defaultAppConfig[_remoteChainId];

        if (config.inboundProofLibraryVersion == 0) {
            config.inboundProofLibraryVersion = defaultConfig.inboundProofLibraryVersion;
        }

        if (config.inboundBlockConfirmations == 0) {
            config.inboundBlockConfirmations = defaultConfig.inboundBlockConfirmations;
        }

        if (config.relayer == address(0x0)) {
            config.relayer = defaultConfig.relayer;
        }

        if (config.outboundProofType == 0) {
            config.outboundProofType = defaultConfig.outboundProofType;
        }

        if (config.outboundBlockConfirmations == 0) {
            config.outboundBlockConfirmations = defaultConfig.outboundBlockConfirmations;
        }

        if (config.oracle == address(0x0)) {
            config.oracle = defaultConfig.oracle;
        }

        return config;
    }

    function setConfig(uint16 _remoteChainId, address _ua, uint _configType, bytes calldata _config) external override onlyEndpoint {
        ApplicationConfiguration storage uaConfig = appConfig[_ua][_remoteChainId];
        if (_configType == CONFIG_TYPE_INBOUND_PROOF_LIBRARY_VERSION) {
            uint16 inboundProofLibraryVersion = abi.decode(_config, (uint16));
            require(inboundProofLibraryVersion <= maxInboundProofLibrary[_remoteChainId], "LayerZero: invalid inbound proof library version");
            uaConfig.inboundProofLibraryVersion = inboundProofLibraryVersion;
        } else if (_configType == CONFIG_TYPE_INBOUND_BLOCK_CONFIRMATIONS) {
            uint64 blockConfirmations = abi.decode(_config, (uint64));
            uaConfig.inboundBlockConfirmations = blockConfirmations;
        } else if (_configType == CONFIG_TYPE_RELAYER) {
            address relayer = abi.decode(_config, (address));
            uaConfig.relayer = relayer;
        } else if (_configType == CONFIG_TYPE_OUTBOUND_PROOF_TYPE) {
            uint16 outboundProofType = abi.decode(_config, (uint16));
            require(supportedOutboundProof[_remoteChainId][outboundProofType] || outboundProofType == 0, "LayerZero: invalid outbound proof type");
            uaConfig.outboundProofType = outboundProofType;
        } else if (_configType == CONFIG_TYPE_OUTBOUND_BLOCK_CONFIRMATIONS) {
            uint64 blockConfirmations = abi.decode(_config, (uint64));
            uaConfig.outboundBlockConfirmations = blockConfirmations;
        } else if (_configType == CONFIG_TYPE_ORACLE) {
            address oracle = abi.decode(_config, (address));
            uaConfig.oracle = oracle;
        } else {
            revert("LayerZero: Invalid config type");
        }

        emit AppConfigUpdated(_ua, _configType, _config);
    }

    function getConfig(uint16 _remoteChainId, address _ua, uint _configType) external view override returns (bytes memory) {
        ApplicationConfiguration storage uaConfig = appConfig[_ua][_remoteChainId];

        if (_configType == CONFIG_TYPE_INBOUND_PROOF_LIBRARY_VERSION) {
            if (uaConfig.inboundProofLibraryVersion == 0) {
                return abi.encode(defaultAppConfig[_remoteChainId].inboundProofLibraryVersion);
            }
            return abi.encode(uaConfig.inboundProofLibraryVersion);
        } else if (_configType == CONFIG_TYPE_INBOUND_BLOCK_CONFIRMATIONS) {
            if (uaConfig.inboundBlockConfirmations == 0) {
                return abi.encode(defaultAppConfig[_remoteChainId].inboundBlockConfirmations);
            }
            return abi.encode(uaConfig.inboundBlockConfirmations);
        } else if (_configType == CONFIG_TYPE_RELAYER) {
            if (uaConfig.relayer == address(0x0)) {
                return abi.encode(defaultAppConfig[_remoteChainId].relayer);
            }
            return abi.encode(uaConfig.relayer);
        } else if (_configType == CONFIG_TYPE_OUTBOUND_PROOF_TYPE) {
            if (uaConfig.outboundProofType == 0) {
                return abi.encode(defaultAppConfig[_remoteChainId].outboundProofType);
            }
            return abi.encode(uaConfig.outboundProofType);
        } else if (_configType == CONFIG_TYPE_OUTBOUND_BLOCK_CONFIRMATIONS) {
            if (uaConfig.outboundBlockConfirmations == 0) {
                return abi.encode(defaultAppConfig[_remoteChainId].outboundBlockConfirmations);
            }
            return abi.encode(uaConfig.outboundBlockConfirmations);
        } else if (_configType == CONFIG_TYPE_ORACLE) {
            if (uaConfig.oracle == address(0x0)) {
                return abi.encode(defaultAppConfig[_remoteChainId].oracle);
            }
            return abi.encode(uaConfig.oracle);
        } else {
            revert("LayerZero: Invalid config type");
        }
    }

    // returns the native fee the UA pays to cover fees
    function estimateFees(uint16 _dstChainId, address _ua, bytes calldata _payload, bool _payInZRO, bytes calldata _adapterParams) external view override returns (uint nativeFee, uint zroFee) {
        ApplicationConfiguration memory uaConfig = _getAppConfig(_dstChainId, _ua);

        // Relayer Fee
        bytes memory adapterParams;
        if (_adapterParams.length > 0) {
            adapterParams = _adapterParams;
        } else {
            adapterParams = defaultAdapterParams[_dstChainId][uaConfig.outboundProofType];
        }
        uint relayerFee = ILayerZeroRelayerV2(uaConfig.relayer).getFee(_dstChainId, uaConfig.outboundProofType, _ua, _payload.length, adapterParams);

        // Oracle Fee
        address ua = _ua; // stack too deep
        uint oracleFee = ILayerZeroOracleV2(uaConfig.oracle).getFee(_dstChainId, uaConfig.outboundProofType, uaConfig.outboundBlockConfirmations, ua);

        // LayerZero Fee
        uint protocolFee = treasuryContract.getFees(_payInZRO, relayerFee, oracleFee);
        _payInZRO ? zroFee = protocolFee : nativeFee = protocolFee;

        // return the sum of fees
        nativeFee = nativeFee.add(relayerFee).add(oracleFee);
    }

    //---------------------------------------------------------------------------
    // Claim Fees

    // universal withdraw ZRO token function
    function withdrawZRO(address _to, uint _amount) external override nonReentrant {
        require(msg.sender == address(treasuryContract), "LayerZero: only treasury");
        treasuryZROFees = treasuryZROFees.sub(_amount);
        layerZeroToken.safeTransfer(_to, _amount);
        emit WithdrawZRO(msg.sender, _to, _amount);
    }

    // universal withdraw native token function.
    // the source contract should perform all the authentication control
    function withdrawNative(address payable _to, uint _amount) external override nonReentrant {
        require(_to != address(0x0), "LayerZero: _to cannot be zero address");
        nativeFees[msg.sender] = nativeFees[msg.sender].sub(_amount);

        (bool success, ) = _to.call{value: _amount}("");
        require(success, "LayerZero: withdraw failed");
        emit WithdrawNative(msg.sender, _to, _amount);
    }

    //---------------------------------------------------------------------------
    // Owner calls, configuration only.
    function setLayerZeroToken(address _layerZeroToken) external onlyOwner {
        require(_layerZeroToken != address(0x0), "LayerZero: _layerZeroToken cannot be zero address");
        layerZeroToken = IERC20(_layerZeroToken);
        emit SetLayerZeroToken(_layerZeroToken);
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0x0), "LayerZero: treasury cannot be zero address");
        treasuryContract = ILayerZeroTreasury(_treasury);
        emit SetTreasury(_treasury);
    }

    function addInboundProofLibraryForChain(uint16 _chainId, address _library) external onlyOwner {
        require(_library != address(0x0), "LayerZero: library cannot be zero address");
        uint16 libId = maxInboundProofLibrary[_chainId];
        require(libId < 65535, "LayerZero: can not add new library");
        maxInboundProofLibrary[_chainId] = ++libId;
        inboundProofLibrary[_chainId][libId] = _library;
        emit AddInboundProofLibraryForChain(_chainId, _library);
    }

    function enableSupportedOutboundProof(uint16 _chainId, uint16 _proofType) external onlyOwner {
        supportedOutboundProof[_chainId][_proofType] = true;
        emit EnableSupportedOutboundProof(_chainId, _proofType);
    }

    function setDefaultConfigForChainId(uint16 _chainId, uint16 _inboundProofLibraryVersion, uint64 _inboundBlockConfirmations, address _relayer, uint16 _outboundProofType, uint64 _outboundBlockConfirmations, address _oracle) external onlyOwner {
        require(_inboundProofLibraryVersion <= maxInboundProofLibrary[_chainId] && _inboundProofLibraryVersion > 0, "LayerZero: invalid inbound proof library version");
        require(_inboundBlockConfirmations > 0, "LayerZero: invalid inbound block confirmation");
        require(_relayer != address(0x0), "LayerZero: invalid relayer address");
        require(supportedOutboundProof[_chainId][_outboundProofType], "LayerZero: invalid outbound proof type");
        require(_outboundBlockConfirmations > 0, "LayerZero: invalid outbound block confirmation");
        require(_oracle != address(0x0), "LayerZero: invalid oracle address");
        defaultAppConfig[_chainId] = ApplicationConfiguration(_inboundProofLibraryVersion, _inboundBlockConfirmations, _relayer, _outboundProofType, _outboundBlockConfirmations, _oracle);
        emit SetDefaultConfigForChainId(_chainId, _inboundProofLibraryVersion, _inboundBlockConfirmations, _relayer, _outboundProofType, _outboundBlockConfirmations, _oracle);
    }

    function setDefaultAdapterParamsForChainId(uint16 _chainId, uint16 _proofType, bytes calldata _adapterParams) external onlyOwner {
        defaultAdapterParams[_chainId][_proofType] = _adapterParams;
        emit SetDefaultAdapterParamsForChainId(_chainId, _proofType, _adapterParams);
    }

    function setRemoteUln(uint16 _remoteChainId, bytes32 _remoteUln) external onlyOwner {
        require(ulnLookup[_remoteChainId] == bytes32(0), "LayerZero: remote uln already set");
        ulnLookup[_remoteChainId] = _remoteUln;
        emit SetRemoteUln(_remoteChainId, _remoteUln);
    }

    function setChainAddressSize(uint16 _chainId, uint _size) external onlyOwner {
        require(chainAddressSizeMap[_chainId] == 0, "LayerZero: remote chain address size already set");
        chainAddressSizeMap[_chainId] = _size;
        emit SetChainAddressSize(_chainId, _size);
    }

    //----------------------------------------------------------------------------------
    // view functions

    function accruedNativeFee(address _address) external view override returns (uint) {
        return nativeFees[_address];
    }

    function getOutboundNonce(uint16 _chainId, bytes calldata _path) external view override returns (uint64) {
        return nonceContract.outboundNonce(_chainId, _path);
    }

    function _isContract(address addr) internal view returns (bool) {
        uint size;
        assembly {
            size := extcodesize(addr)
        }
        return size != 0;
    }
}
