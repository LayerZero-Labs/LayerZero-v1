// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.7.6;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/ILayerZeroOracle.sol";
import "../interfaces/ILayerZeroUltraLightNodeV1.sol";

contract LayerZeroOracleMock is ILayerZeroOracle, Ownable, ReentrancyGuard {
    mapping(address => bool) public approvedAddresses;
    mapping(uint16 => mapping(uint16 => uint)) public chainPriceLookup;
    uint public fee;
    ILayerZeroUltraLightNodeV1 public uln; // ultraLightNode instance

    event OracleNotified(uint16 dstChainId, uint16 _outboundProofType, uint blockConfirmations);
    event Withdraw(address to, uint amount);

    constructor() {
        approvedAddresses[msg.sender] = true;
    }

    function notifyOracle(uint16 _dstChainId, uint16 _outboundProofType, uint64 _outboundBlockConfirmations) external override {
        emit OracleNotified(_dstChainId, _outboundProofType, _outboundBlockConfirmations);
    }

    function updateHash(uint16 _remoteChainId, bytes32 _blockHash, uint _confirmations, bytes32 _data) external {
        require(approvedAddresses[msg.sender], "LayerZeroOracleMock: caller must be approved");
        uln.updateHash(_remoteChainId, _blockHash, _confirmations, _data);
    }

    function withdraw(address payable _to, uint _amount) public onlyOwner nonReentrant {
        (bool success, ) = _to.call{value: _amount}("");
        require(success, "failed to withdraw");
        emit Withdraw(_to, _amount);
    }

    // owner can set uln
    function setUln(address ulnAddress) external onlyOwner {
        uln = ILayerZeroUltraLightNodeV1(ulnAddress);
    }

    // mock, doesnt do anything
    function setJob(uint16 _chain, address _oracle, bytes32 _id, uint _fee) public onlyOwner {}

    function setDeliveryAddress(uint16 _dstChainId, address _deliveryAddress) public onlyOwner {}

    function setPrice(uint16 _destinationChainId, uint16 _outboundProofType, uint _price) external onlyOwner {
        chainPriceLookup[_outboundProofType][_destinationChainId] = _price;
    }

    function setApprovedAddress(address _oracleAddress, bool _approve) external {
        approvedAddresses[_oracleAddress] = _approve;
    }

    function isApproved(address _relayerAddress) public view override returns (bool) {
        return approvedAddresses[_relayerAddress];
    }

    function getPrice(uint16 _destinationChainId, uint16 _outboundProofType) external view override returns (uint) {
        return chainPriceLookup[_outboundProofType][_destinationChainId];
    }

    fallback() external payable {}

    receive() external payable {}
}
