const { generateEndpoints, generateVersion, wireEndpoints, getPairs, incrementCounterWithTest, callAsContract } = require("./util/helpers")
const { VARS } = require("./util/constants")

describe("Profile:", function () {
    let chainIds = [1, 2, 3]
    let numOfIncrements = 10 // increase this to increase the scaling
    let unwiredEndpoints, wiredEndpoints
    let { zroFee, outboundProofType } = VARS

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
    })

    it("incrementCounter() - nonces / counters", async function () {
        for (let i = 1; i <= numOfIncrements; i++) {
            for (let [indexA, indexB] of getPairs(chainIds.length)) {
                await incrementCounterWithTest(wiredEndpoints[indexA], wiredEndpoints[indexB])
            }
        }
    })
})
