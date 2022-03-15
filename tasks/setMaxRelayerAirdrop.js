const { getEndpointIdByName } = require("@layerzerolabs/core-sdk")

module.exports = async function (taskArgs, hre) {
    let relayer = await ethers.getContract("Relayer")
    let tx = await (await relayer.setDstNativeAmtCap(getEndpointIdByName(taskArgs.targetNetwork), ethers.utils.parseEther(taskArgs.max))).wait()
    console.log(`tx: ${tx.transactionHash}`)
}
