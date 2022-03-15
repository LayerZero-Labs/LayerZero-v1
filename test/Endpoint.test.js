const { expect } = require("chai")
const {
    getAddr,
    deployNew,
    encodeParams,
    generateEndpoints,
    generateVersion,
    wireEndpoints,
    deliverMsg,
    callAsContract,
    pingPong,
    incrementCounter,
    checkCounters,
    encodePackedParams,
    checkOutboundNonce,
    checkInboundNonce,
    incrementCounterWithTest,
    incrementCounterWithTestSameChain,
    redeliverMsg,
    setOracle,
    setRelayer,
} = require("./util/helpers")
const { deployments, ethers } = require("hardhat")
const {
    ZERO_ADDRESS,
    CONFIG_TYPE_RELAYER,
    CONFIG_TYPE_ORACLE,
    CONFIG_TYPE_INBOUND_BLOCK_CONFIRMATIONS,
    CONFIG_TYPE_INBOUND_PROOF_LIBRARY_VERSION,
    CONFIG_TYPE_OUTBOUND_BLOCK_CONFIRMATIONS,
    CONFIG_TYPE_OUTBOUND_PROOF_TYPE,
    DEFAULT_APP_CONFIG_VALUES,
} = require("./util/constants")
const { VARS } = require("./util/constants")
const { getEndpointId } = require("../utils/network")
const abiDecoder = require("abi-decoder")
const endpointAbi = require("../artifacts/contracts/Endpoint.sol/Endpoint.json")
abiDecoder.addABI([...endpointAbi.abi])

