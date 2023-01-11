const { getDeploymentAddresses } = require("../utils/readStatic")
const { CHAIN_KEY, CHAIN_LIST_ID, CHAIN_ID, CHAINLINK_ORACLE_CLIENTS, getEndpointIdByName } = require("@layerzerolabs/lz-sdk")
const { getEndpointId } = require("../utils/network")

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

module.exports = async function (taskArgs, hre) {
    const omniCounter = await ethers.getContract("OmniCounter")
    const endpoint = await ethers.getContract("Endpoint")

    // get the destination information
    const targetNetworkAddrs = getDeploymentAddresses(taskArgs.targetNetwork)
    const targetUaAddr = targetNetworkAddrs["OmniCounter"]
    const targetEndpointId = getEndpointIdByName(taskArgs.targetNetwork)
    console.log(`sendOmniCounter [${getEndpointId()}] -> [${targetEndpointId}] @ dst UA: ${targetUaAddr}`)

    let adapterParams = ethers.utils.solidityPack(["uint16", "uint"], [1, 200000])
    let estimatedFees = await endpoint.estimateFees(
        targetEndpointId,
        omniCounter.address,
        "0x", // message payload
        false, // payInZro
        adapterParams // _adapterParams
    )
    let fee = ethers.BigNumber.from(estimatedFees[0])
    console.log(`estimatedFees (wei): ${fee}`)

    // send incrementCounter() call in on the source, targeting the destination OmniCounter
    let tx
    for (let i = 0; i < parseInt(taskArgs.n); ++i) {
        tx = await (
            await omniCounter.incrementCounter(
                targetEndpointId,
                targetUaAddr,
                // { value: ethers.utils.parseEther("0.0142") }
                { value: fee }
            )
        ).wait()
        console.log(`[${i}] tx.hash: ${tx.transactionHash}`)

        await sleep(parseInt(taskArgs.delay))
    }
}
