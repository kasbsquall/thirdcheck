/**
 * Deploys the source-chain half of Verified Inflows on Ethereum Sepolia.
 *
 *   npx hardhat run scripts/deploy-inflow-source.ts --network sepolia
 *
 * SourceGateway is where a user locks value naming a Creditcoin beneficiary. Its Deposited event is the
 * fact the InflowConsumer on CC3 verifies through the BlockProver precompile before crediting anyone.
 * Deploys only the gateway, so the existing Sepolia fixtures keep their addresses. Writes
 * SOURCE_GATEWAY_ADDRESS back into .env.
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
  console.log(`  balance:  ${ethers.formatEther(balance)} ETH\n`);
  if (balance === 0n) throw new Error("deployer has no funds on Sepolia");

  const factory = await ethers.getContractFactory("SourceGateway");
  const gateway = await factory.deploy();
  await gateway.waitForDeployment();
  const address = await gateway.getAddress();
  const receipt = await gateway.deploymentTransaction()!.wait();

  console.log(`  SourceGateway`);
  console.log(`    address:  ${address}`);
  console.log(`    tx:       ${receipt!.hash}`);
  console.log(`    block:    ${receipt!.blockNumber}`);
  console.log(`    gas:      ${receipt!.gasUsed.toString()}`);
  console.log(`    explorer: https://sepolia.etherscan.io/address/${address}\n`);

  setEnv("SOURCE_GATEWAY_ADDRESS", address);
  console.log(`  SOURCE_GATEWAY_ADDRESS written to .env\n`);
}

main().catch((e) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exitCode = 1;
});
