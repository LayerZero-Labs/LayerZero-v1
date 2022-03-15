import { LzConfigType, DstConfigDefinition, DstPriceDefinition } from "./configTypes"
import * as ethers from "ethers"
import BN from "bn.js"
import { getDeploymentAddresses, getRpc } from "../readStatic"
import { CHAIN_ID } from "@layerzerolabs/core-sdk"
import { TransactionReceipt } from "@ethersproject/abstract-provider"

export interface Transaction {
    needChange: boolean
    contractName: string
    methodName: string
    args: any[]
    chainId: string
    remoteChainId?: string
    diff?: { [key: string]: { newValue: any; oldValue: any } }
}

export const CONTRACT_NAMES = {
    RELAYER: "Relayer",
    ULN: "UltraLightNode",
    CHAINLINK_ORACLE: "ChainlinkOracleClient",
    LZ_ORACLE: "LayerZeroOracleMock",
    ENDPOINT: "Endpoint",
    EVM_VALIDATOR: "EVMValidator",
    OMNI_COUNTER: "OmniCounter",
}

export const NETWORKS_BY_ENV = {
    sandbox: [
        "rinkeby-sandbox",
        "bsc-testnet-sandbox",
        "fuji-sandbox",
        "mumbai-sandbox",
        "arbitrum-rinkeby-sandbox",
        "optimism-kovan-sandbox",
        "fantom-testnet-sandbox",
    ],
    testnet: ["rinkeby", "bsc-testnet", "fuji", "mumbai", "arbitrum-rinkeby", "optimism-kovan", "fantom-testnet"],
    mainnet: ["ethereum", "bsc", "avalanche", "polygon", "arbitrum", "optimism", "fantom"],
}

export const isRoolup = (network) =>
    ["optimism", "optimism-kovan", "optimism-kovan-sandbox", "arbitrum", "arbitrum-rinkeby", "arbitrum-rinkeby-sandbox"].includes(network)

const providerByNetwork = {}

const getProvider = (network) => {
    if (!providerByNetwork[network]) {
        providerByNetwork[network] = new ethers.providers.JsonRpcProvider(getRpc(CHAIN_ID[network]))
    }
    return providerByNetwork[network]
}

export const getWallet = (index) => {
    return ethers.Wallet.fromMnemonic(process.env.MNEMONIC || "", `m/44'/60'/0'/0/${index}`)
}

const connectedWallets = {}

export const getConnectedWallet = (network, walletIndex) => {
    const key = `${network}-${walletIndex}`
    if (!connectedWallets[key]) {
        const provider = getProvider(network)
        const wallet = getWallet(walletIndex)
        connectedWallets[key] = wallet.connect(provider)
    }
    return connectedWallets[key]
}

const contractFactories = {}

const getContractFactory = async (hre, contractName) => {
    if (!contractFactories[contractName]) {
        contractFactories[contractName] = await hre.ethers.getContractFactory(contractName)
    }
    return contractFactories[contractName]
}

const deploymentAddresses = {}
export const getDeploymentAddress = (network, contractName) => {
    const key = `${network}-${contractName}`
    if (!deploymentAddresses[key]) {
        deploymentAddresses[key] = getDeploymentAddresses(network)[contractName]
    }
    return deploymentAddresses[key]
}

const contracts = {}

export const getContract = async (hre, network, contractName) => {
    const key = `${network}-${contractName}`
    if (!contracts[key]) {
        const contractFactory = await getContractFactory(hre, contractName)
        const contractAddress = getDeploymentAddress(network, contractName)
        const provider = getProvider(network)

        contracts[key] = contractFactory.attach(contractAddress).connect(provider)
    }
    return contracts[key]
}

export const getWalletContract = async (hre, network, contractName, walletIndex) => {
    const contract = await getContract(hre, network, contractName)
    const wallet = getConnectedWallet(network, walletIndex)
    return contract.connect(wallet)
}

