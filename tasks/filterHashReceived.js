module.exports = async function (taskArgs, hre, runSuper) {
    //let owner = (await ethers.getSigners())[0]
    const ultraLightNode = await ethers.getContract("UltraLightNode")
    let eventFilter = ultraLightNode.filters.HashReceived() // HashReceived
    let events = await ultraLightNode.queryFilter(eventFilter)
    let ctr = 0
    for (let e of events) {
        ctr++
        //console.log(e.args)
    }

    console.log(ctr, "HashReceived events detected")
}
