/**
 * Deploys the reference adopter (CreditLineApp) on CC3 testnet and records it as a verified app.
 *
 *   npx hardhat run scripts/deploy-adopter.ts --network cc3
 *
 * CreditLineApp is a distinct product built on ThirdCheckLib: a cross-chain credit line that opens once
 * an inbound collateral deposit is proven by the third check. Reads SOURCE_GATEWAY_ADDRESS, pins the app
 * to Sepolia's chainKey and that gateway, and writes CREDIT_LINE_APP_ADDRESS back into .env.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";

import { resolveSepoliaChainKey } from "../src/proof";

dotenv.config();

const ENV_PATH = resolve(__dirname, "..", ".env");
const EXPLORER = "https://creditcoin-testnet.blockscout.com/address/";

function setEnv(key: string, value: string) {
  if (!existsSync(ENV_PATH)) return;
  const original = readFileSync(ENV_PATH, "utf8");
  const line = `${key}=${value}`;
  const updated = new RegExp(`^${key}=.*$`, "m").test(original)
    ? original.replace(new RegExp(`^${key}=.*$`, "m"), line)
    : `${original.trimEnd()}\n${line}\n`;
  writeFileSync(ENV_PATH, updated, { mode: 0o600 });
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`\n  network:  ${network.name} (chainId ${network.config.chainId})`);
  console.log(`  deployer: ${deployer.address}`);
  console.log(`  balance:  ${ethers.formatEther(balance)}\n`);
  if (balance === 0n) throw new Error("deployer has no funds");

  const gateway = process.env.SOURCE_GATEWAY_ADDRESS;
  if (!gateway?.trim()) throw new Error("SOURCE_GATEWAY_ADDRESS not set; run deploy-inflow-source.ts first");

  const cc3 = new ethers.JsonRpcProvider(process.env.CREDITCOIN_RPC_URL);
  const chainKey = await resolveSepoliaChainKey(cc3);
  console.log(`  expected source: ${gateway} (Sepolia, chainKey ${chainKey})`);

  const Factory = await ethers.getContractFactory("CreditLineApp");
  const app = await Factory.deploy(chainKey, gateway);
  await app.waitForDeployment();
  const addr = await app.getAddress();
  console.log(`  CreditLineApp:   ${addr}`);
  console.log(`    ${EXPLORER}${addr}`);

  const registryAddr = process.env.VERIFIED_REGISTRY_ADDRESS;
  if (registryAddr && (await ethers.provider.getCode(registryAddr)) !== "0x") {
    const registry = await ethers.getContractAt("VerifiedRegistry", registryAddr, deployer);
    const v = await registry.verify(addr, 10000, ethers.encodeBytes32String("tc-v3"));
    await v.wait();
    console.log(`  recorded as a verified app in the registry (score 10000)`);
  } else {
    console.log(`  (skipped registry record: VERIFIED_REGISTRY_ADDRESS not set or has no code)`);
  }

  setEnv("CREDIT_LINE_APP_ADDRESS", addr);
  console.log(`\n  CREDIT_LINE_APP_ADDRESS written to .env\n`);
}

main().catch((e) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exitCode = 1;
});
