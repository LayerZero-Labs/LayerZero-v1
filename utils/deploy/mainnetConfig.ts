import { ChainId } from "@layerzerolabs/core-sdk"
import * as Config from "./configTypes"
import * as CommonConfig from "./commonConfig"
import { LzConfigType } from "./configTypes"
import _ from "lodash"

const MainnetChainId = [ChainId.ETHEREUM, ChainId.BSC, ChainId.AVALANCHE, ChainId.POLYGON, ChainId.ARBITRUM, ChainId.OPTIMISM, ChainId.FANTOM]

type MainnetChainIdType =
    | ChainId.ETHEREUM
    | ChainId.BSC
    | ChainId.AVALANCHE
    | ChainId.POLYGON
    | ChainId.ARBITRUM
    | ChainId.OPTIMISM
    | ChainId.FANTOM

export const AddressSize: Pick<Config.AddressSizesType, MainnetChainIdType> = {
    [ChainId.ETHEREUM]: CommonConfig.DefaultAddressSize,
    [ChainId.BSC]: CommonConfig.DefaultAddressSize,
    [ChainId.AVALANCHE]: CommonConfig.DefaultAddressSize,
    [ChainId.POLYGON]: CommonConfig.DefaultAddressSize,
    [ChainId.ARBITRUM]: CommonConfig.DefaultAddressSize,
    [ChainId.OPTIMISM]: CommonConfig.DefaultAddressSize,
    [ChainId.FANTOM]: CommonConfig.DefaultAddressSize,
}

export const OracleChainPrice: Pick<Config.ChainPriceType, MainnetChainIdType> = {
    [ChainId.ETHEREUM]: CommonConfig.DefaultOracleChainPrice,
    [ChainId.BSC]: CommonConfig.DefaultOracleChainPrice,
    [ChainId.AVALANCHE]: CommonConfig.DefaultOracleChainPrice,
    [ChainId.POLYGON]: CommonConfig.DefaultOracleChainPrice,
    [ChainId.ARBITRUM]: CommonConfig.DefaultOracleChainPrice,
    [ChainId.OPTIMISM]: CommonConfig.DefaultOracleChainPrice,
    [ChainId.FANTOM]: CommonConfig.DefaultOracleChainPrice,
}

export const RelayerDstPrice: Pick<Config.DstPriceType, MainnetChainIdType> = {
    [ChainId.ETHEREUM]: CommonConfig.DefaultRelayerDstPrice,
    [ChainId.BSC]: CommonConfig.DefaultRelayerDstPrice,
    [ChainId.AVALANCHE]: CommonConfig.DefaultRelayerDstPrice,
    [ChainId.POLYGON]: CommonConfig.DefaultRelayerDstPrice,
    [ChainId.ARBITRUM]: CommonConfig.DefaultRelayerDstPrice,
    [ChainId.OPTIMISM]: CommonConfig.DefaultRelayerDstPrice,
    [ChainId.FANTOM]: CommonConfig.DefaultRelayerDstPrice,
}

export const RelayerDstConfig: Pick<Config.DstConfigType, MainnetChainIdType> = {
    [ChainId.ETHEREUM]: CommonConfig.DefaultRealyerDstConfig,
    [ChainId.BSC]: CommonConfig.DefaultRealyerDstConfig,
    [ChainId.AVALANCHE]: CommonConfig.DefaultRealyerDstConfig,
    [ChainId.POLYGON]: CommonConfig.DefaultRealyerDstConfig,
    [ChainId.ARBITRUM]: CommonConfig.DefaultRealyerDstConfig,
    [ChainId.OPTIMISM]: CommonConfig.DefaultRealyerDstConfig,
    [ChainId.FANTOM]: CommonConfig.DefaultRealyerDstConfig,
}

export const DefaultInboundProof: Pick<Config.InboundProofConfigType, MainnetChainIdType> = {
    [ChainId.ETHEREUM]: {},
    [ChainId.BSC]: {},
    [ChainId.AVALANCHE]: {},
    [ChainId.POLYGON]: {},
    [ChainId.ARBITRUM]: {},
    [ChainId.OPTIMISM]: {},
    [ChainId.FANTOM]: {},
}

export const DefaultOutboundProof: Pick<Config.OutboundProofConfigType, MainnetChainIdType> = {
    [ChainId.ETHEREUM]: CommonConfig.DefaultOutboundProof,
    [ChainId.BSC]: CommonConfig.DefaultOutboundProof,
    [ChainId.AVALANCHE]: CommonConfig.DefaultOutboundProof,
    [ChainId.POLYGON]: CommonConfig.DefaultOutboundProof,
    [ChainId.ARBITRUM]: CommonConfig.DefaultOutboundProof,
    [ChainId.OPTIMISM]: CommonConfig.DefaultOutboundProof,
    [ChainId.FANTOM]: CommonConfig.DefaultOutboundProof,
}

