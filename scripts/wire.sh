#!/bin/bash

for network in "$@"
do
    for networkB in "$@"
    do
        echo "new-wire-endpoints: $network -> $networkB"
        eval "npx hardhat --network $network new-wire-endpoints --endpoint-b $networkB --prompt false"
    done
done