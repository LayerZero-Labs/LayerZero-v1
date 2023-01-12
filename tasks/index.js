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
