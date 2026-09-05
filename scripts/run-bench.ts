/**
 * Runs the falsifier against a target escrow and prints the findings.
 *
 *   npx hardhat run scripts/run-bench.ts --network cc3
 *
 * Defaults to the vulnerable target in .env. Pass --target hardened to run against
 * HARDENED_ESCROW_ADDRESS instead, where every attack is expected to be rejected.
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

import { ethers } from "hardhat";
import * as dotenv from "dotenv";

import { attackImpostor, attackWrongOrder, attackReplay, BenchContext, Finding } from "../src/bench";
import { resolveSepoliaChainKey } from "../src/proof";

dotenv.config();

const ONE_HUNDREDTH = ethers.parseEther("0.01"); // escrow amount per order, in CTC

function env(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) throw new Error(`${name} not set in .env`);
  return v;
}

async function main() {
  const targetArg = process.argv.includes("--target")
    ? process.argv[process.argv.indexOf("--target") + 1]
    : "vulnerable";
  const escrowEnv = targetArg === "hardened" ? "HARDENED_ESCROW_ADDRESS" : "VULNERABLE_ESCROW_ADDRESS";

  const cc3 = new ethers.JsonRpcProvider(env("CREDITCOIN_RPC_URL"));
  const sepolia = new ethers.JsonRpcProvider(env("SEPOLIA_RPC_URL"));
  const key = env("DEPLOYER_PRIVATE_KEY");
  const cc3Signer = new ethers.Wallet(key, cc3);
  const sepoliaSigner = new ethers.Wallet(key, sepolia);
  const proverUrl = env("PROOF_BUILDER_URL");

  const chainKey = await resolveSepoliaChainKey(cc3);

  const escrow = await ethers.getContractAt(
    targetArg === "hardened" ? "HardenedEscrow" : "VulnerableEscrow",
    env(escrowEnv),
    cc3Signer
  );
  const source = await ethers.getContractAt("SourceSettlement", env("SOURCE_SETTLEMENT_ADDRESS"), sepoliaSigner);
  const impostor = await ethers.getContractAt("ImpostorSettlement", env("IMPOSTOR_SETTLEMENT_ADDRESS"), sepoliaSigner);

  const ctx: BenchContext = { cc3, sepolia, cc3Signer, sepoliaSigner, proverUrl, chainKey, escrow, source, impostor };

  console.log(`\n  ThirdCheck falsifier`);
  console.log(`  target: ${targetArg} escrow at ${await escrow.getAddress()}`);
  console.log(`  source chain: Sepolia (chainKey ${chainKey})\n`);

  const findings: Finding[] = [];

  console.log("  [B-02] impostor contract forges the payment event ...");
  findings.push(await attackImpostor(ctx, ONE_HUNDREDTH));

  console.log("  [B-06] genuine payment for a different order ...");
  findings.push(await attackWrongOrder(ctx, ONE_HUNDREDTH));

  console.log("  [B-04] one payment replayed onto a second order ...");
  findings.push(await attackReplay(ctx, ONE_HUNDREDTH));

  console.log("\n  Findings\n");
  for (const f of findings) {
    const vulnerable = f.status === f.vulnerableWhen;
    const verdict = f.status === "error" ? "ERROR" : vulnerable ? "VULNERABLE" : "SAFE";
    console.log(`  ${verdict.padEnd(11)} ${f.id}  ${f.title}`);
    console.log(`              ${f.detail}`);
    if (f.sourceTx) console.log(`              source tx (Sepolia): ${f.sourceTx}`);
    if (f.evidenceTx) console.log(`              release tx (CC3):    ${f.evidenceTx}`);
    console.log();
  }

  const report = {
    target: targetArg,
    escrow: await escrow.getAddress(),
    chainKey,
    generatedAt: new Date().toISOString(),
    findings,
  };
  const path = resolve(__dirname, "..", "data", `bench-${targetArg}.json`);
  writeFileSync(path, JSON.stringify(report, null, 2));
  console.log(`  report written to ${path}\n`);
}

main().catch((e) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exitCode = 1;
});
