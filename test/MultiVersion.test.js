const { expect } = require("chai")
const {
    generateEndpoints,
    generateVersion,
    deliverMsg,
    wireEndpoints,
    callAsContract,
    txTouchedAddress,
    checkOutboundNonce,
    checkInboundNonce,
    checkCounter,
    deployNew,
    setOutboundProofType,
    incrementCounterWithTest,
    setInboundProofLibraryVersion,
} = require("./util/helpers")
const { VERBOSE } = require("./util/constants")
const { VARS } = require("./util/constants")

// responsible for testing a series of endpoints with multiple versions on each 'chain'
// this ensures that the calls are routed correctly through their corresponding uln versions
describe.skip("MultiVersion:", function () {
    let numVersions = 2 // indicates the number of versions we want to support on the endpoint
    let chainIds = [1, 2] // define how many chains we want to support here
    let numOfIncrements = 2 // set how many increments to test
    let unwiredEndpoints
    let { zroFee, outboundProofType } = VARS

    beforeEach(async function () {
        await deployments.fixture(["test"])
        unwiredEndpoints = {}
        // generate numVersions for each chain
        for (const endpoint of await generateEndpoints(chainIds)) {
            for (let i = 1; i <= numVersions; i++) {
                if (!Array.isArray(unwiredEndpoints[i])) unwiredEndpoints[i] = [] // initialize if it is not
                unwiredEndpoints[i].push(await generateVersion(endpoint, chainIds, outboundProofType, false, i, false))
            }
        }

        // set which version each user application should be using
        for (let i = 1; i <= numVersions; i++) {
            for (const version of unwiredEndpoints[i]) {
                const { counterMock, lzEndpoint, lzToken, ultraLightNode } = version
                await callAsContract(lzEndpoint, counterMock.address, "setSendVersion(uint16)", [i])
                await callAsContract(lzEndpoint, counterMock.address, "setReceiveVersion(uint16)", [i])

                // UA has ZRO to spend
                await lzToken.transfer(counterMock.address, zroFee * numOfIncrements * 2)
                // give ultraLightNode allowance to transfer ZRO on the UA behalf
                await callAsContract(lzToken, counterMock.address, "approve(address,uint256)", [
                    ultraLightNode.address,
                    zroFee * numOfIncrements * 2,
                ])
            }
        }
    })

    // go through a series of endpoints and corresponding user applications
    // each UA should use a unique version to route their messages through a lz Endpoint
    it("incrementCounter() - works across multiple chains and versions", async function () {
        this.timeout(5000000)
        let ulnVersions = []
        let ulnAddresses = []

        for (let version = 1; version <= numVersions; version++) {
            const ethereum = unwiredEndpoints[version][0] // ethereum version context
            const avax = unwiredEndpoints[version][1] // avax version context

            // all of the corresponding ultra light nodes are unique
            expect(ulnAddresses.includes(ethereum.ultraLightNode.address)).to.equal(false)
            ulnAddresses.push(ethereum.ultraLightNode.address)
            expect(ulnAddresses.includes(avax.ultraLightNode.address)).to.equal(false)
            ulnAddresses.push(avax.ultraLightNode.address)

            // endpoints wired together so they are pointing to their corresponding remote counterpart
            await wireEndpoints([ethereum, avax])

            // arbitrary number of msgs back and forth
            for (let i = 1; i <= numOfIncrements; i++) {
                // src is the corresponding context for sending a message
                // dst is the corresponding context for receiving a message
                for (let [src, dst] of [
                    [ethereum, avax],
                    [avax, ethereum],
                ]) {
                    if (VERBOSE) console.log(`${src.name} -> ${dst.name}... w/ version ${version}`)

                    let versions = [
                        (await src.lzEndpoint.uaConfigLookup(src.counterMock.address)).sendVersion,
                        (await src.lzEndpoint.uaConfigLookup(src.counterMock.address)).receiveVersion,
                        (await dst.lzEndpoint.uaConfigLookup(dst.counterMock.address)).sendVersion,
                        (await dst.lzEndpoint.uaConfigLookup(dst.counterMock.address)).receiveVersion,
                    ]
                    expect(versions.every((val, t, arr) => val === arr[0])).to.equal(true) // everything points to the same version
                    expect(versions.includes(version)).to.equal(true) // on the right version
                    expect(ulnVersions.includes(version)).to.equal(false) // should not have tried to use this version before

                    // init the counter send msg
                    const tx = await src.counterMock.incrementCounter(dst.chainId, dst.counterMock.address, { value: 300000 })

                    // routes through the correct send version
                    expect(await txTouchedAddress(tx, src.ultraLightNode.address)).to.equal(true)

                    // deliver the msg to dst
                    const tx2 = await deliverMsg(tx, src, dst, dst.counterMock.address)

                    // routes through the correct receive version
                    expect(await txTouchedAddress(tx2, dst.ultraLightNode.address)).to.equal(true)

                    await checkOutboundNonce(src, dst, i)
                    await checkInboundNonce(dst, src, i)
                    await checkCounter(dst, src, i)
                }
            }

            ulnVersions.push(version) // Done testing this version, should not try to use this version again
        }
    })
})

// simulate a situation for a user application is using a separate validation library for two different chains
describe("MultiProof:", function () {
    let chainIds = [1, 2]
    let numOfIncrements = 10 // increase this to increase the scaling
    let unwiredEndpoints, wiredEndpoints, src, dst
    let { zroFee, outboundProofType, outboundProofType2 } = VARS

    beforeEach(async function () {
        await deployments.fixture(["test"])

        const _endpoints = await generateEndpoints(chainIds)
        unwiredEndpoints = await Promise.all(
            _endpoints.map(async (endpoint, index) => {
                return await generateVersion(endpoint, chainIds, outboundProofType, true, 1, index === 0)
            })
        )
        wiredEndpoints = await wireEndpoints(unwiredEndpoints)

        for (let e of wiredEndpoints) {
            // UA has ZRO to spend
            await e.lzToken.transfer(e.counterMock.address, zroFee * numOfIncrements * 2)
            // give ultraLightNode allowance to transfer ZRO on the UA behalf
            await callAsContract(e.lzToken, e.counterMock.address, "approve(address,uint256)", [
                e.ultraLightNode.address,
                zroFee * numOfIncrements * 2,
            ])
        }

        // add a new library to different proofs for an application simultaneously
        ;[src, dst] = wiredEndpoints
        // use the validator light version because we are using proofType 1 in the setup version function
        dst.evmValidator = await deployNew("EVMValidator") // both type 1 and 2 are the same impl, but not the same contract
        await dst.ultraLightNode.addInboundProofLibraryForChain(src.chainId, dst.evmValidator.address)
        // note that the library version is incremented, so it doesnt actually reflect the proofType == 2.
        const libraryVersion = await dst.ultraLightNode.maxInboundProofLibrary(src.chainId)
        await setInboundProofLibraryVersion(dst.ultraLightNode, dst.lzEndpoint, dst.counterMock, libraryVersion, src.chainId)
        await setOutboundProofType(src.ultraLightNode, src.lzEndpoint, src.counterMock, outboundProofType2, dst.chainId)
    })

    it("incrementCounter() - nonces / counters", async function () {
        for (let i = 1; i <= numOfIncrements; i++) {
            await incrementCounterWithTest(src, dst)
            await incrementCounterWithTest(dst, src)
        }
    })
})
