import { LzConfigType } from "./configTypes"
import { ChainId } from "@layerzerolabs/core-sdk"
import * as Config from "./configTypes"
import _ from "lodash"
import * as CommonConfig from "./commonConfig"

const TestnetChainId = [
    ChainId.RINKEBY,
    ChainId.BSC_TESTNET,
    ChainId.FUJI,
    ChainId.MUMBAI,
    ChainId.ARBITRUM_RINKEBY,
    ChainId.OPTIMISM_KOVAN,
    ChainId.FANTOM_TESTNET,
]

type TestnetChainIdType =
    | ChainId.RINKEBY
    | ChainId.BSC_TESTNET
    | ChainId.FUJI
    | ChainId.MUMBAI
    | ChainId.ARBITRUM_RINKEBY
    | ChainId.OPTIMISM_KOVAN
    | ChainId.FANTOM_TESTNET

export const AddressSize: Pick<Config.AddressSizesType, TestnetChainIdType> = {
    [ChainId.RINKEBY]: CommonConfig.DefaultAddressSize,
    [ChainId.BSC_TESTNET]: CommonConfig.DefaultAddressSize,
    [ChainId.FUJI]: CommonConfig.DefaultAddressSize,
    [ChainId.MUMBAI]: CommonConfig.DefaultAddressSize,
    [ChainId.ARBITRUM_RINKEBY]: CommonConfig.DefaultAddressSize,
    [ChainId.OPTIMISM_KOVAN]: CommonConfig.DefaultAddressSize,
    [ChainId.FANTOM_TESTNET]: CommonConfig.DefaultAddressSize,
}

export const OracleChainPrice: Pick<Config.ChainPriceType, TestnetChainIdType> = {
    [ChainId.RINKEBY]: CommonConfig.DefaultOracleChainPrice,
    [ChainId.BSC_TESTNET]: CommonConfig.DefaultOracleChainPrice,
    [ChainId.FUJI]: CommonConfig.DefaultOracleChainPrice,
    [ChainId.MUMBAI]: CommonConfig.DefaultOracleChainPrice,
    [ChainId.ARBITRUM_RINKEBY]: CommonConfig.DefaultOracleChainPrice,
    [ChainId.OPTIMISM_KOVAN]: CommonConfig.DefaultOracleChainPrice,
    [ChainId.FANTOM_TESTNET]: CommonConfig.DefaultOracleChainPrice,
}

export const RelayerDstPrice: Pick<Config.DstPriceType, TestnetChainIdType> = {
    [ChainId.RINKEBY]: CommonConfig.DefaultRelayerDstPrice,
    [ChainId.BSC_TESTNET]: CommonConfig.DefaultRelayerDstPrice,
    [ChainId.FUJI]: CommonConfig.DefaultRelayerDstPrice,
    [ChainId.MUMBAI]: CommonConfig.DefaultRelayerDstPrice,
    [ChainId.ARBITRUM_RINKEBY]: CommonConfig.DefaultRelayerDstPrice,
    [ChainId.OPTIMISM_KOVAN]: CommonConfig.DefaultRelayerDstPrice,
    [ChainId.FANTOM_TESTNET]: CommonConfig.DefaultRelayerDstPrice,
}

export const RelayerDstConfig: Pick<Config.DstConfigType, TestnetChainIdType> = {
    [ChainId.RINKEBY]: CommonConfig.DefaultRealyerDstConfig,
    [ChainId.BSC_TESTNET]: CommonConfig.DefaultRealyerDstConfig,
    [ChainId.FUJI]: CommonConfig.DefaultRealyerDstConfig,
    [ChainId.MUMBAI]: CommonConfig.DefaultRealyerDstConfig,
    [ChainId.ARBITRUM_RINKEBY]: CommonConfig.DefaultRealyerDstConfig,
    [ChainId.OPTIMISM_KOVAN]: CommonConfig.DefaultRealyerDstConfig,
    [ChainId.FANTOM_TESTNET]: CommonConfig.DefaultRealyerDstConfig,
}

