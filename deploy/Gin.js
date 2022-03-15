module.exports = async function ({ deployments, getNamedAccounts }) {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    // get the Endpoint address
    const endpoint = await ethers.getContract("Endpoint")

    await deploy("GIN", {
        from: deployer,
        args: [endpoint.address],
        log: true,
        waitConfirmations: 1,
    })
}

module.exports.tags = ["GIN"]
module.exports.dependencies = ["Endpoint"]
