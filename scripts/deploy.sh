#!/bin/bash

for network in "$@"
do
    echo "$network"
    eval "npx hardhat --network $network deploy"
done