const { getEndpointId } = require("../utils/network")
const CONFIG = require("../constants/config.json")

module.exports = async function ({ deployments, getNamedAccounts }) {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    await deploy("Endpoint", {
        from: deployer,
        args: [getEndpointId()],
        // if set it to true, will not attempt to deploy
        // even if the contract deployed under the same name is different
        skipIfAlreadyDeployed: true,
        log: true,
        waitConfirmations: 1,
    })
}

module.exports.tags = ["Endpoint", "test"]
