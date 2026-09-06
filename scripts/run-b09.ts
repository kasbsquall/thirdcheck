/**
 * Minimal, hang-proof B-09 check against BOTH escrows in one process.
 *
 *   npx hardhat run scripts/run-b09.ts --network cc3
 *
 * Funds the same order on the vulnerable and the hardened escrow, emits ONE source transaction
 * (decoy PaymentSettled logs plus a trailing zero-value log that covers nothing), waits ONCE for
 * that block to be attested, then releases against the same proof on both targets.
 *
 * Expected: the vulnerable escrow releases (it reads only receiptLogs[0], a decoy), the hardened
 * escrow reverts with NoMatchingPayment (no log binds order, recipient and amount). That opposite
 * outcome on identical inputs is the clean B-09 contrast.
 *
 * Every CC3 RPC call is wrapped in a timeout so a stuck node cannot hang the run, which is what
 * turned earlier full-bench reruns into hour-long stalls.
 */
import { writeFileSync } from "fs";
import { resolve } from "path";

import { ethers } from "hardhat";
import * as dotenv from "dotenv";

import { buildProof, resolveSepoliaChainKey, waitUntilAttested } from "../src/proof";

dotenv.config();

const AMOUNT = ethers.parseEther("0.01");
const CALL_TIMEOUT_MS = 60_000;
const RECEIPT_TIMEOUT_MS = 120_000;

function env(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) throw new Error(`${name} not set in .env`);
  return v;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((res, rej) => {
    const t = setTimeout(() => rej(new Error(`${label} timed out after ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); });
  });
}

/** Poll for a receipt with a hard deadline, instead of an un-timeouted tx.wait(). */
async function waitReceipt(provider: ethers.JsonRpcProvider, hash: string, ms: number): Promise<ethers.TransactionReceipt> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    const r = await withTimeout(provider.getTransactionReceipt(hash), CALL_TIMEOUT_MS, "getTransactionReceipt");
    if (r) return r;
    await new Promise((res) => setTimeout(res, 3_000));
  }
  throw new Error(`receipt for ${hash} not mined within ${ms}ms`);
}

function extractRevert(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  const named = /reverted with custom error '([^']*)'/.exec(msg)?.[1];
  if (named) return `reverted: ${named}`;
  const sel = /unknown custom error.*data="?(0x[0-9a-fA-F]{8})/.exec(msg)?.[1];
  if (sel) return `reverted: custom error ${sel}`;
  const reason = /reverted with reason string '([^']*)'/.exec(msg)?.[1];
  if (reason) return `reverted: ${reason}`;
  return msg.split("\n")[0];
}

async function attemptRelease(
  cc3: ethers.JsonRpcProvider,
  escrow: ethers.Contract,
  orderId: string,
  proof: Awaited<ReturnType<typeof buildProof>>
): Promise<{ status: "accepted" | "rejected"; detail: string; tx?: string }> {
  try {
    const tx = await withTimeout(
      escrow.release(orderId, proof.chainKey, proof.height, proof.txBytes, proof.merkle, proof.continuity),
      CALL_TIMEOUT_MS,
      "release send"
    );
    const receipt = await waitReceipt(cc3, tx.hash, RECEIPT_TIMEOUT_MS);
    if (receipt.status === 1) return { status: "accepted", detail: "escrow released against the proof", tx: receipt.hash };
    return { status: "rejected", detail: "release transaction reverted on-chain", tx: receipt.hash };
  } catch (e) {
    return { status: "rejected", detail: extractRevert(e) };
  }
}

async function main() {
  const cc3 = new ethers.JsonRpcProvider(env("CREDITCOIN_RPC_URL"));
  const sepolia = new ethers.JsonRpcProvider(env("SEPOLIA_RPC_URL"));
  const key = env("DEPLOYER_PRIVATE_KEY");
  const cc3Wallet = new ethers.Wallet(key, cc3);
  const sepoliaWallet = new ethers.Wallet(key, sepolia);
  const cc3Sender = new ethers.NonceManager(cc3Wallet);
  const sepoliaSender = new ethers.NonceManager(sepoliaWallet);
  const proverUrl = env("PROOF_BUILDER_URL");
  const chainKey = await resolveSepoliaChainKey(cc3);
  const seller = cc3Wallet.address;
  const sourceAddress = env("SOURCE_SETTLEMENT_ADDRESS");

  const vulnerable = await ethers.getContractAt("VulnerableEscrow", env("VULNERABLE_ESCROW_ADDRESS"), cc3Sender);
  const hardened = await ethers.getContractAt("HardenedEscrow", env("HARDENED_ESCROW_ADDRESS"), cc3Sender);
  const source = await ethers.getContractAt("SourceSettlement", sourceAddress, sepoliaSender);

  const orderId = ethers.id(`b09:${Date.now()}:${Math.random()}`);

  console.log("\n  ThirdCheck — B-09 clean contrast");
  console.log(`  order ${orderId.slice(0, 14)}…  chainKey ${chainKey}\n`);

  console.log("  funding the same order on both escrows");
  const head = await withTimeout(sepolia.getBlockNumber(), CALL_TIMEOUT_MS, "sepolia head");
  await waitReceipt(cc3, (await withTimeout(vulnerable.fund(orderId, seller, { value: AMOUNT }), CALL_TIMEOUT_MS, "vuln fund")).hash, RECEIPT_TIMEOUT_MS);
  await waitReceipt(cc3, (await withTimeout(hardened.fund(orderId, seller, chainKey, sourceAddress, head, head + 5000, { value: AMOUNT }), CALL_TIMEOUT_MS, "hard fund")).hash, RECEIPT_TIMEOUT_MS);

  console.log("  emitting the noisy source transaction (decoys + zero-value log)");
  const src = await (await withTimeout(source.settleNoisy(orderId, seller, 3, { value: 0n }), CALL_TIMEOUT_MS, "settleNoisy")).wait();
  console.log(`  source tx ${src.hash} at block ${src.blockNumber}`);

  console.log(`\n  waiting once for Sepolia block ${src.blockNumber} to be attested`);
  await waitUntilAttested(cc3, chainKey, src.blockNumber);

  console.log("\n  building the proof (shared by both releases)");
  const proof = await buildProof(chainKey, proverUrl, src.hash);

  console.log("\n  releasing against both escrows");
  const vulnOut = await attemptRelease(cc3, vulnerable, orderId, proof);
  console.log(`    vulnerable: ${vulnOut.status} — ${vulnOut.detail}`);
  const hardOut = await attemptRelease(cc3, hardened, orderId, proof);
  console.log(`    hardened:   ${hardOut.status} — ${hardOut.detail}`);

  const clean = vulnOut.status === "accepted" && hardOut.status === "rejected";
  console.log(`\n  B-09 contrast: ${clean ? "CLEAN (vulnerable accepts, hardened rejects)" : "NOT clean — inspect above"}\n`);

  const out = {
    orderId, chainKey, sourceTx: src.hash, sourceBlock: src.blockNumber,
    generatedAt: new Date().toISOString(),
    vulnerable: vulnOut, hardened: hardOut, clean,
  };
  const path = resolve(__dirname, "..", "data", "b09-contrast.json");
  writeFileSync(path, JSON.stringify(out, null, 2));
  console.log(`  written to ${path}\n`);
}

main().catch((e) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exitCode = 1;
});
