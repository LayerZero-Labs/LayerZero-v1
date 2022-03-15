const { expect } = require("chai")
const { BigNumber } = require("ethers")
const { ethers, network, web3 } = require("hardhat")
const { GetProof, proofUtils } = require("@layerzerolabs/proof-evm")
const {
    DEFAULT_APP_CONFIG_VALUES,
    ID_TO_CHAIN_NAME,
    VARS,
    CONFIG_TYPE_RELAYER,
    CONFIG_TYPE_ORACLE,
    CONFIG_TYPE_OUTBOUND_PROOF_TYPE,
    CONFIG_TYPE_OUTBOUND_BLOCK_CONFIRMATIONS,
    CONFIG_TYPE_INBOUND_BLOCK_CONFIRMATIONS,
    CONFIG_TYPE_INBOUND_PROOF_LIBRARY_VERSION,
} = require("../util/constants")

getAddr = async (ethers) => {
    const [deployer, proxyOwner, user1, user2, user3, user4, badUser1, badUser2, fakeContract] = await ethers.getSigners()

    return {
        deployer,
        proxyOwner,
        user1,
        user2,
        user3,
        user4,
        badUser1,
        badUser2,
        fakeContract,
    }
}

checkBalance = async (address, expected) => {
    let balance = await hre.ethers.provider.getBalance(address)
    expect(balance).to.equal(BigNumber.from(expected))
    return balance
}

checkTokenBalance = async (token, address, expected) => {
    const balance = await token.balanceOf(address)
    expect(balance).to.equal(BigNumber.from(expected))
    return balance
}

getBalance = async (address) => {
    return await hre.ethers.provider.getBalance(address)
}

// !!! User at own risk, txEther might need to be increased if running out of gas
callAsContract = async (contract, impersonateAddr, funcNameAsStr, params = [], msgValue = 0) => {
    const existingBal = await hre.ethers.provider.getBalance(impersonateAddr)

    // Might need to increase this for big transactions
    const txEther = BigNumber.from("10000000000000000000000000")
    const msgValueBn = BigNumber.from(msgValue)

    // Update the balance on the network
    await network.provider.send("hardhat_setBalance", [
        impersonateAddr,
        existingBal.add(txEther).add(msgValueBn).toHexString().replace("0x0", "0x"),
    ])

    // Retrieve the signer for the person to impersonate
    const signer = await ethers.getSigner(impersonateAddr)

    // Impersonate the smart contract to make the corresponding call on their behalf
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [impersonateAddr],
    })

    // Process the transaction on their behalf
    const rec = await contract.connect(signer)[funcNameAsStr](...params, { value: msgValueBn })
    const tx = await rec.wait()

    // The amount of gas consumed by the transaction
    const etherUsedForGas = tx.gasUsed.mul(tx.effectiveGasPrice)
    const extraEther = txEther.sub(etherUsedForGas)

    // Balance post transaction
    const currentBal = await hre.ethers.provider.getBalance(impersonateAddr)

    // Subtract the difference  in the amount of ether given
    // vs the amount used in the transaction
    await hre.network.provider.send("hardhat_setBalance", [impersonateAddr, currentBal.sub(extraEther).toHexString().replace("0x0", "0x")])

    // Undo the impersonate so we go back to the default
    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [impersonateAddr],
    })

    return rec
}

getBlock = async (tx) => {
    return await network.provider.send("eth_getBlockByHash", [tx.blockHash, false])
}

// return the relayer's event
const pingPong = async (a, b, pings = 0, attributes = {}) => {
    const tx = await a.pingPong.ping(b.chainId, b.pingPong.address, pings)
    const gasLimit = attributes.gasLimit ?? 10000000
    return await deliverMsg(tx, a, b, b.pingPong.address, { gasLimit })
}

