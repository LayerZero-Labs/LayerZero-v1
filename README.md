# LayerZero - an Omnichain Interoperability Protocol (Omnichain Birlikte Çalışabilirlik Protokolü)

Bu repo, LayerZero Endpoints için akıllı sözleşmeleri içerir. LayerZero'nun üzerine inşa etmek isteyen geliştiriciler için lütfen şuraya bakın: [docs](https://layerzero.gitbook.io/docs/) 

## Overview
LayerZero, zincirler arasında hafif ileti aktarımı için tasarlanmış bir Omnichain Birlikte Çalışabilirlik Protokolüdür. LayerZero, yapılandırılabilir güvenilmezlik ile özgün ve garantili mesaj teslimi sağlar. Protokol, gaz açısından verimli, yükseltilemeyen bir dizi akıllı sözleşme olarak uygulanmaktadır.

## Development (Gelişim)
### Interfaces (Arayüzler)
bunu ekleyin package.json

`
    "@layerzerolabs/contracts": "latest",
`
### Setup (kurulum)
- copy .env.example to .env and fill in variables
- `yarn install`
### Testing
`yarn test`
#### Single Test File (Tek Test Dosyası)
`yarn test test/Endpoint.test.js`
### Gas Uasge (Gaz Kullanımı)
`yarn test:gas`
### Coverage
`yarn test:coverage`
### Lint
`yarn lint`

only lints .js/.ts files

## Deployment

Deploy networks are generated based on tags.

Dağıtım ağları, etiketlere göre oluşturulur.

#### Hardhat
`yarn dev`

local ortamı harekete geçirir ve sözleşmeleri devreye

#### Development
```
hardhat --network rinkeby-testnet deploy
hardhat --network rinkeby-sandbox deploy
```

#### Production (üretim)
```
hardhat --network ethereum deploy
```

### Adding a new network (Yeni bir ağ ekleme)
1. Güncelleme [hardhat config](hardhat.config.ts) ağ ile
   1. başvurun [STAGING_MAP](utils/deploy.js) desteklenen hazırlama ortamları için 
2. Güncelleme [endpoints.json](constants/endpoints.json) with network
3. endpoints.json'daki anahtarın hardhat'taki ağ adıyla eşleştiğinden emin olun

Example: One LayerZero Network (Örnek: Tek Katmanlı Sıfır Ağ)
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

Örnek: Aynı zincir üzerinde birden fazla LayerZero Ağı (using expandNetwork)
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
### Teşekkürler

LayerZero Endpoints'i oluşturan çekirdek geliştirme ekibine teşekkür ederiz: Ryan Zarick, Isaac Zhang, Caleb Banister, Carmen Cheng ve T. Riley Schwarz

### LİSANSLAMA
The primary license for LayerZero is the Business Source License 1.1 (BUSL-1.1). see [`LICENSE`](./LICENSE).
