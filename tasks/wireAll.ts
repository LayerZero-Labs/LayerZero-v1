import {cli} from "cli-ux";

const { CHAIN_ID } = require("@layerzerolabs/core-sdk")
import { LZ_CONFIG } from "../utils/deploy/configs"
import * as crossChainHelper from "../utils/deploy/crossChainHelper"
import markdownTable from "markdown-table"
const fs = require("fs").promises

export async function promptToProceed(): Promise<boolean> {
    const proceed = await cli.prompt("Would you like to proceed with above instruction? y/N")
    return ["y", "yes"].includes(proceed.toLowerCase())
}

module.exports = async function (taskArgs, hre) {
    const networks = crossChainHelper.NETWORKS_BY_ENV[taskArgs.e]

    if (!networks) {
        console.log(`Invalid environment ${taskArgs.e}, environment should be one of mainnet testnet or sandbox`)
    }

    console.log(`************************************************`)
    console.log(`Computing diff`)
    console.log(`************************************************`)

    const transactionBynetwork = await Promise.all(
        networks.map(async (network) => {
            const CONFIG = LZ_CONFIG[CHAIN_ID[network]]
            const transactions: crossChainHelper.Transaction[] = []
            //----------------------------------------------------------------------------------
            // RELAYER
            transactions.push(...(await crossChainHelper.configureRelayer(hre, network, CONFIG)))

            //----------------------------------------------------------------------------------
            // ORACLE
            transactions.push(...(await crossChainHelper.configureOracle(hre, network, CONFIG)))

            //----------------------------------------------------------------------------------
            // ENDPOINT
            transactions.push(...(await crossChainHelper.initLibraryVersion(hre, network)))
            transactions.push(...(await crossChainHelper.setDefaultSendVersion(hre, network, CONFIG)))
            transactions.push(...(await crossChainHelper.setDefaultReceiveVersion(hre, network, CONFIG)))
            await Promise.all(
                networks.map(async (remoteNetwork) => {
                    const remoteConfigurationTransactions: crossChainHelper.Transaction[] = []
                    //----------------------------------------------------------------------------------
                    // RELAYER
                    remoteConfigurationTransactions.push(...(await crossChainHelper.setDstPrice(hre, network, remoteNetwork, CONFIG)))
                    remoteConfigurationTransactions.push(...(await crossChainHelper.setDstConfig(hre, network, remoteNetwork, CONFIG)))

                    //----------------------------------------------------------------------------------
                    // ULTRA LIGHT NODE
                    remoteConfigurationTransactions.push(...(await crossChainHelper.setChainAddressSize(hre, network, remoteNetwork, CONFIG)))
                    remoteConfigurationTransactions.push(...(await crossChainHelper.setRemoteUln(hre, network, remoteNetwork, CONFIG)))
                    remoteConfigurationTransactions.push(
                        ...(await crossChainHelper.initInboundProofLibrary(hre, network, remoteNetwork, [
                            crossChainHelper.CONTRACT_NAMES.EVM_VALIDATOR,
                        ]))
                    )

                    remoteConfigurationTransactions.push(
                        ...(await crossChainHelper.setSupportedOutboundProofTypes(hre, network, remoteNetwork, CONFIG))
                    )
                    remoteConfigurationTransactions.push(
                        ...(await crossChainHelper.setDefaultAdapterParams(hre, network, remoteNetwork, CONFIG))
                    )
                    remoteConfigurationTransactions.push(...(await crossChainHelper.setDefaultAppConfig(hre, network, remoteNetwork, CONFIG)))

                    transactions.push(...remoteConfigurationTransactions)
                })
            )

            return {
                network,
                transactions,
            }
        })
    )

    transactionBynetwork.forEach(({ network, transactions }) => {
        console.log(`************************************************`)
        console.log(`Transaction for ${network}`)
        console.log(`************************************************`)
        const transactionNeedingChange = transactions.filter((transaction) => transaction.needChange)
        if (!transactionNeedingChange.length) {
            console.log("No change needed")
        } else {
            console.table(transactionNeedingChange)
        }
    })
    const columns = ["needChange", "chainId", "remoteChainId", "contractName", "methodName", "args", "diff"]

    await fs.writeFile(
        "./transactions.md",
        markdownTable([
            ["network"].concat(columns),
            ...transactionBynetwork.reduce((acc, { network, transactions }) => {
                transactions.forEach((transaction) => {
                    acc.push([
                        network,
                        ...columns.map((key) => {
                            if (typeof transaction[key] === "object") {
                                return JSON.stringify(transaction[key])
                            } else {
                                return transaction[key]
                            }
                        }),
                    ])
                })
                return acc
            }, []),
        ])
    )

    console.log("Full configuration is written at:")
    console.log(`file:/${process.cwd()}/transactions.md`)

    if (!(await promptToProceed())) {
        return
    }

    const errs: any[] = []
    const print: any = {}
    let previousPrintLine = 0
    const printResult = () => {
        if (previousPrintLine) {
            process.stdout.moveCursor(0, -previousPrintLine)
        }
        if (Object.keys(print)) {
            previousPrintLine = Object.keys(print).length + 4
            console.table(Object.keys(print).map((network) => ({ network, ...print[network] })))
        }
    }

    await Promise.all(
        transactionBynetwork.map(async ({ network, transactions }) => {
            const transactionToCommit = transactions.filter((transaction) => transaction.needChange)

            let successTx = 0
            print[network] = print[network] || { requests: `${successTx}/${transactionToCommit.length}` }
            for (let transaction of transactionToCommit) {
                print[network].current = `${transaction.contractName}.${transaction.methodName}`
                printResult()
                try {
                    const tx = await crossChainHelper.exectuteTransaction(hre, network, transaction)
                    print[network].past = `${transaction.contractName}.${transaction.methodName} (${tx.transactionHash})`
                    successTx++
                    print[network].requests = `${successTx}/${transactionToCommit.length}`
                    printResult()
                } catch (err: any) {
                    console.log(`Failing calling ${transaction.contractName}.${transaction.methodName} for network ${network} with err ${err}`)
                    console.log(err)
                    errs.push({
                        network,
                        err,
                    })
                    print[network].current = err
                    print[network].err = true
                    printResult()
                    break
                }
            }
        })
    )

    if (!errs.length) {
        console.log("Wired all networks successfully")
    } else {
        console.log(errs)
    }
}