const checkOutboundNonce = async (a, b, value) => {
    expect(await a.lzEndpoint.getOutboundNonce(b.chainId, a.counterMock.address)).to.equal(value)
}
const checkInboundNonce = async (a, b, value) => {
    expect(await a.lzEndpoint.getInboundNonce(b.chainId, b.counterMock.address)).to.equal(value)
}
const checkCounter = async (a, b, v) => {
    expect(await a.counterMock.remoteAddressCounter(b.counterMock.address)).to.equal(v)
}
const checkCounters = async (src, dst, srcValue, dstValue) => {
    await checkCounter(src, dst, srcValue)
    await checkCounter(dst, src, dstValue)
}

// return the relayer's event
const incrementCounter = async (a, b, attributes = {}) => {
    const gasLimit = attributes.gasLimit ?? 100000
    const tx = attributes.payload
        ? await a.counterMock.incrementCounterWithPayload(b.chainId, b.counterMock.address, attributes.payload, {
              value: attributes.value || 300000,
          })
        : await a.counterMock.incrementCounter(b.chainId, b.counterMock.address, { value: attributes.value || 300000 })
    return await deliverMsg(tx, a, b, b.counterMock.address, { gasLimit })
}

const incrementCounterWithTest = async (a, b, attributes = {}) => {
    // state before the msg gets sent across
    const aRemoteCounter = await a.counterMock.remoteAddressCounter(b.counterMock.address)
    const bRemoteCounter = await b.counterMock.remoteAddressCounter(a.counterMock.address)
    const aOutboundNonce = await a.lzEndpoint.getOutboundNonce(b.chainId, a.counterMock.address)
    const bOutBoundNonce = await b.lzEndpoint.getOutboundNonce(a.chainId, b.counterMock.address)
    const aInboundNonce = await a.lzEndpoint.getInboundNonce(b.chainId, b.counterMock.address)
    const bInboundNonce = await b.lzEndpoint.getInboundNonce(a.chainId, a.counterMock.address)

    await incrementCounter(a, b, attributes)

    // state afterwards
    expect(await a.counterMock.remoteAddressCounter(b.counterMock.address)).to.equal(aRemoteCounter)
    expect(await b.counterMock.remoteAddressCounter(a.counterMock.address)).to.equal(bRemoteCounter.add(1))
    expect(await a.lzEndpoint.getOutboundNonce(b.chainId, a.counterMock.address)).to.equal(aOutboundNonce.add(1))
    expect(await b.lzEndpoint.getOutboundNonce(a.chainId, b.counterMock.address)).to.equal(bOutBoundNonce)
    expect(await a.lzEndpoint.getInboundNonce(b.chainId, b.counterMock.address)).to.equal(aInboundNonce)
    expect(await b.lzEndpoint.getInboundNonce(a.chainId, a.counterMock.address)).to.equal(bInboundNonce.add(1))
}

const incrementCounterWithTestSameChain = async (a, attributes = {}) => {
    const b = a
    // state before the msg gets sent across
    const aRemoteCounter = await a.counterMock.remoteAddressCounter(b.counterMock.address)
    const bRemoteCounter = await b.counterMock.remoteAddressCounter(a.counterMock.address)
    const aOutboundNonce = await a.lzEndpoint.getOutboundNonce(b.chainId, a.counterMock.address)
    const bOutBoundNonce = await b.lzEndpoint.getOutboundNonce(a.chainId, b.counterMock.address)
    const aInboundNonce = await a.lzEndpoint.getInboundNonce(b.chainId, b.counterMock.address)
    const bInboundNonce = await b.lzEndpoint.getInboundNonce(a.chainId, a.counterMock.address)

    await incrementCounter(a, b, attributes)

    // src counter and dst counter are the same thing, so everything should increment by 1
    // state afterwards
    expect(await a.counterMock.remoteAddressCounter(b.counterMock.address)).to.equal(aRemoteCounter.add(1))
    expect(await b.counterMock.remoteAddressCounter(a.counterMock.address)).to.equal(bRemoteCounter.add(1))
    expect(await a.lzEndpoint.getOutboundNonce(b.chainId, a.counterMock.address)).to.equal(aOutboundNonce.add(1))
    expect(await b.lzEndpoint.getOutboundNonce(a.chainId, b.counterMock.address)).to.equal(bOutBoundNonce.add(1))
    expect(await a.lzEndpoint.getInboundNonce(b.chainId, b.counterMock.address)).to.equal(aInboundNonce.add(1))
    expect(await b.lzEndpoint.getInboundNonce(a.chainId, a.counterMock.address)).to.equal(bInboundNonce.add(1))
}