export const DefaultInboundProof: Pick<Config.InboundProofConfigType, TestnetChainIdType> = {
    [ChainId.RINKEBY]: {},
    [ChainId.BSC_TESTNET]: {},
    [ChainId.FUJI]: {},
    [ChainId.MUMBAI]: {},
    [ChainId.ARBITRUM_RINKEBY]: {},
    [ChainId.OPTIMISM_KOVAN]: {},
    [ChainId.FANTOM_TESTNET]: {},
}

export const DefaultOutboundProof: Pick<Config.OutboundProofConfigType, TestnetChainIdType> = {
    [ChainId.RINKEBY]: CommonConfig.DefaultOutboundProof,
    [ChainId.BSC_TESTNET]: CommonConfig.DefaultOutboundProof,
    [ChainId.FUJI]: CommonConfig.DefaultOutboundProof,
    [ChainId.MUMBAI]: CommonConfig.DefaultOutboundProof,
    [ChainId.ARBITRUM_RINKEBY]: CommonConfig.DefaultOutboundProof,
    [ChainId.OPTIMISM_KOVAN]: CommonConfig.DefaultOutboundProof,
    [ChainId.FANTOM_TESTNET]: CommonConfig.DefaultOutboundProof,
}

export const LzConfig: Record<TestnetChainIdType, LzConfigType> = {
    [ChainId.RINKEBY]: {
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
                addressSizes: _.pick(AddressSize, TestnetChainId),
                inbound: DefaultInboundProof,
                outbound: DefaultOutboundProof,
            },
        },
        treasury: CommonConfig.DefaultTreasuryConfig, //currently unused
        endpoint: CommonConfig.DefaultEndpointConfig,
    },
    [ChainId.BSC_TESTNET]: {
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
                addressSizes: _.pick(AddressSize, TestnetChainId),
                inbound: DefaultInboundProof,
                outbound: DefaultOutboundProof,
            },
        },
        treasury: CommonConfig.DefaultTreasuryConfig, //currently unused
        endpoint: CommonConfig.DefaultEndpointConfig,
    },
    [ChainId.FUJI]: {
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
                addressSizes: _.pick(AddressSize, TestnetChainId),
                inbound: DefaultInboundProof,
                outbound: DefaultOutboundProof,
            },
        },
        treasury: CommonConfig.DefaultTreasuryConfig, //currently unused
        endpoint: CommonConfig.DefaultEndpointConfig,
    },
    [ChainId.MUMBAI]: {
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
                addressSizes: _.pick(AddressSize, TestnetChainId),
                inbound: DefaultInboundProof,
                outbound: DefaultOutboundProof,
            },
        },
        treasury: CommonConfig.DefaultTreasuryConfig, //currently unused
        endpoint: CommonConfig.DefaultEndpointConfig,
    },
    [ChainId.ARBITRUM_RINKEBY]: {
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
                addressSizes: _.pick(AddressSize, TestnetChainId),
                inbound: DefaultInboundProof,
                outbound: DefaultOutboundProof,
            },
        },
        treasury: CommonConfig.DefaultTreasuryConfig, //currently unused
        endpoint: CommonConfig.DefaultEndpointConfig,
    },
    [ChainId.OPTIMISM_KOVAN]: {
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
                addressSizes: _.pick(AddressSize, TestnetChainId),
                inbound: DefaultInboundProof,
                outbound: DefaultOutboundProof,
            },
        },
        treasury: CommonConfig.DefaultTreasuryConfig, //currently unused
        endpoint: CommonConfig.DefaultEndpointConfig,
    },
    [ChainId.FANTOM_TESTNET]: {
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
                addressSizes: _.pick(AddressSize, TestnetChainId),
                inbound: DefaultInboundProof,
                outbound: DefaultOutboundProof,
            },
        },
        treasury: CommonConfig.DefaultTreasuryConfig, //currently unused
        endpoint: CommonConfig.DefaultEndpointConfig,
    },
}
