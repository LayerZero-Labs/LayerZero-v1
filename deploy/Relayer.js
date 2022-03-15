const { isTestnet, getEndpointId } = require("../utils/network")

module.exports = async function ({ deployments, getNamedAccounts }) {
    const { deploy } = deployments
    const { deployer, proxyOwner } = await getNamedAccounts()

    const ultraLightNode = await deployments.get("UltraLightNode")

    let gasLimit = 8000000
    if ([10010, 20010].includes(getEndpointId())) {
        gasLimit = 30000000 // arbitrum requires >8m
    }
    await deploy("Relayer", {
        gasLimit,
        from: deployer,
        log: true,
        waitConfirmations: 1,
        proxy: {
            owner: proxyOwner,
            proxyContract: "OptimizedTransparentProxy",
            execute: {
                init: {
                    methodName: "initialize",
                    args: [ultraLightNode.address],
                },
            },
        },
    })
}

module.exports.tags = ["Relayer", "test"]
module.exports.dependencies = ["UltraLightNode"]
