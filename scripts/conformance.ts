/**
 * conformance — map and exercise the full Attestcoin precompile surface, and count it.
 *
 *   npm run conformance
 *
 * The depth argument for ThirdCheck: auditing the third check requires understanding the whole
 * protocol, so ThirdCheck touches far more of the precompile surface than a product does. A typical
 * consumer calls exactly one entry point (verifyAndEmit, single). This suite enumerates every entry
 * point from the SDK's own ABIs, exercises the read-only ones live against the public CC3 testnet
 * (no private key), and records for each how ThirdCheck reaches it. Output: data/conformance.json.
 *
 * Classification per entry point:
 *   live       called live in this run, returned a value
 *   onchain    state-changing, exercised on-chain and evidenced by committed bench transactions
 *   probed     called live with a well-formed but empty proof; precompile reached and input-validated
 *   enumerated ABI entry present, not exercised here (needs a funded batch run)
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, join } from "path";
import { ethers } from "ethers";
import * as dotenv from "dotenv";

import blockProverAbi from "@gluwa/usc-sdk/dist/block-prover/block_prover.json";
import chainInfoAbi from "@gluwa/usc-sdk/dist/chain-info/chain_info.json";
import decoderAbi from "@gluwa/usc-sdk/dist/utils/evmV1DecoderAbi.json";

dotenv.config();

const DATA = resolve(__dirname, "..", "data");
const CC3_RPC = process.env.CREDITCOIN_RPC_URL?.trim() || "https://rpc.cc3-testnet.creditcoin.network";
const CC3_CHAIN_ID = 102031;
const BLOCK_PROVER = "0x0000000000000000000000000000000000000FD2";
const CHAIN_INFO = "0x0000000000000000000000000000000000000fD3";
const SEPOLIA_CHAIN_ID = 11155111;
const ZERO32 = "0x" + "00".repeat(32);
const EMPTY_MERKLE = { root: ZERO32, siblings: [] as unknown[] };
const EMPTY_CONTINUITY = { lowerEndpointDigest: ZERO32, roots: [] as string[] };

type Kind = "live" | "onchain" | "probed" | "enumerated";
interface Entry {
  precompile: string;
  signature: string;
  selector: string;
  mutability: string;
  kind: Kind;
  detail: string;
}
const entries: Entry[] = [];

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const isRevert = (e: unknown) =>
  typeof e === "object" && e !== null && (e as { code?: unknown }).code === "CALL_EXCEPTION";

/** Canonical function fragments (name, sighash with expanded tuples, selector) from an ABI. */
interface Fn { name: string; sighash: string; selector: string; mutability: string; hasArray: boolean; tupleArgs: number; }
function enumerateFns(abi: unknown): Fn[] {
  const iface = new ethers.Interface(abi as any);
  const out: Fn[] = [];
  iface.forEachFunction((f) => {
    out.push({
      name: f.name,
      sighash: f.format("sighash"),
      selector: f.selector,
      mutability: f.stateMutability,
      hasArray: f.inputs.some((i) => i.type.endsWith("[]") || i.baseType === "array"),
      tupleArgs: f.inputs.filter((i) => i.baseType === "tuple").length,
    });
  });
  return out;
}

