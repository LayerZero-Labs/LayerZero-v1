Here's a more readable and organized version of the LayerZero README for GitHub:

---

# LayerZero - An Omnichain Interoperability Protocol

This repository contains the smart contracts for LayerZero Endpoints. For developers looking to build on top of LayerZero, please refer to the [LayerZero Documentation](https://layerzero.gitbook.io/docs/).

## Overview
LayerZero is an Omnichain Interoperability Protocol designed for lightweight message passing across chains. It ensures authentic and guaranteed message delivery with configurable trustlessness. The protocol is implemented as a set of gas-efficient, non-upgradable smart contracts.

## Development

### Interfaces
Add the following to your `package.json`:
```json
"dependencies": {
  "@layerzerolabs/contracts": "latest"
}
```

### Setup
1. Copy `.env.example` to `.env` and fill in the variables.
2. Run `yarn install` to install dependencies.

### Testing
Run all tests:
```bash
yarn test
```
Run a single test file:
```bash
yarn test test/Endpoint.test.js
```
Check gas usage:
```bash
yarn test:gas
```
Check test coverage:
```bash
yarn test:coverage
```

### Linting
Run linter (only lints `.js` and `.ts` files):
```bash
yarn lint
```

## Deployment

Deploy networks are generated based on tags.

### Hardhat

Spin up the local environment and deploy contracts:
```bash
yarn dev
```

### Development

Deploy to Rinkeby testnet:
```bash
hardhat --network rinkeby-testnet deploy
```

Deploy to Rinkeby sandbox:
```bash
hardhat --network rinkeby-sandbox deploy
```

### Production

Deploy to Ethereum mainnet:
```bash
hardhat --network ethereum deploy
```

### Adding a New Network

1. Update `hardhat.config.ts` with the new network.
   - Refer to `STAGING_MAP` in `utils/deploy.js` for supported staging environments.
2. Update `constants/endpoints.json` with the new network.
3. Ensure the key in `endpoints.json` matches the network name in Hardhat.

Example: Single LayerZero Network
```typescript
// hardhat.config.ts
ethereum: {
  url: `{rpc address}`,
  chainId: 1, // chainlist id
}

// endpoints.json
"production": {
  "ethereum": {
    "id": 1 // layerzero chain id
  }
}
```

Example: Multiple LayerZero Networks on the Same Chain
```typescript
// hardhat.config.ts
...expandNetwork({
  ropsten: {
    url: `{rpc address}`,
    chainId: 3, // chainlist id
  }
}, ["testnet", "sandbox"]),

// endpoints.json
"development": {
  "ropsten": {
    "id": 4 // layerzero chain id
  }
}
```

## Acknowledgments

Special thanks to the core development team for building the LayerZero Endpoints:
- Ryan Zarick
- Isaac Zhang
- Caleb Banister
- Carmen Cheng
- T. Riley Schwarz

## Licensing

The primary license for LayerZero is the Business Source License 1.1 (BUSL-1.1). See [`LICENSE`](./LICENSE) for more details.

---

This structured and organized README should be more accessible and easier to read for developers.
