/**
 * Deploys the Creditcoin-side fixtures.
 *
 *   npx hardhat run scripts/deploy-cc3.ts --network cc3
 *
 * Writes the resulting addresses back into .env so the falsifier can find them.
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

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log(`\n  network:  ${network.name} (chainId ${network.config.chainId})`);
  console.log(`  deployer: ${deployer.address}`);
  console.log(`  balance:  ${ethers.formatEther(balance)}\n`);

  if (balance === 0n) throw new Error("deployer has no funds on this network");

  const factory = await ethers.getContractFactory("VulnerableEscrow");
  const escrow = await factory.deploy();
  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  const receipt = await escrow.deploymentTransaction()!.wait();

  console.log(`  VulnerableEscrow deployed`);
  console.log(`    address: ${address}`);
  console.log(`    tx:      ${receipt!.hash}`);
  console.log(`    block:   ${receipt!.blockNumber}`);
  console.log(`    gas:     ${receipt!.gasUsed.toString()}`);
  console.log(`    explorer: https://creditcoin-testnet.blockscout.com/address/${address}\n`);

  setEnv("VULNERABLE_ESCROW_ADDRESS", address);
  console.log(`  VULNERABLE_ESCROW_ADDRESS written to .env\n`);
}

main().catch((e) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exitCode = 1;
});
