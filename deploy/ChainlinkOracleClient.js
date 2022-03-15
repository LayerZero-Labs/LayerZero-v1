const { CHAIN_KEY, CHAINLINK_ORACLE_CLIENTS } = require("@layerzerolabs/core-sdk")
const { getEndpointId, isTestnet, isLocalhost } = require("../utils/network")
const LINK = require("../constants/chainlink/link.json")

function getDependencies() {
    if (isTestnet()) {
        return ["MockLinkToken"]
    }
}

module.exports = async function ({ deployments, getNamedAccounts }) {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    if (!isTestnet()) {
        // let chainlinkOracleClientAddr = CHAINLINK_ORACLE_CLIENTS[CHAIN_KEY[getEndpointId()]];
        console.log(`Target: lzEndpointId: ${getEndpointId()} `)
        // console.log(`Using ChainlinkOracleClient: ${chainlinkOracleClientAddr}`)
    }

    let linkTokenAddr
    if (isLocalhost()) {
        const linkToken = await deployments.get("MockLinkToken")
        linkTokenAddr = linkToken.address
    } else {
        linkTokenAddr = LINK[getEndpointId()]
    }

    // if (!isTestnet()) {
    //     // console.log(`[${hre.network.name}] LINK token addr: ${linkTokenAddr}`)
    //     let chainlinkOracleClientAddr = CHAINLINK_ORACLE_CLIENTS[hre.network.name]
    //     console.log(`Target: lzEndpointId: ${getEndpointId()} `)
    //     console.log(`Using ChainlinkOracleClient: ${chainlinkOracleClientAddr}`)
    // }

    await deploy("ChainlinkOracleClient", {
        from: deployer,
        args: [linkTokenAddr, getEndpointId()],
        log: true,
    })

    // the oracle jobs will be configured by another script
}

// module.exports.skip = () =>
//     new Promise(async (resolve) => {
//         let addr = CHAINLINK_ORACLE_CLIENTS[CHAIN_KEY[getEndpointId()]]
//         resolve(!isTestnet() || addr)
//     })
module.exports.tags = ["ChainlinkOracleClient", "test"]
module.exports.dependencies = getDependencies()
