const { getEndpointId } = require("../utils/network")

function sleep(millis) {
    return new Promise((resolve) => setTimeout(resolve, millis))
}

module.exports = async function (taskArgs, hre) {
    const OmniCounter = await ethers.getContractFactory("OmniCounter")
    const addr = (await hre.deployments.get("OmniCounter")).address
    const omniCounter = await OmniCounter.attach(addr)
    console.log(`omniCounter: ${omniCounter.address}`)

    while (true) {
        let counter = await omniCounter.getCounter()
        console.log(`[${getEndpointId()}][${hre.network.name}] ${new Date().toISOString().split("T")[1].split(".")[0]} counter...    ${counter}`)
        await sleep(1000)
    }
}
