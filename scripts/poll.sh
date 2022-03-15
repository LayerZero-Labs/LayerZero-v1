#!/bin/bash

echo "$1"
eval "npx hardhat --network $1 pollDocsCounterMock"
