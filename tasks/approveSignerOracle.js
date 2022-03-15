module.exports = async function (taskArgs, hre, runSuper) {
    let oracle = await ethers.getContract("LayerZeroOracleMock")
    if ((await oracle.isApproved(taskArgs.address)) && taskArgs.enable) {
        console.log(`Oracle.isApproved(${taskArgs.address}) => true | *already approved*`)
        return
    }
    let tx = await (await oracle.setApprovedAddress(taskArgs.address, taskArgs.enable)).wait()
    console.log(`tx: ${tx.transactionHash}`)
    console.log(`Oracle.setApprovedAddress(${taskArgs.address}, ${taskArgs.enable}) | tx: ${tx.transactionHash}`)
}