deliverMsg = async (tx, src, dst, targetDestAddress, attributes = {}) => {
    const confirmations = attributes.confirmations ?? 15
    const gasLimit = attributes.gasLimit ?? 100000
    const value = attributes.value ?? 0
    const outboundProofType = await getOutboundProofType(src.ultraLightNode, src.counterMock, dst.chainId)

    await deliverOracle(tx, src.chainId, dst.ultraLightNode, dst.oracle, confirmations)
    return await deliverRelayer(tx, src.chainId, dst.ultraLightNode, targetDestAddress, dst.relayer, outboundProofType, gasLimit, value)
}

// Used for retrying a failed deliverMsg call
redeliverMsg = async (tx, src, dst, targetDestAddress, attributes = {}) => {
    const gasLimit = attributes.gasLimit ?? 100000
    const outboundProofType = await getOutboundProofType(src.ultraLightNode, src.counterMock, dst.chainId)

    return await deliverRelayer(tx, src.chainId, dst.ultraLightNode, targetDestAddress, dst.relayer, outboundProofType, gasLimit)
}

deliverOracle = async (tx, srcChainId, ultraLightNode, oracle, confirmations) => {
    const block = await getBlock(tx)

    const oracleOwner = await oracle.owner()
    await callAsContract(oracle, oracleOwner, "updateHash(uint16,bytes32,uint256,bytes32)", [
        srcChainId,
        tx.blockHash,
        confirmations,
        block.receiptsRoot,
    ])
}

deliverRelayer = async (tx, srcEndpointId, ultraLightNode, targetDstAddress, relayer, outboundProofType, gasLimit, extraNative = 0) => {
    const getProof = new GetProof(network.provider, "hardhat")
    const block = await getBlock(tx)
    const receipt = await network.provider.send("eth_getTransactionReceipt", [tx.hash])
    const logIndex = receipt.logs.findIndex(
        (x) => x.topics[0].toString() === "0xe8d23d927749ec8e512eb885679c2977d57068839d8cca1a85685dbbea0648f6"
    )
    if (logIndex === -1) throw "no log in receipt"
    const proof = await proofUtils.getLogInclusionProof(getProof, block, receipt, outboundProofType, logIndex, srcEndpointId)
    const validateFunction =
        extraNative > 0
            ? "validateTransactionProofV2(uint16,address,uint256,bytes32,bytes,address)"
            : "validateTransactionProofV1(uint16,address,uint256,bytes32,bytes)"
    const params =
        extraNative > 0
            ? [srcEndpointId, targetDstAddress, gasLimit, tx.blockHash, proof, targetDstAddress]
            : [srcEndpointId, targetDstAddress, gasLimit, tx.blockHash, proof]

    // assume the to_ is always relayer signer as a hack
    return await callAsContract(relayer, relayer.address, validateFunction, params, extraNative)
}

deployNew = async (contractName, params = []) => {
    const C = await ethers.getContractFactory(contractName)
    return await C.deploy(...params)
}

generateEndpoints = async (endpointIds, hardhatDeploy = true) => {
    return await Promise.all(
        endpointIds.map(async (chainId, index) => {
            if (hardhatDeploy && index === 0) {
                return {
                    chainId,
                    lzEndpoint: await ethers.getContract("Endpoint"),
                    lzToken: await ethers.getContract("LayerZeroTokenMock"),
                    mockLinkToken: await ethers.getContract("MockLinkToken"),
                }
            } else {
                return {
                    chainId,
                    lzEndpoint: await deployNew("Endpoint", [chainId]),
                    lzToken: await deployNew("LayerZeroTokenMock"),
                    mockLinkToken: await deployNew("MockLinkToken"),
                }
            }
        })
    )
}

