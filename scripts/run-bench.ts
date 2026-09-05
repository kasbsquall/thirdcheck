/**
 * Runs the falsifier against a target escrow and prints the findings.
 *
 *   npx hardhat run scripts/run-bench.ts --network cc3                 # vulnerable target
 *   npx hardhat run scripts/run-bench.ts --network cc3 -- --target hardened
 *
 * Against the vulnerable target every attack is expected to be ACCEPTED (vulnerable). Against the
 * hardened target every attack is expected to be REJECTED and the positive path ACCEPTED.
 */
import { writeFileSync } from "fs";
import { resolve } from "path";

import { ethers } from "hardhat";
import * as dotenv from "dotenv";

import {
  attackImpostor,
  attackWrongOrder,
  attackReplay,
  attackReceiptReverted,
  attackNoisyLogs,
  positivePath,
  BenchContext,
  Finding,
} from "../src/bench";
import { resolveSepoliaChainKey } from "../src/proof";

dotenv.config();

const AMOUNT = ethers.parseEther("0.01"); // escrow per order, in CTC

function env(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) throw new Error(`${name} not set in .env`);
  return v;
}

async function main() {
  const idx = process.argv.indexOf("--target");
  const target = idx >= 0 ? process.argv[idx + 1] : "vulnerable";
  const hardened = target === "hardened";
  const escrowEnv = hardened ? "HARDENED_ESCROW_ADDRESS" : "VULNERABLE_ESCROW_ADDRESS";

  const cc3 = new ethers.JsonRpcProvider(env("CREDITCOIN_RPC_URL"));
  const sepolia = new ethers.JsonRpcProvider(env("SEPOLIA_RPC_URL"));
  const key = env("DEPLOYER_PRIVATE_KEY");
  const cc3Signer = new ethers.Wallet(key, cc3);
  const sepoliaSigner = new ethers.Wallet(key, sepolia);
  const proverUrl = env("PROOF_BUILDER_URL");
  const chainKey = await resolveSepoliaChainKey(cc3);

  const escrow = await ethers.getContractAt(hardened ? "HardenedEscrow" : "VulnerableEscrow", env(escrowEnv), cc3Signer);
  const sourceAddress = env("SOURCE_SETTLEMENT_ADDRESS");
  const source = await ethers.getContractAt("SourceSettlement", sourceAddress, sepoliaSigner);
  const impostor = await ethers.getContractAt("ImpostorSettlement", env("IMPOSTOR_SETTLEMENT_ADDRESS"), sepoliaSigner);

  const ctx: BenchContext = {
    cc3, sepolia, cc3Signer, sepoliaSigner, proverUrl, chainKey,
    escrow, escrowIsHardened: hardened, source, sourceAddress, impostor,
  };

  console.log(`\n  ThirdCheck falsifier`);
  console.log(`  target: ${target} escrow at ${await escrow.getAddress()}`);
  console.log(`  source chain: Sepolia (chainKey ${chainKey})\n`);

  const findings: Finding[] = [];
  const steps: [string, (c: BenchContext, a: bigint) => Promise<Finding>][] = [
    ["[B-01] reverted source transaction", attackReceiptReverted],
    ["[B-02] impostor forges the payment event", attackImpostor],
    ["[B-04] one payment replayed onto a second order", attackReplay],
    ["[B-06] genuine payment for a different order", attackWrongOrder],
    ["[B-09] decoy logs before the real one", attackNoisyLogs],
    ["[POS] correct payment (positive path)", positivePath],
  ];

  for (const [label, fn] of steps) {
    console.log(`  ${label} ...`);
    findings.push(await fn(ctx, AMOUNT));
  }

  console.log("\n  Findings\n");
  for (const f of findings) {
    // Positive path is meant to be accepted; attacks accepted means vulnerable.
    const isPositive = f.id === "POS";
    const good = isPositive ? f.status === "accepted" : f.status === "rejected";
    let verdict: string;
    if (f.status === "error") verdict = "ERROR";
    else if (isPositive) verdict = f.status === "accepted" ? "OK" : "BROKEN";
    else verdict = f.status === "accepted" ? "VULNERABLE" : "SAFE";

    console.log(`  ${verdict.padEnd(11)} ${f.id}  ${f.title}`);
    console.log(`              ${f.detail}`);
    if (f.sourceTx) console.log(`              source tx (Sepolia): ${f.sourceTx}`);
    if (f.evidenceTx) console.log(`              release tx (CC3):    ${f.evidenceTx}`);
    console.log();
    void good;
  }

  const report = {
    target,
    escrow: await escrow.getAddress(),
    chainKey,
    generatedAt: new Date().toISOString(),
    findings,
  };
  const path = resolve(__dirname, "..", "data", `bench-${target}.json`);
  writeFileSync(path, JSON.stringify(report, null, 2));
  console.log(`  report written to ${path}\n`);
}

main().catch((e) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exitCode = 1;
});
