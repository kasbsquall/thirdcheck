/**
 * Deploys the protocol layer to CC3 testnet: VerifiedRegistry (the trust layer) and SettlementHub
 * (the rails), wires the hub to the registry with a verified-operator discount, and verifies the
 * deployed HardenedEscrow as a demo verified consumer so the discount is live on-chain.
 *
 *   npx hardhat run scripts/deploy-protocol.ts --network cc3
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

const FEE_BPS = 25;       // 0.25% protocol fee
const DISCOUNT_BPS = 15;  // verified operators pay 0.10%
const EXPLORER = "https://creditcoin-testnet.blockscout.com/address/";

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`\n  network:  ${network.name} (chainId ${network.config.chainId})`);
  console.log(`  deployer: ${deployer.address}`);
  console.log(`  balance:  ${ethers.formatEther(balance)}\n`);
  if (balance === 0n) throw new Error("deployer has no funds");

  const Registry = await ethers.getContractFactory("VerifiedRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log(`  VerifiedRegistry: ${registryAddr}`);
  console.log(`    ${EXPLORER}${registryAddr}`);

  const Hub = await ethers.getContractFactory("SettlementHub");
  const hub = await Hub.deploy(deployer.address, FEE_BPS);
  await hub.waitForDeployment();
  const hubAddr = await hub.getAddress();
  console.log(`  SettlementHub:    ${hubAddr}`);
  console.log(`    ${EXPLORER}${hubAddr}`);

  const cfg = await hub.setConfig(deployer.address, FEE_BPS, DISCOUNT_BPS, registryAddr);
  await cfg.wait();
  console.log(`  wired hub -> registry, fee ${FEE_BPS} bps, verified discount ${DISCOUNT_BPS} bps`);

  // Verify a real deployed consumer as a demo, so the discount is exercisable on-chain.
  const consumer = process.env.HARDENED_ESCROW_ADDRESS;
  if (consumer && (await ethers.provider.getCode(consumer)) !== "0x") {
    const v = await registry.verify(consumer, 10000, ethers.encodeBytes32String("tc-v3"));
    await v.wait();
    console.log(`  verified consumer ${consumer} (score 10000)`);
    const amt = ethers.parseEther("1");
    console.log(`    quoteFee verified:   ${ethers.formatEther(await hub.quoteFee(consumer, amt))} per 1.0`);
    console.log(`    quoteFee unverified: ${ethers.formatEther(await hub.quoteFee(deployer.address, amt))} per 1.0`);
  } else {
    console.log(`  (skipped demo verify: HARDENED_ESCROW_ADDRESS not set or has no code)`);
  }

  setEnv("VERIFIED_REGISTRY_ADDRESS", registryAddr);
  setEnv("SETTLEMENT_HUB_ADDRESS", hubAddr);
  console.log(`\n  addresses written to .env\n`);
}

main().catch((e) => { console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`); process.exitCode = 1; });
