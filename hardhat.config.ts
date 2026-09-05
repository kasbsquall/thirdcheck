import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const { DEPLOYER_PRIVATE_KEY, CREDITCOIN_RPC_URL, SEPOLIA_RPC_URL } = process.env;

// Only pass accounts when a key is actually present. An empty array keeps Hardhat from
// throwing at config load, which is what lets `check-setup` run before funds exist.
const accounts = DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    cc3: {
      url: CREDITCOIN_RPC_URL ?? "https://rpc.cc3-testnet.creditcoin.network",
      chainId: 102031,
      accounts,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL ?? "",
      chainId: 11155111,
      accounts,
    },
  },
};

export default config;