export async function configureRelayer(hre: any, network: string, config: LzConfigType): Promise<Transaction[]> {
    const relayer = await getContract(hre, network, CONTRACT_NAMES.RELAYER)
    const response: Transaction[] = []
    if ("approvedAddresses" in config.layerZeroRelayer) {
        for (const k in config.layerZeroRelayer.approvedAddresses) {
            const currentlyApproved = await relayer.isApproved(k)
            const needChange = !currentlyApproved
            const tx: any = {
                needChange,
                chainId: CHAIN_ID[network],
                contractName: CONTRACT_NAMES.RELAYER,
                methodName: "setApprovedAddress",
                args: [k, config.layerZeroRelayer.approvedAddresses[k]],
            }
            if (tx.needChange) {
                tx.diff = { isApproved: { oldValue: false, newValue: true } }
            }
            response.push(tx)
        }
    }
    return response
}

function getOracleContractName(config: LzConfigType): string {
    if ("oracle" in config.ultraLightNode.defaultApp) {
        return CONTRACT_NAMES.CHAINLINK_ORACLE
    } else {
        return CONTRACT_NAMES.LZ_ORACLE
    }
}

export async function configureOracle(hre: any, network: string, config: LzConfigType): Promise<Transaction[]> {
    const oracleConfig = config.chainLinkOracle
    const response: Transaction[] = []
    const oracleContractName = getOracleContractName(config)
    const oracle = await getContract(hre, network, oracleContractName)
    const ulnAddr = getDeploymentAddress(network, CONTRACT_NAMES.ULN)
    //set uln
    const currentUln = await oracle.uln()
    const needChange = /^0x0+$/.test(currentUln) || currentUln !== ulnAddr
    const tx: any = {
        needChange,
        chainId: CHAIN_ID[network],
        contractName: oracleContractName,
        methodName: "setUln",
        args: [ulnAddr],
    }
    if (tx.needChange) {
        tx.diff = { uln: { oldValue: currentUln, newValue: ulnAddr } }
    }
    response.push(tx)

    //set price
    for (const c in oracleConfig.chainPrice) {
        for (const t in oracleConfig.chainPrice[c]) {
            const currentPrice: BN = new BN((await oracle.chainPriceLookup(t, c)).toString())
            const newPrice: BN = oracleConfig.chainPrice[c][t]

            const needChange = currentPrice.isZero() || !currentPrice.eq(newPrice)
            const tx: any = {
                needChange,
                chainId: CHAIN_ID[network],
                remoteChainId: c,
                contractName: oracleContractName,
                methodName: "setPrice",
                args: [c, t, newPrice.toString()],
            }
            if (tx.needChange) {
                tx.diff = { uln: { oldValue: currentPrice.toString(), newValue: newPrice.toString() } }
            }
            response.push(tx)
        }
    }

    //approve oracle signers
    if ("approvedAddresses" in oracleConfig) {
        for (const k in oracleConfig.approvedAddresses) {
            const currentlyApproved = await oracle.isApproved(k)
            const needChange = !currentlyApproved
            const tx: any = {
                needChange,
                chainId: CHAIN_ID[network],
                contractName: oracleContractName,
                methodName: "setApprovedAddress",
                args: [k, oracleConfig.approvedAddresses[k]],
            }
            if (tx.needChange) {
                tx.diff = { isApproved: { oldValue: false, newValue: true } }
            }
            response.push(tx)
        }
    }
    return response
}

