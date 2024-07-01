const { getNetworksForEnv } = require("@layerzerolabs/lz-sdk");
const fs = require("fs").promises;

async function getAddresses(environment, contractCsv) {
    const contracts = contractCsv.split(",");
    const promises = [];
    
    for (const contract of contracts) {
        promises.push("\n" + contract);
        const networks = getNetworksForEnv(environment);
        
        for (const network of networks) {
            promises.push(getAddressForNetwork(`../deployments/${network}/${contract[0].toUpperCase() + contract.substring(1)}.json`, network));
        }
    }
    
    try {
        const resolvedPromises = await Promise.all(promises);
        resolvedPromises.forEach((networkAddressStr) => {
            console.log(networkAddressStr);
        });
    } catch (error) {
        console.error(error);
    }
}

async function getAddressForNetwork(file, network) {
    try {
        const content = await fs.readFile(file);
        return `${network}: ${JSON.parse(content).address}`;
    } catch (error) {
        console.log(`File: ${file} does not exist`);
        return null;
    }
}

// to run: node getAddresses ${ENVIRONMENT} ${CONTRACT_CSV}
// example: node getAddresses testnet Relayer,Endpoint,UltraLightNode
getAddresses(environmentArg, contractCsvArg).then(() => console.log("\nComplete!"));