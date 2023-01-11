const { getDeploymentAddresses } = require("../utils/readStatic")
const { CHAIN_KEY, CHAINLINK_ORACLE_CLIENTS, getEndpointIdByName } = require("@layerzerolabs/lz-sdk")
const { getEndpointId } = require("../utils/network")

// get the ChainlinkOracleClient address for this local chain
const CONFIG_TYPE_ORACLE = 1
const CONFIG_TYPE_RELAYER = 2
const CONFIG_TYPE_BLOCK_CONFIRMATIONS = 3
const CONFIG_TYPE_INBOUND_PROOF_LIBRARY_VERSION = 4

module.exports = async function (taskArgs, hre) {
    //
    const UltraLightNode = await ethers.getContractFactory("UltraLightNode")
    const ultraLightNodeAddr = (await hre.deployments.get("UltraLightNode")).address
    const ultraLightNode = await UltraLightNode.attach(ultraLightNodeAddr)
    //
    const Endpoint = await ethers.getContractFactory("Endpoint")
    const endpointAddr = (await hre.deployments.get("Endpoint")).address
    const endpoint = await Endpoint.attach(endpointAddr)

    // get local OmniCounter instance
    const OmniCounter = await ethers.getContractFactory("OmniCounter")
    const localAddr = (await hre.deployments.get("OmniCounter")).address
    const omniCounter = await OmniCounter.attach(localAddr)
    const dstChainId = getEndpointIdByName(taskArgs.targetNetwork)
    console.log(`omniCounter.adderss: ${omniCounter.address}`)

    //---- get the current set oracle, ie: dont overwite it if its already set ---
    let tx
    //---- get the current set oracle, ie: dont overwite it if its already set ---
    let sendVersion = await omniCounter.getSendVersion()
    let receiveVersion = await omniCounter.getReceiveVersion()
    console.log(`sendVersion: ${sendVersion}, receiveVersion: ${receiveVersion}`)
    // function getConfig(uint16 _dstChainId, uint16 _chainId, address, uint _configType)
    const encodedCurrentOracle = await omniCounter.getConfig(
        0, // unused param
        getEndpointId(),
        localAddr, // unused param
        CONFIG_TYPE_ORACLE
    )
    // console.log(`encodedCurrentOracle: ${encodedCurrentOracle}`)

    let currentOracle = ethers.utils.defaultAbiCoder.decode(["address"], encodedCurrentOracle)
    currentOracle = currentOracle[0]
    console.log(`currentOracle:             ${currentOracle}`)

    //--- were going to set it to the ChainlinkOracleClient address for the target chain
    const chainlinkOracleClientAddr = CHAINLINK_ORACLE_CLIENTS[CHAIN_KEY[getEndpointId()]]
    console.log(`chainlinkOracleClientAddr: ${chainlinkOracleClientAddr}`)

    if (ethers.utils.getAddress(currentOracle) == chainlinkOracleClientAddr) {
        console.log("oracle address already set!")
        return
    } else {
        console.log("oracle addresses does not match. setting new Oracle to CHAINLINK oracleclient...")
    }

    // set the layerZero address in the ChainlinkOracleClient instance if its not set
    let ChainlinkOracleClient = await ethers.getContractFactory("ChainlinkOracleClient")
    let chainlinkOracleClient = await ChainlinkOracleClient.attach(chainlinkOracleClientAddr)
    let layerZeroAddr = await chainlinkOracleClient.layerZero()
    // console.log(`layerZeroAddr: ${layerZeroAddr} | ultraLightNode.address: ${ultraLightNode.address}`)
    if (layerZeroAddr != ultraLightNode.address) {
        tx = await (await chainlinkOracleClient.setLayerZero(ultraLightNode.address)).wait()
        console.log(`layerZeroAddr: ${layerZeroAddr} | tx: ${tx.transactionHash}`)
    } else {
        console.log(`layerZeroAddr: ${layerZeroAddr} | *already set*`)
    }

    let config = ethers.utils.defaultAbiCoder.encode(["uint16", "address"], [dstChainId, chainlinkOracleClientAddr])

    // setConfig for this local OmniCounter
    tx = await (await omniCounter.setConfig(dstChainId, CONFIG_TYPE_ORACLE, config)).wait()
    console.log(`tx: ${tx.transactionHash}`)
}
