const { expect } = require("chai")
const { getAddr, checkBalance, getBalance } = require("./util/helpers")
const { BigNumber } = require("ethers")
const { deployments, ethers } = require("hardhat")
const { getEndpointId } = require("../utils/network")

describe("ChainlinkOracleClient", function () {
    let chainId = getEndpointId()
    let user1, badUser1, deployer, oracle, lzToken, lzEndpoint, oracleClient

    before(async function () {
        ;({ deployer, user1, badUser1 } = await getAddr(ethers))
    })

    beforeEach(async function () {
        await deployments.fixture(["test"])

        oracle = await ethers.getContract("LayerZeroOracleMock")
        oracleClient = await ethers.getContract("ChainlinkOracleClient")
        lzToken = await ethers.getContract("LayerZeroTokenMock")
        lzEndpoint = await ethers.getContract("Endpoint")

        await oracleClient.setApprovedAddress(oracle.address, true)
    })

    it("setUln() - reverts as non owner", async function () {
        await expect(oracleClient.connect(badUser1).setUln(user1.address)).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("approveToken() - reverts as non-owner", async function () {
        await expect(oracleClient.connect(badUser1).approveToken(lzToken.address, user1.address, 1000)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        )
    })

    it("withdrawTokens() - reverts for non owner", async function () {
        await expect(oracleClient.connect(user1).withdrawTokens(user1.address, user1.address, 1)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        )
    })

    it("withdraw() - reverts for non owner - oracleClient", async function () {
        await expect(oracleClient.connect(user1).withdraw(user1.address, 1)).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("withdraw() - reverts for non owner - oracle", async function () {
        await expect(oracle.connect(user1).withdraw(user1.address, 1)).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("withdraw() - reverts with 'failed to withdraw' - oracle", async function () {
        const qty = 12345

        await user1.sendTransaction({
            to: oracle.address,
            value: qty,
        })

        await expect(oracle.withdraw(lzToken.address, qty)).to.be.revertedWith("failed to withdraw")
    })

    it("withdrawTokens() - reverts as non-owner", async function () {
        await expect(oracleClient.connect(badUser1).withdrawTokens(lzToken.address, user1.address, 1000)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        )
    })

    it("setApprovedAddress() - reverts for non owner", async function () {
        await expect(oracleClient.connect(badUser1).setApprovedAddress(user1.address, true)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        )
    })

    it("notifyOracleOfBlock() - reverts for non owner", async function () {
        await expect(oracleClient.connect(badUser1).notifyOracle(1, 1, 15)).to.be.revertedWith("OracleClient: caller must be LayerZero.")
    })

    it("updateHash() - reverts for non owner", async function () {
        const ZeroBytes32 = "0x0000000000000000000000000000000000000000000000000000000000000000"
        await expect(oracleClient.connect(badUser1).updateHash(0, ZeroBytes32, 0, ZeroBytes32)).to.be.revertedWith(
            "Oracle: caller must be approved"
        )
    })

    it("getPrice() - reverts for 0 cost", async function () {
        await expect(oracleClient.getPrice(chainId, 0)).to.revertedWith("Chainlink Oracle: not supporting the (dstChain, libraryVersion)")
    })

    it("isApproved()", async function () {
        expect(await oracleClient.isApproved(deployer.address)).to.equal(true)
        expect(await oracleClient.isApproved(badUser1.address)).to.equal(false)
    })

    it("fulfillNotificationOfBlock() - emits event", async function () {
        const ZeroBytes32 = "0x0000000000000000000000000000000000000000000000000000000000000000"
        await expect(oracleClient.fulfillNotificationOfBlock(ZeroBytes32, ZeroBytes32)).to.revertedWith(
            "Source must be the oracle of the request"
        )
    })

    it("setApprovedAddress()", async function () {
        await oracleClient.setApprovedAddress(user1.address, true)
        expect(await oracleClient.approvedAddresses(user1.address)).to.equal(true)
    })

    it("withdraw() - sends native asset to carol - oracleClient", async function () {
        const qty = 12345

        await user1.sendTransaction({ to: oracleClient.address, value: qty })

        const balance = await checkBalance(oracleClient.address, qty) // was payable and received it

        let expectedBal = balance.add(await getBalance(user1.address))
        await oracleClient.withdraw(user1.address, balance)
        expect(await getBalance(user1.address)).to.equal(BigNumber.from(expectedBal))
    })

    it("withdraw() - reverts with 'failed to withdraw' - oracleClient", async function () {
        const qty = 12345

        await user1.sendTransaction({
            to: oracleClient.address,
            value: qty,
        })

        await expect(oracleClient.withdraw(lzToken.address, qty)).to.be.revertedWith("failed to withdraw")
    })

    it("withdraw() - sends native asset to carol - oracle", async function () {
        const qty = 12345

        await user1.sendTransaction({ to: oracle.address, value: qty })

        const balance = await checkBalance(oracle.address, qty) // was payable and received it

        let expectedBal = balance.add(await getBalance(user1.address))
        await oracle.withdraw(user1.address, balance)
        expect(await getBalance(user1.address)).to.equal(BigNumber.from(expectedBal))
    })

    it("withdrawTokens()", async function () {
        expect(await lzToken.balanceOf(user1.address)).to.equal(0) // start with 0 tokens
        await lzToken.transfer(oracleClient.address, 1000) // give client 1000 tokens

        // withdraw them to random address
        await expect(oracleClient.withdrawTokens(lzToken.address, user1.address, 1000))
            .to.emit(oracleClient, "WithdrawTokens")
            .withArgs(lzToken.address, user1.address, 1000)

        expect(await lzToken.balanceOf(user1.address)).to.equal(1000) // balance updates
    })

    it("setUln()", async function () {
        await oracleClient.setUln(user1.address)
        expect(await oracleClient.uln()).to.equal(user1.address)
    })

    it("approveToken()", async function () {
        await oracleClient.approveToken(lzToken.address, user1.address, 1000)
    })

    it("getPrice()", async function () {
        await oracleClient.setPrice(chainId, 0, 1)
        expect(await oracleClient.getPrice(chainId, 0)).gte(1)
    })
})