export const LzConfig: Record<MainnetChainIdType, LzConfigType> = {
    [ChainId.ETHEREUM]: {
        chainLinkOracle: {
            chainPrice: OracleChainPrice,
            approvedAddresses: CommonConfig.DefaultOracleApprovedAddresses,
        },
        layerZeroRelayer: {
            dstPrice: RelayerDstPrice,
            dstConfig: RelayerDstConfig,
            approvedAddresses: CommonConfig.DefaultRelayerApprovedAddresses,
        },
        ultraLightNode: {
            defaultApp: CommonConfig.DefaultApplicationConfig,
            proof: {
                addressSizes: _.pick(AddressSize, MainnetChainId),
                inbound: DefaultInboundProof,
                outbound: DefaultOutboundProof,
            },
        },
        treasury: CommonConfig.DefaultTreasuryConfig, //currently unused
        endpoint: CommonConfig.DefaultEndpointConfig,
    },
    [ChainId.BSC]: {
        chainLinkOracle: {
            chainPrice: OracleChainPrice,
            approvedAddresses: CommonConfig.DefaultOracleApprovedAddresses,
        },
        layerZeroRelayer: {
            dstPrice: RelayerDstPrice,
            dstConfig: RelayerDstConfig,
            approvedAddresses: CommonConfig.DefaultRelayerApprovedAddresses,
        },
        ultraLightNode: {
            defaultApp: CommonConfig.DefaultApplicationConfig,
            proof: {
                addressSizes: _.pick(AddressSize, MainnetChainId),
                inbound: DefaultInboundProof,
                outbound: DefaultOutboundProof,
            },
        },
        treasury: CommonConfig.DefaultTreasuryConfig, //currently unused
        endpoint: CommonConfig.DefaultEndpointConfig,
    },
    [ChainId.AVALANCHE]: {
        chainLinkOracle: {
            chainPrice: OracleChainPrice,
            approvedAddresses: CommonConfig.DefaultOracleApprovedAddresses,
        },
        layerZeroRelayer: {
            dstPrice: RelayerDstPrice,
            dstConfig: RelayerDstConfig,
            approvedAddresses: CommonConfig.DefaultRelayerApprovedAddresses,
        },
        ultraLightNode: {
            defaultApp: CommonConfig.DefaultApplicationConfig,
            proof: {
                addressSizes: _.pick(AddressSize, MainnetChainId),
                inbound: DefaultInboundProof,
                outbound: DefaultOutboundProof,
            },
        },
        treasury: CommonConfig.DefaultTreasuryConfig, //currently unused
        endpoint: CommonConfig.DefaultEndpointConfig,
    },
    [ChainId.POLYGON]: {
        chainLinkOracle: {
            chainPrice: OracleChainPrice,
            approvedAddresses: CommonConfig.DefaultOracleApprovedAddresses,
        },
        layerZeroRelayer: {
            dstPrice: RelayerDstPrice,
            dstConfig: RelayerDstConfig,
            approvedAddresses: CommonConfig.DefaultRelayerApprovedAddresses,
        },
        ultraLightNode: {
            defaultApp: CommonConfig.DefaultApplicationConfig,
            proof: {
                addressSizes: _.pick(AddressSize, MainnetChainId),
                inbound: DefaultInboundProof,
                outbound: DefaultOutboundProof,
            },
        },
        treasury: CommonConfig.DefaultTreasuryConfig, //currently unused
        endpoint: CommonConfig.DefaultEndpointConfig,
    },
    [ChainId.ARBITRUM]: {
        chainLinkOracle: {
            chainPrice: OracleChainPrice,
            approvedAddresses: CommonConfig.DefaultOracleApprovedAddresses,
        },
        layerZeroRelayer: {
            dstPrice: RelayerDstPrice,
            dstConfig: RelayerDstConfig,
            approvedAddresses: CommonConfig.DefaultRelayerApprovedAddresses,
        },
        ultraLightNode: {
            defaultApp: CommonConfig.DefaultApplicationConfig,
            proof: {
                addressSizes: _.pick(AddressSize, MainnetChainId),
                inbound: DefaultInboundProof,
                outbound: DefaultOutboundProof,
            },
        },
        treasury: CommonConfig.DefaultTreasuryConfig, //currently unused
        endpoint: CommonConfig.DefaultEndpointConfig,
    },
    [ChainId.OPTIMISM]: {
        chainLinkOracle: {
            chainPrice: OracleChainPrice,
            approvedAddresses: CommonConfig.DefaultOracleApprovedAddresses,
        },
        layerZeroRelayer: {
            dstPrice: RelayerDstPrice,
            dstConfig: RelayerDstConfig,
            approvedAddresses: CommonConfig.DefaultRelayerApprovedAddresses,
        },
        ultraLightNode: {
            defaultApp: CommonConfig.DefaultApplicationConfig,
            proof: {
                addressSizes: _.pick(AddressSize, MainnetChainId),
                inbound: DefaultInboundProof,
                outbound: DefaultOutboundProof,
            },
        },
        treasury: CommonConfig.DefaultTreasuryConfig, //currently unused
        endpoint: CommonConfig.DefaultEndpointConfig,
    },
    [ChainId.FANTOM]: {
        chainLinkOracle: {
            chainPrice: OracleChainPrice,
            approvedAddresses: CommonConfig.DefaultOracleApprovedAddresses,
        },
        layerZeroRelayer: {
            dstPrice: RelayerDstPrice,
            dstConfig: RelayerDstConfig,
            approvedAddresses: CommonConfig.DefaultRelayerApprovedAddresses,
        },
        ultraLightNode: {
            defaultApp: CommonConfig.DefaultApplicationConfig,
            proof: {
                addressSizes: _.pick(AddressSize, MainnetChainId),
                inbound: DefaultInboundProof,
                outbound: DefaultOutboundProof,
            },
        },
        treasury: CommonConfig.DefaultTreasuryConfig, //currently unused
        endpoint: CommonConfig.DefaultEndpointConfig,
    },
}
