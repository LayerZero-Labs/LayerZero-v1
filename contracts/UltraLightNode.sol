// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.7.6;
pragma abicoder v2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "./interfaces/ILayerZeroValidationLibrary.sol";
import "./interfaces/ILayerZeroMessagingLibrary.sol";
import "./interfaces/ILayerZeroReceiver.sol";
import "./interfaces/ILayerZeroRelayer.sol";
import "./interfaces/ILayerZeroTreasury.sol";
import "./interfaces/ILayerZeroOracle.sol";
import "./interfaces/ILayerZeroUltraLightNodeV1.sol";
import "./interfaces/ILayerZeroEndpoint.sol";

contract UltraLightNode is ILayerZeroMessagingLibrary, ILayerZeroUltraLightNodeV1, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using SafeMath for uint;

    struct BlockData {
        uint confirmations;
        bytes32 data;
    }

    // Application config
    uint public constant CONFIG_TYPE_INBOUND_PROOF_LIBRARY_VERSION = 1;
    uint public constant CONFIG_TYPE_INBOUND_BLOCK_CONFIRMATIONS = 2;
    uint public constant CONFIG_TYPE_RELAYER = 3;
    uint public constant CONFIG_TYPE_OUTBOUND_PROOF_TYPE = 4;
    uint public constant CONFIG_TYPE_OUTBOUND_BLOCK_CONFIRMATIONS = 5;
    uint public constant CONFIG_TYPE_ORACLE = 6;

    struct ApplicationConfiguration {
        uint16 inboundProofLibraryVersion;
        uint64 inboundBlockConfirmations;
        address relayer;
        uint16 outboundProofType;
        uint64 outboundBlockConfirmations;
        address oracle;
    }

    // Token and Contracts
    IERC20 public layerZeroToken;
    ILayerZeroTreasury public treasuryContract;

    // Fee management
    uint public constant BP_DENOMINATOR = 10000;
    // treasury and relayer share the protocol fee, either in native token or ZRO
    uint8 public constant WITHDRAW_TYPE_TREASURY_PROTOCOL_FEES = 0;
    uint8 public constant WITHDRAW_TYPE_ORACLE_QUOTED_FEES = 1; // quoted fee refers to the fee in block relaying
    uint8 public constant WITHDRAW_TYPE_RELAYER_QUOTED_FEES = 2; //quoted fee refers the fee in msg relaying

    mapping(address => uint) public oracleQuotedFees;
    mapping(address => uint) public relayerQuotedFees;
    uint public treasuryNativeFees;
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
    mapping(address => mapping(uint16 => mapping(bytes32 => BlockData))) public hashLookup;
    mapping(uint16 => bytes32) public ulnLookup; // remote ulns

    ILayerZeroEndpoint public immutable endpoint;

    // Events
    event AppConfigUpdated(address userApplication, uint configType, bytes newConfig);
    event AddInboundProofLibraryForChain(uint16 chainId, address lib);
    event EnableSupportedOutboundProof(uint16 chainId, uint16 proofType);
    event HashReceived(uint16 srcChainId, address oracle, uint confirmations, bytes32 blockhash);
    event Packet(uint16 chainId, bytes payload);
    event RelayerParams(uint16 chainId, uint64 nonce, uint16 outboundProofType, bytes adapterParams);
    event SetChainAddressSize(uint16 chainId, uint size);
    event SetDefaultConfigForChainId(uint16 chainId, uint16 inboundProofLib, uint64 inboundBlockConfirm, address relayer, uint16 outboundProofType, uint16 outboundBlockConfirm, address oracle);
    event SetDefaultAdapterParamsForChainId(uint16 chainId, uint16 proofType, bytes adapterParams);
    event SetLayerZeroToken(address tokenAddress);
    event SetRelayerFeeContract(address relayerFeeContract);
    event SetRemoteUln(uint16 chainId, bytes32 uln);
    event SetTreasury(address treasuryAddress);
    event WithdrawZRO(address _msgSender, address _to, uint _amount);
    event WithdrawNative(uint8 _type, address _owner, address _msgSender, address _to, uint _amount);

    constructor(address _endpoint) {
        require(_endpoint != address(0x0), "LayerZero: endpoint cannot be zero address");
        endpoint = ILayerZeroEndpoint(_endpoint);
    }

    // only the endpoint can call SEND() and setConfig()
    modifier onlyEndpoint() {
        require(address(endpoint) == msg.sender, "LayerZero: only endpoint");
        _;
    }

    //----------------------------------------------------------------------------------
    // PROTOCOL

    // This function completes delivery of a LayerZero message.
    //
    // In order to deliver the message, this function:
    // (a) takes the _transactionProof submitted by UA's relayer, and
    // (b) retrieve UA's validation library
    // (c) takes the _blockData submitted by the UA's oracle given the their configuration (and blockConfirmations),
    // (d) decodes using UA's validation library using (a) and (c)
    //  then, this functions asserts that
    // (e) the payload originated from the known Ultra Light Node from source chain, and
    // (f) the _dstAddress the specified destination contract
    function validateTransactionProof(uint16 _srcChainId, address _dstAddress, uint _gasLimit, bytes32 _lookupHash, bytes calldata _transactionProof) external override {
        // retrieve UA's configuration using the _dstAddress from arguments.
        ApplicationConfiguration memory uaConfig = getAppConfig(_srcChainId, _dstAddress);

        // (a) assert that the caller == UA's relayer
        require(uaConfig.relayer == msg.sender, "LayerZero: invalid relayer");

        LayerZeroPacket.Packet memory _packet;
        {
            // (b) retrieve UA's validation library
            address inboundProofLib = inboundProofLibrary[_srcChainId][uaConfig.inboundProofLibraryVersion];

            // (c) assert that the data submitted by UA's oracle have no fewer confirmations than UA's configuration
            BlockData storage blockData = hashLookup[uaConfig.oracle][_srcChainId][_lookupHash];
            require(blockData.confirmations >= uaConfig.inboundBlockConfirmations, "LayerZero: not enough block confirmations");

            // (d) decode
            uint remoteAddressSize = chainAddressSizeMap[_srcChainId];
            _packet = ILayerZeroValidationLibrary(inboundProofLib).validateProof(blockData.data, _transactionProof, remoteAddressSize);
        }

        // (e) assert that the packet was emitted by the source ultra light node
        require(ulnLookup[_srcChainId] == _packet.ulnAddress, "LayerZero: _packet.ulnAddress is invalid");

        // (f) assert that the _packet._dstAddress == the _dstAddress specified by the UAs message
        require(_packet.dstAddress == _dstAddress, "LayerZero: invalid dst address");

        // publish the payload and _gasLimit to the endpoint for calling lzReceive at _dstAddress
        endpoint.receivePayload(_packet.srcChainId, _packet.srcAddress, _packet.dstAddress, _packet.nonce, _gasLimit, _packet.payload);
    }

    // Called (by the Endpoint) with the information required to send a LayerZero message for a User Application.
    // This function:
    // (a) pays the protocol (native token or ZRO), oracle (native token) and relayer (native token) for their roles in sending the message.
    // (b) generates the message payload and emits events of the message and adapterParams
    // (c) notifies the oracle
    function send(address _ua, uint64 _nonce, uint16 _chainId, bytes calldata _destination, bytes calldata _payload, address payable _refundAddress, address _zroPaymentAddress, bytes calldata _adapterParams) external payable override onlyEndpoint {
        ApplicationConfiguration memory uaConfig = getAppConfig(_chainId, _ua);
        address ua = _ua;
        uint64 nonce = _nonce;
        uint16 chainId = _chainId;
        require(ulnLookup[chainId] != bytes32(0), "LayerZero: chainId does not exist");

        uint totalNativeFee;
        {
            uint oracleFee;
            // (a - 1), pay the oracle
            {
                oracleFee = ILayerZeroOracle(uaConfig.oracle).getPrice(chainId, uaConfig.outboundProofType);
                oracleQuotedFees[uaConfig.oracle] = oracleQuotedFees[uaConfig.oracle].add(oracleFee);
            }

            // (a - 2), pay the relayer
            {
                uint payloadSize = _payload.length;
                ILayerZeroRelayer relayer = ILayerZeroRelayer(uaConfig.relayer);
                if (_adapterParams.length == 0) {
                    bytes memory defaultAdaptorParam = defaultAdapterParams[chainId][uaConfig.outboundProofType];
                    totalNativeFee = relayer.getPrice(chainId, uaConfig.outboundProofType, ua, payloadSize, defaultAdaptorParam);
                    relayer.notifyRelayer(chainId, uaConfig.outboundProofType, defaultAdaptorParam);
                } else {
                    totalNativeFee = relayer.getPrice(chainId, uaConfig.outboundProofType, ua, payloadSize, _adapterParams);
                    relayer.notifyRelayer(chainId, uaConfig.outboundProofType, _adapterParams);
                }
                relayerQuotedFees[uaConfig.relayer] = relayerQuotedFees[uaConfig.relayer].add(totalNativeFee); // totalNativeFee == relayerFee here

                // emit the param events
                emit RelayerParams(chainId, nonce, uaConfig.outboundProofType, _adapterParams);
            }

            // (a - 3), pay the protocol
            {
                // if no ZRO token or not specifying a payment address, pay in native token
                bool payInNative = _zroPaymentAddress == address(0x0) || address(layerZeroToken) == address(0x0);
                uint protocolFee = treasuryContract.getFees(!payInNative, totalNativeFee, oracleFee); // totalNativeFee == relayerFee here

                if (protocolFee > 0) {
                    if (payInNative) {
                        treasuryNativeFees = treasuryNativeFees.add(protocolFee);
                        totalNativeFee = totalNativeFee.add(protocolFee);
                    } else {
                        // zro payment address must equal the _ua or the tx.origin otherwise the transaction reverts
                        require(_zroPaymentAddress == ua || _zroPaymentAddress == tx.origin, "LayerZero: must be paid by sender or origin");

                        // transfer the LayerZero token to this contract from the payee
                        layerZeroToken.safeTransferFrom(_zroPaymentAddress, address(this), protocolFee);

                        treasuryZROFees = treasuryZROFees.add(protocolFee);
                    }
                }
            }

            totalNativeFee = totalNativeFee.add(oracleFee);
        }

        // (b) emit payload and the adapterParams if any
        {
            bytes memory encodedPayload = abi.encodePacked(nonce, ua, _destination, _payload);
            emit Packet(chainId, encodedPayload);
            // (c) notify the oracle
            ILayerZeroOracle(uaConfig.oracle).notifyOracle(chainId, uaConfig.outboundProofType, uaConfig.outboundBlockConfirmations);
        }

        require(totalNativeFee <= msg.value, "LayerZero: not enough native for fees");
        // refund if they send too much
        uint amount = msg.value.sub(totalNativeFee);
        if (amount > 0) {
            (bool success, ) = _refundAddress.call{value: amount}("");
            require(success, "LayerZero: failed to refund");
        }
    }

    // Can be called by any address to update a block header
    // can only upload new block data or the same block data with more confirmations
    function updateHash(uint16 _srcChainId, bytes32 _lookupHash, uint _confirmations, bytes32 _data) external override {
        // this function may revert with a default message if the oracle address is not an ILayerZeroOracle
        BlockData storage bd = hashLookup[msg.sender][_srcChainId][_lookupHash];
        // if it has a record, requires a larger confirmation.
        require(bd.confirmations < _confirmations, "LayerZero: oracle data can only update if it has more confirmations");

        // set the new information into storage
        bd.confirmations = _confirmations;
        bd.data = _data;

        emit HashReceived(_srcChainId, msg.sender, _confirmations, _lookupHash);
    }

    //----------------------------------------------------------------------------------
    // Other Library Interfaces

    // default to DEFAULT setting if ZERO value
    function getAppConfig(uint16 _chainId, address userApplicationAddress) public view returns (ApplicationConfiguration memory) {
        ApplicationConfiguration memory config = appConfig[userApplicationAddress][_chainId];
        ApplicationConfiguration storage defaultConfig = defaultAppConfig[_chainId];

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

    function setConfig(uint16 chainId, address _ua, uint _configType, bytes calldata _config) external override onlyEndpoint {
        ApplicationConfiguration storage uaConfig = appConfig[_ua][chainId];
        if (_configType == CONFIG_TYPE_INBOUND_PROOF_LIBRARY_VERSION) {
            uint16 inboundProofLibraryVersion = abi.decode(_config, (uint16));
            require(inboundProofLibraryVersion <= maxInboundProofLibrary[chainId], "LayerZero: invalid inbound proof library version");
            uaConfig.inboundProofLibraryVersion = inboundProofLibraryVersion;
        } else if (_configType == CONFIG_TYPE_INBOUND_BLOCK_CONFIRMATIONS) {
            uint64 blockConfirmations = abi.decode(_config, (uint64));
            uaConfig.inboundBlockConfirmations = blockConfirmations;
        } else if (_configType == CONFIG_TYPE_RELAYER) {
            address relayer = abi.decode(_config, (address));
            uaConfig.relayer = relayer;
        } else if (_configType == CONFIG_TYPE_OUTBOUND_PROOF_TYPE) {
            uint16 outboundProofType = abi.decode(_config, (uint16));
            require(supportedOutboundProof[chainId][outboundProofType] || outboundProofType == 0, "LayerZero: invalid outbound proof type");
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

    function getConfig(uint16 _chainId, address userApplicationAddress, uint _configType) external view override returns (bytes memory) {
        ApplicationConfiguration storage uaConfig = appConfig[userApplicationAddress][_chainId];

        if (_configType == CONFIG_TYPE_INBOUND_PROOF_LIBRARY_VERSION) {
            if (uaConfig.inboundProofLibraryVersion == 0) {
                return abi.encode(defaultAppConfig[_chainId].inboundProofLibraryVersion);
            }
            return abi.encode(uaConfig.inboundProofLibraryVersion);
        } else if (_configType == CONFIG_TYPE_INBOUND_BLOCK_CONFIRMATIONS) {
            if (uaConfig.inboundBlockConfirmations == 0) {
                return abi.encode(defaultAppConfig[_chainId].inboundBlockConfirmations);
            }
            return abi.encode(uaConfig.inboundBlockConfirmations);
        } else if (_configType == CONFIG_TYPE_RELAYER) {
            if (uaConfig.relayer == address(0x0)) {
                return abi.encode(defaultAppConfig[_chainId].relayer);
            }
            return abi.encode(uaConfig.relayer);
        } else if (_configType == CONFIG_TYPE_OUTBOUND_PROOF_TYPE) {
            if (uaConfig.outboundProofType == 0) {
                return abi.encode(defaultAppConfig[_chainId].outboundProofType);
            }
            return abi.encode(uaConfig.outboundProofType);
        } else if (_configType == CONFIG_TYPE_OUTBOUND_BLOCK_CONFIRMATIONS) {
            if (uaConfig.outboundBlockConfirmations == 0) {
                return abi.encode(defaultAppConfig[_chainId].outboundBlockConfirmations);
            }
            return abi.encode(uaConfig.outboundBlockConfirmations);
        } else if (_configType == CONFIG_TYPE_ORACLE) {
            if (uaConfig.oracle == address(0x0)) {
                return abi.encode(defaultAppConfig[_chainId].oracle);
            }
            return abi.encode(uaConfig.oracle);
        } else {
            revert("LayerZero: Invalid config type");
        }
    }

    // returns the native fee the UA pays to cover fees
    function estimateFees(uint16 _chainId, address _ua, bytes calldata _payload, bool _payInZRO, bytes calldata _adapterParams) external view override returns (uint nativeFee, uint zroFee) {
        uint16 chainId = _chainId;
        address ua = _ua;
        uint payloadSize = _payload.length;
        bytes memory adapterParam = _adapterParams;

        ApplicationConfiguration memory uaConfig = getAppConfig(chainId, ua);

        // Relayer Fee
        uint relayerFee;
        {
            if (adapterParam.length == 0) {
                bytes memory defaultAdaptorParam = defaultAdapterParams[chainId][uaConfig.outboundProofType];
                relayerFee = ILayerZeroRelayer(uaConfig.relayer).getPrice(chainId, uaConfig.outboundProofType, ua, payloadSize, defaultAdaptorParam);
            } else {
                relayerFee = ILayerZeroRelayer(uaConfig.relayer).getPrice(chainId, uaConfig.outboundProofType, ua, payloadSize, adapterParam);
            }
        }

        // Oracle Fee
        uint oracleFee = ILayerZeroOracle(uaConfig.oracle).getPrice(chainId, uaConfig.outboundProofType);

        // LayerZero Fee
        {
            uint protocolFee = treasuryContract.getFees(_payInZRO, relayerFee, oracleFee);
            _payInZRO ? zroFee = protocolFee : nativeFee = protocolFee;
        }

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
    // safemath overflow if the amount is not enough
    function withdrawNative(uint8 _type, address _owner, address payable _to, uint _amount) external override nonReentrant {
        if (_type == WITHDRAW_TYPE_TREASURY_PROTOCOL_FEES) {
            require(msg.sender == address(treasuryContract), "LayerZero:only treasury");
            treasuryNativeFees = treasuryNativeFees.sub(_amount);
        } else if (_type == WITHDRAW_TYPE_ORACLE_QUOTED_FEES) {
            oracleQuotedFees[msg.sender] = oracleQuotedFees[msg.sender].sub(_amount);
        } else if (_type == WITHDRAW_TYPE_RELAYER_QUOTED_FEES) {
            relayerQuotedFees[msg.sender] = relayerQuotedFees[msg.sender].sub(_amount);
        } else {
            revert("LayerZero: unsupported withdraw type");
        }

        (bool success, ) = _to.call{value: _amount}("");
        require(success, "LayerZero: withdraw failed");
        emit WithdrawNative(_type, _owner, msg.sender, _to, _amount);
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
        require(maxInboundProofLibrary[_chainId] < 65535, "LayerZero: can not add new library");
        maxInboundProofLibrary[_chainId]++;
        inboundProofLibrary[_chainId][maxInboundProofLibrary[_chainId]] = _library;
        emit AddInboundProofLibraryForChain(_chainId, _library);
    }

    function enableSupportedOutboundProof(uint16 _chainId, uint16 _proofType) external onlyOwner {
        supportedOutboundProof[_chainId][_proofType] = true;
        emit EnableSupportedOutboundProof(_chainId, _proofType);
    }

    function setDefaultConfigForChainId(uint16 _chainId, uint16 _inboundProofLibraryVersion, uint64 _inboundBlockConfirmations, address _relayer, uint16 _outboundProofType, uint16 _outboundBlockConfirmations, address _oracle) external onlyOwner {
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
    function getBlockHeaderData(address _oracle, uint16 _remoteChainId, bytes32 _lookupHash) external view returns (BlockData memory blockData) {
        return hashLookup[_oracle][_remoteChainId][_lookupHash];
    }

    function oracleQuotedAmount(address _oracle) external view override returns (uint) {
        return oracleQuotedFees[_oracle];
    }

    function relayerQuotedAmount(address _relayer) external view override returns (uint) {
        return relayerQuotedFees[_relayer];
    }
}
