import { ChainId } from "@layerzerolabs/core-sdk"
import BN from "bn.js"

//---------------------------------------------------------------------------
// Full Config Type Definition

export type LzConfigType = {
    chainLinkOracle: OracleConfigType
    layerZeroRelayer: RelayerConfigType
    ultraLightNode: UlnConfigType
    treasury: TreasuryConfigType
    endpoint: DefaultEndpointConfigType
}

// assumes 1:1 mapping of outbound and inbound right now
export enum OutBoundProofType {
    MPT = 1,
}
// export type InboundProofLibraryVersion = Record<ChainId, Record<OutBoundProofType, Record<number, string>>>

//---------------------------------------------------------------------------
// Relayer.sol Config Type Definitions

export type DstPriceDefinition = {
    dstPriceRatio: BN
    dstGasPriceInWei: BN
}
//[dstChainId][outboundType]
export type DstPriceType = Record<ChainId, DstPriceDefinition>

export type DstConfigDefinition = {
    dstNativeAmtCap: BN
    baseGas: BN
    gasPerByte: BN
}
//[dstChainId]
export type DstConfigType = Record<ChainId, Record<OutBoundProofType, DstConfigDefinition>>

export type RelayerConfigType = {
    dstPrice: Partial<DstPriceType>
    dstConfig: Partial<DstConfigType>
    approvedAddresses: Record<string, boolean>
}

//---------------------------------------------------------------------------
// Oracle.sol Config Type Definitions

//[dstChainId][outboundType]
export type ChainPriceType = Record<ChainId, Record<OutBoundProofType, BN>>

export type OracleConfigType = {
    ulnAddress?: string //if not set, uses deployments (UltraLightNode)
    chainPrice: Partial<ChainPriceType>
    approvedAddresses: Record<string, boolean>
}

//---------------------------------------------------------------------------
// UltraLightNode.sol Config Type Definitions
export type DefaultApplicationType = {
    inboundProofLibraryVersion: number
    inboundBlockConfirmations: BN
    relayer?: string //if not set, uses deployments (Relayer)
    outboundProofType: number
    outboundBlockConfirmations: BN
    oracle?: string //if not set, uses deployments (LayerZeroMockOracle)
}

type DefaultAdapterParamsType1 = {
    types: [string, string]
    values: [number, number]
}
type DefaultAdapterParamsType2 = {
    types: [string, string, string, string]
    values: [number, number, BN, string]
}
export type DefaultAdapterParams = Record<OutBoundProofType, DefaultAdapterParamsType1 | DefaultAdapterParamsType2>

export type OutboundProofConfigDefinition = {
    supportedOutboundProof: Record<OutBoundProofType, boolean>
    defaultAdapterParams: DefaultAdapterParams
}
export type OutboundProofConfigType = Record<ChainId, OutboundProofConfigDefinition>

export type InboundProofConfigType = Record<
    ChainId,
    {
        inboundProofLibrary?: string //if not set, using deployments right now (evmValidatorAddress)
        remoteUln?: string //if not set, using deployments right now (UltraLightNode)
    }
>

export type AddressSizesType = Record<ChainId, BN>

export type ProofConfigType = {
    addressSizes: Partial<AddressSizesType> //chainId
    inbound: Partial<InboundProofConfigType> //srcChainId
    outbound: Partial<OutboundProofConfigType> //srcChainId
}

export type UlnConfigType = {
    defaultApp: DefaultApplicationType
    proof: ProofConfigType
}

//---------------------------------------------------------------------------
// Endpoint.sol Config Type Definitions

export type DefaultEndpointConfigType = {
    defaultSendVersion: number
    defaultReceiveVersion: number
}

//---------------------------------------------------------------------------
// Treasury.sol Config Type Definitions

export type TreasuryConfigType = {
    nativeFee: BN
    zroFee: BN
    nativeBP: number
    zroBP: number
}
