import {
    DefaultApplicationType,
    DefaultEndpointConfigType, DstConfigDefinition, DstPriceDefinition,
    OutboundProofConfigDefinition,
    OutBoundProofType,
    TreasuryConfigType,
} from "./configTypes"
import BN from 'bn.js'
import * as Config from "./configTypes"

export const DefaultAddressSize: BN = new BN(20)
export const BN_ZERO = new BN(0)
export const BN_ONE = new BN(1)

export const DefaultTreasuryConfig: TreasuryConfigType = {
    nativeFee: BN_ZERO,
    zroFee: BN_ZERO,
    nativeBP: 0,
    zroBP: 0,
}

export const DefaultEndpointConfig: DefaultEndpointConfigType = {
    defaultSendVersion: 1,
    defaultReceiveVersion: 1,
}

export const DefaultOracleApprovedAddresses: Record<string, boolean> = {
    "0xA83EcD137DFb7F793b041DEEB8FD0C6F5A23E9EB": true,
    "0x3812F5eF5FB6171C3C07e8E865854eaBf1a0B18B": true, // testnet
}

export const DefaultRelayerApprovedAddresses: Record<string, boolean> = {
    "0xB9Cb228D7498d6F02B0F88F7b16d2Cf836d2aeA9": true,
    "0xF5E8A439C599205C1aB06b535DE46681Aed1007a": true, // testnet
}

export const DefaultApplicationConfig: DefaultApplicationType = {
    inboundProofLibraryVersion: OutBoundProofType.MPT,
    inboundBlockConfirmations: new BN(4),
    outboundProofType: OutBoundProofType.MPT,
    outboundBlockConfirmations: new BN(4),
}

export const DefaultOutboundProof: OutboundProofConfigDefinition = {
    supportedOutboundProof: {
        [Config.OutBoundProofType.MPT]: true,
    },
    defaultAdapterParams: {
        [OutBoundProofType.MPT]: {
            types: ["uint16", "uint256"],
            values: [1, 200000],
        },
    },
}

export const DefaultRelayerDstPrice: DstPriceDefinition = {
    dstPriceRatio: new BN(10000000000),
    dstGasPriceInWei: new BN(10000000000)
}

export const DefaultOracleChainPrice: Record<OutBoundProofType, BN> = {
    [Config.OutBoundProofType.MPT]: new BN(1000),
}

export const DefaultRealyerDstConfig: Record<OutBoundProofType, DstConfigDefinition> = {
    [Config.OutBoundProofType.MPT]: {
        dstNativeAmtCap: new BN("42000000000000000"), //0.042 Ether
        baseGas: BN_ONE,
        gasPerByte: BN_ONE
    },
}
