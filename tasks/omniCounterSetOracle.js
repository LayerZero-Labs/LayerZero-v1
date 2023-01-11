const { CHAIN_KEY, CHAINLINK_ORACLE_CLIENTS, getEndpointIdByName } = require("@layerzerolabs/lz-sdk")
const { getEndpointId } = require("../utils/network")

const TYPE_ORACLE = 6

module.exports = async function (taskArgs, hre) {
    // get local OmniCounter instance
    const omniCounter = await ethers.getContract("OmniCounter")
    console.log(`omniCounter.address: ${omniCounter.address}`)
    const dstChainId = getEndpointIdByName(taskArgs.targetNetwork)

    // set the config for this UA to use the specified Oracle
    let tx = await (await omniCounter.setOracle(dstChainId, taskArgs.oracle)).wait()

    console.log(`tx: ${tx.transactionHash}`)
    console.log(`✅ SET Oracle (${hre.network.name}) -> dst [${dstChainId}]: ${taskArgs.oracle}`)
}
