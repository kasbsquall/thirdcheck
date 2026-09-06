/**
 * Generates a counterparty wallet and a distinct seller address, funds the counterparty on both
 * chains from the deployer, and writes the keys to the scratchpad (NOT committed) so the
 * external-counterparty settlement can run with three distinct parties. Testnet only.
 *
 *   COUNTERPARTY_OUT=/abs/path/counterparty.json npx hardhat run scripts/fund-counterparty.ts --network cc3
 */
import { writeFileSync } from "fs";
import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

const CTC_FUND = ethers.parseEther("0.5");     // covers order value 0.001 + gas on CC3
const SEP_FUND = ethers.parseEther("0.01");    // covers source payment 0.001 + gas on Sepolia

function env(n: string): string { const v = process.env[n]; if (!v?.trim()) throw new Error(`${n} not set`); return v; }

async function main() {
  const out = env("COUNTERPARTY_OUT");
  const cc3 = new ethers.JsonRpcProvider(env("CREDITCOIN_RPC_URL"));
  const sep = new ethers.JsonRpcProvider(env("SEPOLIA_RPC_URL"));
  const depCc3 = new ethers.NonceManager(new ethers.Wallet(env("DEPLOYER_PRIVATE_KEY"), cc3));
  const depSep = new ethers.NonceManager(new ethers.Wallet(env("DEPLOYER_PRIVATE_KEY"), sep));

  const counterparty = ethers.Wallet.createRandom();
  const seller = ethers.Wallet.createRandom();
  console.log(`\n  counterparty (operator+payer): ${counterparty.address}`);
  console.log(`  seller:                        ${seller.address}\n`);

  console.log(`  funding counterparty ${ethers.formatEther(CTC_FUND)} CTC on CC3 ...`);
  await (await depCc3.sendTransaction({ to: counterparty.address, value: CTC_FUND })).wait();
  console.log(`  funding counterparty ${ethers.formatEther(SEP_FUND)} ETH on Sepolia ...`);
  await (await depSep.sendTransaction({ to: counterparty.address, value: SEP_FUND })).wait();

  writeFileSync(out, JSON.stringify({
    counterpartyKey: counterparty.privateKey,
    counterpartyAddr: counterparty.address,
    sellerAddr: seller.address,
    fundedCtc: ethers.formatEther(CTC_FUND),
    fundedSepolia: ethers.formatEther(SEP_FUND),
    generatedAt: new Date().toISOString(),
  }, null, 2), { mode: 0o600 });
  console.log(`\n  keys written to ${out}\n`);
}

main().catch((e) => { console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`); process.exitCode = 1; });
