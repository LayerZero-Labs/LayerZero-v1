const { getEndpointIdByName } = require("@layerzerolabs/lz-sdk")

module.exports = async function (taskArgs, hre) {
    let relayer = await ethers.getContract("Relayer")
    let tx = await (await relayer.setDstNativeAmtCap(getEndpointIdByName(taskArgs.targetNetwork), ethers.utils.parseEther(taskArgs.max))).wait()
    console.log(`tx: ${tx.transactionHash}`)
}
