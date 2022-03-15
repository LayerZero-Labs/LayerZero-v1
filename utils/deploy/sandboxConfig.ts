import * as Config from "./configTypes"
import { ChainId } from "@layerzerolabs/core-sdk"
import * as CommonConfig from "./commonConfig"
import * as _ from "lodash"
import { LzConfigType } from "./configTypes"

const SandboxChainId = [
    ChainId.RINKEBY_SANDBOX,
    ChainId.BSC_TESTNET_SANDBOX,
    ChainId.FUJI_SANDBOX,
    ChainId.MUMBAI_SANDBOX,
    ChainId.ARBITRUM_RINKEBY_SANDBOX,
    ChainId.OPTIMISM_KOVAN_SANDBOX,
    ChainId.FANTOM_TESTNET_SANDBOX,
]

type SandboxChainIdType =
    | ChainId.RINKEBY_SANDBOX
    | ChainId.BSC_TESTNET_SANDBOX
    | ChainId.FUJI_SANDBOX
    | ChainId.MUMBAI_SANDBOX
    | ChainId.ARBITRUM_RINKEBY_SANDBOX
    | ChainId.OPTIMISM_KOVAN_SANDBOX
    | ChainId.FANTOM_TESTNET_SANDBOX

export const AddressSize: Pick<Config.AddressSizesType, SandboxChainIdType> = {
    [ChainId.RINKEBY_SANDBOX]: CommonConfig.DefaultAddressSize,
    [ChainId.BSC_TESTNET_SANDBOX]: CommonConfig.DefaultAddressSize,
    [ChainId.FUJI_SANDBOX]: CommonConfig.DefaultAddressSize,
    [ChainId.MUMBAI_SANDBOX]: CommonConfig.DefaultAddressSize,
    [ChainId.ARBITRUM_RINKEBY_SANDBOX]: CommonConfig.DefaultAddressSize,
    [ChainId.OPTIMISM_KOVAN_SANDBOX]: CommonConfig.DefaultAddressSize,
    [ChainId.FANTOM_TESTNET_SANDBOX]: CommonConfig.DefaultAddressSize,
}

export const OracleChainPrice: Pick<Config.ChainPriceType, SandboxChainIdType> = {
    [ChainId.RINKEBY_SANDBOX]: CommonConfig.DefaultOracleChainPrice,
    [ChainId.BSC_TESTNET_SANDBOX]: CommonConfig.DefaultOracleChainPrice,
    [ChainId.FUJI_SANDBOX]: CommonConfig.DefaultOracleChainPrice,
    [ChainId.MUMBAI_SANDBOX]: CommonConfig.DefaultOracleChainPrice,
    [ChainId.ARBITRUM_RINKEBY_SANDBOX]: CommonConfig.DefaultOracleChainPrice,
    [ChainId.OPTIMISM_KOVAN_SANDBOX]: CommonConfig.DefaultOracleChainPrice,
    [ChainId.FANTOM_TESTNET_SANDBOX]: CommonConfig.DefaultOracleChainPrice,
}

export const RelayerDstPrice: Pick<Config.DstPriceType, SandboxChainIdType> = {
    [ChainId.RINKEBY_SANDBOX]: CommonConfig.DefaultRelayerDstPrice,
    [ChainId.BSC_TESTNET_SANDBOX]: CommonConfig.DefaultRelayerDstPrice,
    [ChainId.FUJI_SANDBOX]: CommonConfig.DefaultRelayerDstPrice,
    [ChainId.MUMBAI_SANDBOX]: CommonConfig.DefaultRelayerDstPrice,
    [ChainId.ARBITRUM_RINKEBY_SANDBOX]: CommonConfig.DefaultRelayerDstPrice,
    [ChainId.OPTIMISM_KOVAN_SANDBOX]: CommonConfig.DefaultRelayerDstPrice,
    [ChainId.FANTOM_TESTNET_SANDBOX]: CommonConfig.DefaultRelayerDstPrice,
}

export const RelayerDstConfig: Pick<Config.DstConfigType, SandboxChainIdType> = {
    [ChainId.RINKEBY_SANDBOX]: CommonConfig.DefaultRealyerDstConfig,
    [ChainId.BSC_TESTNET_SANDBOX]: CommonConfig.DefaultRealyerDstConfig,
    [ChainId.FUJI_SANDBOX]: CommonConfig.DefaultRealyerDstConfig,
    [ChainId.MUMBAI_SANDBOX]: CommonConfig.DefaultRealyerDstConfig,
    [ChainId.ARBITRUM_RINKEBY_SANDBOX]: CommonConfig.DefaultRealyerDstConfig,
    [ChainId.OPTIMISM_KOVAN_SANDBOX]: CommonConfig.DefaultRealyerDstConfig,
    [ChainId.FANTOM_TESTNET_SANDBOX]: CommonConfig.DefaultRealyerDstConfig,
}

