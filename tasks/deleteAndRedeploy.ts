import {getNetworksForEnv} from "@layerzerolabs/lz-sdk";
const shell = require('shelljs')

module.exports = async function (taskArgs) {
    const networks = getNetworksForEnv(taskArgs.e);
    const ignoreNetworks = taskArgs.ignore.split(',')
    if(!taskArgs.e || networks.length == 0) {
        console.log(`Invalid environment argument: ${taskArgs.e}`)
    }

    //delete contract and redeploy
    networks.map(async (network) => {
        console.log("network: " + network)
        if(ignoreNetworks.indexOf(network) === -1) {
            let deleteCommand = `rm deployments/${network}/${taskArgs.contract}.json`;
            console.log("deleteCommand: " + deleteCommand)
            shell.exec(deleteCommand)
            const redeployCommand = `npx hardhat --network ${network} deploy --tags ${taskArgs.contract}`;
            console.log("redeployCommand: " + redeployCommand)
            shell.exec(redeployCommand)
        } else {
            console.log("ignoring: " + network)
        }
    })
}
