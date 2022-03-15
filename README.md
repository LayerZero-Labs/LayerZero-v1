# LayerZero - an Omnichain Interoperability Protocol

This repository contains the smart contracts for LayerZero Endpoints. For developers looking to build on top of LayerZero please refer to the [docs](https://layerzero.gitbook.io/docs/) 

## Overview
LayerZero is an Omnichain Interoperability Protocol designed for lightweight message passing across chains. LayerZero provides authentic and guaranteed message delivery with configurable trustlessness. The protocol is implemented as a set of gas-efficient, non-upgradable smart contracts.

## Development
### Interfaces
add this to your package.json

`
    "@layerzerolabs/contracts": "latest",
`
### Setup
- copy .env.example to .env and fill in variables
- `yarn install`
### Testing
`yarn test`
#### Single Test File
`yarn test test/Endpoint.test.js`
### Gas Uasge
`yarn test:gas`
### Coverage
`yarn test:coverage`
### Lint
`yarn lint`

only lints .js/.ts files

## Deployment

Deploy networks are generated based on tags.

#### Hardhat
`yarn dev`

spins up local environment and deploys contracts 

#### Development
```
hardhat --network rinkeby-testnet deploy
hardhat --network rinkeby-sandbox deploy
```

#### Production
```
hardhat --network ethereum deploy
```

### Adding a new network
1. Update [hardhat config](hardhat.config.ts) with network
   1. refer to [STAGING_MAP](utils/deploy.js) for staging environments supported 
2. Update [endpoints.json](constants/endpoints.json) with network
3. Make sure that key in endpoints.json matches network name in hardhat

Example: One LayerZero Network
```
//hardhat.config.ts
ethereum: {
    url: `{rpc address}`,
    chainId: 1, //chainlist id
}

//endpoints.json
"production": {
   ...
   "ethereum": {
     "id": 1 //layerzero chain id
   }
}
```

Example: More than one LayerZero Network on same chain (using expandNetwork)
```
//hardhat.config.ts
...expandNetwork({
    ropsten: {
        url: `{rpc address}`,
        chainId: 3, //chainlist id
    }
}, ["testnet", "sandbox"]),

//endpoints.json
"development": {
   ...
   "ropsten": {
     "id": 4 //layerzero chain id
   }
}
```
### Acknowledgments

Thank you to the core development team for building the LayerZero Endpoints: Ryan Zarick, Isaac Zhang, Caleb Banister, Carmen Cheng and T. Riley Schwarz 


### LICENSING
The primary license for LayerZero is the Business Source License 1.1 (BUSL-1.1). see [`LICENSE`](./LICENSE).
