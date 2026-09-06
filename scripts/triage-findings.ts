/**
 * Triage the raw static-analyzer output into a defensible findings report.
 *
 *   npx ts-node scripts/triage-findings.ts
 *
 * The analyzer (src/static.ts) is deliberately noisy: it flags every fake-selector declaration,
 * every mock contract, every swappable verifier, and every catch-return-null in the tree. Most of
 * those are NOT defects. A mock in a test file is correct practice. A catch-return-null in a
 * frontend balance cache is not a contract treating absence as proof. Publishing the raw list would
 * falsely accuse sound teams and destroy ThirdCheck's own credibility.
 *
 * This pass classifies each raw signal by evidence and file path into:
 *   confirmed  a production, source-visible binding defect we stand behind
 *   review     a real production pattern whose severity needs the call site / access control read
 *              (held for private confirmation before any claim; needs the repo re-cloned)
 *   noise      test/mock code, or off-chain catch-return-null that no contract consumes as absence
 *
 * Output: data/findings-report.json (named; the private basis for responsible disclosure, not for
 * publication) and a console summary. Author names are never published; confirmed defects go to the
 * affected team and team@creditcoin.org before any naming.
 */
import { writeFileSync } from "fs";
import { resolve } from "path";

interface RawFinding {
  id: string;
  title: string;
  file: string;
  line: number;
  evidence?: string;
  note?: string;
}
interface RepoResult {
  repo: string;
  findingCount: number;
  findings: RawFinding[];
}
interface Day7 {
  results: RepoResult[];
}

type Verdict = "confirmed" | "review" | "noise";

interface Triaged extends RawFinding {
  repo: string;
  verdict: Verdict;
  reason: string;
  sourceConfirmed: boolean;
}

const day7: Day7 = require("../data/day7-findings.json");

/**
 * Source-confirmed overrides. Each key is `repo|file:line`. These come from reading the actual call
 * site / setter guard in the re-cloned repos (see docs/09-findings-ecosistema.md), and they OVERRIDE
 * the path heuristic. This is what makes the report defensible: a heuristic that flags every
 * `setVerifier` cannot tell a swappable PROOF verifier from an authorized-CALLER role. Only reading
 * the code can, and this table records those reads so the run stays reproducible.
 */
const CONFIRMATIONS: Record<string, { verdict: Verdict; reason: string }> = {
  // A flagged RWA consumer (name withheld pending coordinated disclosure) — confirmed real. The
  // fake selector is the actual verification path.
  "flagged-rwa-a|contracts/src/creditcoin/VaultLending.sol:147": {
    verdict: "confirmed",
    reason: "setVerifier is onlyOwner with no write-once/timelock guard; owner (EOA) can point verifierAddress at MockStreakPrecompile (shipped in src/, returns true), making verification decorative",
  },
  "flagged-rwa-a|contracts/src/creditcoin/interfaces/IUSCVerifier.sol:7": {
    verdict: "confirmed",
    reason: "VaultLending._verifySingle calls IUSCVerifier(target).verifySingle at 0x0FD2 on every registration path; verifySingle is not a precompile selector, so real inclusion+continuity verification is never reached",
  },
  "flagged-rwa-a|contracts/src/creditcoin/interfaces/IUSCVerifier.sol:17": {
    verdict: "confirmed",
    reason: "verifyBatch is not a precompile selector; the batch registration path calls it at 0x0FD2 and cannot reach real verification",
  },
  "flagged-rwa-a|contracts/src/creditcoin/MockStreakPrecompile.sol:10": {
    verdict: "confirmed",
    reason: "mock verifier shipped in src/ (not test/), combined with the unguarded swappable verifier, is the mechanism to bypass the precompile in a deployed instance",
  },

  // Swappable-verifier flags that are actually authorized-CALLER roles, confirmed by reading the
  // setter and its consumer. Not proof-verifier indirection. Downgraded to noise (false positive).
  "flagged-rwa-b|src/CommercialIntent.sol:37": { verdict: "noise", reason: "false positive: `verifier` is an authorized-submitter role gating recordIntent (data write), not a proof verifier" },
  "flagged-rwa-b|src/ReceivableRegistry.sol:66": { verdict: "noise", reason: "false positive: `verifier` is an authorized-caller role (onlyVerifier gates a data write), not a proof verifier" },
  "ConvenantX|contracts/creditcoin/CovenantRegistry.sol:79": { verdict: "noise", reason: "false positive: covenantVerifier is a write-once authorized-caller role (reverts if already set); not swappable, not a proof verifier" },
  "ConvenantX|contracts/creditcoin/CreditFacility.sol:97": { verdict: "noise", reason: "false positive: covenantVerifier is a write-once authorized-caller role; not swappable, not a proof verifier" },
  "loomcredit|contracts/creditcoin/src/FacilityRegistry.sol:87": { verdict: "noise", reason: "false positive: evidenceVerifier is the authorized-caller role for the registry; real proof verification is in a separate contract (TradeEvidenceUSC)" },
  "credo-settlement-rwa|contracts/src/SettleRWA.sol:78": { verdict: "noise", reason: "false positive: `verifier` is an AccessControl-gated authorized-caller role; SettleRWA verifies the proof synchronously in-contract" },
  "ChargeProof|packages/contracts-creditcoin/contracts/ChargeIntentEscrow.sol:110": { verdict: "noise", reason: "false positive: write-once authorized-caller role (VerifierAlreadySet guard), Ownable2Step; the escrow binds and verifies in-contract" },
  // spark — mock verifier lives in src/ but is referenced only by tests; real verifier calls 0x0FD2.
  "spark|contracts/src/MockPaymentVerifier.sol:12": { verdict: "noise", reason: "false positive: MockPaymentVerifier is referenced only by test/Spark.t.sol; production uses AttestcoinPaymentVerifier calling blockProver.verify/verifyAndEmit at 0x0FD2 (housekeeping: move it under test/)" },
};

