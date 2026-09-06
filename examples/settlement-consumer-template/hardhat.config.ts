import type { HardhatUserConfig } from "hardhat/config";

// Matches ThirdCheck's own build. viaIR is required: EvmV1Decoder unpacks deeply nested bytes[]
// chunks and overflows the stack under the legacy codegen, and Gluwa's own contracts need it too.
const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
};

export default config;
