const { CHAIN_KEY, CHAINLINK_ORACLE_CLIENTS, getEndpointIdByName } = require("@layerzerolabs/lz-sdk")
const { getEndpointId } = require("../utils/network")

const TYPE_ORACLE = 6

module.exports = async function (taskArgs, hre) {
    // get local OmniCounter instance
    const omniCounter = await ethers.getContract("OmniCounter")
    console.log(`omniCounter.address: ${omniCounter.address}`)
    const dstChainId = getEndpointIdByName(taskArgs.targetNetwork)

    // set the config for this UA to use the specified Oracle
    let data = await omniCounter.getConfig(
        0, // unused
        dstChainId,
        omniCounter.address,
        TYPE_ORACLE
    )

    console.log(`✅ Oracle for src (${hre.network.name}) -> dst [${dstChainId}]: ${data.replace("000000000000000000000000", "")}`)
    // console.log(`tx: ${tx.transactionHash}`)
}
