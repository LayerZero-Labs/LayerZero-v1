let path = require("path")
let fs = require("fs")

module.exports = async function (taskArgs, hre, runSuper) {
    let oracleJobData = JSON.parse(fs.readFileSync(taskArgs.jobIdFile))
    console.log("oracle oracleJobData:")
    console.log(oracleJobData)
    let oracleAddressData = JSON.parse(fs.readFileSync(taskArgs.oracleAddressFile))
    console.log("oracle oracleAddressData:")
    console.log(oracleAddressData)

    // let oracleAddr;
    // let jobId;
    // for(let chainId in oracleJobData){
    //         oracleAddr = oracleAddressData[chainId];
    //         jobId = oracleJobData[chainId];
    //         console.log(`chainlinkOracleClient.setJob(${chainId}, ${oracleAddr}, ${jobId})`);
    // }

    let signers = await ethers.getSigners()
    let owner = signers[0]
    console.log(`owner.address: ${owner.address}`)

    //--------------- ChainlinkOracleClient -----------------------------------------------
    const ChainlinkOracleClient = await ethers.getContractFactory("ChainlinkOracleClient")
    const chainlinkOracleClient = await ChainlinkOracleClient.deploy(taskArgs.link)
    await chainlinkOracleClient.deployed()
    console.log("ChainlinkOracleClient:", chainlinkOracleClient.address)

    // set lz (ie: the caller of notifyOracleOfBlock()
    let ownerAddr = owner.address
    if (taskArgs.lz == "0x0") {
        ownerAddr = owner.address
    } else {
        ownerAddr = taskArgs.lz
    }
    let tx = await chainlinkOracleClient.setLayerZero(ownerAddr)
    await tx.wait(1)

    let txx = await chainlinkOracleClient.setRemoteChainId(taskArgs.localChainId)
    await txx.wait(1)
    console.log(`setRemoteChainId tx.hash: ${txx.hash}`)

    let oracleAddr = oracleAddressData[taskArgs.localChainId] // doesnt change for the rest of deploy
    let jobId
    for (let chainId in oracleJobData) {
        jobId = oracleJobData[chainId]
        // set the job
        tx = await chainlinkOracleClient.setJob(chainId, oracleAddr, jobId, ethers.utils.parseEther(taskArgs.fee))
        await tx.wait(1)
        console.log(`chainlinkOracleClient.setJob(${chainId}, ${oracleAddr}, ${jobId}) | tx.hash: ${JSON.stringify(tx.hash)}`)
    }

    // xfer 1 token of LINK to the new client so we dont have to use faucet (deployer wallet needs to have some)
    let MockToken = await ethers.getContractFactory("MockToken") // we just need an ERC20 interface
    let mockToken = await MockToken.attach(taskArgs.link)
    let tx2 = await mockToken.transfer(chainlinkOracleClient.address, "1000000000000000000") // 1 * 10**18
    await tx2.wait(1)
    console.log(`transfer LINK: ${JSON.stringify(tx2.hash)}`)
}
