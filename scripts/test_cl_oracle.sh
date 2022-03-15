#!/bin/bash

N=$1
networks=(${N//,/ })

# usage (mainnet):
#   $ ./test_cl_oracle.sh eth,bsc,avax mainnet

# usage (testnet/sandbox):
#   $ ./test_cl_oracle.sh rinkeby-sandbox,bsctestnet-sandbox,fuji-sandbox sandbox

for network in "${networks[@]}"
do
    eval "npx hardhat --network $network deploy"
    eval "npx hardhat --network $network configureChainlinkOracleClient --env $2"

    for networkB in "${networks[@]}"
    do
        eval "    npx hardhat --network $network testChainlinkOracle --target-network $networkB"
    done
done