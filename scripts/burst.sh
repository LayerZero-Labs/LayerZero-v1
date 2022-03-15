#!/bin/bash

echo "--network $1"
echo "--n $2"
echo "--b $3"
eval "npx hardhat --network $1 sendDocsCounterMockConcurrent --target-network $1 --n $2 --b $3"
