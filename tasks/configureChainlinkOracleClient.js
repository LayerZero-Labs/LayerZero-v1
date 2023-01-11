const { getEndpointIdByName, CHAIN_KEY } = require("@layerzerolabs/lz-sdk")
const { getDeploymentAddresses } = require("../utils/readStatic")
const LINK = require("../constants/chainlink/link.json")
const ORACLE_WHITELISTER_ADDRESSES = require("../constants/oracleWhitelister.json")

module.exports = async function (taskArgs, hre, runSuper) {
    console.log(ORACLE_WHITELISTER_ADDRESSES)
    // let oracleJobData = JSON.parse(fs.readFileSync(taskArgs.jobIdFile));
    let jobIdsPath = `../constants/chainlink/${taskArgs.env}/oracle_job_ids.json`
    console.log("jobIdsPath:", jobIdsPath)
    let oracleJobData = require(jobIdsPath)
    console.log(oracleJobData)

    let oracleAddressDataPath = `../constants/chainlink/${taskArgs.env}/oracle_addresses.json`
    console.log("oracleAddressDataPath:", oracleAddressDataPath)
    let oracleAddressData = require(oracleAddressDataPath)
    console.log(oracleAddressData)

    let oracleSignersPath = `../constants/chainlink/${taskArgs.env}/signers.json`
    console.log("oracleSignersPath:", oracleSignersPath)
    let oracleSigners = require(oracleSignersPath)
    console.log(oracleSigners)

    let signers = await ethers.getSigners()
    let owner = signers[0]
    console.log(`owner.address: ${owner.address}`)

    //--------------- ChainlinkOracleClient -----------------------------------------------
    const ChainlinkOracleClient = await ethers.getContractFactory("ChainlinkOracleClient")
    const chainlinkOracleClientAddr = (await hre.deployments.get("ChainlinkOracleClient")).address
    const chainlinkOracleClient = await ChainlinkOracleClient.attach(chainlinkOracleClientAddr)
    console.log("chainlinkOracleClient:", chainlinkOracleClient.address)

    // configure the approved incoming signing addresses
    for (let signer of oracleSigners["signers"]) {
        let isApproved = await chainlinkOracleClient.isApproved(signer)
        // console.log(`signer: ${signer} isApproved => ${isApproved}`)
        if (isApproved == true) {
            console.log(`signer: ${signer} isApproved => ${isApproved}`)
            continue
        }
        let txSigner = await (await chainlinkOracleClient.setApprovedAddress(signer, true)).wait()
        console.log(`chainlinkOracleClient.setApprovedAddress(${signer}, true)`)
    }

    const ultraLightNode = await ethers.getContract("UltraLightNode")
    // set the remote ULN
    let txSetUln = await (await chainlinkOracleClient.setUln(ultraLightNode.address)).wait()
    console.log(`txSetUln: ${txSetUln.transactionHash}`)

    let localChainId = await chainlinkOracleClient.endpointId() // name changed
    let oracleAddr = oracleAddressData[localChainId]
    console.log(oracleAddressData)
    console.log(localChainId)
    let jobId
    for (let chainId in oracleJobData) {
        jobId = oracleJobData[chainId]

        // set this for each outbound
        // function setPrice(uint16 _destinationChainId, uint16 _outboundProofType, uint _price)
        let outboundProofType = 1
        let price = 1
        tx = await (await chainlinkOracleClient.setPrice(chainId, outboundProofType, price)).wait()
        console.log(` -> chainlinkOracleClient.setPrice(${chainId},${outboundProofType},${price})`)
        // set the delivery side address (the remote Oracle whitelister)
        // setDeliveryAddress(uint16 _dstChainId, address _deliveryAddress)
        let deliveryAddress = "0x0000000000000000000000000000000000000000" // default

        if (!CHAIN_KEY[chainId]) {
            console.log(`CHAIN_KEY[${chainId}] is undefined, skipping...`)
            continue
        }
        console.log(`chainId -> ${chainId}, CHAIN_KEY[chainId]: ${CHAIN_KEY[chainId]}`, ORACLE_WHITELISTER_ADDRESSES[CHAIN_KEY[chainId]])
        if (chainId < 30000) {
            // skip the localhost chainIds
            deliveryAddress = ORACLE_WHITELISTER_ADDRESSES[CHAIN_KEY[chainId]]
        }
        console.log(`deliveryAddress: ${deliveryAddress}`)
        tx = await (await chainlinkOracleClient.setDeliveryAddress(chainId, deliveryAddress)).wait()
        console.log(` -> chainlinkOracleClient.setDeliveryAddress(${chainId}, ${deliveryAddress})`)

        // check if the job data for this job already exists so we can skip it if
        let currJob = await chainlinkOracleClient.jobs(chainId)
        // console.log(currJob);
        // console.log('^ currJob')
        if (
            currJob[0] != "0x0000000000000000000000000000000000000000" &&
            ethers.utils.getAddress(currJob[0]) == ethers.utils.getAddress(oracleAddr)
        ) {
            console.log(`... job already set: ${jobId}`)
            continue
        } else {
            console.log(`going to set new job: ${jobId}`)
        }

        // set the job
        tx = await (await chainlinkOracleClient.setJob(chainId, oracleAddr, jobId, ethers.utils.parseEther("0.0001"))).wait(1)

        console.log(`chainlinkOracleClient.setJob(${chainId}, ${oracleAddr}, ${jobId}) | tx.hash: ${JSON.stringify(tx.transactionHash)}`)
    }

    try {
        // if its testnet or sandbox try to send it some for easy testing
        if (["testnet", "sandbox"].includes(taskArgs.env)) {
            // xfer 1 token of LINK to the new client so we dont have to use faucet (deployer wallet needs to have some)
            let MockToken = await ethers.getContractFactory("MockToken") // we just need an ERC20 interface
            let mockToken = await MockToken.attach(LINK[hre.network.name])
            let tx2 = await (await mockToken.transfer(chainlinkOracleClient.address, "1000000000000000000")).wait(1) // 1 * 10**18

            console.log(`[testnet] transfer LINK tx: ${tx2.transactionHash}`)
        }
    } catch (e) {}
}
