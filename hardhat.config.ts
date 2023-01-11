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
import { accounts} from "@layerzerolabs/lz-sdk";

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
    ethereum: {
      url: "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161", // public infura endpoint
      chainId: 1,
      accounts: accounts(),
    },
    bsc: {
      url: "https://bsc-dataseed1.binance.org",
      chainId: 56,
      accounts: accounts(),
    },
    avalanche: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      chainId: 43114,
      accounts: accounts(),
    },
    polygon: {
      url: "https://rpc-mainnet.maticvigil.com",
      chainId: 137,
      accounts: accounts(),
    },
    arbitrum: {
      url: `https://arb1.arbitrum.io/rpc`,
      chainId: 42161,
      accounts: accounts(),
    },
    optimism: {
      url: `https://mainnet.optimism.io`,
      chainId: 10,
      accounts: accounts(),
    },
    fantom: {
      url: `https://rpcapi.fantom.network`,
      chainId: 250,
      accounts: accounts(),
    },

    goerli: {
      url: "https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161", // public infura endpoint
      chainId: 5,
      accounts: accounts(),
    },
    'bsc-testnet': {
      url: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
      chainId: 97,
      accounts: accounts(),
    },
    fuji: {
      url: `https://api.avax-test.network/ext/bc/C/rpc`,
      chainId: 43113,
      accounts: accounts(),
    },
    mumbai: {
      url: "https://rpc-mumbai.maticvigil.com/",
      chainId: 80001,
      accounts: accounts(),
    },
    'arbitrum-goerli': {
      url: `https://goerli-rollup.arbitrum.io/rpc/`,
      chainId: 421613,
      accounts: accounts(),
    },
    'optimism-goerli': {
      url: `https://goerli.optimism.io/`,
      chainId: 420,
      accounts: accounts(),
    },
    'fantom-testnet': {
      url: `https://rpc.testnet.fantom.network/`,
      chainId: 4002,
      accounts: accounts(),
    }
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
