module.exports = async function (taskArgs, hre, runSuper) {
    // Communicator            public communicator;
    // mapping(uint16=>uint)   public gasPriceInWeiLookup;
    // mapping(uint16=>uint)   public baseGasQuantityLookup;         // the base price set by LayerZero required to pay for transactions on the chain
    // mapping(uint16=>uint)   public gasPerByteQuantityLookup;      // the base price set by LayerZero required to pay for transactions based on payload size
    // mapping(address=>bool)  public approvedAddresses;

    let Relayer = await ethers.getContractFactory("Relayer")
    let relayer = await Relayer.attach(taskArgs.addr)

    let chainIds = taskArgs.chainIds.split(",")
    let communicator = await relayer.communicator()

    let gasPriceData = {}
    let baseGasData = {}
    let gasPerByteData = {}
    let defaultGetPrice = {}
    for (let cid of chainIds) {
        let gasPriceInWei = await relayer.gasPriceInWeiLookup(cid)
        // console.log(`  gasPriceInWeiLoopkup( ${cid} ): ${gasPriceInWei}`);
        gasPriceData[cid] = gasPriceInWei.toString()

        let baseGasQuantity = await relayer.baseGasQuantityLookup(cid)
        // console.log(`  baseGasQuantityLookup( ${cid} ): ${baseGasQuantity}`);
        baseGasData[cid] = baseGasQuantity.toString()

        let gasPerByteQuantity = await relayer.gasPerByteQuantityLookup(cid)
        // console.log(`  gasPerByteQuantityLookup( ${cid} ): ${gasPerByteQuantity}`);
        gasPerByteData[cid] = gasPerByteQuantity.toString()

        // get a default transaction price
        // contract["initialize(string,string)"](name, symbol)
        let defaultGetPricesValue = await relayer["getPrices(uint16,address)"](cid, taskArgs.ua)
        // console.log(`  defaultGetPrice( ${cid}, ${taskArgs.ua} ): ${defaultGetPricesValue}`);
        defaultGetPrice[cid] = defaultGetPricesValue.toString()
    }

    let info = {
        relayer: relayer.address,
        communicator,
        gasPriceData,
        baseGasData,
        gasPerByteData,
        defaultGetPrice,
    }
    console.log(info)
}
