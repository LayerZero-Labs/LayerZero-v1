const { CHAIN_KEY, CHAINLINK_ORACLE_CLIENTS, getEndpointIdByName } = require("@layerzerolabs/lz-sdk")
const { getEndpointId } = require("../utils/network")

module.exports = async function (taskArgs, hre) {
    const endpoint = await ethers.getContract("Endpoint")
    console.log(`endpoint.address: ${endpoint.address}`)
    // get local OmniCounter instance
    const OmniCounter = await ethers.getContractFactory("OmniCounter")
    const omniCounter = await OmniCounter.deploy(endpoint.address)
    await omniCounter.deployed()
    console.log("omniCounter:", omniCounter.address)
}