// A path is test/mock scaffolding when it lives under a test tree or is a Foundry test file.
function isTestPath(file: string): boolean {
  const f = file.toLowerCase();
  return (
    /(^|\/)tests?\//.test(f) ||
    /(^|\/)mocks?\//.test(f) ||
    /\/test\//.test(f) ||
    /\.t\.sol$/.test(f) ||
    /\/helpers\//.test(f)
  );
}

// A path is off-chain (TypeScript/JS app code) when it is not a Solidity contract.
function isOffChain(file: string): boolean {
  return !/\.sol$/i.test(file);
}

// Production Solidity: a .sol file that is not under a test tree.
function isProdContract(file: string): boolean {
  return /\.sol$/i.test(file) && !isTestPath(file);
}

function classify(repo: string, f: RawFinding): { verdict: Verdict; reason: string } {
  const ev = (f.evidence || "").toLowerCase();
  const inTest = isTestPath(f.file);

  // B-12 — off-chain failure treated as a negative observation.
  if (f.id === "B-12") {
    // The unambiguous defect: a generator that blanks the proof on failure yet reports success.
    if (/success:\s*true/.test(ev) || /proof\s*=\s*'0x'/.test(ev) || f.title.toLowerCase().includes("still reports success")) {
      return { verdict: "confirmed", reason: "generator zeroes the proof on failure but returns success; a consumer acts on an empty proof" };
    }
    // Everything else is a catch-return-null. Only a defect if a CONTRACT consumes the null as
    // proof of absence. All hits here are in off-chain app code (frontend/worker/scripts/agent),
    // which no contract reads as an on-chain absence proof.
    if (isOffChain(f.file)) {
      return { verdict: "noise", reason: "catch-return-null in off-chain app code; not a contract treating absence as proven" };
    }
    return { verdict: "review", reason: "catch-return-null on a path that may feed an absence claim; needs the consumer read" };
  }

  // B-11 — swappable / fake-selector / mock verifier.
  if (f.id === "B-11") {
    // Mock contracts.
    if (/contract mock/.test(ev) || /mock/.test(f.file.toLowerCase())) {
      if (inTest) {
        return { verdict: "noise", reason: "mock verifier in a test tree; correct practice for unit tests" };
      }
      // A mock shipped in the production source tree is a genuine smell.
      return { verdict: "review", reason: "mock verifier shipped in the production src tree; confirm the deployed verifier never points here" };
    }
    // Fake SDK-only selectors (verifySingle/verifyBatch) — the precompile does not implement them.
    if (/verifysingle|verifybatch/.test(ev)) {
      if (inTest) {
        return { verdict: "noise", reason: "SDK-only selector declared in test code" };
      }
      return { verdict: "review", reason: "SDK-only selector declared in a production interface/contract; confirm it is the actual verification call against 0x0FD2" };
    }
    // Swappable verifier address in mutable storage.
    if (/setverifier|set.*verifier|assigns/.test(ev)) {
      if (inTest) {
        return { verdict: "noise", reason: "verifier setter in test code" };
      }
      return { verdict: "review", reason: "verifier target in mutable storage; severity depends on access control (owner/timelock/multisig) — needs the setter's guard read" };
    }
    return { verdict: "review", reason: "production B-11 signal; needs source re-read" };
  }

  return { verdict: "review", reason: "unclassified; needs source re-read" };
}

