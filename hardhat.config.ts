import "dotenv/config"
import "@nomiclabs/hardhat-solhint"
import "@nomiclabs/hardhat-waffle"
import "@nomiclabs/hardhat-web3"
import "@nomiclabs/hardhat-ethers"
import "@nomiclabs/hardhat-etherscan"
import "hardhat-deploy"
import "hardhat-deploy-ethers"
import "hardhat-gas-reporter"
import "hardhat-spdx-license-identifier"
import "solidity-coverage"
import "./tasks"

import {HardhatUserConfig} from "hardhat/types"
import {ChainId, accounts, setupNetwork} from "@layerzerolabs/core-sdk";

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  gasReporter: {
    currency: "USD",
    enabled: process.env.REPORT_GAS === "true",
    excludeContracts: ["contracts/libraries/"],
  },
  mocha: {
    timeout: 50000,
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    proxyOwner: {
      default: 1
    }
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: accounts(),
    },
    hardhat: {
      forking: {
        enabled: process.env.FORKING === "true",
        url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      },
    },

    //////////////////////// mainnets
    ...setupNetwork({
    // eth mainnet
    eth: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_MAINNET_ETH_API_KEY}`,
    } }, [ChainId.ETHEREUM]),
    ...setupNetwork({
    // bsc mainnet
    bsc: {
      url: `https://speedy-nodes-nyc.moralis.io/${process.env.MORALIS_MAINNET_BSC_API_KEY}`,
    } }, [ChainId.BSC]),
    ...setupNetwork({
    // avax mainnet
    avax: {
      url: `https://speedy-nodes-nyc.moralis.io/${process.env.MORALIS_MAINNET_AVAX_API_KEY}`,
    } }, [ChainId.AVALANCHE]),
    ...setupNetwork({
    // polygon mainnet
    polygon: {
      url: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_MAINNET_POLYGON_API_KEY}`,
    } }, [ChainId.POLYGON]),
    ...setupNetwork({
    // arbitrum mainnet
    arbitrum: {
      url: `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_MAINNET_ARBITRUM_API_KEY}`,
    } }, [ChainId.ARBITRUM]),
    ...setupNetwork({
    // optimism mainnet
    optimism: {
       url: `https://opt-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_MAINNET_OPTIMISM_API_KEY}`,
    } }, [ChainId.OPTIMISM]),
    ...setupNetwork({
    // ftm mainnet
    ftm: {
      url: `https://speedy-nodes-nyc.moralis.io/${process.env.MORALIS_MAINNET_FTM_API_KEY}`,
    } }, [ChainId.FANTOM]),


    // // GOERLI
    // // https://eth-goerli.alchemyapi.io/v2/
    // ...setupNetwork({
    //   goerli: {
    //     url: `https://eth-goerli.alchemyapi.io/v2/${process.env.ALCHEMY_GOERLI_API_KEY}`,
    //     gasMultiplier: 2,
    //   }
    // }, [ChainId.GOERLI, ChainId.GOERLI_SANDBOX]),

    // RINKEBY -> will be deprecated
    ...setupNetwork({
      rinkeby: {
        url: `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_RINKEBY_API_KEY}`,
        gasMultiplier: 2,
      }
    }, [ChainId.RINKEBY, ChainId.RINKEBY_SANDBOX]),
    ...setupNetwork({
      "bsc-testnet": {
        url: process.env.BSC_TESTNET_RPC // "https://data-seed-prebsc-2-s3.binance.org:8545",
      }
    }, [ChainId.BSC_TESTNET, ChainId.BSC_TESTNET_SANDBOX]),
    ...setupNetwork({
      fuji: {
        url: process.env.FUJI_RPC, // "https://api.avax-test.network/ext/bc/C/rpc",
        gasMultiplier: 3
      }
    }, [ChainId.FUJI, ChainId.FUJI_SANDBOX]),
    ...setupNetwork({
      mumbai: {
        url: `https://polygon-mumbai.g.alchemy.com/v2/${process.env.ALCHEMY_MUMBAI_API_KEY}`, // "https://rpc-mumbai.maticvigil.com/",
        gasMultiplier: 2,
      }
    }, [ChainId.MUMBAI, ChainId.MUMBAI_SANDBOX]),
    ...setupNetwork({
      arbrink: {
        url: `https://arb-rinkeby.g.alchemy.com/v2/${process.env.ALCHEMY_ARBRINK_API_KEY}`,
        gasMultiplier: 2,
      }
    }, [ChainId.ARBITRUM_RINKEBY, ChainId.ARBITRUM_RINKEBY_SANDBOX]),
    ...setupNetwork({
      optkov: {
        url: `https://opt-kovan.g.alchemy.com/v2/${process.env.ALCHEMY_OPTKOV_API_KEY}`, // `https://optimism-kovan.infura.io/v3/${process.env.INFURA_API_KEY}`,
        // url: `${process.env.INUFRA_OPTKOV_RPC}`
      }
    }, [ChainId.OPTIMISM_KOVAN, ChainId.OPTIMISM_KOVAN_SANDBOX]),
    ...setupNetwork({
      ftmtestnet: {
        url: `${process.env.FTM_TESTNET_RPC}`,
        gasMultiplier: 2,
      }
    }, [ChainId.FANTOM_TESTNET, ChainId.FANTOM_TESTNET_SANDBOX]),
  },
  paths: {
    artifacts: "artifacts",
    cache: "cache",
    deploy: "deploy",
    deployments: "deployments",
    imports: "imports",
    sources: "contracts",
    tests: "test",
  },
  // etherscan: {
  //
  //   apiKey: {
  //     mainnet: `${process.env.ETHERSCAN_API_KEY}`,
  //     rinkeby: `${process.env.ETHERSCAN_API_KEY}`,
  //   }
  // },
  solidity: {
    compilers: [
      {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 30000,
          },
        },
      },
    ],
  },
  spdxLicenseIdentifier: {
    overwrite: true,
    runOnCompile: true,
  }

}

export default config
