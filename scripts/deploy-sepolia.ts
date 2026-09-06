/**
 * Deploys the source-chain fixtures on Ethereum Sepolia.
 *
 *   npx hardhat run scripts/deploy-sepolia.ts --network sepolia
 *
 * SourceSettlement is the honest payment contract. ImpostorSettlement is its look-alike:
 * same event signature, same field layout, different address, and it never moves a wei.
 * Writes both addresses back into .env.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

import { ethers, network } from "hardhat";

const ENV_PATH = resolve(__dirname, "..", ".env");

function setEnv(key: string, value: string) {
  if (!existsSync(ENV_PATH)) return;
  const original = readFileSync(ENV_PATH, "utf8");
  const line = `${key}=${value}`;
  const updated = new RegExp(`^${key}=.*$`, "m").test(original)
    ? original.replace(new RegExp(`^${key}=.*$`, "m"), line)
    : `${original.trimEnd()}\n${line}\n`;
  writeFileSync(ENV_PATH, updated, { mode: 0o600 });
}

async function deploy(name: string, envKey: string) {
  const factory = await ethers.getContractFactory(name);
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const receipt = await contract.deploymentTransaction()!.wait();

  console.log(`  ${name}`);
  console.log(`    address:  ${address}`);
  console.log(`    tx:       ${receipt!.hash}`);
  console.log(`    block:    ${receipt!.blockNumber}`);
  console.log(`    gas:      ${receipt!.gasUsed.toString()}`);
  console.log(`    explorer: https://sepolia.etherscan.io/address/${address}\n`);

  setEnv(envKey, address);
  return address;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log(`\n  network:  ${network.name} (chainId ${network.config.chainId})`);
  console.log(`  deployer: ${deployer.address}`);
  console.log(`  balance:  ${ethers.formatEther(balance)} ETH\n`);

  if (balance === 0n) throw new Error("deployer has no funds on Sepolia");

  await deploy("SourceSettlement", "SOURCE_SETTLEMENT_ADDRESS");
  await deploy("ImpostorSettlement", "IMPOSTOR_SETTLEMENT_ADDRESS");

  console.log("  addresses written to .env\n");
}

main().catch((e) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exitCode = 1;
});