describe("Endpoint:", function () {
    let chainId = getEndpointId()
    let chainIds = [getEndpointId()]
    let oracle, relayer, ultraLightNode, lzEndpoint, lzToken, user1, badUser1, deployer, userApplication
    let { blockedVersion, outboundProofType2, adapterParams } = VARS

    before(async function () {
        ;({ deployer, user1, badUser1 } = await getAddr(ethers))
    })

    beforeEach(async function () {
        await deployments.fixture(["test"])

        let endpoints = await generateEndpoints(chainIds) // needs semicolon or object destructuring assignment breaks rip
        ;({
            oracle,
            relayer,
            lzEndpoint,
            ultraLightNode,
            lzToken,
            counterMock: userApplication,
        } = (await wireEndpoints([await generateVersion(endpoints[0], chainIds, outboundProofType2, false, 1, true)]))[0])
    })

    it("constructor()", async function () {
        expect(await lzEndpoint.BLOCK_VERSION()).to.equal(blockedVersion)
        expect(await lzEndpoint.DEFAULT_VERSION()).to.equal(0)
        expect(await lzEndpoint.latestVersion()).to.equal(1)
        expect(await lzEndpoint.defaultSendVersion()).to.equal(1)
        expect(await lzEndpoint.defaultReceiveVersion()).to.equal(1)
        expect(await lzEndpoint.chainId()).to.equal(chainId)
    })

    it("newVersion() - reverts when called by non owner", async function () {
        await expect(lzEndpoint.connect(user1).newVersion(user1.address)).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("newVersion() - reverts when called with 0x0", async function () {
        await expect(lzEndpoint.newVersion(ZERO_ADDRESS)).to.be.revertedWith("LayerZero: new version cannot be zero address")
    })

    it("newVersion() - emit event / set", async function () {
        await expect(lzEndpoint.newVersion(user1.address)).to.emit(lzEndpoint, "NewLibraryVersionAdded").withArgs(2)
        expect(await lzEndpoint.latestVersion()).to.equal(2)
        expect(await lzEndpoint.libraryLookup(2)).to.equal(user1.address)
    })

    it("newVersion() - reverts if max library size is hit", async function () {
        // initialize to 1
        expect(await lzEndpoint.latestVersion()).to.equal(1)
        let storageValue = await network.provider.send("eth_getStorageAt", [lzEndpoint.address, "0x0"])

        // set to max
        await network.provider.send("hardhat_setStorageAt", [lzEndpoint.address, "0x0", storageValue.replace("0001", "FFFF")])
        expect(await lzEndpoint.latestVersion()).to.equal(65535)

        await expect(lzEndpoint.newVersion(user1.address)).to.revertedWith("LayerZero: can not add new messaging library")
    })

    it("setDefaultSendVersion() - reverts when called by non owner", async function () {
        await expect(lzEndpoint.setDefaultSendVersion(0)).to.be.revertedWith("LayerZero: default send version must > 0")
    })

    it("setDefaultReceiveVersion() - reverts when called by non owner", async function () {
        await expect(lzEndpoint.setDefaultReceiveVersion(0)).to.be.revertedWith("LayerZero: default receive version must > 0")
    })

    it("setDefaultSendVersion() - reverts for 0", async function () {
        await expect(lzEndpoint.connect(user1).setDefaultSendVersion(0)).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("setDefaultSendVersion() - reverts when version is > latest Version", async function () {
        await expect(lzEndpoint.setDefaultSendVersion(123)).to.be.revertedWith("LayerZero: invalid messaging library version")
    })

    it("setDefaultSendVersion() - emits event / set", async function () {
        await expect(lzEndpoint.setDefaultSendVersion(1)).to.emit(lzEndpoint, "DefaultSendVersionSet").withArgs(1)
        expect(await lzEndpoint.defaultSendVersion()).to.equal(1)
    })

    it("setDefaultReceiveVersion() - reverts when called by non owner", async function () {
        await expect(lzEndpoint.connect(user1).setDefaultReceiveVersion(1)).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("setDefaultReceiveVersion() - reverts when version is > latest Version", async function () {
        await expect(lzEndpoint.setDefaultReceiveVersion(123)).to.be.revertedWith("LayerZero: invalid messaging library version")
    })

    it("setDefaultReceiveVersion()", async function () {
        await expect(lzEndpoint.setDefaultReceiveVersion(1)).to.emit(lzEndpoint, "DefaultReceiveVersionSet").withArgs(1)
        expect(await lzEndpoint.defaultReceiveVersion()).to.equal(1)
    })

    it("send() - is blocked when on default, and txSend is set to max uint16", async function () {
        await lzEndpoint.setDefaultSendVersion(blockedVersion)
        await expect(lzEndpoint.send(1, "0x", "0x", user1.address, user1.address, "0x")).to.be.revertedWith(
            "LayerZero: default in BLOCK_VERSION"
        )
    })

    it("send() - is blocked when on specific version, and txSend is set to max uint16", async function () {
        await lzEndpoint.setSendVersion(blockedVersion)
        await expect(lzEndpoint.send(1, "0x", "0x", user1.address, user1.address, "0x")).to.be.revertedWith("LayerZero: in BLOCK_VERSION")
    })

    it("setConfig() - reverts during migration on default version", async function () {
        await lzEndpoint.setDefaultSendVersion(blockedVersion)
        await expect(lzEndpoint.setConfig(0, 0, 0, "0x")).to.be.revertedWith("LayerZero: can not set Config during DEFAULT migration")
    })

    it("setConfig() - reverts when new version number > latestVersion", async function () {
        await expect(lzEndpoint.setConfig(123, 0, 0, "0x")).to.be.revertedWith("LayerZero: invalid messaging library version")
    })

    it("setConfig() - reverts when version is BLOCK_VERSION", async function () {
        await expect(lzEndpoint.setConfig(blockedVersion, 0, 0, "0x")).to.be.revertedWith("LayerZero: can not set config for BLOCK_VERSION")
    })

    it("setConfig() - is NOT blocked for ua during migration for non defaultVersion", async function () {
        await lzEndpoint.setDefaultSendVersion(blockedVersion)
        const config = encodeParams(["address"], [oracle.address])
        await lzEndpoint.setConfig(1, chainId, CONFIG_TYPE_ORACLE, config)
    })

    it("setConfig() - oracle set w/ default", async function () {
        const configType = CONFIG_TYPE_ORACLE
        const version = 0

        const config = encodeParams(["address"], [oracle.address])
        const oracleAddressBytes = encodeParams(["address"], [oracle.address])
        await lzEndpoint.setConfig(version, chainId, configType, config)

        expect(await lzEndpoint.getConfig(version, chainId, deployer.address, configType)).to.equal(oracleAddressBytes)
    })

    it("setConfig() - relayer set w/ default", async function () {
        const configType = CONFIG_TYPE_RELAYER
        const version = 0

        const config = encodeParams(["address"], [relayer.address])
        const relayerAddressBytes = encodeParams(["address"], [relayer.address])
        await lzEndpoint.setConfig(version, chainId, configType, config)

        expect(await lzEndpoint.getConfig(version, chainId, deployer.address, configType)).to.equal(relayerAddressBytes)
    })

    it("setConfig() - CONFIG_TYPE_OUTBOUND_BLOCK_CONFIRMATIONS w/ default", async function () {
        const configType = CONFIG_TYPE_OUTBOUND_BLOCK_CONFIRMATIONS
        const version = 0

        const config = encodeParams(["uint"], [456])
        const blockConfirmationsBytes = encodeParams(["uint"], [456])
        await lzEndpoint.setConfig(version, chainId, configType, config)

        expect(await lzEndpoint.getConfig(version, chainId, deployer.address, configType)).to.equal(blockConfirmationsBytes)
    })

    it("setConfig() - CONFIG_TYPE_INBOUND_BLOCK_CONFIRMATIONS w/ default", async function () {
        const configType = CONFIG_TYPE_INBOUND_BLOCK_CONFIRMATIONS
        const version = 0

        const config = encodeParams(["uint"], [456])
        const blockConfirmationsBytes = encodeParams(["uint"], [456])
        await lzEndpoint.setConfig(version, chainId, configType, config)

        expect(await lzEndpoint.getConfig(version, chainId, deployer.address, configType)).to.equal(blockConfirmationsBytes)
    })

    it("setConfig() - library version is set w/ default", async function () {
        const configType = CONFIG_TYPE_INBOUND_PROOF_LIBRARY_VERSION
        const version = 0

        const config = encodeParams(["uint16"], [0])
        const feeLibraryBytes = encodeParams(["uint"], [DEFAULT_APP_CONFIG_VALUES.inboundProofLibraryVersion])
        await lzEndpoint.setConfig(version, chainId, configType, config)

        expect(await lzEndpoint.getConfig(version, chainId, deployer.address, configType)).to.equal(feeLibraryBytes)
    })

    it("setConfig() - CONFIG_TYPE_OUTBOUND_PROOF_TYPE w/ default", async function () {
        const configType = CONFIG_TYPE_OUTBOUND_PROOF_TYPE
        const version = 0

        const config = encodeParams(["uint16"], [DEFAULT_APP_CONFIG_VALUES.outboundProofType])
        const data = encodeParams(["uint"], [DEFAULT_APP_CONFIG_VALUES.outboundProofType])
        await lzEndpoint.setConfig(version, chainId, configType, config)

        expect(await lzEndpoint.getConfig(version, chainId, deployer.address, configType)).to.equal(data)
    })

    it("setConfig() - oracle", async function () {
        const configType = CONFIG_TYPE_ORACLE
        const version = 1

        const config = encodeParams(["address"], [oracle.address])
        const oracleAddressBytes = encodeParams(["address"], [oracle.address])
        await lzEndpoint.setConfig(version, chainId, configType, config)

        expect(await lzEndpoint.getConfig(version, chainId, deployer.address, configType)).to.equal(oracleAddressBytes)
    })

    it("setConfig() - relayer", async function () {
        const configType = CONFIG_TYPE_RELAYER
        const version = 1

        const config = encodeParams(["address"], [relayer.address])
        const relayerAddressBytes = encodeParams(["address"], [relayer.address])
        await lzEndpoint.setConfig(version, chainId, configType, config)

        expect(await lzEndpoint.getConfig(version, chainId, deployer.address, configType)).to.equal(relayerAddressBytes)
    })

    it("setConfig() - CONFIG_TYPE_OUTBOUND_BLOCK_CONFIRMATIONS", async function () {
        const configType = CONFIG_TYPE_OUTBOUND_BLOCK_CONFIRMATIONS
        const version = 1

        const config = encodeParams(["uint"], [456])
        const blockConfirmationsBytes = encodeParams(["uint"], [456])
        await lzEndpoint.setConfig(version, chainId, configType, config)

        expect(await lzEndpoint.getConfig(version, chainId, deployer.address, configType)).to.equal(blockConfirmationsBytes)
    })

    it("setConfig() - CONFIG_TYPE_INBOUND_BLOCK_CONFIRMATIONS", async function () {
        const configType = CONFIG_TYPE_INBOUND_BLOCK_CONFIRMATIONS
        const version = 1

        const config = encodeParams(["uint"], [456])
        const blockConfirmationsBytes = encodeParams(["uint"], [456])
        await lzEndpoint.setConfig(version, chainId, configType, config)

        expect(await lzEndpoint.getConfig(version, chainId, deployer.address, configType)).to.equal(blockConfirmationsBytes)
    })

    it("setConfig() - library version", async function () {
        const configType = CONFIG_TYPE_INBOUND_PROOF_LIBRARY_VERSION
        const version = 1

        const config = encodeParams(["uint16"], [0])
        const feeLibraryBytes = encodeParams(["uint"], [DEFAULT_APP_CONFIG_VALUES.inboundProofLibraryVersion])
        await lzEndpoint.setConfig(version, chainId, configType, config)

        expect(await lzEndpoint.getConfig(version, chainId, deployer.address, configType)).to.equal(feeLibraryBytes)
    })

    it("getConfig() - reverts during migration", async function () {
        await expect(lzEndpoint.getConfig(blockedVersion, chainId, deployer.address, 1)).to.be.revertedWith(
            "LayerZero: can not get config for BLOCK_VERSION"
        )
    })

    it("getConfig() - reverts during migration", async function () {
        await lzEndpoint.setDefaultSendVersion(blockedVersion) // init migration
        await expect(lzEndpoint.getConfig(0, chainId, deployer.address, 1)).to.be.revertedWith("LayerZero: no DEFAULT config while migration")
    })

    it("getConfig() - reverts with invalid library version", async function () {
        await expect(lzEndpoint.getConfig(100, chainId, deployer.address, 1)).to.be.revertedWith("LayerZero: invalid messaging library version")
    })

    it("getEndpointId()", async function () {
        expect(await lzEndpoint.getChainId()).to.equal(chainId)
    })

    it("estimateFees() - reverts when type 2 doesnt contain dstNativeAddress", async function () {
        const payload = "0x"
        const payInZro = false
        const adapterParamsType2 = encodePackedParams(adapterParams[2].types.slice(0, -1), adapterParams[2].values.slice(0, -1))

        await expect(lzEndpoint.estimateFees(chainId, userApplication.address, payload, payInZro, adapterParamsType2)).to.revertedWith(
            "Relayer: wrong _adapterParameters size"
        )
        await expect(ultraLightNode.estimateFees(chainId, userApplication.address, payload, payInZro, adapterParamsType2)).to.revertedWith(
            "Relayer: wrong _adapterParameters size"
        )
    })

    it("estimateFees() - type 1", async function () {
        const payload = "0x"
        const payInZro = false
        const adapterParamsType1 = encodePackedParams(adapterParams[1].types, adapterParams[1].values)

        const { nativeFee: _nativeFeeA, zroFee: _zroFeeA } = await lzEndpoint.estimateFees(
            chainId,
            userApplication.address,
            payload,
            payInZro,
            adapterParamsType1
        )
        const { nativeFee: _nativeFeeB, zroFee: _zroFeeB } = await ultraLightNode.estimateFees(
            chainId,
            userApplication.address,
            payload,
            payInZro,
            adapterParamsType1
        )
        expect(_nativeFeeA).to.equal(_nativeFeeB)
        expect(_zroFeeA).to.equal(_zroFeeB)
    })

    it("estimateFees() - type 2", async function () {
        const payload = "0x"
        const payInZro = false
        const adapterParamsType2 = encodePackedParams(adapterParams[2].types, adapterParams[2].values)

        const { nativeFee: _nativeFeeA, zroFee: _zroFeeA } = await lzEndpoint.estimateFees(
            chainId,
            userApplication.address,
            payload,
            payInZro,
            adapterParamsType2
        )
        const { nativeFee: _nativeFeeB, zroFee: _zroFeeB } = await ultraLightNode.estimateFees(
            chainId,
            userApplication.address,
            payload,
            payInZro,
            adapterParamsType2
        )
        expect(_nativeFeeA).to.equal(_nativeFeeB)
        expect(_zroFeeA).to.equal(_zroFeeB)
    })

    it("setSendVersion() - reverts when version is > latest Version", async function () {
        await expect(lzEndpoint.setSendVersion(123)).to.be.revertedWith("LayerZero: invalid messaging library version'")
    })

    it("setSendVersion()", async function () {
        const ultraLightNodeV2 = await deployNew("UltraLightNode", [lzEndpoint.address])
        expect(await lzEndpoint.newVersion(ultraLightNodeV2.address)).to.emit(lzEndpoint, "NewLibraryVersionAdded")

        expect(await lzEndpoint.getSendVersion(deployer.address)).to.equal(1)
        await expect(lzEndpoint.setSendVersion(2)).to.emit(lzEndpoint, "UaSendVersionSet").withArgs(deployer.address, 2)
        expect((await lzEndpoint.uaConfigLookup(deployer.address)).sendVersion).to.equal(2)
        expect(await lzEndpoint.getSendVersion(deployer.address)).to.equal(2)

        await expect(lzEndpoint.setSendVersion(0)).to.emit(lzEndpoint, "UaSendVersionSet").withArgs(deployer.address, 0)
        expect((await lzEndpoint.uaConfigLookup(deployer.address)).sendVersion).to.equal(0)
        expect(await lzEndpoint.getSendVersion(deployer.address)).to.equal(1)
    })

    it("setReceiveVersion() - reverts when version is > latest Version", async function () {
        await expect(lzEndpoint.setReceiveVersion(123)).to.be.revertedWith("LayerZero: invalid messaging library version'")
    })

    it("setReceiveVersion()", async function () {
        const ultraLightNodeV2 = await deployNew("UltraLightNode", [lzEndpoint.address])
        expect(await lzEndpoint.newVersion(ultraLightNodeV2.address)).to.emit(lzEndpoint, "NewLibraryVersionAdded")

        expect(await lzEndpoint.getReceiveVersion(deployer.address)).to.equal(1)
        await expect(lzEndpoint.setReceiveVersion(2)).to.emit(lzEndpoint, "UaReceiveVersionSet").withArgs(deployer.address, 2)
        expect((await lzEndpoint.uaConfigLookup(deployer.address)).receiveVersion).to.equal(2)
        expect(await lzEndpoint.getReceiveVersion(deployer.address)).to.equal(2)

        await expect(lzEndpoint.setReceiveVersion(0)).to.emit(lzEndpoint, "UaReceiveVersionSet").withArgs(deployer.address, 0)
        expect((await lzEndpoint.uaConfigLookup(deployer.address)).receiveVersion).to.equal(0)
        expect(await lzEndpoint.getReceiveVersion(deployer.address)).to.equal(1)
    })

    it("receivePayload() - reverts with invalid library", async function () {
        await lzEndpoint.setReceiveVersion(1) // non default
        await expect(lzEndpoint.connect(badUser1).receivePayload(0, "0x", deployer.address, 1, 0, "0x")).to.be.revertedWith(
            "LayerZero: invalid library"
        )
    })

    it("receivePayload() - reverts with invalid library w/ default", async function () {
        await expect(lzEndpoint.receivePayload(0, "0x", ZERO_ADDRESS, 1, 0, "0x")).to.be.revertedWith("LayerZero: invalid default library")
    })

    it("receivePayload() - reverts in blocked version w/ default", async function () {
        await lzEndpoint.setDefaultReceiveVersion(blockedVersion) // put into blocked state
        await expect(lzEndpoint.receivePayload(0, "0x", ZERO_ADDRESS, 1, 0, "0x")).to.be.revertedWith("LayerZero: invalid default library")
    })

    it("receivePayload() - reverts in blocked version", async function () {
        await lzEndpoint.setReceiveVersion(blockedVersion) // put into blocked state
        await expect(lzEndpoint.receivePayload(0, "0x", deployer.address, 1, 0, "0x")).to.be.revertedWith("LayerZero: invalid library")
    })

    it("getReceiveLibraryAddress()", async function () {
        expect(await lzEndpoint.getReceiveLibraryAddress(user1.address)).to.not.equal(user1.address)
        expect(await lzEndpoint.getReceiveLibraryAddress(user1.address)).to.equal(ultraLightNode.address)
    })

    it("getSendLibraryAddress()", async function () {
        expect(await lzEndpoint.getSendLibraryAddress(user1.address)).to.not.equal(user1.address)
        expect(await lzEndpoint.getSendLibraryAddress(user1.address)).to.equal(ultraLightNode.address)
    })

    it("getSendLibraryAddress() - reverts when non default send is BLOCK_VERSION", async function () {
        await lzEndpoint.setSendVersion(blockedVersion) // put into blocked state
        await expect(lzEndpoint.getSendLibraryAddress(deployer.address)).to.revertedWith("LayerZero: send version is BLOCK_VERSION")
    })

    it("getSendLibraryAddress() - reverts when default send is BLOCK_VERSION", async function () {
        await lzEndpoint.setDefaultSendVersion(blockedVersion) // put into blocked state
        await expect(lzEndpoint.getSendLibraryAddress(deployer.address)).to.revertedWith("LayerZero: send version (default) is BLOCK_VERSION")
    })

    it("getReceiveLibraryAddress() - reverts when non default receive is BLOCK_VERSION", async function () {
        await lzEndpoint.setReceiveVersion(blockedVersion) // put into blocked state
        await expect(lzEndpoint.getReceiveLibraryAddress(deployer.address)).to.revertedWith("LayerZero: receive version is BLOCK_VERSION")
    })

    it("getReceiveLibraryAddress() - reverts when default receive is BLOCK_VERSION", async function () {
        await lzEndpoint.setDefaultReceiveVersion(blockedVersion) // put into blocked state
        await expect(lzEndpoint.getReceiveLibraryAddress(deployer.address)).to.revertedWith(
            "LayerZero: receive version (default) is BLOCK_VERSION"
        )
    })

    it("isSendingPayload() - returns default of false", async function () {
        expect(await lzEndpoint.isSendingPayload()).to.equal(false)
    })

    it("isReceivingPayload() - returns default of false", async function () {
        expect(await lzEndpoint.isReceivingPayload()).to.equal(false)
    })
})

describe("Endpoint Integration:", function () {
    let chainIds = [1, 2]
    let unwiredEndpoints, src, dst, user1, user2, deployer
    let {
        dstPrice,
        srcPrice,
        denominator,
        dstGasPrice,
        baseGas,
        gasPerByte,
        zroFee,
        nativeBP,
        extraGas,
        outboundProofType,
        dstNativeCap,
        defaultMsgValue,
    } = VARS

    before(async function () {
        ;({ user1, user2, deployer } = await getAddr(ethers))
    })

    beforeEach(async function () {
        await deployments.fixture(["test"])

        const _endpoints = await generateEndpoints(chainIds)
        unwiredEndpoints = await Promise.all(
            _endpoints.map(async (endpoint, index) => {
                return await generateVersion(endpoint, chainIds, outboundProofType, false, 1, index === 0, true)
            })
        )
        const wiredEndpoints = await wireEndpoints(unwiredEndpoints)

        src = wiredEndpoints[0]
        dst = wiredEndpoints[1]

        // give counterMock tokens to spend
        await src.lzToken.transfer(src.counterMock.address, 10000)
        await dst.lzToken.transfer(dst.counterMock.address, 10000)
        // approve the node to spend tokens on our behalf, eg. pay the relayer and oracle
        await src.counterMock.approveTokenSpender(src.lzToken.address, src.ultraLightNode.address, 10000)
        await dst.counterMock.approveTokenSpender(dst.lzToken.address, dst.ultraLightNode.address, 10000)
    })

    it("validateTransactionProof() - reverts with 'invalid dst address'", async function () {
        // send a transaction across
        const tx = await src.counterMock.incrementCounter(dst.chainId, dst.counterMock.address, { value: defaultMsgValue })

        // try to send to the wrong dst address, ie the src, not the dst countermock
        await expect(deliverMsg(tx, src, dst, src.counterMock.address, { gasLimit: 100000 })).to.be.revertedWith(
            "LayerZero: invalid dst address"
        )
    })

    it("send() - with extra native via txType2", async function () {
        const balanceBefore = await getBalance(dst.counterMock.address)
        const tx = await src.counterMock.incrementCounter(dst.chainId, dst.counterMock.address, { value: defaultMsgValue })
        await deliverMsg(tx, src, dst, dst.counterMock.address, { value: extraGas })
        expect((await getBalance(dst.counterMock.address)).sub(balanceBefore)).to.equal(extraGas)
    })

    it("send() - reverts with failed payment", async function () {
        extraGas = 1001 // special blocked amount of gas
        const balanceBefore = await getBalance(dst.counterMock.address)

        const tx = await src.counterMock.incrementCounter(dst.chainId, dst.counterMock.address, { value: defaultMsgValue })
        // hits the abritrary block of rejected ether for the counter mock contract
        await expect(deliverMsg(tx, src, dst, dst.counterMock.address, { value: extraGas })).to.revertedWith("Relayer: failed to send ether'")

        expect((await getBalance(dst.counterMock.address)).sub(balanceBefore)).to.equal(0) // doesnt get rejected and the gas
    })

    it("Send() - reverts if refund reverts", async function () {
        await expect(
            callAsContract(
                src.counterMock,
                src.counterMock.address,
                "incrementCounter(uint16,bytes)",
                [dst.chainId, dst.counterMock.address],
                defaultMsgValue
            )
        ).to.revertedWith("LayerZero: failed to refund")
    })

    it("retryPayload() - reverts when called multiple times or with wrong payloads", async function () {
        const relayerTxn = await incrementCounter(src, dst, { gasLimit: 1000 })
        const receipt = await relayerTxn.wait()
        let decodedLogs = abiDecoder.decodeLogs(receipt.logs)
        //extract payload from event
        const payload = decodedLogs[0].events[4].value
        await checkCounters(src, dst, 0, 0) // doesnt update because not enough gas

        // check if any stored payload
        expect(await dst.lzEndpoint.hasStoredPayload(src.chainId, encodePackedParams(["address"], [src.counterMock.address]))).to.equal(true)

        // trying with invalid payload, fail()
        let wrongPayload = payload + "01"
        await expect(dst.lzEndpoint.retryPayload(src.chainId, src.counterMock.address, wrongPayload)).to.be.revertedWith(
            "LayerZero: invalid payload"
        )
        // trying with none payload, fail()
        wrongPayload = "0x"
        await expect(dst.lzEndpoint.retryPayload(src.chainId, src.counterMock.address, wrongPayload)).to.be.revertedWith(
            "LayerZero: invalid payload"
        )

        // trying with valida payload, success()
        await dst.lzEndpoint.retryPayload(src.chainId, src.counterMock.address, payload)
        await checkCounters(src, dst, 0, 1)

        // using the same transaction proof from the relayer should result in a revert
        await expect(dst.lzEndpoint.retryPayload(src.chainId, src.counterMock.address, payload)).to.be.revertedWith(
            "LayerZero: no stored payload"
        )

        // check if any stored payload
        expect(await dst.lzEndpoint.hasStoredPayload(src.chainId, encodePackedParams(["address"], [src.counterMock.address]))).to.equal(false)
    })

    it("retryPayload() - emits event and nonce isn't updated until enough gas is sent", async function () {
        const relayerTxn = await incrementCounter(src, dst, { gasLimit: 1000 })
        const receipt = await relayerTxn.wait()
        let decodedLogs = abiDecoder.decodeLogs(receipt.logs)
        //extract payload from event
        const payload = decodedLogs[0].events[4].value

        await checkCounters(src, dst, 0, 0) // doesnt update because not enough gas

        // check if any stored payload
        expect(await dst.lzEndpoint.hasStoredPayload(src.chainId, encodePackedParams(["address"], [src.counterMock.address]))).to.equal(true)

        // only outbound nonce updated
        await checkCounters(src, dst, 0, 0)
        await checkOutboundNonce(src, dst, 1)
        await checkInboundNonce(dst, src, 1)

        // try again with too little gas which should fail
        try {
            await dst.lzEndpoint.retryPayload(src.chainId, src.counterMock.address, payload, { gasLimit: 22628 })
        } catch (e) {
            expect(e.toString()).to.equal("TransactionExecutionError: Transaction ran out of gas")
        }

        // nothing updated because of revert
        await checkCounters(src, dst, 0, 0)
        await checkOutboundNonce(src, dst, 1)
        await checkInboundNonce(dst, src, 1)

        // try again because the payload is not cleared unless we force resume
        try {
            await dst.lzEndpoint.retryPayload(src.chainId, src.counterMock.address, payload, { gasLimit: 22628 })
        } catch (e) {
            expect(e.toString()).to.equal("TransactionExecutionError: Transaction ran out of gas")
        }

        // nothing updated because of revert
        await checkCounters(src, dst, 0, 0)
        await checkOutboundNonce(src, dst, 1)
        await checkInboundNonce(dst, src, 1)

        // finally enough gas
        await expect(dst.lzEndpoint.retryPayload(src.chainId, src.counterMock.address, payload, { gasLimit: 1000000 }))
            .to.emit(dst.lzEndpoint, "PayloadCleared")
            .withArgs(parseInt(src.chainId), src.counterMock.address.toLowerCase(), 1, dst.counterMock.address)

        // nothing updated because of revert
        await checkCounters(src, dst, 0, 1)
        await checkOutboundNonce(src, dst, 1)
        await checkInboundNonce(dst, src, 1)

        // check via helper
        expect(await dst.lzEndpoint.hasStoredPayload(src.chainId, encodePackedParams(["address"], [src.counterMock.address]))).to.equal(false)

        // using the same transaction proof from the relayer should result in a revert
        await expect(dst.lzEndpoint.retryPayload(src.chainId, src.counterMock.address, payload)).to.be.revertedWith(
            "LayerZero: no stored payload"
        )
    })

    it("incrementCounter() - reverts when sending delivering msg twice", async function () {
        const tx = await src.counterMock.incrementCounter(dst.chainId, dst.counterMock.address, { value: defaultMsgValue })
        await deliverMsg(tx, src, dst, dst.counterMock.address)
        await checkCounters(src, dst, 0, 1) // updates to 1

        // using the same transaction proof from the relayer should result in a revert
        await expect(deliverMsg(tx, src, dst, dst.counterMock.address, { confirmations: 16 })).to.be.revertedWith("LayerZero: wrong nonce")

        await checkCounters(src, dst, 0, 1) // counter should not increment on the failed tx
    })

    it("sendNonReentrant() - increment counter reverts when a bad oracle tries to send a msg twice", async function () {
        const badOracle = await deployNew("LayerZeroOracleBadMock")
        await badOracle.setEndpoint(src.lzEndpoint.address)
        await setOracle(src.ultraLightNode, src.lzEndpoint, src.counterMock, badOracle, dst.chainId)
        await expect(src.counterMock.incrementCounter(dst.chainId, dst.counterMock.address, { value: defaultMsgValue })).to.be.revertedWith(
            "LayerZero: no send reentrancy"
        )
    })

    it("receiveNonReentrant() - increment counter reverts when a bad relayer tries to send a msg twice", async function () {
        // testing for the
        const { payloadLength: payloadLengthA } = await dst.lzEndpoint.storedPayload(src.chainId, src.counterMock.address)
        expect(payloadLengthA).to.equal(0)
        // special payload to trigger a reentrancy attempt
        await incrementCounter(src, dst, { payload: "0x6666" })

        // lzReceive try catches the payloads if they fail, this means that the reentrant guard does not explicitly revert
        // we need to just check before and after stored payloads
        const { payloadLength: payloadLengthB } = await dst.lzEndpoint.storedPayload(src.chainId, src.counterMock.address)
        expect(payloadLengthB).to.equal(10)
    })

    it("incrementCounter() - reverts when sending from a rogue contract", async function () {
        // needs a unwired version of the endpoints so we can set a bad contract to uln
        unwiredEndpoints = []
        for (const endpoint of await generateEndpoints(chainIds, false)) {
            unwiredEndpoints.push(await generateVersion(endpoint, chainIds, outboundProofType, true))
        }
        // pass a false flag to ensure we dont actually wire these together
        ;[src, dst] = await wireEndpoints(unwiredEndpoints, false)

        const dstUlnBytes32 = ethers.utils.hexZeroPad(dst.ultraLightNode.address, 32)
        await src.ultraLightNode.setRemoteUln(dst.chainId, dstUlnBytes32)
        // purposely set a rogue remote ultraLightNode address
        await dst.ultraLightNode.setRemoteUln(src.chainId, dstUlnBytes32)

        await src.lzToken.transfer(src.counterMock.address, zroFee)
        await src.counterMock.approveTokenSpender(src.lzToken.address, src.ultraLightNode.address, zroFee)

        const tx = await src.counterMock.incrementCounter(dst.chainId, dst.counterMock.address, { value: defaultMsgValue })

        // using the same transaction proof from the relayer should result in a revert
        await expect(deliverMsg(tx, src, dst, dst.counterMock.address)).to.be.revertedWith("LayerZero: _packet.ulnAddress is invalid")
    })

    it("incrementCounter() - multiple chains and nonces update accordingly", async function () {
        await incrementCounterWithTest(src, dst)
        await incrementCounterWithTest(src, dst)

        await incrementCounterWithTestSameChain(src)
        await incrementCounterWithTestSameChain(dst)
        await incrementCounterWithTest(src, dst)
        await incrementCounterWithTest(src, dst)

        // Hardcode the layerzero version to default 0 -> 1
        await callAsContract(src.lzEndpoint, src.counterMock.address, "setReceiveVersion(uint16)", [1])
        await callAsContract(dst.lzEndpoint, dst.counterMock.address, "setReceiveVersion(uint16)", [1])
        await callAsContract(src.lzEndpoint, src.counterMock.address, "setSendVersion(uint16)", [1])
        await callAsContract(dst.lzEndpoint, dst.counterMock.address, "setSendVersion(uint16)", [1])

        await incrementCounterWithTest(dst, src)
    })

    it("forceResumeReceive() - nonces are updating properly", async function () {
        // revert because there is no message stored
        await expect(
            callAsContract(dst.lzEndpoint, dst.counterMock.address, "forceResumeReceive(uint16,bytes)", [
                src.chainId,
                encodePackedParams(["address"], [src.counterMock.address]),
            ])
        ).to.revertedWith("LayerZero: no stored payload")

        // purposely set gasLimit to 0, this will put the msg in a cached state
        await incrementCounter(src, dst, { gasLimit: 0 })

        // nonce should not be incremented and will remain 0 because previous receive fails to deliver
        await checkCounters(src, dst, 0, 0)
        await checkOutboundNonce(src, dst, 1)
        await checkInboundNonce(dst, src, 1)

        // try sending another message while there is a blocked payload
        const tx = await src.counterMock.incrementCounter(dst.chainId, dst.counterMock.address, { value: defaultMsgValue })
        // reverts because there is a blocked msg
        await expect(deliverMsg(tx, src, dst, dst.counterMock.address)).to.revertedWith("LayerZero: in message blocking")

        // nonce should remain the same at the destination
        await checkCounters(src, dst, 0, 0)
        await checkOutboundNonce(src, dst, 2)
        await checkInboundNonce(dst, src, 1)

        // forceResume(), should revert is someone else tries to clear the payload
        await expect(
            callAsContract(dst.lzEndpoint, user1.address, "forceResumeReceive(uint16,bytes)", [
                src.chainId,
                encodePackedParams(["address"], [src.counterMock.address]),
            ])
        ).to.revertedWith("LayerZero: invalid caller")

        // forceResume(), which should remove the message from the queue
        await expect(
            await callAsContract(dst.lzEndpoint, dst.counterMock.address, "forceResumeReceive(uint16,bytes)", [
                src.chainId,
                encodePackedParams(["address"], [src.counterMock.address]),
            ])
        )
            .to.emit(dst.lzEndpoint, "UaForceResumeReceive")
            .withArgs(parseInt(src.chainId), src.counterMock.address.toLowerCase())

        await checkCounters(src, dst, 0, 0)
        await checkOutboundNonce(src, dst, 2)
        await checkInboundNonce(dst, src, 1)

        // deliver now because the nonce is cleared
        await redeliverMsg(tx, src, dst, dst.counterMock.address)

        await checkCounters(src, dst, 0, 1)
        await checkOutboundNonce(src, dst, 2)
        await checkInboundNonce(dst, src, 2)

        // revert because we just cleared it
        await expect(
            callAsContract(dst.lzEndpoint, dst.counterMock.address, "forceResumeReceive(uint16,bytes)", [
                src.chainId,
                encodePackedParams(["address"], [src.counterMock.address]),
            ])
        ).to.revertedWith("LayerZero: no stored payload")

        // assert that no payload stored
        expect(await dst.lzEndpoint.hasStoredPayload(src.chainId, encodePackedParams(["address"], [src.counterMock.address]))).to.equal(false)

        await incrementCounterWithTest(src, dst)

        // Hardcode the layerzero version to default 0 -> 1
        await callAsContract(src.lzEndpoint, src.counterMock.address, "setReceiveVersion(uint16)", [1])
        await callAsContract(dst.lzEndpoint, dst.counterMock.address, "setReceiveVersion(uint16)", [1])
        await callAsContract(src.lzEndpoint, src.counterMock.address, "setSendVersion(uint16)", [1])
        await callAsContract(dst.lzEndpoint, dst.counterMock.address, "setSendVersion(uint16)", [1])

        await incrementCounterWithTest(dst, src)
        await incrementCounterWithTest(src, dst)
    })

    it("withdraw() - via treasury and relayer withdraw", async function () {
        // arbitrary withdraw amount
        const withdrawAmount = 3

        // set relayer fees
        const dstPriceRatio = (dstPrice * denominator) / srcPrice
        await src.relayer.setDstPrice(dst.chainId, dstPriceRatio, dstGasPrice)
        await src.relayer.setDstConfig(dst.chainId, outboundProofType, dstNativeCap, baseGas, gasPerByte)
        await dst.relayer.setDstPrice(src.chainId, dstPriceRatio, dstGasPrice)
        await dst.relayer.setDstConfig(src.chainId, outboundProofType, dstNativeCap, baseGas, gasPerByte)
        // set treasury fees
        await src.treasury.setNativeBP(nativeBP)
        await dst.treasury.setNativeBP(nativeBP)
        // enable zro payment
        await src.treasury.setZroEnabled(true)
        await src.treasury.setZroEnabled(true)
        await src.treasury.setZroFee(69)
        await dst.treasury.setZroFee(69)

        await src.counterMock.setPayInZRO(true)

        await incrementCounterWithTest(src, dst, { value: 3000000000 })

        // relayer can withdraw the native Fees via an approved address
        await src.relayer.setApprovedAddress(user1.address, true)
        const balPreWithdraw0 = await getBalance(user2.address)
        await src.relayer.connect(user1).withdrawQuotedFromULN(user2.address, withdrawAmount)
        const balPostWithdraw0 = await getBalance(user2.address)
        expect(balPostWithdraw0.sub(balPreWithdraw0)).to.equal(withdrawAmount)

        // check that treasury can withdraw the ZRO fees
        await src.lzToken.transfer(src.ultraLightNode.address, withdrawAmount)
        await checkTokenBalance(src.lzToken, user2.address, 0)
        await src.treasury.withdrawZROFromULN(user2.address, withdrawAmount)
        await checkTokenBalance(src.lzToken, user2.address, withdrawAmount)

        // swap over to paying in native from countermock
        await src.counterMock.setPayInZRO(false)
        await dst.counterMock.setPayInZRO(false)

        await incrementCounterWithTest(src, dst, { value: 3000000000 })

        // treasury can withdraw the native Fees
        const balPreWithdraw1 = await getBalance(user2.address)
        await src.treasury.withdrawNativeFromULN(user2.address, withdrawAmount)
        const balPostWithdraw1 = await getBalance(user2.address)
        expect(balPostWithdraw1.sub(balPreWithdraw1)).to.equal(withdrawAmount)

        // relayer can withdraw the native Fees
        const balPreWithdraw2 = await getBalance(user2.address)
        await src.relayer.withdrawQuotedFromULN(user2.address, withdrawAmount)
        const balPostWithdraw2 = await getBalance(user2.address)
        expect(balPostWithdraw2.sub(balPreWithdraw2)).to.equal(withdrawAmount)
    })

    it("send() - non-reentrant doesnt block send() calling lzReceive()", async function () {
        // provide the pingPong contracts gas to spend
        await deployer.sendTransaction({
            to: src.pingPong.address,
            value: ethers.utils.parseEther("1.0"),
        })
        await deployer.sendTransaction({
            to: dst.pingPong.address,
            value: ethers.utils.parseEther("1.0"),
        })

        expect(await dst.pingPong.numPings()).to.equal(0)
        await pingPong(src, dst)
        expect(await dst.pingPong.numPings()).to.equal(1)
    })
})
