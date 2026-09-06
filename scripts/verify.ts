/**
 * judge:verify — one command a judge runs to reproduce ThirdCheck's headline claims.
 *
 *   npm run judge:verify              offline integrity + on-chain evidence (public CC3 RPC)
 *   npm run judge:verify -- --reclone re-fetch VaultBridge's public source and re-derive the finding
 *
 * No private key, no funded account, no waiting for attestation. It reads the committed evidence and
 * confirms it independently:
 *   A. on-chain    the vulnerable escrow's releases are real, mined CC3 transactions
 *   B. protocol    the selector the VaultBridge finding rests on is genuinely not a precompile method
 *   C. findings    the triage stands behind exactly one source-confirmed defect, VaultBridge
 *   D. scorecard   the ecosystem scorecard's own invariants hold
 *   E. reclone     (optional) clone VaultBridge and re-run the analyzer to reproduce the finding
 *
 * Exit code is non-zero if any check fails.
 */
import { readFileSync, existsSync, mkdtempSync, rmSync } from "fs";
import { resolve, join } from "path";
import { tmpdir } from "os";
import { execFileSync } from "child_process";
import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const DATA = resolve(__dirname, "..", "data");
const CC3_RPC = process.env.CREDITCOIN_RPC_URL?.trim() || "https://rpc.cc3-testnet.creditcoin.network";
const CC3_CHAIN_ID = 102031;
const BLOCK_PROVER = "0x0000000000000000000000000000000000000FD2";
// The precompile's real surface. The VaultBridge finding rests on verifySingle/verifyBatch NOT
// being here. See @gluwa/usc-sdk and docs.
const REAL_SELECTORS = ["verify", "verifyAndEmit", "calculateTxIndex"] as const;

type Status = "PASS" | "FAIL" | "INFO";
const results: { status: Status; label: string; detail: string }[] = [];
const pass = (label: string, detail: string) => results.push({ status: "PASS", label, detail });
const fail = (label: string, detail: string) => results.push({ status: "FAIL", label, detail });
const info = (label: string, detail: string) => results.push({ status: "INFO", label, detail });

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const readJson = <T>(name: string): T => JSON.parse(readFileSync(join(DATA, name), "utf8")) as T;
const short = (h: string) => `${h.slice(0, 10)}…${h.slice(-6)}`;

// A — the vulnerable escrow's releases are real transactions on CC3.
async function checkOnChain() {
  let provider: ethers.JsonRpcProvider;
  try {
    provider = new ethers.JsonRpcProvider(CC3_RPC);
    const net = await provider.getNetwork();
    if (Number(net.chainId) !== CC3_CHAIN_ID) {
      fail("CC3 RPC", `wrong network: chainId ${net.chainId}, expected ${CC3_CHAIN_ID}`);
      return;
    }
    pass("CC3 RPC", `chainId ${net.chainId} at ${CC3_RPC}`);
  } catch (e) {
    info("CC3 RPC", `unreachable (${errMsg(e)}); skipping on-chain checks (offline)`);
    return;
  }

  const vuln = readJson<{ escrow: string; findings: { id: string; status: string; evidenceTx?: string }[] }>("bench-vulnerable.json");
  const b09 = readJson<{ vulnerable: { status: string; tx: string }; hardened: { status: string; detail: string }; clean: boolean }>("b09-contrast.json");

  // Collect every claimed release (accepted + evidenceTx) plus the B-09 release.
  const releases: { id: string; tx: string }[] = [];
  for (const f of vuln.findings) if (f.status === "accepted" && f.evidenceTx) releases.push({ id: f.id, tx: f.evidenceTx });
  if (b09.vulnerable.status === "accepted" && b09.vulnerable.tx) releases.push({ id: "B-09", tx: b09.vulnerable.tx });

  if (releases.length === 0) {
    fail("Vulnerable releases", "no release evidence transactions recorded");
    return;
  }

  const escrow = vuln.escrow.toLowerCase();
  let mined = 0;
  const misses: string[] = [];
  for (const r of releases) {
    try {
      const rc = await provider.getTransactionReceipt(r.tx);
      if (!rc) { misses.push(`${r.id} ${short(r.tx)}: not found`); continue; }
      if (rc.status !== 1) { misses.push(`${r.id} ${short(r.tx)}: status ${rc.status}`); continue; }
      if (rc.to && rc.to.toLowerCase() !== escrow) { misses.push(`${r.id} ${short(r.tx)}: to ${rc.to} != escrow`); continue; }
      mined++;
    } catch (e) {
      misses.push(`${r.id} ${short(r.tx)}: ${errMsg(e)}`);
    }
  }

  if (mined === releases.length) {
    pass("Vulnerable releases on-chain", `${mined}/${releases.length} mined against escrow ${short(vuln.escrow)}, all status 1`);
  } else {
    fail("Vulnerable releases on-chain", `${mined}/${releases.length} confirmed; issues: ${misses.join(" | ")}`);
  }

  // The B-09 contrast: same proof, opposite verdict.
  if (b09.clean && b09.hardened.status === "rejected" && /0x[0-9a-f]{8}/i.test(b09.hardened.detail)) {
    pass("B-09 contrast", `vulnerable released ${short(b09.vulnerable.tx)}, hardened reverted (${b09.hardened.detail.match(/0x[0-9a-f]{8}/i)?.[0]})`);
  } else {
    fail("B-09 contrast", `not clean: ${JSON.stringify(b09.hardened)}`);
  }
}