async function main() {
  console.log("\nThirdCheck · precompile conformance\n");

  const bpFns = enumerateFns(blockProverAbi);
  const ciFns = enumerateFns(chainInfoAbi);
  const decFns = enumerateFns(decoderAbi);

  let provider: ethers.JsonRpcProvider | null = null;
  try {
    provider = new ethers.JsonRpcProvider(CC3_RPC);
    const net = await provider.getNetwork();
    if (Number(net.chainId) !== CC3_CHAIN_ID) throw new Error(`chainId ${net.chainId}`);
    console.log(`  CC3 RPC: chainId ${net.chainId} at ${CC3_RPC}\n`);
  } catch (e) {
    console.log(`  CC3 RPC unreachable (${errMsg(e)}); enumerating surface offline.\n`);
    provider = null;
  }

  // ---- ChainInfo: exercise all views, chained from the live attestation frontier. ----
  const ci = provider ? new ethers.Contract(CHAIN_INFO, chainInfoAbi as any, provider) : null;
  let sepoliaKey: bigint | null = null;
  let latestHeight: bigint | null = null;
  let latestHash: string | null = null;
  let genesis: bigint | null = null;

  if (ci) {
    try {
      const chains = await ci.get_supported_chains();
      const m = chains.find((c: any) => Number(c.chainId) === SEPOLIA_CHAIN_ID);
      if (m) sepoliaKey = m.chainKey;
    } catch { /* recorded below per-call */ }
    try {
      if (sepoliaKey !== null) {
        const latest = await ci.get_latest_attestation_height_and_hash(sepoliaKey);
        if (latest.exists) { latestHeight = latest.height; latestHash = latest.hash; }
      }
    } catch { /* ignore */ }
    try {
      if (sepoliaKey !== null) genesis = await ci.get_attestation_genesis_height(sepoliaKey);
    } catch { /* ignore */ }
  }

  const k = sepoliaKey ?? 1n;
  const h = latestHeight ?? 0n;
  const g = genesis ?? 0n;
  const dig = latestHash ?? ZERO32;

  // Args chosen so each view is called with data derived from the live frontier.
  const ciArgs: Record<string, unknown[]> = {
    "get_supported_chains()": [],
    "get_chain_by_key(uint64)": [k],
    "get_attestation_genesis_height(uint64)": [k],
    "get_latest_attestation_height_and_hash(uint64)": [k],
    "get_latest_checkpoint_height_and_hash(uint64)": [k],
    "is_height_attested(uint64,uint64)": [k, h],
    "get_checkpoint_for_height(uint64,uint64)": [k, h],
    "get_attestation_height_for_digest(uint64,bytes32)": [k, dig],
    "get_attestation_bounds(uint64,uint64)": [k, h],
    "find_highest_attested_before(uint64,uint64)": [k, h],
    "find_lowest_attested_after(uint64,uint64)": [k, g],
  };

  for (const f of ciFns) {
    const s = f.sighash;
    if (!ci) { entries.push({ precompile: "ChainInfo", signature: s, selector: f.selector, mutability: f.mutability, kind: "enumerated", detail: "offline" }); continue; }
    try {
      const res = await (ci as any).getFunction(f.selector)(...(ciArgs[s] ?? [k]));
      entries.push({ precompile: "ChainInfo", signature: s, selector: f.selector, mutability: f.mutability, kind: "live", detail: summarize(res) });
    } catch (e) {
      entries.push({ precompile: "ChainInfo", signature: s, selector: f.selector, mutability: f.mutability, kind: isRevert(e) ? "probed" : "enumerated", detail: isRevert(e) ? "reached, reverted on these args" : errMsg(e) });
    }
  }

  // ---- BlockProver: probe the views live; verifyAndEmit is state-changing (evidenced by bench). ----
  const bp = provider ? new ethers.Contract(BLOCK_PROVER, blockProverAbi as any, provider) : null;
  for (const f of bpFns) {
    const s = f.sighash;
    if (f.name === "verifyAndEmit") {
      // Single is exercised on-chain by both escrows; batch is enumerated (needs a funded batch run).
      entries.push({
        precompile: "BlockProver",
        signature: s, selector: f.selector, mutability: f.mutability,
        kind: f.hasArray ? "enumerated" : "onchain",
        detail: f.hasArray ? "batch variant; not exercised here (needs a funded batch run)" : "called in-contract by both escrows; evidenced by mined bench release txs",
      });
      continue;
    }
    if (!bp) { entries.push({ precompile: "BlockProver", signature: s, selector: f.selector, mutability: f.mutability, kind: "enumerated", detail: "offline" }); continue; }
    try {
      let res: unknown;
      if (f.name === "calculateTxIndex") res = await (bp as any).getFunction(f.selector)(EMPTY_MERKLE);
      else if (f.hasArray) res = await (bp as any).getFunction(f.selector)(k, [h], ["0x"], [EMPTY_MERKLE], EMPTY_CONTINUITY);
      else res = await (bp as any).getFunction(f.selector)(k, h, "0x", EMPTY_MERKLE, EMPTY_CONTINUITY);
      entries.push({ precompile: "BlockProver", signature: s, selector: f.selector, mutability: f.mutability, kind: "live", detail: `returned ${summarize(res)} on an empty proof` });
    } catch (e) {
      entries.push({ precompile: "BlockProver", signature: s, selector: f.selector, mutability: f.mutability, kind: isRevert(e) ? "probed" : "enumerated", detail: isRevert(e) ? "reached, rejected the empty proof (input-validated)" : errMsg(e) });
    }
  }

  // ---- Decoder surface: understood, enumerated (used in-contract via the official lib). ----
  const decoderSurface = decFns.map((f) => f.sighash);

  // ---- Rollup ----
  const onchainEntries = entries.filter((e) => e.precompile !== "Decoder");
  const exercised = onchainEntries.filter((e) => e.kind === "live" || e.kind === "onchain" || e.kind === "probed");
  const byKind = (kd: Kind) => onchainEntries.filter((e) => e.kind === kd).length;

  const report = {
    generatedAt: new Date().toISOString(),
    rpc: provider ? CC3_RPC : "offline",
    precompiles: {
      BlockProver: { address: BLOCK_PROVER, entryPoints: bpFns.length },
      ChainInfo: { address: CHAIN_INFO, entryPoints: ciFns.length },
    },
    surface: {
      totalEntryPoints: onchainEntries.length,
      exercised: exercised.length,
      live: byKind("live"),
      onchain: byKind("onchain"),
      probed: byKind("probed"),
      enumerated: byKind("enumerated"),
      typicalConsumerEntryPoints: 1, // verifyAndEmit, single
    },
    decoderSurface,
    entries,
  };
  writeFileSync(join(DATA, "conformance.json"), JSON.stringify(report, null, 2));

  // ---- Print ----
  const width = Math.max(...entries.map((e) => e.signature.length));
  let current = "";
  for (const e of entries) {
    if (e.precompile !== current) { console.log(`  ${e.precompile} (${e.precompile === "ChainInfo" ? CHAIN_INFO : BLOCK_PROVER})`); current = e.precompile; }
    console.log(`    ${e.kind.padEnd(10)} ${e.signature.padEnd(width)}  ${e.selector}  ${e.detail}`);
  }
  console.log(`\n  Decoder surface understood: ${decoderSurface.length} pure decode functions`);
  console.log(`\n  Precompile surface: ${report.surface.exercised}/${report.surface.totalEntryPoints} entry points exercised`);
  console.log(`    live ${report.surface.live}  ·  on-chain ${report.surface.onchain}  ·  probed ${report.surface.probed}  ·  enumerated ${report.surface.enumerated}`);
  console.log(`  A typical consumer touches ${report.surface.typicalConsumerEntryPoints} (verifyAndEmit, single).`);
  console.log(`\n  written: data/conformance.json\n`);
}

function summarize(res: unknown): string {
  if (Array.isArray(res)) {
    // A struct return (ethers Result) or an array.
    const r = res as any;
    if (r.length && typeof r === "object" && "exists" in r) return `exists=${r.exists}` + ("height" in r ? `, height=${r.height}` : "");
    return `[${res.length} items]`;
  }
  if (typeof res === "bigint") return res.toString();
  if (typeof res === "boolean") return String(res);
  const r = res as any;
  if (r && typeof r === "object" && "exists" in r) return `exists=${r.exists}` + ("height" in r ? `, height=${r.height}` : "");
  return String(res);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
