const { getDeploymentAddresses } = require("../utils/readStatic")
const { CHAIN_KEY, CHAIN_LIST_ID, CHAIN_ID, CHAINLINK_ORACLE_CLIENTS, getEndpointIdByName } = require("@layerzerolabs/lz-sdk")
const { getEndpointId } = require("../utils/network")

module.exports = async function (taskArgs, hre) {
    // get local OmniCounter instance so we can call incrementCounter()
    const OmniCounter = await ethers.getContractFactory("OmniCounter")
    const omniCounter = await ethers.getContract("OmniCounter")

    // get the destination information
    let networks = taskArgs.targetNetworks.split(",")
    console.log(networks)

    let dstDCMs = []
    let dstEndpointIds = []
    for (let network of networks) {
        dstDCMs.push(getDeploymentAddresses(network)["OmniCounter"])
        dstEndpointIds.push(getEndpointIdByName(network))
    }

    // console.log(`dstDCMs: ${dstDCMs}`)
    console.log(`target endpointIds: ${dstEndpointIds}`)

    let tx
    for (let i = 0; i < parseInt(taskArgs.n); ++i) {
        tx = await (
            await omniCounter.incrementCounterMulti(
                dstEndpointIds,
                dstDCMs,
                { value: ethers.utils.parseEther("0.1") } // cover dstDDMs.length * individual cost
            )
        ).wait()
        console.log(`[${i}] tx: ${tx.transactionHash}`)
    }
}
