const { getEndpointId } = require("../utils/network")
const { getEndpointIdByName } = require("@layerzerolabs/lz-sdk")

module.exports = async function (taskArgs, hre) {
    let targetEndpointId = getEndpointIdByName(taskArgs.targetNetwork)
    let ultraLightNode = await ethers.getContract("UltraLightNode")
    let defaultAppConfig = await ultraLightNode.defaultAppConfig(targetEndpointId)

    console.log(`UltraLightNode[${getEndpointId()}]: ${ultraLightNode.address} -> [${targetEndpointId}]`)

    console.log("* defaultConfig *")
    console.log(defaultAppConfig)

    if (taskArgs.ua !== "0x0000000000000000000000000000000000000000") {
        console.log(`* appConfig: ${taskArgs.ua}`)
        let appConfig = await ultraLightNode.getAppConfig(targetEndpointId, taskArgs.ua)
        console.log(appConfig)

        let inboundProfLib = await ultraLightNode.inboundProofLibrary(targetEndpointId, appConfig.inboundProofLibraryVersion)
        console.log(`* inboundProofLibrary[${targetEndpointId}][${appConfig.inboundProofLibraryVersion}]: ${inboundProfLib}`)
    }
}
