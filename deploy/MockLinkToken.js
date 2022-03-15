const { isLocalhost } = require("../utils/network")
module.exports = async function ({ deployments, getNamedAccounts }) {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    await deploy("MockLinkToken", {
        from: deployer,
        log: true,
    })
}

module.exports.skip = () =>
    new Promise(async (resolve) => {
        resolve(!isLocalhost())
    })
module.exports.tags = ["MockLinkToken", "test"]
