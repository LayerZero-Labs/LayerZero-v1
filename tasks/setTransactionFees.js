module.exports = async function (taskArgs, hre, runSuper) {
    let Relayer = await ethers.getContractFactory("Relayer")
    let relayer = await Relayer.attach(taskArgs.addr)
    console.log(`relayer.address: ${relayer.address}`)

    let chainIds = taskArgs.chainIds.split(",")

    let tx
    for (let chainId of chainIds) {
        tx = await (await relayer.setTransactionFees(chainId, taskArgs.baseFee, taskArgs.feePerByte)).wait()
        console.log(`setTransactionFees(${chainId}, ${taskArgs.baseFee}, ${taskArgs.feePerByte}) tx: ${tx.transactionHash}`)
    }
}