export async function setDstPrice(hre: any, network: string, remoteNetwork: string, config: LzConfigType): Promise<Transaction[]> {
    const relayer = await getContract(hre, network, CONTRACT_NAMES.RELAYER)
    const remoteEid = CHAIN_ID[remoteNetwork]
    const q = await relayer.dstPriceLookup(remoteEid)

    const dstPrice = config.layerZeroRelayer.dstPrice[remoteEid]!

    const currentPrice: DstPriceDefinition = {
        dstPriceRatio: new BN(q.dstPriceRatio.toString()),
        dstGasPriceInWei: new BN(q.dstGasPriceInWei.toString()),
    }

    const diff: any = {}
    if (currentPrice.dstPriceRatio.isZero()) {
        diff.price = { oldValue: currentPrice.dstPriceRatio.toString(), newValue: dstPrice.dstPriceRatio.toString() }
    }
    if (currentPrice.dstPriceRatio.isZero()) {
        diff.dstGasPriceInWei = { oldValue: currentPrice.dstGasPriceInWei.toString(), newValue: dstPrice.dstGasPriceInWei.toString() }
    }
    const needChange = !!Object.keys(diff).length
    const tx: any = {
        needChange,
        chainId: CHAIN_ID[network],
        remoteChainId: CHAIN_ID[remoteNetwork],
        contractName: CONTRACT_NAMES.RELAYER,
        methodName: "setDstPrice",
        args: [remoteEid, dstPrice.dstPriceRatio.toString(), dstPrice.dstGasPriceInWei.toString()],
    }
    if (tx.needChange) {
        tx.diff = diff
    }
    return [tx]
}

export async function setDstConfig(hre: any, network: string, remoteNetwork: string, config: LzConfigType): Promise<Transaction[]> {
    const relayer = await getContract(hre, network, CONTRACT_NAMES.RELAYER)
    const remoteEid = CHAIN_ID[remoteNetwork]
    const dstConfig = config.layerZeroRelayer.dstConfig[remoteEid]!

    const response: Transaction[] = []

    for (const t in dstConfig) {
        const q = await relayer.dstConfigLookup(remoteEid, t)

        const currentConfig: DstConfigDefinition = {
            baseGas: new BN(q.baseGas.toString()),
            dstNativeAmtCap: new BN(q.dstNativeAmtCap.toString()),
            gasPerByte: new BN(q.gasPerByte.toString()),
        }

        const diff: any = {}
        if (currentConfig.dstNativeAmtCap.isZero() || !currentConfig.dstNativeAmtCap.eq(dstConfig[t].dstNativeAmtCap)) {
            diff.dstNativeAmtCap = { oldValue: currentConfig.dstNativeAmtCap.toString(), newValue: dstConfig[t].dstNativeAmtCap.toString() }
        }
        if (currentConfig.baseGas.isZero() || !currentConfig.baseGas.eq(dstConfig[t].baseGas)) {
            diff.baseGas = { oldValue: currentConfig.baseGas.toString(), newValue: dstConfig[t].baseGas.toString() }
        }
        if (currentConfig.gasPerByte.isZero() || !currentConfig.gasPerByte.eq(dstConfig[t].gasPerByte)) {
            diff.gasPerByte = { oldValue: currentConfig.gasPerByte.toString(), newValue: dstConfig[t].gasPerByte.toString() }
        }
        const needChange = !!Object.keys(diff).length
        const tx: any = {
            needChange,
            chainId: CHAIN_ID[network],
            remoteChainId: CHAIN_ID[remoteNetwork],
            contractName: CONTRACT_NAMES.RELAYER,
            methodName: "setDstConfig",
            args: [remoteEid, t, dstConfig[t].dstNativeAmtCap.toString(), dstConfig[t].baseGas.toString(), dstConfig[t].gasPerByte.toString()],
        }
        if (tx.needChange) {
            tx.diff = diff
        }

        response.push(tx)
    }

    return response
}

export async function initLibraryVersion(hre: any, network: string): Promise<Transaction[]> {
    const endpoint = await getContract(hre, network, CONTRACT_NAMES.ENDPOINT)
    const ulnAddress = await getDeploymentAddress(network, CONTRACT_NAMES.ULN)
    const currentVersion: number = await endpoint.latestVersion()
    const needChange = currentVersion === 0
    const tx: any = {
        needChange,
        chainId: CHAIN_ID[network],
        contractName: CONTRACT_NAMES.ENDPOINT,
        methodName: "newVersion",
        args: [ulnAddress],
    }
    if (tx.needChange) {
        tx.diff = { version: { oldValue: currentVersion, newValue: 1 } }
    }
    return [tx]
}

