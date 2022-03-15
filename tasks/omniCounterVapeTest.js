const { getDeploymentAddresses, getRpc } = require("../utils/readStatic")
const { CHAIN_ID } = require("@layerzerolabs/core-sdk")
const crossChainHelper = require("../utils/deploy/crossChainHelper")
function sleep(millis) {
    return new Promise((resolve) => setTimeout(resolve, millis))
}
const getOracles = (env, oracle, networks) => {
    if (oracle === "") {
        // retrieve a map of the /deployments oracles
        let lzOracles = {}
        for (let network of networks) {
            let oracleAddr = crossChainHelper.getDeploymentAddress(network, crossChainHelper.CONTRACT_NAMES.LZ_ORACLE)
            console.log(`network: ${network} | lz oracle mock: ${oracleAddr}`)
            lzOracles[CHAIN_ID[network]] = oracleAddr
        }
        return lzOracles
    }
    // return a network:oracleAddr map for the specified oracle third party
    let oracles = require(`../constants/${oracle}/${env}/oracles.json`)
    return oracles
}
const setOracles = async (hre, networks, oracles, testAllPath) => {
    console.log("************* Setting Oracles *************")
    console.log(oracles)
    for (let network of networks) {
        // console.log(network)
        const targetNetworks = testAllPath ? networks : [network]
        for (let targetNetwork of targetNetworks) {
            // console.log(`...${targetNetwork}`)
            await updateOracle(hre, network, targetNetwork, oracles[CHAIN_ID[network]])
        }
    }
}
const setBlockConfirmations = async (hre, networks, confirmations, testAllPath) => {
    console.log("************* Block Confirmations *************")
    for (let network of networks) {
        const targetNetworks = testAllPath ? networks : [network]
        for (let targetNetwork of targetNetworks) {
            await updateBlockConfirmations(hre, network, targetNetwork, confirmations)
        }
    }
}
const updateBlockConfirmations = async (hre, network, targetNetwork, confirmations) => {
    const dstChainId = CHAIN_ID[targetNetwork]
    const omniCounter = await crossChainHelper.getWalletContract(hre, network, crossChainHelper.CONTRACT_NAMES.OMNI_COUNTER, 0)
    // check if its already set
    let inbound = await omniCounter.getConfig(0, dstChainId, omniCounter.address, 2) // INBOUND
    inbound = ethers.BigNumber.from(inbound)
    console.log(`  ${network} inbound confirmations from ${dstChainId}: ${inbound}`)
    if (parseInt(inbound) !== parseInt(confirmations)) {
        let tx = await (await omniCounter.setInboundConfirmations(dstChainId, confirmations, { gasLimit: 1000000 })).wait(1)
        console.log(`  -> set to ${confirmations} | ${tx.transactionHash}`)
    }
    let outbound = await omniCounter.getConfig(0, dstChainId, omniCounter.address, 5) // OUTBOUND
    outbound = ethers.BigNumber.from(outbound)
    console.log(`  ${network} outbound confirmations to ${dstChainId}: ${outbound}`)
    if (parseInt(outbound) !== parseInt(confirmations)) {
        let tx = await (await omniCounter.setOutboundConfirmations(dstChainId, confirmations, { gasLimit: 1000000 })).wait(1)
        console.log(`  -> set to ${confirmations} | ${tx.transactionHash}`)
    }
}
const fetchInitialCounters = async (hre, networks) => {
    console.log("************* Fetching initial counter *************")
    const initialCounters = {}
    await Promise.all(
        networks.map(async (network) => {
            const omniCounterContract = await crossChainHelper.getContract(hre, network, crossChainHelper.CONTRACT_NAMES.OMNI_COUNTER)
            const counter = await omniCounterContract.getCounter()
            initialCounters[network] = counter.toNumber()
        })
    )
    console.log("Initial counter are:")
    console.table(Object.keys(initialCounters).map((network) => ({ network, initialCounter: initialCounters[network] })))
    return initialCounters
}
const estimateFees = async (hre, networks) => {
    console.log("************* Estimating fees for each network *************")
    const networkFees = {}
    await Promise.all(
        networks.map(async (sourceNetwork) => {
            await Promise.all(
                networks.map(async (targetNetwork) => {
                    const endpointContract = await crossChainHelper.getContract(hre, sourceNetwork, crossChainHelper.CONTRACT_NAMES.ENDPOINT)
                    let adapterParams = ethers.utils.solidityPack(["uint16", "uint"], [1, 200000])
                    let estimatedFees = await endpointContract.estimateFees(
                        CHAIN_ID[targetNetwork],
                        crossChainHelper.getDeploymentAddress(targetNetwork, crossChainHelper.CONTRACT_NAMES.OMNI_COUNTER),
                        "0x", // message payload
                        false, // payInZro
                        adapterParams // _adapterParams
                    )
                    let fee = ethers.BigNumber.from(estimatedFees[0])
                    networkFees[`${sourceNetwork}-${targetNetwork}`] = fee
                })
            )
        })
    )
    console.table(
        Object.keys(networkFees).map((network) => ({
            network,
            "estimatedFees (wei)": networkFees[network].toString(),
            "estimatedFees (eth)": ethers.utils.formatEther(networkFees[network]),
        }))
    )
    return networkFees
}
const updateOracle = async (hre, network, targetNetwork, oracleAddr) => {
    const dstChainId = CHAIN_ID[targetNetwork]
    const omniCounter = await crossChainHelper.getWalletContract(hre, network, crossChainHelper.CONTRACT_NAMES.OMNI_COUNTER, 0)
    // check if its already set
    let data = await omniCounter.getConfig(0, dstChainId, omniCounter.address, 6) // TYPE_ORACLE = 6
    let currOracle = data.replace("000000000000000000000000", "")
    if (currOracle.toLowerCase() === oracleAddr.toLowerCase()) {
        console.log(`Oracle for src (${network}) -> target [${targetNetwork}]: ${currOracle} | *already set*`)
    } else {
        let tx = await (await omniCounter.setOracle(dstChainId, oracleAddr, { gasLimit: 1000000 })).wait(1)
        console.log(`setOracle from [${network}] -> [${dstChainId}] to ${oracleAddr} ... tx: ${tx.transactionHash}`)
    }
}
const sendTransaction = async (hre, network, targetNetwork, networkFees, walletIndex, nonce) => {
    const omniCounter = await crossChainHelper.getWalletContract(hre, network, crossChainHelper.CONTRACT_NAMES.OMNI_COUNTER, walletIndex)
    const targetNetworkContractAddress = crossChainHelper.getDeploymentAddress(targetNetwork, crossChainHelper.CONTRACT_NAMES.OMNI_COUNTER)
    return omniCounter.incrementCounter(CHAIN_ID[targetNetwork], targetNetworkContractAddress, {
        gasLimit: 1000000,
        value: networkFees[`${network}-${targetNetwork}`],
        nonce,
    })
}
const pollResults = async (hre, networks, initialCounters, actualTransactionCounts) => {
    console.log("************* All transactions have been sent *************")
    console.log("List of actual transaction sent")
    console.table(
        Object.keys(actualTransactionCounts).map((network) => ({ network, actualTransactionCounts: actualTransactionCounts[network] }))
    )
    let endByTime = (new Date().getTime() + 4 * 60 * 1000) / 1000 // in millis
    let finished = false
    while (!finished && new Date().getTime() / 1000 < endByTime) {
        await sleep(10000)
        console.log(`************* Start polling (every 10s for 4 minutes) *************`)
        const newCounters = {}
        await Promise.all(
            networks.map(async (network) => {
                const omniCounterContract = await crossChainHelper.getContract(hre, network, crossChainHelper.CONTRACT_NAMES.OMNI_COUNTER)
                const counter = await omniCounterContract.getCounter()
                newCounters[network] = counter.toNumber()
            })
        )
        const result = networks.map((network) => {
            const allReceived = newCounters[network] >= initialCounters[network] + actualTransactionCounts[network]
            return {
                network,
                initialCounter: initialCounters[network],
                currentCounter: newCounters[network],
                requestsCompletion: `${newCounters[network] - initialCounters[network]}/${actualTransactionCounts[network]}`,
                finished: allReceived,
            }
        })
        console.table(result)
        finished = result.every(({ finished }) => finished)
    }
}
const waitForSuccessTransactions = async (network, targetNetwork, sentTransactions) => {
    const sentTransactionResults = await Promise.all(
        sentTransactions.map(async (tx) => {
            try {
                return await tx
            } catch (err) {
                console.log(`Failed to send transaction  [${network}=>${targetNetwork}] . Ignoring it`)
                console.log(err)
            }
        })
    )
    const sentSuccessTransactions = sentTransactionResults.filter((i) => i)
    const finalTransactionResults = await Promise.all(
        sentSuccessTransactions.map(async (tx, i) => {
            try {
                const finalTx = await tx.wait()
                console.log(`[${network}=>${targetNetwork}][${i}] tx.hash: ${finalTx.transactionHash}`)
                return finalTx
            } catch (err) {
                console.log(`Failed to watch for transaction on [${network}=>${targetNetwork}], txhash is: ${tx.transactionHash}`)
                console.log(err)
            }
        })
    )
    return finalTransactionResults.filter((i) => i)
}
const fullRun = async (taskArgs, hre) => {
    // taskArgs.e == 'mainnet' | 'testnet' | 'sandbox'
    let networks = crossChainHelper.NETWORKS_BY_ENV[taskArgs.e]
    // let networks = getNetworksForEnv(taskArgs.e)
    networks = networks.filter((n) => !taskArgs.ignore.split(",").includes(n))
    console.log(networks)
    console.log(`igrnoing: [${taskArgs.ignore}]`)
    const testAllPath = taskArgs.a
    if (!networks) {
        console.log(`Invalid environment ${taskArgs.e}, environment should be one of mainnet testnet or sandbox`)
    }
    // set the Oracles for the Source -> Destination OmniCounter
    const oracles = getOracles(taskArgs.e, taskArgs.oracle, networks)
    console.log(`setting [${taskArgs.oracle ? taskArgs.oracle : "default"}] oracles for [${taskArgs.e}]`)
    await setOracles(hre, networks, oracles, testAllPath)
    // set inbound / outbound block confirmations for OmniCounter
    if (taskArgs.confirmations) {
        await setBlockConfirmations(hre, networks, taskArgs.confirmations, testAllPath)
    } else {
        console.log(`... skipping block confirmations. if you wish, use flag: --confirmations X`)
    }
    // accumulate initial counters
    const initialCounters = await fetchInitialCounters(hre, networks)
    const networkFees = await estimateFees(hre, networks)
    const batchSize = parseInt(taskArgs.b)
    const request = parseInt(taskArgs.n)
    const numberOfBatch = Math.floor(request / batchSize)
    console.log("************* Sending transaction *************")
    const actualTransactionCounts = {}
    await Promise.all(
        networks.map(async (network) => {
            const defaultWallet = crossChainHelper.getConnectedWallet(network, 0)
            let currentNonce = await defaultWallet.getTransactionCount()
            const targetNetworks = testAllPath ? networks : [network]
            for (let targetNetwork of targetNetworks) {
                for (let i = 0; i < numberOfBatch; ++i) {
                    const txs = []
                    for (let j = 0; j < batchSize; ++j) {
                        if (crossChainHelper.isRoolup(network)) {
                            txs.push(sendTransaction(hre, network, targetNetwork, networkFees, j))
                        } else {
                            txs.push(sendTransaction(hre, network, targetNetwork, networkFees, 0, currentNonce))
                            currentNonce++
                        }
                    }
                    const finalTransactionResults = await waitForSuccessTransactions(network, targetNetwork, txs)
                    actualTransactionCounts[targetNetwork] = actualTransactionCounts[targetNetwork] || 0
                    actualTransactionCounts[targetNetwork] += finalTransactionResults.length
                }
            }
        })
    )
    await pollResults(hre, networks, initialCounters, actualTransactionCounts)
}
module.exports = async function (taskArgs, hre) {
    for (let i = 0; i < taskArgs.loops; ++i) {
        await fullRun(taskArgs, hre)
        console.log(`waiting ${taskArgs.delay} 
            until starting another full world loop. 
            you can kill the script if you only wanted 1 loop`)
        await sleep(taskArgs.delay * 1000)
    }
}