export const DefaultInboundProof: Pick<Config.InboundProofConfigType, SandboxChainIdType> = {
    [ChainId.RINKEBY_SANDBOX]: {},
    [ChainId.BSC_TESTNET_SANDBOX]: {},
    [ChainId.FUJI_SANDBOX]: {},
    [ChainId.MUMBAI_SANDBOX]: {},
    [ChainId.ARBITRUM_RINKEBY_SANDBOX]: {},
    [ChainId.OPTIMISM_KOVAN_SANDBOX]: {},
    [ChainId.FANTOM_TESTNET_SANDBOX]: {},
}

export const DefaultOutboundProof: Pick<Config.OutboundProofConfigType, SandboxChainIdType> = {
    [ChainId.RINKEBY_SANDBOX]: CommonConfig.DefaultOutboundProof,
    [ChainId.BSC_TESTNET_SANDBOX]: CommonConfig.DefaultOutboundProof,
    [ChainId.FUJI_SANDBOX]: CommonConfig.DefaultOutboundProof,
    [ChainId.MUMBAI_SANDBOX]: CommonConfig.DefaultOutboundProof,
    [ChainId.ARBITRUM_RINKEBY_SANDBOX]: CommonConfig.DefaultOutboundProof,
    [ChainId.OPTIMISM_KOVAN_SANDBOX]: CommonConfig.DefaultOutboundProof,
    [ChainId.FANTOM_TESTNET_SANDBOX]: CommonConfig.DefaultOutboundProof,
}

export const LzConfig: Record<SandboxChainIdType, LzConfigType> = {
    [ChainId.RINKEBY_SANDBOX]: {
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
                addressSizes: _.pick(AddressSize, SandboxChainId),
                inbound: DefaultInboundProof,
                outbound: DefaultOutboundProof,
            },
        },
        treasury: CommonConfig.DefaultTreasuryConfig, //currently unused
        endpoint: CommonConfig.DefaultEndpointConfig,
    },
    [ChainId.BSC_TESTNET_SANDBOX]: {
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
                addressSizes: _.pick(AddressSize, SandboxChainId),
                inbound: DefaultInboundProof,
                outbound: DefaultOutboundProof,
            },
        },
        treasury: CommonConfig.DefaultTreasuryConfig, //currently unused
        endpoint: CommonConfig.DefaultEndpointConfig,
    },
    [ChainId.FUJI_SANDBOX]: {
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
                addressSizes: _.pick(AddressSize, SandboxChainId),
                inbound: DefaultInboundProof,
                outbound: DefaultOutboundProof,
            },
        },
        treasury: CommonConfig.DefaultTreasuryConfig, //currently unused
        endpoint: CommonConfig.DefaultEndpointConfig,
    },
    [ChainId.MUMBAI_SANDBOX]: {
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
                addressSizes: _.pick(AddressSize, SandboxChainId),
                inbound: DefaultInboundProof,
                outbound: DefaultOutboundProof,
            },
        },
        treasury: CommonConfig.DefaultTreasuryConfig, //currently unused
        endpoint: CommonConfig.DefaultEndpointConfig,
    },
    [ChainId.ARBITRUM_RINKEBY_SANDBOX]: {
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
                addressSizes: _.pick(AddressSize, SandboxChainId),
                inbound: DefaultInboundProof,
                outbound: DefaultOutboundProof,
            },
        },
        treasury: CommonConfig.DefaultTreasuryConfig, //currently unused
        endpoint: CommonConfig.DefaultEndpointConfig,
    },
    [ChainId.OPTIMISM_KOVAN_SANDBOX]: {
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
                addressSizes: _.pick(AddressSize, SandboxChainId),
                inbound: DefaultInboundProof,
                outbound: DefaultOutboundProof,
            },
        },
        treasury: CommonConfig.DefaultTreasuryConfig, //currently unused
        endpoint: CommonConfig.DefaultEndpointConfig,
    },
    [ChainId.FANTOM_TESTNET_SANDBOX]: {
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
                addressSizes: _.pick(AddressSize, SandboxChainId),
                inbound: DefaultInboundProof,
                outbound: DefaultOutboundProof,
            },
        },
        treasury: CommonConfig.DefaultTreasuryConfig, //currently unused
        endpoint: CommonConfig.DefaultEndpointConfig,
    },
}
