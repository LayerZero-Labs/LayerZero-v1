const { getDeploymentAddresses } = require("../utils/readStatic")
const { CHAIN_KEY, CHAINLINK_ORACLE_CLIENTS, getEndpointIdByName } = require("@layerzerolabs/lz-sdk")
const { getEndpointId } = require("../utils/network")
const { UserApplicationConfigType } = require("../utils/uaConfigTypes")

module.exports = async function (taskArgs, hre) {
    const endpoint = await ethers.getContract("Endpoint")
    console.log(`endpoint.address: ${endpoint.address}`)
    const omniCounter = await ethers.getContract("OmniCounter")
    console.log(`omniCounter.address: ${omniCounter.address}`)

    let tx
    console.log(
        0, // unused param
        getEndpointId(),
        omniCounter.address, // unused param
        UserApplicationConfigType.CONFIG_TYPE_INBOUND_PROOF_LIBRARY_VERSION
    )
    const encodedCurrentInboundLibraryVersion = await omniCounter.getConfig(
        0, // unused param
        getEndpointId(),
        omniCounter.address, // unused param
        UserApplicationConfigType.CONFIG_TYPE_INBOUND_PROOF_LIBRARY_VERSION
    )
    console.log(`encodedCurrentInboundLibraryVersion: ${encodedCurrentInboundLibraryVersion}`)

    // let currentOracle = ethers.utils.defaultAbiCoder.decode(["address"], encodedCurrentOracle)
    // currentOracle = currentOracle[0]
    // console.log(`currentOracle:             ${currentOracle}`)
    //
    // //--- were going to set it to the ChainlinkOracleClient address for the target chain
    // const chainlinkOracleClientAddr = CHAINLINK_ORACLE_CLIENTS[CHAIN_KEY[getEndpointId()]]
    // console.log(`chainlinkOracleClientAddr: ${chainlinkOracleClientAddr}`)
    //
    // if (ethers.utils.getAddress(currentOracle) == chainlinkOracleClientAddr) {
    //     console.log("oracle address already set!")
    //     return
    // } else {
    //     console.log("oracle addresses does not match. setting new Oracle to CHAINLINK oracleclient...")
    // }
    //
    // // set the layerZero address in the ChainlinkOracleClient instance if its not set
    // let ChainlinkOracleClient = await ethers.getContractFactory("ChainlinkOracleClient")
    // let chainlinkOracleClient = await ChainlinkOracleClient.attach(chainlinkOracleClientAddr)
    // let layerZeroAddr = await chainlinkOracleClient.layerZero()
    // // console.log(`layerZeroAddr: ${layerZeroAddr} | ultraLightNode.address: ${ultraLightNode.address}`)
    // if (layerZeroAddr != ultraLightNode.address) {
    //     tx = await (await chainlinkOracleClient.setLayerZero(ultraLightNode.address)).wait()
    //     console.log(`layerZeroAddr: ${layerZeroAddr} | tx: ${tx.transactionHash}`)
    // } else {
    //     console.log(`layerZeroAddr: ${layerZeroAddr} | *already set*`)
    // }
    //
    let dstChainId = getEndpointIdByName(taskArgs.targetNetwork)
    console.log(dstChainId, taskArgs.libraryVersion)
    let config = ethers.utils.defaultAbiCoder.encode(["uint16", "uint16"], [dstChainId, taskArgs.libraryVersion])
    console.log(config)
    // setConfig for this local OmniCounter
    tx = await (await omniCounter.setConfig(dstChainId, UserApplicationConfigType.CONFIG_TYPE_INBOUND_PROOF_LIBRARY_VERSION, config)).wait()
    console.log(`tx: ${tx.transactionHash}`)
}