export async function setDefaultSendVersion(hre: any, network: string, config: LzConfigType): Promise<Transaction[]> {
    const endpoint = await getContract(hre, network, CONTRACT_NAMES.ENDPOINT)
    const defaultSendVersion = config.endpoint.defaultSendVersion
    const currentVersion: number = await endpoint.defaultSendVersion()
    const needChange = currentVersion === 0 || currentVersion !== defaultSendVersion
    const tx: any = {
        needChange,
        chainId: CHAIN_ID[network],
        contractName: CONTRACT_NAMES.ENDPOINT,
        methodName: "setDefaultSendVersion",
        args: [defaultSendVersion],
    }
    if (tx.needChange) {
        tx.diff = { defaultSendVersion: { oldValue: currentVersion, newValue: defaultSendVersion } }
    }
    return [tx]
}

export async function setDefaultReceiveVersion(hre: any, network: string, config: LzConfigType): Promise<Transaction[]> {
    const defaultReceiveVersion = config.endpoint.defaultReceiveVersion
    const endpoint = await getContract(hre, network, CONTRACT_NAMES.ENDPOINT)

    const currentVersion: number = await endpoint.defaultReceiveVersion()
    const needChange = currentVersion === 0 || currentVersion !== defaultReceiveVersion
    const tx: any = {
        needChange,
        chainId: CHAIN_ID[network],
        contractName: CONTRACT_NAMES.ENDPOINT,
        methodName: "setDefaultReceiveVersion",
        args: [defaultReceiveVersion],
    }
    if (tx.needChange) {
        tx.diff = { defaultReceiveVersion: { oldValue: currentVersion, newValue: defaultReceiveVersion } }
    }
    return [tx]
}

export async function setDefaultAdapterParams(hre: any, network: string, remoteNetwork: string, config: LzConfigType): Promise<Transaction[]> {
    const remoteEid = CHAIN_ID[remoteNetwork]
    const uln = await getContract(hre, network, CONTRACT_NAMES.ULN)
    const response: Transaction[] = []
    const defaultAdapterParams = config.ultraLightNode.proof.outbound[remoteEid]!.defaultAdapterParams

    for (const outboundProofType in defaultAdapterParams) {
        const currentAdapterParams = await uln.defaultAdapterParams(remoteEid, outboundProofType)

        const newAdapterParams = ethers.utils.solidityPack(
            defaultAdapterParams[outboundProofType].types,
            defaultAdapterParams[outboundProofType].values
        )
        const needChange = currentAdapterParams == "0x" || currentAdapterParams !== newAdapterParams
        const tx: any = {
            needChange,
            chainId: CHAIN_ID[network],
            remoteChainId: CHAIN_ID[remoteNetwork],
            contractName: CONTRACT_NAMES.ULN,
            methodName: "setDefaultAdapterParamsForChainId",
            args: [remoteEid, outboundProofType, newAdapterParams],
        }
        if (tx.needChange) {
            tx.diff = { adapterParams: { oldValue: currentAdapterParams, newValue: newAdapterParams } }
        }
        response.push(tx)
    }
    return response
}

export async function setSupportedOutboundProofTypes(
    hre: any,
    network: string,
    remoteNetwork: string,
    config: LzConfigType
): Promise<Transaction[]> {
    const remoteEid = CHAIN_ID[remoteNetwork]
    const uln = await getContract(hre, network, CONTRACT_NAMES.ULN)

    const supportedOutboundProof = config.ultraLightNode.proof.outbound[remoteEid].supportedOutboundProof

    const response: Transaction[] = []

    for (const outboundProofType in supportedOutboundProof) {
        const currentlySupported: boolean = await uln.supportedOutboundProof(remoteEid, outboundProofType)
        const needChange = supportedOutboundProof[outboundProofType] && !currentlySupported
        const tx: any = {
            needChange,
            chainId: CHAIN_ID[network],
            remoteChainId: CHAIN_ID[remoteNetwork],
            contractName: CONTRACT_NAMES.ULN,
            methodName: "enableSupportedOutboundProof",
            args: [remoteEid, outboundProofType],
        }
        if (tx.needChange) {
            tx.diff = { currentlySupported: { oldValue: currentlySupported, newValue: true } }
        }
        response.push(tx)
    }
    return response
}

