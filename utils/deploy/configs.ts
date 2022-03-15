import { ChainId } from "@layerzerolabs/core-sdk"
import { LzConfigType } from "./configTypes"
import { LzConfig as SandboxLzConfig } from "./sandboxConfig"
import { LzConfig as TestnetLzConfig } from "./testnetConfig"
import _ from "lodash"

export const LZ_CONFIG: { [chain in ChainId]?: LzConfigType } = _.merge(SandboxLzConfig, TestnetLzConfig)