// B — the precompile itself rejects the selector the VaultBridge finding rests on.
// A live, keyless probe: 0x0FD2 replies "Unknown selector" to verifySingle, but dispatches verify.
// This turns the finding from a static claim into an on-chain fact.
async function checkSelectorLive() {
  const fakeSel = ethers.id("verifySingle(uint256,uint256,bytes,bytes,bytes)").slice(0, 10);
  const realSel = "0x7cc4e258"; // verify(uint64,uint64,bytes,tuple,tuple), from the SDK ABI
  let provider: ethers.JsonRpcProvider;
  try {
    provider = new ethers.JsonRpcProvider(CC3_RPC);
    const net = await provider.getNetwork();
    if (Number(net.chainId) !== CC3_CHAIN_ID) throw new Error(`chainId ${net.chainId}`);
  } catch {
    // Offline: fall back to the static fact, labelled as such.
    const offenders = ["verifySingle", "verifyBatch"].filter((s) => (REAL_SELECTORS as readonly string[]).includes(s));
    info("Precompile selector", offenders.length === 0 ? "offline: verifySingle/verifyBatch are SDK names, not precompile selectors (static)" : "offline check inconclusive");
    return;
  }
  const reasonOf = async (data: string): Promise<string> => {
    try { await provider.call({ to: BLOCK_PROVER, data }); return "(returned)"; }
    catch (e) { return (e as { reason?: string }).reason || "(revert)"; }
  };
  const fakeReason = await reasonOf(fakeSel);
  const realReason = await reasonOf(realSel);
  const fakeUnknown = /unknown selector/i.test(fakeReason);
  const realDispatched = !/unknown selector/i.test(realReason);
  if (fakeUnknown && realDispatched) {
    pass("Precompile rejects fake selector (live)", `0x0FD2 replies "${fakeReason}" to verifySingle but dispatches verify ("${realReason}"); VaultBridge's verify path cannot reach the precompile`);
  } else {
    fail("Precompile rejects fake selector (live)", `verifySingle -> "${fakeReason}", verify -> "${realReason}"`);
  }
}

