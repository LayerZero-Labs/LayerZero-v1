module.exports = async function (taskArgs, hre, runSuper) {
    let tx
    let signers = await ethers.getSigners()
    let owner = signers[0]
    console.log(`owner.address: ${owner.address}`)

    //--------------- ChainlinkOracleClient -----------------------------------------------
    const ChainlinkOracleClient = await ethers.getContractFactory("ChainlinkOracleClient")
    const chainlinkOracleClient = await ChainlinkOracleClient.attach(taskArgs.addr)
    console.log("ChainlinkOracleClient:", chainlinkOracleClient.address)

    //--------------- give the oracle approval to transferFrom LINK fee -------------------
    try {
        tx = await (
            await chainlinkOracleClient.approveToken(taskArgs.link, taskArgs.oracle, ethers.BigNumber.from("1000000000000000000000000000"))
        ).wait()
        console.log(`approve tx.hash: ${tx.transactionHash}`)
    } catch (e) {
        // ProviderError: execution reverted: SafeERC20: approve from non-zero to non-zero allowance
    }

    //------- notifyOracleOfBlock ------
    tx = await (await chainlinkOracleClient.notifyOracleOfBlock(taskArgs.chain, taskArgs.dstNetwork, taskArgs.confirmations)).wait()
    console.log(`chainlinkOracleClient.notifyOracleOfBlock tx.hash: ${tx.transactionHash}`)
}
