const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
const CONFIG_TYPE_INBOUND_PROOF_LIBRARY_VERSION = 1
const CONFIG_TYPE_INBOUND_BLOCK_CONFIRMATIONS = 2
const CONFIG_TYPE_RELAYER = 3
const CONFIG_TYPE_OUTBOUND_PROOF_TYPE = 4
const CONFIG_TYPE_OUTBOUND_BLOCK_CONFIRMATIONS = 5
const CONFIG_TYPE_ORACLE = 6
const DEFAULT_APP_CONFIG_VALUES = {
    inboundProofLibraryVersion: 1,
    inboundBlockConfirmations: 15,
    outboundProofType: 1,
    outboundBlockConfirmations: 15,
}
const WITHDRAW_TYPE_TREASURY_PROTOCOL_FEES = 0
const WITHDRAW_TYPE_ORACLE_QUOTED_FEES = 1 // quoted fee refers to the fee in block relaying
const WITHDRAW_TYPE_RELAYER_QUOTED_FEES = 2 //quoted fee refers the fee in msg relaying
const ID_TO_CHAIN_NAME = {
    1: "Ethereum",
    2: "Avax",
    3: "Optimism",
    4: "Arbitrum",
}
const VARS = {
    oracleJobId: "0xb41ef42ebd5a54a9834eb215c8e3cbe05d71ced9ee5ff465801759362925099e",
    gasLimit: 100000,
    txParams: "0x00010000000000000000000000000000000000000000000000000000000000030D40", // version 1 200,000 gas
    adapterParams: {
        [1]: { types: ["uint16", "uint256"], values: [1, 200000] }, // [outboundProofType]: { types: ['uint16', 'uint256'], values: [outboundProofType, extraGas] }
        [2]: { types: ["uint16", "uint256", "uint256", "address"], values: [2, 200000, 100000, ZERO_ADDRESS] }, // [outboundProofType]: { types: ['uint16', 'uint256', 'uint256', 'address'], values: [outboundProofType, extraGas, dstNativeAmt, ZERO_ADDRESS] }
    },
    nativeFee: 100,
    nativeBP: 1000,
    zroFee: 200,
    zroBP: 2000,
    denominator: 10000000000,
    chainId: 1,
    outboundProofType: 1,
    outboundProofType2: 1, // the actual implementation is the same
    payloadLength: 2,
    txType: 1,
    txType2: 2,
    extraGas: 1,
    dstNativeAmt: 10,
    dstNativeCap: 200000, //dstNativeAmtCap
    dstGasPrice: 10, //dstGasPriceInWei
    dstPrice: 100,
    srcPrice: 50,
    baseGas: 10,
    gasPerByte: 20,
    chainAddressSize: 20, // might change depending on the dst chain
    oracleFee: 50,
    relayerFee: 75,
    blockedVersion: 65535,
    defaultMsgValue: 300000,
}
const VERBOSE = false // flag this if you want tests to print verbose messages

module.exports = {
    ZERO_ADDRESS,
    CONFIG_TYPE_INBOUND_PROOF_LIBRARY_VERSION,
    CONFIG_TYPE_INBOUND_BLOCK_CONFIRMATIONS,
    CONFIG_TYPE_RELAYER,
    CONFIG_TYPE_OUTBOUND_PROOF_TYPE,
    CONFIG_TYPE_OUTBOUND_BLOCK_CONFIRMATIONS,
    CONFIG_TYPE_ORACLE,
    DEFAULT_APP_CONFIG_VALUES,
    ID_TO_CHAIN_NAME,
    VARS,
    VERBOSE,
    WITHDRAW_TYPE_TREASURY_PROTOCOL_FEES,
    WITHDRAW_TYPE_ORACLE_QUOTED_FEES,
    WITHDRAW_TYPE_RELAYER_QUOTED_FEES,
}