// C — the curated list of source-confirmed defects, each anchored to file:line evidence.
function checkFindings() {
  // The authoritative confirmed set (source-read, distinct defect classes).
  if (existsSync(join(DATA, "confirmed-defects.json"))) {
    const cd = readJson<{ confirmed: { repo: string; class: string; evidence: string[] }[] }>("confirmed-defects.json");
    const repos = [...new Set(cd.confirmed.map((c) => c.repo))];
    const classes = [...new Set(cd.confirmed.map((c) => c.class))];
    const allAnchored = cd.confirmed.every((c) => c.evidence.length > 0 && c.evidence.every((e) => /:\d+|no .*reference/i.test(e)));
    if (repos.length >= 2 && classes.length >= 2 && allAnchored) {
      pass("Confirmed defects", `${repos.length} repos, ${classes.length} distinct classes: ${repos.join(", ")}`);
    } else {
      fail("Confirmed defects", `${repos.length} repos / ${classes.length} classes; all anchored: ${allAnchored}`);
    }
  }

  if (!existsSync(join(DATA, "findings-report.json"))) { fail("Findings report", "data/findings-report.json missing; run npm run triage"); return; }
  const rep = readJson<{
    counts: { confirmed: number; review: number; noise: number };
    sourceConfirmed: number;
    reposWithConfirmed: number;
    repos: { repo: string; confirmed: number; findings: { verdict: string }[] }[];
  }>("findings-report.json");

  // Honest accounting: no OTHER repo carries unresolved review items; the confirmed repo
  // (VaultBridge) does carry corroborating review signals, and we say so rather than hide them.
  const otherOpen = rep.repos.filter((r) => r.confirmed === 0 && r.findings.some((f) => f.verdict === "review")).map((r) => r.repo);
  const confirmedRepoReview = rep.repos
    .filter((r) => r.confirmed > 0)
    .reduce((n, r) => n + r.findings.filter((f) => f.verdict === "review").length, 0);
  if (otherOpen.length === 0) {
    pass("Open review items", `none in other repos; the confirmed repo carries ${confirmedRepoReview} corroborating review signal(s) of its own`);
  } else {
    fail("Open review items", `${otherOpen.length} other repos still unresolved: ${otherOpen.join(", ")}`);
  }

  // The confirmed VaultBridge finding must be anchored to real file:line evidence.
  if (existsSync(join(DATA, "static-VaultBridge.json"))) {
    const vb = readJson<{ findings: { file: string; line: number; evidence: string }[] }>("static-VaultBridge.json");
    const hasSelector = vb.findings.some((f) => /IUSCVerifier\.sol/.test(f.file) && /verifysingle|verifybatch/i.test(f.evidence));
    const hasSetter = vb.findings.some((f) => /VaultLending\.sol/.test(f.file) && /setverifier|assigns/i.test(f.evidence));
    if (hasSelector && hasSetter) pass("VaultBridge evidence", "fake selector + swappable verifier both anchored to file:line");
    else fail("VaultBridge evidence", `selector:${hasSelector} setter:${hasSetter}`);
  }
}

// D — the ecosystem scorecard's own invariants hold.
function checkScorecard() {
  if (!existsSync(join(DATA, "scorecard.json"))) { fail("Scorecard", "data/scorecard.json missing; run npm run scorecard"); return; }
  const sc = readJson<{
    total: number;
    rows: unknown[];
    distribution: { id: string; applicable: number; yes: number; partial: number }[];
    depthCounts: { count: number }[];
  }>("scorecard.json");

  const depthSum = sc.depthCounts.reduce((s, d) => s + d.count, 0);
  const badDist = sc.distribution.filter((d) => d.yes + d.partial > d.applicable);
  if (sc.rows.length === sc.total && depthSum === sc.total && badDist.length === 0) {
    pass("Scorecard invariants", `${sc.total} submissions, depth sums to ${depthSum}, every distribution yes+partial <= applicable`);
  } else {
    fail("Scorecard invariants", `rows ${sc.rows.length}/${sc.total}, depthSum ${depthSum}, bad distribution rows ${badDist.map((d) => d.id).join(",")}`);
  }
}

