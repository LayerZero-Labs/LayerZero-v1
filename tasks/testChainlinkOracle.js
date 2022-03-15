// testChainlinkOracle.js
const { getDeploymentAddresses } = require("../utils/readStatic")
const LINK = require("../constants/chainlink/link.json")
const CHAINLINK_ORACLES = require("../constants/chainlink/sandbox/oracle_addresses.json")
const { getEndpointId } = require("../utils/network")

module.exports = async function (taskArgs, hre, runSuper) {
    let tx
    let signers = await ethers.getSigners()
    let owner = signers[0]
    console.log(`owner.address: ${owner.address}`)

    //--------------- get local ChainlinkOracleClient -----------------------------------------------
    // const networkContract = await ethers.getContractFactory("Network")
    // const networkAddr = (await hre.deployments.get("Network")).address
    // const network = await networkContract.attach(networkAddr)

    const ChainlinkOracleClient = await ethers.getContract("ChainlinkOracleClient")
    const chainlinkOracleClientAddr = (await hre.deployments.get("ChainlinkOracleClient")).address
    const chainlinkOracleClient = await ChainlinkOracleClient.attach(chainlinkOracleClientAddr)
    console.log("chainlinkOracleClient:", chainlinkOracleClient.address)

    //--------------- give the oracle approval to transferFrom LINK fee -------------------
    try {
        let linkAddr = LINK[hre.network.name] // get the local LINK address
        let localOracle = CHAINLINK_ORACLES[hre.network.name]
        let approveQty = ethers.utils.parseEther("1000") // tons
        tx = await (await chainlinkOracleClient.approveToken(linkAddr, linkOracle, approveQty)).wait()
        console.log(`approve tx: ${tx.transactionHash}`)
    } catch (e) {
        // ProviderError: execution reverted: SafeERC20: approve from non-zero to non-zero allowance
    }

    //------- notifyOracleOfBlock ------
    //---- retrieve the remote network address so we can get its chain id from deployments
    const targetAddrs = getDeploymentAddresses(taskArgs.targetNetwork)
    const targetChainId = getEndpointId()
    let dstNetworkAddr = targetAddrs["LayerZeroNetworkMock"]
    let blockConfirmations = 2
    console.log(`dstNetworkAddr: ${dstNetworkAddr}`)
    console.log(`targetChainId: ${targetChainId}`)

    // notify chainlink oracle to send to this mock contract address
    tx = await (await chainlinkOracleClient.notifyOracleOfBlock(targetChainId, dstNetworkAddr, blockConfirmations)).wait()
    console.log(`chainlinkOracleClient.notifyOracleOfBlock tx: ${tx.transactionHash}`)

    // if you get this error:
    //    ProviderError: execution reverted: OracleClient: caller must be LayerZero.
    //
    // you may need to call ChainlinkOracleClient.setLayerZero( owner.address )
    // ** warning ** if you set this, you steal control from an endpoint!
}
