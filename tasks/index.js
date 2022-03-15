task("approveSignerRelayer", "whitelist addresses for Relayer ", require("./approveSignerRelayer"))
    .addParam("address", "the address to approve")
    .addOptionalParam("enable", "to enable or disable the signer. true=enable, default: true", true, types.boolean)

task("approveSignerOracle", "whitelist addresses for Oracle ", require("./approveSignerOracle"))
    .addParam("address", "the address to approve")
    .addOptionalParam("enable", "to enable or disable the signer. true=enable, default: true", true, types.boolean)

// increment a OmniCounter
task("omniCounterSend", "calls OmniCounter.incrementCounter()", require("./omniCounterSend"))
    .addParam("targetNetwork", "the destination network name. ie: fuji-sandbox")
    .addOptionalParam("n", "the number of incrementCounter() calls. default: 1", 1, types.int)
    .addOptionalParam("delay", "milliseconds of delay between calls. default: 1000", 1000, types.int)

// increment a OmniCounter using v1 adapterParams
task("omniCounterSendV1", "calls OmniCounter.incrementCounter()", require("./omniCounterSendV1"))
    .addParam("targetNetwork", "the destination network name. ie: fuji-sandbox")
    .addParam("dstGasAmount", "the qty of destination gas")

// increment a OmniCounter using v2 adapterParams
task("omniCounterSendV2", "calls OmniCounter.incrementCounter()", require("./omniCounterSendV2"))
    .addParam("targetNetwork", "the destination network name. ie: fuji-sandbox")
    .addParam("dstGasAmount", "the qty of destination gas")
    .addParam("airdropEthQty", "the qty of ether to airdrop on destination")
    .addParam("airdropAddr", "the destination address to send ether")

task("omniCounterSendConcurrent", "calls OmniCounter.incrementCounter() simultaneously at ", require("./omniCounterSendConcurrent"))
    .addParam("targetNetwork", "the destination network name. ie: fuji-sandbox")
    .addOptionalParam("b", "the number of request per target network that goes inside the same block", 1, types.int)
    .addOptionalParam("n", "the number of incrementCounter() calls per target network. default: 1", 1, types.int)

task("omniCounterVapeTest", "calls OmniCounter.incrementCounter() on all loopback", require("./omniCounterVapeTest"))
    .addParam("e", "the environment ie: mainnet, testnet or sandbox")
    .addOptionalParam("b", "the number of request per target network that goes inside the same block", 1, types.int)
    .addOptionalParam("n", "the number of incrementCounter() calls per target network. default: 1", 1, types.int)
    .addOptionalParam("a", "test all paths. default: false", false, types.boolean)
    .addOptionalParam("ignore", "csv of network names to ignore when selecting the --a", "", types.string)
    .addOptionalParam("oracle", "name of the Oracle, ie: '', chainlink, flux", "", types.string)
    .addOptionalParam("confirmations", "the # of inbound and outbound block confirmations (symmetricly)", 0, types.int)
    .addOptionalParam("loops", "the number of full-world loops", 1, types.int)
    .addOptionalParam("delay", "the seconds of delay betweeen full-world loops", 0, types.int)

task("wireAll", "check the config on all path", require("./wireAll")).addParam("e", "the environment ie: mainnet, testnet or sandbox")

task("omniCounterSwitchProofType", "switch all OmniCounter to the given proof type", require("./omniCounterSwitchProofType"))
    .addParam("e", "the environment ie: mainnet, testnet or sandbox")
    .addParam("p", "outbound proof type")
    .addParam("v", "inbound proof version")

task("omniCounterSendFanout", "calls OmniCounter.incrementCounterMulti() targeting many networks", require("./omniCounterSendFanout"))
    .addParam("targetNetworks", "csv of destination network names. ie: rinkeby,fuji,mumbai")
    .addOptionalParam("n", "the number of incrementCounter() calls per target network. default: 1", 1, types.int)

// set the Relayer max aidrop eth cap
task("setMaxRelayerAirdrop", "sets the maximum cap on aidropped desitnation eth for the specified relayer", require("./setMaxRelayerAirdrop"))
    .addParam("targetNetwork", "the destination chainId")
    .addParam("max", "max eth that can be airdropped via the Relayer")

// set the OmniCounter oracle to the *LayerZeroOracle*
task("omniCounterUseLZ", "set the OmniCounter to use the LayerZeroOracle", require("./omniCounterUseLZ")).addParam(
    "targetNetwork",
    "the target network name"
)
// set the OmniCounter oracle to the *ChainlinkOracle*
task("omniCounterUseCL", "set the OmniCounter to use the ChainlinkOracleClient", require("./omniCounterUseCL")).addParam(
    "targetNetwork",
    "the target network name"
)

// set the OmniCounter oracle to the *LayerZeroOracle*
task(
    "omniCounterSetInboundLibraryVersion",
    "set the OmniCounter to use a specific inbound Library version",
    require("./omniCounterSetInboundLibraryVersion")
)
    .addParam("targetNetwork", "the target network")
    .addParam("libraryVersion", "the inbound library version")