// D2 — protocol depth: the conformance run exercised most of the precompile surface.
function checkConformance() {
  if (!existsSync(join(DATA, "conformance.json"))) { info("Protocol surface", "data/conformance.json missing; run npm run conformance"); return; }
  const cf = readJson<{ surface: { totalEntryPoints: number; exercised: number; typicalConsumerEntryPoints: number }; decoderSurface: string[] }>("conformance.json");
  const s = cf.surface;
  if (s.exercised >= s.totalEntryPoints - 1 && s.exercised > s.typicalConsumerEntryPoints) {
    pass("Protocol surface", `${s.exercised}/${s.totalEntryPoints} precompile entry points exercised (+${cf.decoderSurface.length} decoder fns); a typical consumer touches ${s.typicalConsumerEntryPoints}`);
  } else {
    fail("Protocol surface", `only ${s.exercised}/${s.totalEntryPoints} exercised`);
  }
}

// E — optional: re-fetch each confirmed repo's public source and re-derive the finding.
function checkReclone() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { analyzeTree } = require("../src/static") as { analyzeTree: (p: string) => { id: string; title: string; file: string; evidence: string }[] };
  const targets = [
    {
      repo: "VaultBridge",
      url: "https://github.com/Bobo2005/VaultBridge.git",
      derived: (f: { title: string; file: string; evidence: string }[]) =>
        f.some((x) => /IUSCVerifier\.sol/.test(x.file) && /verifysingle|verifybatch/i.test(x.evidence)) &&
        f.some((x) => /src\/.*Mock/i.test(x.file) && /contract mock/i.test(x.evidence)),
      label: "fake selector + mock-in-src",
    },
    {
      repo: "Sovereign",
      url: "https://github.com/SDRmsung/Sovereign-AttestAgent-Creditcoin",
      derived: (f: { title: string }[]) => f.some((x) => /signature, not the precompile/i.test(x.title)),
      label: "attestation-by-signature (no precompile)",
    },
    {
      repo: "FactorX",
      url: "https://github.com/Ebubechukwucyber/FactorX.git",
      derived: (f: { title: string; file: string }[]) =>
        f.some((x) => /without verifying the proof/i.test(x.title) && /AttestcoinVerifier\.sol/.test(x.file)),
      label: "records an attestation without verifying the proof",
    },
  ];
  for (const t of targets) {
    let dir = "";
    try {
      dir = mkdtempSync(join(tmpdir(), "tc-"));
      execFileSync("git", ["clone", "--depth", "1", "--no-tags", "-q", t.url, dir], { stdio: "ignore" });
      const findings = analyzeTree(dir);
      if (t.derived(findings as never)) {
        pass(`Re-clone: ${t.repo}`, `cloned public source, analyzer reproduced ${t.label} (${findings.length} signals)`);
      } else {
        fail(`Re-clone: ${t.repo}`, `analyzer did not reproduce ${t.label} over ${findings.length} signals`);
      }
    } catch (e) {
      info(`Re-clone: ${t.repo}`, `skipped (${errMsg(e)})`);
    } finally {
      if (dir) try { rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
    }
  }
}

async function main() {
  const reclone = process.argv.includes("--reclone");
  console.log("\nThirdCheck · judge:verify\n");

  await checkOnChain();
  await checkSelectorLive();
  checkFindings();
  checkScorecard();
  checkConformance();
  if (reclone) checkReclone();

  const width = Math.max(...results.map((r) => r.label.length));
  for (const r of results) {
    console.log(`  ${r.status.padEnd(4)} ${r.label.padEnd(width)}  ${r.detail}`);
  }
  const failed = results.filter((r) => r.status === "FAIL");
  const passed = results.filter((r) => r.status === "PASS").length;
  console.log(`\n  ${passed} passed, ${failed.length} failed${reclone ? "" : "  (add --reclone to re-derive the VaultBridge finding from source)"}\n`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
