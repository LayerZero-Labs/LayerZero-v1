#!/bin/bash

for network in "$@"
do
    for networkB in "$@"
    do
        echo "addInboundProofLibraryForChain: $network -> $networkB"
        eval "npx hardhat --network $network addInboundProofLibraryForChain --target-network $networkB"
    done
done