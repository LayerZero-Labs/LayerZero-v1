#!/bin/bash

network=$1
stage=$2
#N=$1
#networks=(${N//,/ })
#
#for network in "${networks[@]}"
#do

        echo "npx hardhat --network $network deploy --tags ChainlinkOracleClient"
        echo "npx hardhat --network $network configureChainlinkOracleClient --env $stage"
        echo "npx hardhat --network $network testChainlinkOracle --target-network $network"

#done
