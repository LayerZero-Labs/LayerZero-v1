const { expect } = require("chai")
const { getAddr, encodeParams, encodePackedParams, deployNew, getRatioAndPriceType1, getRatioAndPriceType2 } = require("./util/helpers")
const { ZERO_ADDRESS } = require("./util/constants")
const { deployments, ethers } = require("hardhat")
const { VARS } = require("./util/constants")

describe("Relayer:", function () {
    let relayer, lzToken, ultraLightNode, deployer, user1, proxyOwner, badUser1
    let { chainId, outboundProofType, payloadLength, txType, txType2, extraGas, dstNativeAmt, dstNativeCap, dstGasPrice, baseGas, gasPerByte } =
        VARS

    before(async function () {
        ;({ badUser1, deployer, user1, proxyOwner } = await getAddr(ethers))
    })

    beforeEach(async function () {
        await deployments.fixture(["test"])

        relayer = await ethers.getContract("Relayer")
        lzToken = await ethers.getContract("LayerZeroTokenMock")
        ultraLightNode = await ethers.getContract("UltraLightNode")
    })

    it("upgrade() - only allow upgrade by admin", async function () {
        expect(await relayer.approvedAddresses(user1.address)).to.be.false // inits to false

        // approve for user1
        await relayer.connect(deployer).setApprovedAddress(user1.address, true)
        expect(await relayer.approvedAddresses(user1.address)).to.be.true

        // deploy a relayer v2
        const proxyAdmin = await ethers.getContract("DefaultProxyAdmin")
        const relayerV1Addr = await proxyAdmin.getProxyImplementation(relayer.address)
        const relayerV2 = await deployNew("Relayer")

        // reverts when called by non proxy owner
        await expect(proxyAdmin.connect(deployer).upgrade(relayer.address, relayerV2.address)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        )

        // deploys new implementation
        await proxyAdmin.connect(proxyOwner).upgrade(relayer.address, relayerV2.address)
        expect(relayerV1Addr).to.not.equal(await proxyAdmin.getProxyImplementation(relayer.address))

        expect(await relayer.approvedAddresses(user1.address)).to.be.true // user1 remains approved
    })

    it("constructor() - created / is approved", async function () {
        expect(await relayer.isApproved(relayer.address)).to.equal(true)
    })

    it("setApprovedAddress() - reverts with non owner", async function () {
        await expect(relayer.connect(badUser1).setApprovedAddress(user1.address, true)).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("withdrawQuotedFromULN() reverts with unapproved", async function () {
        await expect(relayer.connect(user1).withdrawQuotedFromULN(user1.address, 1)).to.be.revertedWith("Relayer: not approved")
    })

    it("withdrawQuotedFromULN() - reverts from non owner", async function () {
        await expect(relayer.connect(badUser1).withdrawQuotedFromULN(badUser1.address, 1)).to.revertedWith("Relayer: not approved")
    })

    it("setDstPrice() - reverts with unapproved", async function () {
        await expect(relayer.connect(badUser1).setDstPrice(chainId, 1, dstGasPrice)).to.revertedWith("Relayer: not approved")
    })

    it("setDstConfig() - reverts with unapproved", async function () {
        await expect(relayer.connect(badUser1).setDstConfig(chainId, outboundProofType, dstNativeCap, baseGas, gasPerByte)).to.revertedWith(
            "Relayer: not approved"
        )
    })

    it("setApprovedAddress() - set / emits event", async function () {
        await expect(relayer.setApprovedAddress(user1.address, true)).to.emit(relayer, "ApproveAddress")
        expect(await relayer.isApproved(user1.address))
    })

    it("setDstPrice() - set", async function () {
        const { dstPriceRatio } = getRatioAndPriceType1()
        await relayer.setDstPrice(chainId, dstPriceRatio, dstGasPrice)

        const { dstPriceRatio: _dstPriceRatio, dstGasPriceInWei: _dstGasPrice } = await relayer.dstPriceLookup(chainId)
        expect(_dstPriceRatio).to.equal(dstPriceRatio)
        expect(_dstGasPrice).to.equal(dstGasPrice)
    })

    it("setDstConfig() - set", async function () {
        await relayer.setDstConfig(chainId, outboundProofType, dstNativeCap, baseGas, gasPerByte)

        const config = await relayer.dstConfigLookup(chainId, outboundProofType)
        expect(config.dstNativeAmtCap).to.equal(dstNativeCap)
        expect(config.baseGas).to.equal(baseGas)
        expect(config.gasPerByte).to.equal(gasPerByte)
    })

    it("getPrice() - reverts with invalid txParams", async function () {
        // encoded with the wrong size != 34 && < 66
        let txParams = encodePackedParams(["uint16", "uint"], [1, 1])
        // tamper it
        txParams = "0x0001" + txParams.split("0x")[1]

        await expect(txParams.length).to.equal((2 + 32) * 2 + 2 + 4)
        await expect(relayer["getPrice(uint16,uint16,address,uint256,bytes)"](chainId, 1, user1.address, 10, txParams)).to.be.revertedWith(
            "Relayer: wrong _adapterParameters size"
        )
    })

    it("getPrice() - reverts with unsupported type", async function () {
        // encoded with the wrong size >= 66
        const txParams = encodeParams(["uint16", "uint", "uint", "address"], [1, 1, 1, "0x0000000000000000000000000000000000000001"])
        await expect(txParams.length).to.equal(32 * 4 * 2 + 2)
        await expect(relayer["getPrice(uint16,uint16,address,uint256,bytes)"](1, 1, user1.address, 10, txParams)).to.be.revertedWith(
            "Relayer: unsupported txType"
        )
    })

    it("getPrice() - reverts with bad tx types", async function () {
        const txParams = encodePackedParams(["uint16", "uint"], [0, 1])
        await expect(relayer["getPrice(uint16,uint16,address,uint256,bytes)"](1, 1, user1.address, 0, txParams)).to.be.revertedWith(
            "Relayer: unsupported txType"
        )
    })

    it("getPrice() - reverts with not enough gas", async function () {
        const txParams = encodePackedParams(["uint16", "uint"], [1, 0])
        await expect(relayer["getPrice(uint16,uint16,address,uint256,bytes)"](1, 1, user1.address, 10, txParams)).to.be.revertedWith(
            "Relayer: gas too low"
        )
    })

    it("getPrice() - type 1 - returns 0 fees if transaction fees not set", async function () {
        const txParams = encodePackedParams(["uint16", "uint"], [txType, extraGas])
        expect(
            await relayer["getPrice(uint16,uint16,address,uint256,bytes)"](chainId, outboundProofType, user1.address, payloadLength, txParams)
        ).to.equal(0)
    })

    it("getPrice() - type 1 - returns correct prices", async function () {
        const { expectedPrice, dstPriceRatio } = getRatioAndPriceType1()
        const txParams = encodePackedParams(["uint16", "uint"], [txType, extraGas])

        await relayer.setDstConfig(chainId, outboundProofType, dstNativeCap, baseGas, gasPerByte)
        await relayer.setDstPrice(chainId, dstPriceRatio, dstGasPrice)

        expect(
            await relayer["getPrice(uint16,uint16,address,uint256,bytes)"](chainId, outboundProofType, user1.address, payloadLength, txParams)
        ).to.equal(expectedPrice)
    })

    it("getPrice() - type 2 - reverts with 'dstNativeAmt too large'", async function () {
        const { dstPriceRatio } = getRatioAndPriceType2()
        const txParams = encodePackedParams(["uint16", "uint", "uint", "address"], [txType2, extraGas, dstNativeCap, ZERO_ADDRESS])

        // set the cap 1 lower than the requested amount
        await relayer.setDstConfig(chainId, outboundProofType, dstNativeCap - 1, baseGas, gasPerByte)
        await relayer.setDstPrice(chainId, dstPriceRatio, dstGasPrice)

        await expect(
            relayer["getPrice(uint16,uint16,address,uint256,bytes)"](chainId, outboundProofType, user1.address, payloadLength, txParams)
        ).to.be.revertedWith("Relayer: dstNativeAmt too large")
    })

    it("getPrice() - type 2 - returns correct price", async function () {
        const { expectedPrice, dstPriceRatio } = getRatioAndPriceType2()
        const txParams = encodePackedParams(["uint16", "uint", "uint", "address"], [txType2, extraGas, dstNativeAmt, ZERO_ADDRESS])

        await relayer.setDstConfig(chainId, outboundProofType, dstNativeCap, baseGas, gasPerByte)
        await relayer.setDstPrice(chainId, dstPriceRatio, dstGasPrice)

        expect(
            await relayer["getPrice(uint16,uint16,address,uint256,bytes)"](chainId, outboundProofType, user1.address, payloadLength, txParams)
        ).to.equal(expectedPrice)
    })
})
