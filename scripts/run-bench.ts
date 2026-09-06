/**
 * Runs the falsifier against a target escrow in two phases, so the attestation frontier is waited
 * on once, not once per attack.
 *
 *   npx hardhat run scripts/run-bench.ts --network cc3                 # vulnerable target
 *   npx hardhat run scripts/run-bench.ts --network cc3 -- --target hardened
 *
 * Phase one emits all source transactions and funds all orders. Then it waits once for the highest
 * source block to be attested. Phase two proves and releases everything.
 */
import { writeFileSync } from "fs";
import { resolve } from "path";

import { ethers } from "hardhat";
import * as dotenv from "dotenv";

import { PREPARERS, BenchContext, Finding, PreparedAttack } from "../src/bench";
import { resolveSepoliaChainKey, waitUntilAttested } from "../src/proof";

dotenv.config();

const AMOUNT = ethers.parseEther("0.01"); // escrow per order, in CTC

function env(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) throw new Error(`${name} not set in .env`);
  return v;
}

async function main() {
  // Hardhat 2.x swallows extra CLI args, so the target comes from an env var (with an argv
  // fallback for direct ts-node use): BENCH_TARGET=hardened npx hardhat run ...
  const idx = process.argv.indexOf("--target");
  const target = process.env.BENCH_TARGET ?? (idx >= 0 ? process.argv[idx + 1] : "vulnerable");
  const hardened = target === "hardened";
  const escrowEnv = hardened ? "HARDENED_ESCROW_ADDRESS" : "VULNERABLE_ESCROW_ADDRESS";

  const cc3 = new ethers.JsonRpcProvider(env("CREDITCOIN_RPC_URL"));
  const sepolia = new ethers.JsonRpcProvider(env("SEPOLIA_RPC_URL"));
  const key = env("DEPLOYER_PRIVATE_KEY");
  const cc3Wallet = new ethers.Wallet(key, cc3);
  const sepoliaWallet = new ethers.Wallet(key, sepolia);
  // Contracts send through a NonceManager so the many sequential txs from one key cannot collide
  // on a nonce when an RPC ack is slow (REPLACEMENT_UNDERPRICED). The plain wallets are kept for
  // their synchronous .address.
  const cc3Sender = new ethers.NonceManager(cc3Wallet);
  const sepoliaSender = new ethers.NonceManager(sepoliaWallet);
  const proverUrl = env("PROOF_BUILDER_URL");
  const chainKey = await resolveSepoliaChainKey(cc3);

  const escrow = await ethers.getContractAt(hardened ? "HardenedEscrow" : "VulnerableEscrow", env(escrowEnv), cc3Sender);
  const sourceAddress = env("SOURCE_SETTLEMENT_ADDRESS");
  const source = await ethers.getContractAt("SourceSettlement", sourceAddress, sepoliaSender);
  const impostor = await ethers.getContractAt("ImpostorSettlement", env("IMPOSTOR_SETTLEMENT_ADDRESS"), sepoliaSender);

  const ctx: BenchContext = {
    cc3, sepolia, cc3Signer: cc3Wallet, sepoliaSigner: sepoliaWallet, proverUrl, chainKey,
    escrow, escrowIsHardened: hardened, source, sourceAddress, impostor,
  };

  console.log(`\n  ThirdCheck falsifier`);
  console.log(`  target: ${target} escrow at ${await escrow.getAddress()}`);
  console.log(`  source chain: Sepolia (chainKey ${chainKey})\n`);

  // Phase one: emit all source txs and fund all orders, sequentially (one key, ordered nonces).
  console.log("  phase 1 — emitting source transactions and funding orders");
  const prepared: PreparedAttack[] = [];
  for (const prepare of PREPARERS) {
    const p = await prepare(ctx, AMOUNT);
    console.log(`    ${p.id} ready  (source block ${p.maxHeight}${p.sourceTx ? `, ${p.sourceTx.slice(0, 12)}…` : ""})`);
    prepared.push(p);
  }

  const maxHeight = Math.max(...prepared.map((p) => p.maxHeight));
  console.log(`\n  phase 1.5 — waiting once for Sepolia block ${maxHeight} to be attested`);
  await waitUntilAttested(cc3, chainKey, maxHeight);

  // Phase two: prove and release everything. Blocks are attested, so proofs come back fast.
  console.log("\n  phase 2 — proving and releasing");
  const findings: Finding[] = [];
  for (const p of prepared) {
    const f = await p.finalize();
    findings.push(f);
    console.log(`    ${f.id} ${f.status}`);
  }

  console.log("\n  Findings\n");
  for (const f of findings) {
    const isPositive = f.id === "POS";
    let verdict: string;
    if (f.status === "error") verdict = "ERROR";
    else if (isPositive) verdict = f.status === "accepted" ? "OK" : "BROKEN";
    else verdict = f.status === "accepted" ? "VULNERABLE" : "SAFE";

    console.log(`  ${verdict.padEnd(11)} ${f.id}  ${f.title}`);
    console.log(`              ${f.detail}`);
    if (f.sourceTx) console.log(`              source tx (Sepolia): ${f.sourceTx}`);
    if (f.evidenceTx) console.log(`              release tx (CC3):    ${f.evidenceTx}`);
    console.log();
  }

  const report = { target, escrow: await escrow.getAddress(), chainKey, generatedAt: new Date().toISOString(), findings };
  const path = resolve(__dirname, "..", "data", `bench-${target}.json`);
  writeFileSync(path, JSON.stringify(report, null, 2));
  console.log(`  report written to ${path}\n`);
}

main().catch((e) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exitCode = 1;
});
