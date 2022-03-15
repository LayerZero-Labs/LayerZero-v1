module.exports = async function (taskArgs, hre, runSuper) {
    let Endpoint = await ethers.getContractFactory("Endpoint")
    let endpoint = await Endpoint.attach(taskArgs.endpoint)
    let estimatedFees = await endpoint.estimateFees(
        taskArgs.dstChainId,
        taskArgs.ua,
        taskArgs.payload,
        false, // payInZro
        taskArgs.relayerParams
    )
    console.log(`estimatedFees: ${estimatedFees}`)
}
