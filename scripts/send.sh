#!/bin/bash

echo "--network $1"
echo "--n $2"
eval "npx hardhat --network $1 sendDocsCounterMock --target-network $1 --n $2"
