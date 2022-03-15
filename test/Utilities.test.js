const { expect } = require("chai")
const { setupNetwork } = require("@layerzerolabs/core-sdk")

describe("Network Utilities:", function () {
    it("fails if chainId not setup in core-sdk", function () {
        expect(() =>
            setupNetwork(
                {
                    rinkeby: {
                        url: `http://127.0.0.1:8545`,
                        gasMultiplier: 2,
                    },
                },
                [99999]
            )
        ).to.throw("ChainId not setup in core-sdk")
    })

    it("sets hardhat network correctly", function () {
        expect(
            setupNetwork(
                {
                    rinkeby: {
                        url: `http://127.0.0.1:8545`,
                        gasMultiplier: 2,
                    },
                },
                [10001, 20001]
            )
        ).to.deep.equal({
            rinkeby: {
                url: `http://127.0.0.1:8545`,
                accounts: {
                    mnemonic: "test test test test test test test test test test test junk",
                },
                chainId: 4,
                gasMultiplier: 2,
            },
            "rinkeby-sandbox": {
                url: `http://127.0.0.1:8545`,
                accounts: {
                    mnemonic: "test test test test test test test test test test test junk",
                },
                chainId: 4,
                gasMultiplier: 2,
            },
        })
    })
})
