const { getDeploymentAddresses } = require("../utils/readStatic")
const { CHAIN_KEY, CHAIN_LIST_ID, CHAIN_ID, CHAINLINK_ORACLE_CLIENTS, getEndpointIdByName } = require("@layerzerolabs/core-sdk")
const { getEndpointId } = require("../utils/network")

module.exports = async function (taskArgs, hre) {
    // get local OmniCounter instance so we can call incrementCounter()
    const isRoolup = [
        CHAIN_ID["optimism"],
        CHAIN_ID["optimism-kovan"],
        CHAIN_ID["optimism-kovan-sandbox"],
        CHAIN_ID["arbitrum"],
        CHAIN_ID["arbitrum-rinkeby"],
        CHAIN_ID["arbitrum-rinkeby-sandbox"],
    ].includes(getEndpointId())

    const OmniCounter = await ethers.getContractFactory("OmniCounter")
    const localAddr = (await hre.deployments.get("OmniCounter")).address
    let omniCounter = await OmniCounter.attach(localAddr)
    // omniCounter = await omniCounter.connect((await ethers.getSigners())[1])

    // get the destination information
    const targetNetworkAddrs = getDeploymentAddresses(taskArgs.targetNetwork)
    const targetUaAddr = targetNetworkAddrs["OmniCounter"]
    const targetEndpointId = getEndpointIdByName(taskArgs.targetNetwork)
    console.log(`sendOmniCounter [${getEndpointId()}] -> [${targetEndpointId}] @ dst UA: ${targetUaAddr}`)

    const batchSize = parseInt(taskArgs.b)
    const request = parseInt(taskArgs.n)
    const numberOfBatch = Math.floor(request / batchSize)
    let currentNonce = await omniCounter.signer.getTransactionCount()

    // send incrementCounter() call in on the source, targeting the destination OmniCounter

    let tx
    for (let i = 0; i < numberOfBatch; ++i) {
        const txs = []
        for (let j = 0; j < batchSize; ++j) {
            if (isRoolup) {
                const otherOmniCounter = await omniCounter.connect((await ethers.getSigners())[j])
                txs.push(
                    otherOmniCounter.incrementCounter(
                        targetEndpointId,
                        targetUaAddr,
                        { gasLimit: 1000000, value: ethers.utils.parseEther("1") } // sending plenty so we dont have to estimateNativeFees() first
                    )
                )
            } else {
                txs.push(
                    omniCounter.incrementCounter(
                        targetEndpointId,
                        targetUaAddr,
                        { gasLimit: 1000000, value: ethers.utils.parseEther("1"), nonce: currentNonce } // sending plenty so we dont have to estimateNativeFees() first
                    )
                )
                currentNonce++
            }
        }

        const sendTxs = await Promise.all(txs)

        await Promise.all(
            sendTxs.map(async (tx, i) => {
                const finalTx = await tx.wait()
                console.log(`[${i}] tx.hash: ${finalTx.transactionHash}`)
            })
        )
    }
}