// poll getCounter() on the OmniCounter
task("pollOmniCounter", "poll getCounter()", require("./omniCounterPoll"))

// for testing purposes, use the deployer wallet as the --lz param so we can call it manually
task("deployChainlinkOracleClient", "deploy an instance of ChainlinkOracleClient.sol", require("./deployChainlinkOracleClient"))
    .addParam("link", "the LINK token address for the chain were deploying to")
    .addParam("fee", "ie: 0.001, paid in link")
    .addParam("localChainId", "the local chainId, which it will pass to the orace for updateHash")
    .addParam("lz", "default: 0x0 for deployer, otherwise the address that will be calling this oracle clients notifyOracleOfBlock")
    .addParam("jobIdFile", "default: ./constants/chainlink/sandbox/oracle_job_ids.json")
    .addParam("oracleAddressFile", "default: ./constants/chainlink/sandbox/oracles.json")

// notifiy the chainlink oracle, instructing it to move the blockHash + receiptsRoot
// for testing purposes, use the deployer wallet as the --lz param so we can call it manually
task("chainlinkNotifyOracle", "call ChainlinkOracleClient instance notifyOracleOfBlock", require("./chainlinkNotifyOracle"))
    .addParam("addr", "the ChainlinkOracleClient address")
    .addParam("chain", "the layerzero destination chainId")
    .addParam("oracle", "the chainlink oracle address, for setJob()")
    .addParam("dstNetwork", "the destination layerzero Network instance")
    .addParam("confirmations", "the block confirmations for the oracle to wait")
    .addParam("link", "chainlink LINK token address for approveToken()")

// call estimateNativeFees on an endpoint to check the price of a message
task("estimateFees", "shows the native fees for the parameters specified", require("./estimateFees"))
    .addParam("endpoint", "the endpoint/communicator address")
    .addParam("dstChainId", "the chain id to send to")
    .addParam("ua", "the source ua")
    .addParam("payload", "bytes payload")
    .addOptionalParam(
        "relayerParams",
        "the 34 bytes _adapterParams, sometimes call relayerParams",
        "0x000100000000000000000000000000000000000000000000000000000000000F4240",
        types.string
    )

task("showDeploy", "shows default configuration info for the target network", require("./showDeploy"))
    .addParam("targetNetwork", "the target network")
    .addOptionalParam("ua", "the User Application whose configuration to show", "0x0000000000000000000000000000000000000000", types.string)

// get Relayer information/config, gas prices, etc
task("getRelayerInfo", "gets all the onchain values inside a Relayer.sol instance", require("./getRelayerInfo"))
    .addParam("addr", "the address of the Relayer")
    .addParam("chainIds", "csv of chainIds if you want to explore the gas values")
    .addParam("ua", "user application (ua) address. for default specify '0x0000000000000000000000000000000000000000'")

// call Relayer.setTransactionFees(uint16 chainId, uint baseGas, uint gasPerByte)
task("setTransactionFees", "sets the Relayer transaction fees", require("./setTransactionFees"))
    .addParam("addr", "the address of the Relayer")
    .addParam("chainIds", "csv of the chainIds to set the specified fees to")
    .addParam("baseFee", "the baseFee gas qty (in wei)")
    .addParam("feePerByte", "the feePerByte gas qty (in wei)")

// configureChainlinkOracleClient
task(
    "configureChainlinkOracleClient",
    "sets the jobids in the ChainlinkOracleClient contract based",
    require("./configureChainlinkOracleClient")
).addParam("env", "mainnet, testnet, or sandbox")

task(
    "testChainlinkOracle",
    "initiate the local chainlink oracle and test it on destination with a mock",
    require("./testChainlinkOracle")
).addParam("targetNetwork", "each network has a mock Netowrk.sol to receive the updateHash() call")

//
task("omniCounterDeploy", "deploy a new counter to the network", require("./omniCounterDeploy"))

//
task(
    "omniCounterSetOracle",
    "set the UA (a counter mock) to use the specified oracle for the destination chain",
    require("./omniCounterSetOracle")
)
    .addParam("targetNetwork", "the destination network")
    .addParam("oracle", "the oracle address for the source UA to use")

//
task(
    "omniCounterGetOracle",
    "set the UA (a counter mock) to use the specified oracle for the destination chain",
    require("./omniCounterGetOracle")
).addParam("targetNetwork", "the destination network")

task("filterHashReceived", "filter on recent UltraLightNode HashReceived events", require("./filterHashReceived"))

task("deleteAndRedeploy", "remove contracts from folder and redeploy", require("./deleteAndRedeploy"))
    .addParam("e", "the environment ie: mainnet, testnet or sandbox")
    .addParam("contract", "the contrac tto delete and redeploy")
    .addOptionalParam("ignore", "csv of network names to ignore", "", types.string)