export async function setRemoteUln(hre: any, network: string, remoteNetwork: string, config: LzConfigType): Promise<Transaction[]> {
    const remoteEid = CHAIN_ID[remoteNetwork]
    const uln = await getContract(hre, network, CONTRACT_NAMES.ULN)
    const remoteUlnAddr = config.ultraLightNode.proof.inbound[remoteEid].remoteUln || getDeploymentAddress(remoteNetwork, CONTRACT_NAMES.ULN)
    const remoteUlnBytesAddr: string = hre.ethers.utils.hexZeroPad(remoteUlnAddr.toLowerCase(), 32)

    const currentRemoteUln: string = await uln.ulnLookup(remoteEid)
    const needChange = /^0x0+$/.test(currentRemoteUln) || remoteUlnBytesAddr !== currentRemoteUln
    const tx: any = {
        needChange,
        chainId: CHAIN_ID[network],
        remoteChainId: CHAIN_ID[remoteNetwork],
        contractName: CONTRACT_NAMES.ULN,
        methodName: "setRemoteUln",
        args: [remoteEid, remoteUlnBytesAddr],
    }
    if (tx.needChange) {
        tx.diff = { remoteUlnBytesAddr: { oldValue: currentRemoteUln, newValue: remoteUlnBytesAddr } }
    }
    return [tx]
}

export async function initInboundProofLibrary(
    hre: any,
    network: string,
    remoteNetwork: string,
    inboundProofLibraryContractNames: string[]
): Promise<Transaction[]> {
    const remoteEid = CHAIN_ID[remoteNetwork]
    const uln = await getContract(hre, network, CONTRACT_NAMES.ULN)
    const response: Transaction[] = []
    const maxInboundProofLibrary: number = await uln.maxInboundProofLibrary(remoteEid)
    for (let index = 0; index < inboundProofLibraryContractNames.length; index++) {
        const libContractName = inboundProofLibraryContractNames[index]
        const libAddr = getDeploymentAddress(network, libContractName)
        const needChange = maxInboundProofLibrary <= index
        const tx: any = {
            needChange,
            chainId: CHAIN_ID[network],
            remoteChainId: CHAIN_ID[remoteNetwork],
            contractName: CONTRACT_NAMES.ULN,
            methodName: "addInboundProofLibraryForChain",
            args: [remoteEid, libAddr],
        }
        if (tx.needChange) {
            tx.diff = { maxInboundProofLibrary: { oldValue: maxInboundProofLibrary, newValue: index } }
        }
        response.push(tx)
    }
    return response
}

export async function setChainAddressSize(hre: any, network: string, remoteNetwork: string, config: LzConfigType): Promise<Transaction[]> {
    const remoteEid = CHAIN_ID[remoteNetwork]
    const uln = await getContract(hre, network, CONTRACT_NAMES.ULN)
    const currentChainAddressSize = new BN((await uln.chainAddressSizeMap(remoteEid)).toString())
    const addressSize = config.ultraLightNode.proof.addressSizes[remoteEid]!
    const needChange = currentChainAddressSize.isZero() || !currentChainAddressSize.eq(addressSize)
    const tx: any = {
        needChange,
        chainId: CHAIN_ID[network],
        remoteChainId: CHAIN_ID[remoteNetwork],
        contractName: CONTRACT_NAMES.ULN,
        methodName: "setChainAddressSize",
        args: [remoteEid, addressSize.toString()],
    }
    if (tx.needChange) {
        tx.diff = { addressSize: { oldValue: currentChainAddressSize.toString(), newValue: addressSize.toString() } }
    }
    return [tx]
}

