const { getNetworksForEnv } = require("@layerzerolabs/lz-sdk")
const fs = require("fs")

const environmentArg = process.argv[2]
const contractCsvArg = process.argv[3]

async function getAddresses(environment, contractCsv) {
    let contracts = contractCsv.split(",")
    const promises = []
    for (const contract of contracts) {
        promises.push("\n" + contract)
        const networks = getNetworksForEnv(environment)
        for (const network of networks) {
            promises.push(getAddressForNetwork(`../deployments/${network}/${contract[0].toUpperCase() + contract.substring(1)}.json`, network))
        }
    }
    const resolvedPromises = await Promise.all(promises)
    resolvedPromises.forEach((networkAddressStr) => {
        console.log(networkAddressStr)
    })
}

function getAddressForNetwork(file, network) {
    return new Promise((resolve, reject) => {
        fs.readFile(file, (error, content) => {
            if (error) {
                console.error(`Error reading file: ${file}`, error);
                reject(`Error reading file: ${file}`);
                return;
            }
            try {
                const address = JSON.parse(content).address;
                resolve(`${network}: ${address}`);
            } catch (parseError) {
                console.error(`Error parsing JSON from file: ${file}`, parseError);
                reject(`Error parsing JSON from file: ${file}`);
            }
        });
    });
}


// to run: node getAddresses ${ENVIRONMENT} ${CONTRACT_CSV}
// example: node getAddresses testnet Relayer,Endpoint,UltraLightNode
getAddresses(environmentArg, contractCsvArg).then((res) => console.log("\nComplete!"))
