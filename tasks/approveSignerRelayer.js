module.exports = async function (taskArgs, hre, runSuper) {
    let relayer = await ethers.getContract("Relayer")
    if ((await relayer.isApproved(taskArgs.address)) && taskArgs.enable) {
        console.log(`Relayer.isApproved(${taskArgs.address}) => true | *already approved*`)
        return
    }
    let tx = await (await relayer.setApprovedAddress(taskArgs.address, taskArgs.enable)).wait()
    console.log(`tx: ${tx.transactionHash}`)
    console.log(`Relayer.setApprovedAddress(${taskArgs.address}, ${taskArgs.enable}) | tx: ${tx.transactionHash}`)
}
