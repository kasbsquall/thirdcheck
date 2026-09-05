/**
 * Generates a fresh burner wallet for testnet deployment and writes the private key
 * straight into .env. The key is never printed, never copied by hand, and never leaves
 * this machine. Only the public address is shown, which is the part you paste into the
 * faucet.
 *
 *   npx ts-node scripts/new-deployer.ts
 *   npx ts-node scripts/new-deployer.ts --force   # replace an existing key
 *
 * This wallet is for Creditcoin CC3 testnet and Ethereum Sepolia. Never fund it with
 * anything of value and never reuse it anywhere real.
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from "fs";
import { resolve } from "path";

import { ethers } from "ethers";

const ENV_PATH = resolve(__dirname, "..", ".env");
const EXAMPLE_PATH = resolve(__dirname, "..", ".env.example");
const KEY = "DEPLOYER_PRIVATE_KEY";

function main() {
  const force = process.argv.includes("--force");

  if (!existsSync(ENV_PATH)) {
    if (!existsSync(EXAMPLE_PATH)) throw new Error(".env.example is missing, cannot bootstrap .env");
    copyFileSync(EXAMPLE_PATH, ENV_PATH);
    console.log("Created .env from .env.example");
  }

  const original = readFileSync(ENV_PATH, "utf8");
  const existing = original.match(new RegExp(`^${KEY}=(.+)$`, "m"));

  if (existing && existing[1].trim() && !force) {
    const address = new ethers.Wallet(existing[1].trim()).address;
    console.log(`\n  .env already has a ${KEY}.`);
    console.log(`  Its address is ${address}`);
    console.log(`  Run with --force to replace it. The old key will be lost.\n`);
    return;
  }

  // ethers v6 createRandom draws from the platform CSPRNG. No provider is attached here
  // on purpose: this call must never touch the network.
  const wallet = ethers.Wallet.createRandom();

  const line = `${KEY}=${wallet.privateKey}`;
  const updated = new RegExp(`^${KEY}=.*$`, "m").test(original)
    ? original.replace(new RegExp(`^${KEY}=.*$`, "m"), line)
    : `${original.trimEnd()}\n${line}\n`;

  writeFileSync(ENV_PATH, updated, { mode: 0o600 });

  console.log(`\n  New deployer written to .env. The key was not printed anywhere.`);
  console.log(`\n  Address:  ${wallet.address}\n`);
  console.log(`  Fund it:`);
  console.log(`    CC3 testnet CTC  ->  Creditcoin Discord, #token-faucet channel`);
  console.log(`                         /faucet address:${wallet.address}`);
  console.log(`    Sepolia ETH      ->  any Sepolia faucet, same address\n`);
}

main();
