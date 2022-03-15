const { getDeploymentAddresses, getRpc } = require("../utils/readStatic")
const { CHAIN_ID } = require("@layerzerolabs/core-sdk")
const crossChainHelper = require("../utils/deploy/crossChainHelper")

const CONFIG_TYPE = {
    INBOUND: "1",
    OUTBOUND: "4",
}

const CONFIG_TYPE_REVERSE = {
    1: "INBOUND",
    4: "OUTBOUND",
}

const setProofType = async (omniCounter, chainId, remoteChainId, configType, proofTypeVersion) => {
    const currentInboundType = await omniCounter.getConfig("0", remoteChainId, "0x0000000000000000000000000000000000000000", configType)

    const currentProofTypeVersion = ethers.utils.defaultAbiCoder.decode(["uint64"], currentInboundType)[0].toString()

    if (currentProofTypeVersion === proofTypeVersion) {
        console.log(`[${chainId}] Proof type ${proofTypeVersion} already set for ${remoteChainId} for ${CONFIG_TYPE_REVERSE[configType]}`)
        return
    }

    console.log(`[${chainId}] Proof type ${proofTypeVersion} is NOT SET for ${remoteChainId} for ${CONFIG_TYPE_REVERSE[configType]}`)
    console.log("Settings it!")

    let config = ethers.utils.defaultAbiCoder.encode(["uint16", "uint16"], [remoteChainId, proofTypeVersion])
    let tx
    try {
        tx = await omniCounter.setConfig("0", configType, config, { gasLimit: 1000000 })
    } catch (err) {
        console.log(`Got an error sending transaction on [${chainId}] configuring ${remoteChainId} ${CONFIG_TYPE_REVERSE[configType]}`)
        console.log(err)
        return
    }
    let fTx
    try {
        fTx = await tx.wait()
    } catch (err) {
        console.log(
            `Got an error waiting for the transaction on chain [${chainId}] configuring ${remoteChainId} ${CONFIG_TYPE_REVERSE[configType]}`
        )
        console.log(err)
        return
    }

    console.log(
        `[${chainId}] Proof type ${proofTypeVersion} is have been set for ${remoteChainId} for ${CONFIG_TYPE_REVERSE[configType]} with tx hash ${fTx.transactionHash}`
    )
}

module.exports = async function (taskArgs, hre) {
    const networks = crossChainHelper.NETWORKS_BY_ENV[taskArgs.e]

    if (!networks) {
        console.log(`Invalid environment ${taskArgs.e}, environment should be one of mainnet testnet or sandbox`)
    }

    const outboundProofType = taskArgs.p
    const inboundProofVersion = taskArgs.v

    console.log("************* Sending transaction *************")
    await Promise.all(
        networks.map(async (counterMockNetwork) => {
            console.log(`Changing config type for chain ${CHAIN_ID[counterMockNetwork]}`)

            const omniCounter = await crossChainHelper.getWalletContract(
                hre,
                counterMockNetwork,
                crossChainHelper.CONTRACT_NAMES.OMNI_COUNTER,
                0
            )
            for (let network of networks) {
                if (network !== counterMockNetwork) {
                    continue
                }
                await setProofType(omniCounter, CHAIN_ID[counterMockNetwork], CHAIN_ID[network], CONFIG_TYPE.INBOUND, inboundProofVersion)
                await setProofType(omniCounter, CHAIN_ID[counterMockNetwork], CHAIN_ID[network], CONFIG_TYPE.OUTBOUND, outboundProofType)
            }
        })
    )
}
