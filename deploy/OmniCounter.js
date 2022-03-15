const { isTestnet } = require("../utils/network")

module.exports = async function ({ deployments, getNamedAccounts }) {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    // get the Endpoint address
    const endpoint = await ethers.getContract("Endpoint")

    await deploy("OmniCounter", {
        from: deployer,
        args: [endpoint.address],
        log: true,
        waitConfirmations: 1,
    })
}

module.exports.skip = () =>
    new Promise(async (resolve) => {
        resolve(!isTestnet())
    })

module.exports.tags = ["OmniCounter", "test"]
// do not make this a dependency, it will cause a redeploy
module.exports.dependencies = ["Endpoint"]