generateVersion = async (
    endpoint,
    chainIds,
    inboundProofType,
    oracleMock = false,
    version = 1,
    hardhatDeploy = false,
    deployPingPong = false
) => {
    let { lzEndpoint, lzToken, mockLinkToken } = endpoint
    const { oracleFee, outboundProofType, outboundProofType2, nativeBP } = VARS
    let ultraLightNode, oracle, relayer, treasury, counterMock, evmValidator, pingPong

    // flag for determining if we should be using the hardhat deploy retrieval method for contracts
    // this wont work for tests where we need multiple versions/endpoints setup as the hardhat deploy returns the
    // same snapshot of contracts each time its called
    if (hardhatDeploy) {
        ultraLightNode = await ethers.getContract("UltraLightNode")
        oracle = await ethers.getContract("LayerZeroOracleMock")
        relayer = await ethers.getContract("Relayer")
        treasury = await ethers.getContract("Treasury")
        counterMock = await ethers.getContract("OmniCounter")
        if (deployPingPong) pingPong = await ethers.getContract("PingPong")
        evmValidator = await ethers.getContract("EVMValidator")
    } else {
        ultraLightNode = await deployNew("UltraLightNode", [lzEndpoint.address])
        oracle = oracleMock
            ? await deployNew("LayerZeroOracleMock")
            : await deployNew("ChainlinkOracleClient", [mockLinkToken.address, endpoint.chainId])
        relayer = await deployNew("Relayer")
        treasury = await deployNew("Treasury", [ultraLightNode.address])
        counterMock = await deployNew("OmniCounter", [lzEndpoint.address])
        if (deployPingPong) pingPong = await deployNew("PingPong", [lzEndpoint.address])
        evmValidator = await deployNew("EVMValidator")
        await relayer.initialize(ultraLightNode.address) // hardhat deploy scripts initialize this for us
    }

    // non automated deploy settings
    // mock link token
    await mockLinkToken.mint(oracle.address, ethers.utils.parseEther("1000")) // ensure oracle has enough 'link token'
    // treasury
    await treasury.setNativeBP(nativeBP)
    await treasury.setFeeEnabled(true)
    // uln
    await ultraLightNode.setLayerZeroToken(lzToken.address)
    await ultraLightNode.setTreasury(treasury.address)

    // automated deploy settings
    // oracle
    await oracle.setUln(ultraLightNode.address)
    for (let id of chainIds) {
        await oracle.setPrice(id, outboundProofType, oracleFee)
        await oracle.setPrice(id, outboundProofType2, oracleFee)
    }
    // lzEndpoint
    await lzEndpoint.newVersion(ultraLightNode.address)
    await lzEndpoint.setDefaultSendVersion(1)
    await lzEndpoint.setDefaultReceiveVersion(1)

    return {
        ultraLightNode,
        oracle,
        relayer,
        treasury,
        counterMock,
        pingPong,
        evmValidator,
        outboundProofType: inboundProofType,
        name: ID_TO_CHAIN_NAME[endpoint.chainId],
        version,
        ...endpoint,
    }
}

