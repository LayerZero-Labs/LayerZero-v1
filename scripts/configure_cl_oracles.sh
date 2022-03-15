#!/bin/bash


N=$1
networks=(${N//,/ })

for network in "${networks[@]}"
do
    echo "npx hardhat --network $network configureChainlinkOracleClient --env $2"
done