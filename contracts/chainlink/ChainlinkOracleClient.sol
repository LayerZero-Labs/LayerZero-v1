// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.7.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.7/ChainlinkClient.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/ILayerZeroOracle.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/ILayerZeroUltraLightNodeV1.sol";

contract ChainlinkOracleClient is ILayerZeroOracle, ChainlinkClient, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Job {
        address oracle;
        bytes32 id;
        uint fee;
        uint calledInBlock;
    }

    struct CachedAddressString {
        bool cached;
        string addressString;
    }

    uint public calledInBlock;
    mapping(uint16 => Job) public jobs;
    uint16 public immutable endpointId; // my local endpointId
    ILayerZeroUltraLightNodeV1 public uln;
    mapping(address => bool) public approvedAddresses;
    mapping(uint16 => mapping(uint16 => uint)) public chainPriceLookup;
    // dstChainId => "0x" prefixed address where updateHash called on dst
    mapping(uint16 => CachedAddressString) public deliveryAddressLookup;

    event Result(bytes32 requestId, bytes32 result);
    event WithdrawTokens(address token, address to, uint amount);
    event Withdraw(address to, uint amount);

    modifier onlyULN() {
        require(msg.sender == address(uln), "OracleClient: caller must be LayerZero.");
        _;
    }

    // create this contract with the LINK token address for the local chain
    constructor(address _linkAddress, uint16 _endpointId) {
        setChainlinkToken(_linkAddress);
        endpointId = _endpointId;
        approvedAddresses[msg.sender] = true;
    }

    // only approved
    function updateHash(uint16 _remoteChainId, bytes32 _blockHash, uint _confirmations, bytes32 _data) external {
        require(approvedAddresses[msg.sender], "Oracle: caller must be approved");
        uln.updateHash(_remoteChainId, _blockHash, _confirmations, _data);
    }

    // LayerZero will call this function to initiate the Chainlink oracle
    function notifyOracle(uint16 _dstChainId, uint16 _outboundProofType, uint64 _outboundBlockConfirmations) external override onlyULN {
        Job storage job = jobs[_dstChainId];

        if (job.calledInBlock < block.number) {
            Chainlink.Request memory req = buildChainlinkRequest(job.id, address(this), this.fulfillNotificationOfBlock.selector);
            // send this source sides endpointId. when cl delivers it on the remote,
            // it makes sense they use the variable named "remoteChainId" from that side.
            Chainlink.addUint(req, "remoteChainId", endpointId);
            Chainlink.addUint(req, "libraryVersion", uint(_outboundProofType));

            require(deliveryAddressLookup[_dstChainId].cached, "ChainlinkOracleClient: no deliveryAddressLookup for _dstChainId");
            Chainlink.add(req, "contractAddress", deliveryAddressLookup[_dstChainId].addressString);

            Chainlink.addUint(req, "confirmations", _outboundBlockConfirmations);

            sendChainlinkRequestTo(job.oracle, req, job.fee);
            job.calledInBlock = block.number;
        }
    }

    //---------------------------------------------------------------------------
    // Owner calls, configuration only.

    // owner can approve a token spender
    function approveToken(address _token, address _spender, uint _amount) external onlyOwner {
        IERC20 token = IERC20(_token);
        token.safeApprove(_spender, _amount);
    }

    // owner can withdraw native
    function withdraw(address payable _to, uint _amount) external onlyOwner nonReentrant {
        (bool success, ) = _to.call{value: _amount}("");
        require(success, "OracleClient: failed to withdraw");
        emit Withdraw(_to, _amount);
    }

    // owner can set uln
    function setUln(address ulnAddress) external onlyOwner {
        uln = ILayerZeroUltraLightNodeV1(ulnAddress);
    }

    // owner can withdraw tokens
    function withdrawTokens(address _token, address _to, uint _amount) public onlyOwner {
        IERC20(_token).safeTransfer(_to, _amount);
        emit WithdrawTokens(_token, _to, _amount);
    }

    // uint8 public constant WITHDRAW_TYPE_ORACLE_QUOTED_FEES = 1;
    // quoted fee refers to the fee in block relaying
    function withdrawOracleQuotedFee(uint amount) external onlyOwner {
        uln.withdrawNative(1, address(this), address(this), amount);
    }

    // set/update chainlink jobid data for oralces
    function setJob(uint16 _chain, address _oracle, bytes32 _id, uint _fee) public onlyOwner {
        jobs[_chain] = Job(_oracle, _id, _fee, block.number - 1);
    }

    // store the dstChainId "0x" prefixed address information
    function setDeliveryAddress(uint16 _dstChainId, address _deliveryAddress) public onlyOwner {
        deliveryAddressLookup[_dstChainId] = CachedAddressString(true, addr2str(_deliveryAddress));
    }

    function setPrice(uint16 _destinationChainId, uint16 _outboundProofType, uint _price) external onlyOwner {
        chainPriceLookup[_outboundProofType][_destinationChainId] = _price;
    }

    // approve a signing address
    function setApprovedAddress(address _oracleAddress, bool _approve) external onlyOwner {
        approvedAddresses[_oracleAddress] = _approve;
    }

    //---------------------------------------------------------------------------
    // view and helper functions

    // chainlink callback function
    function fulfillNotificationOfBlock(bytes32 _requestId, bytes32 _result) public recordChainlinkFulfillment(_requestId) {
        emit Result(_requestId, _result);
    }

    // helper inside addr2str
    // if necessary, converts utf8 numeric to alpha
    function checkUtfUint8(uint8 _c) internal pure returns (uint8 _ret) {
        _ret = _c;
        if (_ret > 0x39) {
            // its the a to f
            _ret += 7;
        }
    }

    // helper for addr2str
    // split a bytes1 into its two 4 bit utf8 char ints
    function byte2UtfInts(bytes1 _b) internal pure returns (uint8 _x, uint8 _y) {
        _x = checkUtfUint8(0x30 + ((uint8(_b) >> 4) & 0x0f));
        _y = checkUtfUint8(0x30 + ((uint8(_b)) & 0x0f));
    }

    // converts an address into a string prefixed with 0x
    function addr2str(address _addr) public pure returns (string memory) {
        bytes20 byts = bytes20(_addr);
        bytes memory b = new bytes(42); // the size is the answer to life, the universe, and everything

        // put first bytes
        uint j;
        b[j++] = bytes1(0x30); // "0"
        b[j++] = bytes1(0x78); // "x"

        uint i;
        uint8 x;
        uint8 y;
        for (; i < 20; ++i) {
            (x, y) = byte2UtfInts(bytes1(byts[i]));
            b[j++] = bytes1(x);
            b[j++] = bytes1(y);
        }

        return string(b);
    }

    // not doing 0 cost
    function getPrice(uint16 _destinationChainId, uint16 _outboundProofType) external view override returns (uint price) {
        price = chainPriceLookup[_outboundProofType][_destinationChainId];
        require(price > 0, "Chainlink Oracle: not supporting the (dstChain, libraryVersion)");
    }

    function isApproved(address _relayerAddress) public view override returns (bool) {
        return approvedAddresses[_relayerAddress];
    }

    // be able to receive ether
    fallback() external payable {}

    receive() external payable {}
}