wireEndpoint = async (src, dst, uln = true) => {
    const {
        baseGas,
        gasPerByte,
        dstNativeCap,
        outboundProofType,
        outboundProofType2,
        dstGasPrice,
        adapterParams,
        chainAddressSize,
        oracleJobId,
        oracleFee,
    } = VARS

    await src.ultraLightNode.addInboundProofLibraryForChain(dst.chainId, src.evmValidator.address)
    await src.ultraLightNode.enableSupportedOutboundProof(dst.chainId, outboundProofType)
    await src.ultraLightNode.enableSupportedOutboundProof(dst.chainId, outboundProofType2)
    await src.ultraLightNode.setChainAddressSize(dst.chainId, chainAddressSize)
    await src.ultraLightNode.setDefaultAdapterParamsForChainId(
        dst.chainId,
        outboundProofType,
        ethers.utils.solidityPack(adapterParams[outboundProofType].types, adapterParams[outboundProofType].values)
    )
    await src.ultraLightNode.setDefaultAdapterParamsForChainId(
        dst.chainId,
        outboundProofType2,
        ethers.utils.solidityPack(adapterParams[outboundProofType2].types, adapterParams[outboundProofType2].values)
    )
    await src.ultraLightNode.setDefaultConfigForChainId(
        dst.chainId,
        DEFAULT_APP_CONFIG_VALUES.inboundProofLibraryVersion,
        DEFAULT_APP_CONFIG_VALUES.inboundBlockConfirmations,
        src.relayer.address,
        src.outboundProofType,
        DEFAULT_APP_CONFIG_VALUES.outboundBlockConfirmations,
        src.oracle.address
    )

    await src.oracle.setJob(dst.chainId, src.oracle.address, oracleJobId, oracleFee)
    await src.oracle.setDeliveryAddress(dst.chainId, dst.oracle.address)

    await src.relayer.setDstPrice(dst.chainId, 10000, dstGasPrice)
    await src.relayer.setDstConfig(dst.chainId, outboundProofType, dstNativeCap, baseGas, gasPerByte)
    await src.relayer.setDstConfig(dst.chainId, outboundProofType2, dstNativeCap, baseGas, gasPerByte)

    // allow the setup to refrain from setting remote uln
    if (uln) {
        const dstUlnAddressBytes32 = ethers.utils.hexZeroPad(dst.ultraLightNode.address, 32)
        await src.ultraLightNode.setRemoteUln(dst.chainId, dstUlnAddressBytes32)
    }
}

wireEndpoints = async (endpoints, uln = true) => {
    for (let a = 0; a < endpoints.length; a++) {
        for (let b = 0; b < endpoints.length; b++) {
            await wireEndpoint(endpoints[a], endpoints[b], uln)
        }
    }
    return endpoints
}

// Tricks ethers js into thinking this contract has access to these functions. This is used to force a call to a contract
// that doesnt contain the function in its generated abi, and as a result it will proxy the call into the _implementation() contract
applyInterfaceToContract = (contract, contractToCopy) => {
    let interfaceFunctions = Object.fromEntries(Object.entries(contractToCopy).filter(([, y]) => typeof y == "function"))
    contract = { ...contract, ...interfaceFunctions }
    return contract
}

encodeParams = (types, values, packed = false) => {
    if (!packed) {
        return web3.eth.abi.encodeParameters(types, values)
    } else {
        return ethers.utils.solidityPack(types, values)
    }
}

encodePackedParams = (types, values) => {
    return encodeParams(types, values, true)
}

decodeParam = (type, value) => {
    return web3.eth.abi.decodeParameter(type, value)
}

txTouchedAddress = async (tx, address) => {
    const trace = await hre.network.provider.send("debug_traceTransaction", [tx.hash])
    const opCalls = trace.structLogs.filter((x) => x.op === "CALL")
    const addr = address.toLowerCase().split("x")[1]

    // not fully optimised, we could check for these as filtering, but not important for the test cases we are doing
    for (const op of opCalls) {
        for (const stack of op.stack) {
            if (stack.includes(addr)) {
                return true
            }
        }
    }

    return false
}

// dstPriceRatio and price for a relayer gas fee
getRatioAndPrice = (values = {}, typeTwo = false) => {
    const { denominator, dstPrice, srcPrice, dstNativeAmt, dstGasPrice, baseGas, extraGas, payloadLength, gasPerByte } = values

    const _denominator = denominator || VARS.denominator
    const _dstPrice = dstPrice || VARS.dstPrice
    const _srcPrice = srcPrice || VARS.srcPrice

    // type 1 transaction, do not include dst native gas in the price formula
    const _dstNativeAmount = typeTwo ? dstNativeAmt || VARS.dstNativeAmt : 0
    const _dstGasPrice = dstGasPrice || VARS.dstGasPrice
    const _baseGas = baseGas || VARS.baseGas
    const _extraGas = extraGas || VARS.extraGas
    const _payloadLength = payloadLength || VARS.payloadLength
    const _gasPerByte = gasPerByte || VARS.gasPerByte

    const dstPriceRatio = (_dstPrice * _denominator) / _srcPrice

    const basePrice = ((_dstNativeAmount + _dstGasPrice * (_baseGas + _extraGas)) * dstPriceRatio) / _denominator
    const pricePerByte = (_dstGasPrice * _gasPerByte * dstPriceRatio) / _denominator
    const expectedPrice = basePrice + pricePerByte * _payloadLength

    return { dstPriceRatio, expectedPrice }
}