function main() {
  const triaged: Triaged[] = [];
  for (const r of day7.results) {
    for (const f of r.findings) {
      const key = `${r.repo}|${f.file}:${f.line}`;
      const override = CONFIRMATIONS[key];
      const base = classify(r.repo, f);
      const chosen = override ?? base;
      triaged.push({ ...f, repo: r.repo, verdict: chosen.verdict, reason: chosen.reason, sourceConfirmed: Boolean(override) });
    }
  }

  const confirmed = triaged.filter((t) => t.verdict === "confirmed");
  const review = triaged.filter((t) => t.verdict === "review");
  const noise = triaged.filter((t) => t.verdict === "noise");

  // Per-repo rollup, sorted by strongest verdict then count.
  const rank: Record<Verdict, number> = { confirmed: 2, review: 1, noise: 0 };
  const byRepo = new Map<string, Triaged[]>();
  for (const t of triaged) {
    if (!byRepo.has(t.repo)) byRepo.set(t.repo, []);
    byRepo.get(t.repo)!.push(t);
  }
  const repos = [...byRepo.entries()]
    .map(([repo, items]) => {
      const top = Math.max(...items.map((i) => rank[i.verdict]));
      return {
        repo,
        topVerdict: (Object.keys(rank) as Verdict[]).find((k) => rank[k] === top)!,
        confirmed: items.filter((i) => i.verdict === "confirmed").length,
        review: items.filter((i) => i.verdict === "review").length,
        noise: items.filter((i) => i.verdict === "noise").length,
        findings: items,
      };
    })
    .sort((a, b) => rank[b.topVerdict] - rank[a.topVerdict] || b.review - a.review || b.confirmed - a.confirmed);

  const report = {
    generatedAt: new Date().toISOString(),
    method:
      "Triage of the ThirdCheck static analyzer output over the cloned submission repositories. Each raw signal is classified by evidence and file path. 'confirmed' = a production, source-visible binding defect. 'review' = a real production pattern whose severity needs the call site / access control read before any claim. 'noise' = test/mock code or off-chain catch-return-null no contract consumes. Named report; the private basis for responsible disclosure, not for publication.",
    rawSignals: triaged.length,
    counts: { confirmed: confirmed.length, review: review.length, noise: noise.length },
    sourceConfirmed: triaged.filter((t) => t.sourceConfirmed).length,
    reposWithConfirmed: repos.filter((r) => r.confirmed > 0).length,
    reposWithReviewOnly: repos.filter((r) => r.confirmed === 0 && r.review > 0).length,
    reposNoiseOnly: repos.filter((r) => r.confirmed === 0 && r.review === 0 && r.noise > 0).length,
    repos,
  };
  writeFileSync(resolve(__dirname, "..", "data", "findings-report.json"), JSON.stringify(report, null, 2));

  console.log(`\n  Triage of ${triaged.length} raw signals across ${repos.length} repos\n`);
  console.log(`  confirmed  ${confirmed.length}`);
  console.log(`  review     ${review.length}`);
  console.log(`  noise      ${noise.length}\n`);
  console.log(`  repos with a confirmed defect: ${report.reposWithConfirmed}`);
  console.log(`  repos with review-only signals: ${report.reposWithReviewOnly}`);
  console.log(`  repos with noise only: ${report.reposNoiseOnly}\n`);

  console.log(`  source-confirmed by reading the code: ${report.sourceConfirmed}\n`);

  console.log("  confirmed defects:");
  for (const t of confirmed) {
    console.log(`    ${t.repo}  ${t.id}  ${t.file}:${t.line}${t.sourceConfirmed ? "  [source-read]" : ""}`);
    console.log(`        ${t.reason}`);
  }
  const openReview = repos.filter((r) => r.topVerdict === "review");
  if (openReview.length) {
    console.log("\n  review still open (needs source read):");
    for (const r of openReview) {
      const kinds = [...new Set(r.findings.filter((f) => f.verdict === "review").map((f) => f.reason.split(";")[0]))];
      console.log(`    ${r.repo.padEnd(30)} ${r.review} signal(s): ${kinds.join(" | ")}`);
    }
  } else {
    console.log("\n  review: none open. Every production signal was read and resolved.");
  }
  const fp = triaged.filter((t) => t.sourceConfirmed && t.verdict === "noise");
  console.log(`\n  false positives caught by source read (analyzer over-flagged): ${fp.length}`);
  for (const t of fp) console.log(`    ${t.repo}  ${t.file}:${t.line} — ${t.reason.replace(/^false positive:\s*/, "")}`);
  console.log("\n  written: data/findings-report.json\n");
}

main();