export async function setDefaultAppConfig(hre: any, network: string, remoteNetwork: string, config: LzConfigType): Promise<Transaction[]> {
    const ulnDefaultAppConfig = config.ultraLightNode.defaultApp
    const relayerAddress = getDeploymentAddress(network, CONTRACT_NAMES.RELAYER)
    const oracleContractName = getOracleContractName(config)
    const oracleAddress = getDeploymentAddress(network, oracleContractName)
    if (ulnDefaultAppConfig.inboundProofLibraryVersion <= 0) {
        throw new Error("inbound proof library version cannot be zero")
    }
    if (ulnDefaultAppConfig.inboundBlockConfirmations.isZero()) {
        throw new Error("inbound block confirmation cannot be zero")
    }
    if (ulnDefaultAppConfig.outboundBlockConfirmations.isZero()) {
        throw new Error("outbound block confirmation cannot be zero")
    }

    const remoteEid = CHAIN_ID[remoteNetwork]
    const uln = await getContract(hre, network, CONTRACT_NAMES.ULN)

    const currentconfig = await uln.defaultAppConfig(remoteEid)

    const diff: any = {}
    if (
        currentconfig.inboundProofLibraryVersion === 0 ||
        currentconfig.inboundProofLibraryVersion !== ulnDefaultAppConfig.inboundProofLibraryVersion
    ) {
        diff.inboundProofLibraryVersion = {
            oldValue: currentconfig.inboundProofLibraryVersion,
            newValue: ulnDefaultAppConfig.inboundProofLibraryVersion,
        }
    }
    if (
        currentconfig.inboundBlockConfirmations.isZero() ||
        currentconfig.inboundBlockConfirmations.toString() !== ulnDefaultAppConfig.inboundBlockConfirmations.toString()
    ) {
        diff.inboundBlockConfirmations = {
            oldValue: currentconfig.inboundBlockConfirmations.toString(),
            newValue: ulnDefaultAppConfig.inboundBlockConfirmations.toString(),
        }
    }
    if (
        currentconfig.outboundBlockConfirmations.isZero() ||
        currentconfig.outboundBlockConfirmations.toString() !== ulnDefaultAppConfig.outboundBlockConfirmations.toString()
    ) {
        diff.outboundBlockConfirmations = {
            oldValue: currentconfig.outboundBlockConfirmations.toString(),
            newValue: ulnDefaultAppConfig.outboundBlockConfirmations.toString(),
        }
    }
    if (/^0x0+$/.test(currentconfig.relayer) || currentconfig.relayer !== relayerAddress) {
        diff.relayer = {
            oldValue: currentconfig.relayer,
            newValue: relayerAddress,
        }
    }
    if (/^0x0+$/.test(currentconfig.oracle) || currentconfig.oracle !== oracleAddress) {
        diff.oracle = {
            oldValue: currentconfig.oracle,
            newValue: oracleAddress,
        }
    }
    const needChange = !!Object.keys(diff).length
    const tx: any = {
        needChange,
        chainId: CHAIN_ID[network],
        remoteChainId: CHAIN_ID[remoteNetwork],
        contractName: CONTRACT_NAMES.ULN,
        methodName: "setDefaultConfigForChainId",
        args: [
            remoteEid,
            ulnDefaultAppConfig.inboundProofLibraryVersion,
            ulnDefaultAppConfig.inboundBlockConfirmations.toString(),
            relayerAddress,
            ulnDefaultAppConfig.outboundProofType,
            ulnDefaultAppConfig.outboundBlockConfirmations.toString(),
            oracleAddress,
        ],
    }
    if (tx.needChange) {
        tx.diff = diff
    }

    return [tx]
}

export const exectuteTransaction = async (hre: any, network: string, transaction: Transaction): Promise<TransactionReceipt> => {
    const walletContract = await getWalletContract(hre, network, transaction.contractName, 0)
    const receipt: TransactionReceipt = await (await walletContract[transaction.methodName](...transaction.args, { gasLimit: 8000000 })).wait()
    return receipt
}
