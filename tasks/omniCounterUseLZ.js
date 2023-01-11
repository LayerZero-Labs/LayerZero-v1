const { getDeploymentAddresses } = require("../utils/readStatic")
const { getEndpointIdByName } = require("@layerzerolabs/lz-sdk")
const { getEndpointId } = require("../utils/network")

// get the ChainlinkOracleClient address for this local chain
const CONFIG_TYPE_ORACLE = 1
const CONFIG_TYPE_RELAYER = 2
const CONFIG_TYPE_BLOCK_CONFIRMATIONS = 3
const CONFIG_TYPE_INBOUND_PROOF_LIBRARY_VERSION = 4

module.exports = async function (taskArgs, hre) {
    // get local OmniCounter instance
    const OmniCounter = await ethers.getContractFactory("OmniCounter")
    const localAddr = (await hre.deployments.get("OmniCounter")).address
    const omniCounter = await OmniCounter.attach(localAddr)
    const dstChainId = getEndpointIdByName(taskArgs.targetNetwork)
    console.log(`omniCounter.adderss: ${omniCounter.address}`)
    // console.log(`getConfig for targetNetwork: ${dstChainId}`)
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
    currentOracle = ethers.utils.getAddress(currentOracle[0])
    //--- were going to set it to the chainlinkoraclclient address for the target chain
    let layerZeroOracleAddr = (await hre.deployments.get("LayerZeroOracleMock")).address
    layerZeroOracleAddr = ethers.utils.getAddress(layerZeroOracleAddr)
    console.log(`layerZeroOracleAddr: ${layerZeroOracleAddr}`)
    console.log(`currentOracle      : ${currentOracle}`)

    if (currentOracle == layerZeroOracleAddr) {
        console.log("oracle address already set!")
        return
    } else {
        console.log("oracle addresses does not match. setting new Oracle ...")
    }

    // set the layerZero address of the Oracle if its not set
    let uln = await ethers.getContract("UltraLightNode")
    let LayerZeroOracleMock = await ethers.getContractFactory("LayerZeroOracleMock")
    let oracle = await LayerZeroOracleMock.attach(layerZeroOracleAddr)
    let layerZeroAddress = await oracle.layerZero()
    console.log(`uln.address: ${uln.address} | oracle.layerZero: ${layerZeroAddress}`)
    if (uln.address != layerZeroAddress) {
        tx = await (await oracle.setLayerZero(uln.address)).wait()
        console.log(`oracle.layerZero(${uln.address}) | tx: ${tx.transactionHash}`)
    } else {
        console.log(`oracle.layerZero(${uln.address}) | *already set*`)
    }

    // encode the oracle address so we can setConfig
    let config = ethers.utils.defaultAbiCoder.encode(["uint16", "address"], [dstChainId, layerZeroOracleAddr])
    console.log(`setConfig: ${config}`)

    // setConfig for this local OmniCounter
    tx = await (
        await omniCounter.setConfig(
            0, // unused param
            CONFIG_TYPE_ORACLE,
            config
        )
    ).wait()
    console.log(`tx: ${tx.transactionHash}`)
}