getRatioAndPriceType2 = (values = {}) => {
    return getRatioAndPrice(values, true)
}
getRatioAndPriceType1 = (values = {}) => {
    return getRatioAndPrice(values)
}

getPairs = (lengthOfArray) => {
    let pairs = []
    for (let i = 0; i < lengthOfArray - 1; i++) {
        for (let j = i; j < lengthOfArray - 1; j++) {
            pairs.push([i, j + 1])
            pairs.push([j + 1, i])
        }
    }
    return pairs
}

setRelayer = async (uln, endpoint, ua, relayer, chainId) => {
    return await callAsContract(uln, endpoint.address, "setConfig(uint16,address,uint256,bytes)", [
        chainId,
        ua.address,
        CONFIG_TYPE_RELAYER,
        encodeParams(["address"], [relayer.address]),
    ])
}

setOracle = async (uln, endpoint, ua, oracle, chainId) => {
    return await callAsContract(uln, endpoint.address, "setConfig(uint16,address,uint256,bytes)", [
        chainId,
        ua.address,
        CONFIG_TYPE_ORACLE,
        encodeParams(["address"], [oracle.address]),
    ])
}

setOutboundProofType = async (uln, endpoint, ua, proofType, chainId) => {
    return await callAsContract(uln, endpoint.address, "setConfig(uint16,address,uint256,bytes)", [
        chainId,
        ua.address,
        CONFIG_TYPE_OUTBOUND_PROOF_TYPE,
        encodeParams(["uint16"], [proofType]),
    ])
}

setOutboundBlockConfirmations = async (uln, endpoint, ua, confirmations, chainId) => {
    return await callAsContract(uln, endpoint.address, "setConfig(uint16,address,uint256,bytes)", [
        chainId,
        ua.address,
        CONFIG_TYPE_OUTBOUND_BLOCK_CONFIRMATIONS,
        encodeParams(["uint16"], [confirmations]),
    ])
}

setInboundBlockConfirmations = async (uln, endpoint, ua, confirmations, chainId) => {
    return await callAsContract(uln, endpoint.address, "setConfig(uint16,address,uint256,bytes)", [
        chainId,
        ua.address,
        CONFIG_TYPE_INBOUND_BLOCK_CONFIRMATIONS,
        encodeParams(["uint16"], [confirmations]),
    ])
}

setInboundProofLibraryVersion = async (uln, endpoint, ua, libraryVersion, chainId) => {
    return await callAsContract(uln, endpoint.address, "setConfig(uint16,address,uint256,bytes)", [
        chainId,
        ua.address,
        CONFIG_TYPE_INBOUND_PROOF_LIBRARY_VERSION,
        encodeParams(["uint16"], [libraryVersion]),
    ])
}

getOutboundProofType = async (uln, ua, chainId) => {
    return parseInt(decodeParam("uint16", await uln.getConfig(chainId, ua.address, CONFIG_TYPE_OUTBOUND_PROOF_TYPE)))
}

module.exports = {
    getAddr,
    checkBalance,
    checkTokenBalance,
    getBalance,
    callAsContract,
    generateEndpoints,
    generateVersion,
    deployNew,
    deliverMsg,
    redeliverMsg,
    wireEndpoints,
    encodeParams,
    encodePackedParams,
    txTouchedAddress,
    decodeParam,
    getRatioAndPriceType1,
    getRatioAndPriceType2,
    getPairs,
    checkInboundNonce,
    checkOutboundNonce,
    checkCounter,
    checkCounters,
    pingPong,
    incrementCounter,
    incrementCounterWithTest,
    incrementCounterWithTestSameChain,
    setRelayer,
    setOracle,
    setOutboundProofType,
    setOutboundBlockConfirmations,
    setInboundBlockConfirmations,
    setInboundProofLibraryVersion,
    getOutboundProofType,
}
