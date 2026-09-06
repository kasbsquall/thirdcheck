/**
 * Builds the ThirdCheck ecosystem scorecard from the competitive review of all 48 BUIDL CTC 2026
 * Fall submissions.
 *
 *   npx ts-node scripts/build-scorecard.ts
 *
 * Emits two artifacts:
 *   data/scorecard-private.json  — named, per-project, the basis for responsible disclosure. NOT
 *                                  for publication; the bulletin never loads it.
 *   data/scorecard.json          — anonymised (track code, no name/repo) plus field-wide
 *                                  distributions. This is what the public bulletin renders.
 *
 * Provenance and honesty: each row is a reading of the public submission description cross-checked
 * against the repository and ThirdCheck's static analyzer. It reflects what a submission EVIDENCES,
 * not a full audit. A check is "y" only when the submission demonstrably addresses it, "p" when
 * partial, "n" when a consumer of this shape should address it and does not evidence it, "na" when
 * it does not apply to that design, and "flag" when a real defect was found. This is stated on the
 * card so no reader mistakes it for a security certification.
 */
import { writeFileSync } from "fs";
import { resolve } from "path";

type Mark = "y" | "p" | "n" | "na" | "flag";
type Depth = "deep" | "solid" | "light" | "absent";

interface Checks {
  receipt: Mark; // B-01 receipt status read
  emitter: Mark; // B-02 emitting contract pinned
  event: Mark;   // B-03 event signature checked
  replay: Mark;  // B-04 replay guard on the proof
  chain: Mark;   // B-05 chain identity of the proof
  order: Mark;   // B-06 proof bound to the business object
  fields: Mark;  // B-07 payer/recipient/amount bound
  window: Mark;  // B-08 block window constrained
  logsel: Mark;  // B-09 correct log selected among many
}

interface Row {
  id: string;
  name: string;
  track: string;
  depth: Depth;
  checks: Checks;
  redFlags: string[];     // confirmed, e.g. "B-11 swappable verifier"
  evidence: { deployed: boolean; video: boolean; demo: boolean; mainnet: boolean };
  note: string;
}

// c(): terse checks builder in catalogue order.
function c(receipt: Mark, emitter: Mark, event: Mark, replay: Mark, chain: Mark, order: Mark, fields: Mark, window: Mark, logsel: Mark): Checks {
  return { receipt, emitter, event, replay, chain, order, fields, window, logsel };
}
function ev(deployed: boolean, video: boolean, demo: boolean, mainnet: boolean) {
  return { deployed, video, demo, mainnet };
}

const ROWS: Row[] = [
  { id: "P01", name: "WEN", track: "Gaming", depth: "solid",
    checks: c("na","y","y","y","y","na","na","na","p"), redFlags: [],
    evidence: ev(true,false,true,false),
    note: "ChartVerifier rejects unproven candles; real historical Uniswap swaps proven. No repo and no video, so code is unverifiable by a judge." },
  { id: "P02", name: "CovenantX", track: "DeFi", depth: "deep",
    checks: c("y","y","y","y","p","y","y","p","p"), redFlags: [],
    evidence: ev(true,true,true,false),
    note: "Real Aave V3 borrow/repay, breach and cure live on-chain, adapter model. Full third check enumerated." },
  { id: "P03", name: "AttestOps", track: "DePIN", depth: "solid",
    checks: c("y","y","y","p","p","p","p","na","p"), redFlags: [],
    evidence: ev(true,true,true,false),
    note: "Batch-proof SLA settlement verified against the precompile on-chain. Concise submission." },
  { id: "P04", name: "Flagged RWA consumer (withheld)", track: "RWA", depth: "absent",
    checks: c("n","flag","n","p","n","n","n","n","n"),
    redFlags: ["B-11 verifier addressed by non-existent selector (verifySingle/verifyBatch)","B-11 swappable verifier address","B-11 mock precompile in tree","B-12 absence proof unsound"],
    evidence: ev(true,true,true,false),
    note: "Ambitious dual-product pitch, but the absence-proof claim is broken and the verifier is mockable/swappable. ThirdCheck's analyzer flags 13 items. The worked example of why this matters." },
  { id: "P05", name: "AEOS", track: "AI", depth: "solid",
    checks: c("p","y","y","y","p","na","na","na","p"), redFlags: [],
    evidence: ev(true,true,false,false),
    note: "Evidence-first DAO treasury; verifyAndAnchor on-chain, stale proofs never promoted. Honest about inclusion != truth. AI holds no keys." },
  { id: "P06", name: "Collateral Eligibility Ledger", track: "RWA", depth: "deep",
    checks: c("y","y","y","y","y","na","p","n","y"), redFlags: [],
    evidence: ev(true,true,false,true),
    note: "Five ordered checks with emitter allowlist named the most important; real Ethereum MAINNET impairment event; on-chain negative demo; 60/60 tests." },
  { id: "P07", name: "loomcredit", track: "AI", depth: "deep",
    checks: c("y","y","y","y","p","y","y","y","p"), redFlags: [],
    evidence: ev(true,true,true,false),
    note: "TradeEvidenceUSC validates receipt, escrow emitter, event, buyer/supplier/token/value/guarantee/deadline/nonce, replay. AI proposes, RiskGuard enforces." },
  { id: "P08", name: "ProofPay", track: "DeFi", depth: "deep",
    checks: c("y","y","p","y","p","y","y","y","p"), redFlags: [],
    evidence: ev(true,true,true,false),
    note: "Bridgeless solver settlement; router pinned, order/solver/merchant/token/amount/deadline bound, replay. Adversarial flow shown." },
  { id: "P09", name: "Flagged RWA submission (withheld)", track: "RWA", depth: "light",
    checks: c("p","p","y","y","na","p","p","na","p"),
    redFlags: ["B-11 SDK verifySingle path used instead of in-contract precompile (disclosed)"],
    evidence: ev(true,true,true,false),
    note: "Cashflow passport. Honest that in-contract verifyAndEmit selector did not match, shipped SDK path plus on-chain record. Lighter enforcement depth." },
  { id: "P10", name: "AgentKeeper-MCP", track: "AI", depth: "light",
    checks: c("p","p","p","y","p","na","na","na","na"), redFlags: [],
    evidence: ev(false,false,false,false),
    note: "Agent infra with Merkle audit and solver escrow. Attestcoin use more claimed than shown; no demo or video." },
  { id: "P11", name: "Rivyn", track: "DeFi", depth: "deep",
    checks: c("y","y","y","y","y","y","y","p","p"), redFlags: [],
    evidence: ev(true,true,true,false),
    note: "Proof-bound escrow: invoice/token/amount/buyer/dest/source/expiry all bound, fail-closed. Eight checks enumerated." },
  { id: "P12", name: "Tutela", track: "DePIN", depth: "deep",
    checks: c("y","y","y","y","y","y","y","p","p"), redFlags: [],
    evidence: ev(true,true,true,false),
    note: "Warranty settlement, success and failure paths on-chain, non-upgradeable, fuzz/invariants/CI, honest trust boundary." },
  { id: "P13", name: "Echelon Protocol", track: "AI", depth: "light",
    checks: c("p","p","p","p","p","na","na","na","na"), redFlags: [],
    evidence: ev(true,false,true,false),
    note: "AI C-level sentinels; cross-chain attestation described vaguely, mock ERC-20 collateral. No video." },
  { id: "P14", name: "Hardcore Arena", track: "Gaming", depth: "absent",
    checks: c("na","na","na","na","na","na","na","na","na"), redFlags: [],
    evidence: ev(false,true,false,false),
    note: "Platform game with no Attestcoin integration; off the protocol entirely." },
  { id: "P15", name: "ClaimProof", track: "AI", depth: "solid",
    checks: c("y","p","y","y","p","p","p","na","p"), redFlags: [],
    evidence: ev(false,true,false,false),
    note: "Parametric insurance; ClaimVault re-verifies inclusion, continuity, receipt status, replay via 0x0FD2. New product domain." },
  { id: "P16", name: "Unbridged", track: "DeFi", depth: "deep",
    checks: c("y","y","y","y","y","na","p","na","p"), redFlags: [],
    evidence: ev(true,true,true,false),
    note: "Prove-don't-move CDP; same-block verifyAndEmit, receipt status, emitter allowlist, source-chain binding, replay. 44 tests, live loop." },
  { id: "P17", name: "ChargeProof", track: "DePIN", depth: "deep",
    checks: c("y","y","y","y","y","y","y","p","p"), redFlags: [],
    evidence: ev(true,true,true,false),
    note: "EV charging; source/chain/sender/selector bound before decode, EIP-712 device sig, three replay domains, 25 tests, explorer-verified, judge:verify." },
  { id: "P18", name: "Attestcoin Credit Passport", track: "AI", depth: "solid",
    checks: c("y","p","y","y","p","na","p","na","p"), redFlags: [],
    evidence: ev(true,true,true,false),
    note: "Same-block precompile verify; AI adjusts collateral tier; real run with source and CC3 hashes." },
  { id: "P19", name: "Standing", track: "DeFi", depth: "deep",
    checks: c("y","y","y","y","p","y","y","na","p"), redFlags: [],
    evidence: ev(true,true,true,false),
    note: "Reads real Aave V3 and Compound V3 repayments from inside the contract; receipt, log origin, borrower-not-sender, per-log replay. Analyzer 0." },
  { id: "P20", name: "Remit-to-Own", track: "RWA", depth: "solid",
    checks: c("y","y","y","y","p","y","y","na","p"), redFlags: [],
    evidence: ev(true,true,false,true),
    note: "USCBase verifyAndEmit, queryId replay, ERC-20 transfer matching; adversarial self-audit closed 10 issues; both Sepolia and mainnet sources; never mocks the precompile." },
  { id: "P21", name: "AttestWatch", track: "AI", depth: "light",
    checks: c("na","na","p","na","p","na","na","na","na"), redFlags: [],
    evidence: ev(true,true,false,false),
    note: "Pager that stays quiet until a source block is attested and prover+precompile agree. Small scope, clever." },
  { id: "P22", name: "Credo", track: "RWA", depth: "deep",
    checks: c("y","p","y","y","y","y","y","y","y"), redFlags: [],
    evidence: ev(true,true,true,false),
    note: "DvP RWA: buyer sends plain USDC, synchronous verify, exactly-one-Transfer match, block window, replay, fields bound. Honest asymmetry boundary." },
  { id: "P23", name: "Transfer Settlement Network", track: "DeFi", depth: "light",
    checks: c("p","p","p","p","p","na","p","na","na"), redFlags: [],
    evidence: ev(true,false,true,false),
    note: "Ambitious identity-first settlement; Solana layer live, the Creditcoin/Attestcoin adapter is the in-build MVP. No video." },
  { id: "P24", name: "AttestCredit", track: "DeFi", depth: "light",
    checks: c("p","p","p","p","p","na","p","na","na"), redFlags: [],
    evidence: ev(true,true,false,false),
    note: "Cross-chain credit score via a Golang relayer submitting proofs; lighter on in-contract verification detail." },
  { id: "P25", name: "VaultPulse", track: "DeFi", depth: "light",
    checks: c("n","p","p","p","n","na","p","na","na"),
    redFlags: ["B-12 off-chain worker mints attestation proofs (trust shifts off-chain)"],
    evidence: ev(true,true,true,false),
    note: "Yield vault + credit score; a worker mints attestation proofs, which moves trust off-chain. Thin verification story." },
  { id: "P26", name: "CreditPass", track: "DeFi", depth: "solid",
    checks: c("p","p","y","y","p","na","p","na","p"), redFlags: [],
    evidence: ev(true,true,true,false),
    note: "Repayment-to-score with soulbound passport, precompile verify, tiered lending. Clean execution in a crowded niche." },
  { id: "P27", name: "SpaceFinance", track: "DePIN", depth: "deep",
    checks: c("y","y","y","y","p","p","p","p","p"), redFlags: [],
    evidence: ev(true,true,true,false),
    note: "Rare bidirectional flow via USC Write-ability (Outbox/Inbox); seven validation layers, 75 tests, very honest about stubs and unwired GuildPool." },
  { id: "P28", name: "Credit Reputation Agent", track: "DeFi", depth: "solid",
    checks: c("p","p","y","p","p","na","p","na","p"), redFlags: [],
    evidence: ev(true,true,true,false),
    note: "Points only after precompile verify of a Sepolia bridge burn; also reads an already-verified native loan outcome. Honest about the capped off-chain signal." },
  { id: "P29", name: "COVENANT", track: "RWA", depth: "deep",
    checks: c("y","y","y","y","y","y","y","y","y"), redFlags: [],
    evidence: ev(true,false,true,false),
    note: "Proof-conditioned tranches; 58 Foundry tests including fuzzing and stateful invariants over wrong chain/emitter/payer/recipient/stale/multi-log. No video." },
  { id: "P30", name: "Flagged AI agent (withheld)", track: "AI", depth: "absent",
    checks: c("p","n","p","y","y","na","na","na","na"),
    redFlags: ["B-11 uses EIP-191 signatures + ecrecover, not the BlockProver precompile"],
    evidence: ev(true,true,false,false),
    note: "Flashy metrics (4000 TPS, TRIZ) but the proof is an off-chain EIP-191 signature scheme, not the native precompile. Questionable protocol integration." },
  { id: "P31", name: "Cr3dX", track: "RWA", depth: "solid",
    checks: c("y","y","y","y","p","p","p","p","p"), redFlags: [],
    evidence: ev(true,true,true,false),
    note: "Credit state cross-chain; inclusion, receipt, gateway event, deadline vs attested height, replay. Independent reference model, 63/63 traces, adversarial testing." },
  { id: "P32", name: "web3-analysis-dashboard", track: "DeFi", depth: "absent",
    checks: c("na","na","na","na","na","na","na","na","na"), redFlags: [],
    evidence: ev(true,false,true,false),
    note: "Analytics dashboard; Attestcoin only appears in the future roadmap. Not an integration." },
  { id: "P33", name: "LedgerLine", track: "RWA", depth: "solid",
    checks: c("y","y","y","y","p","na","y","na","p"), redFlags: [],
    evidence: ev(true,false,true,false),
    note: "Credit registry; real precompile, own decoder, emitter+signature checks, borrower/amount bound from the event, replay, owner-approved lenders. No video." },
  { id: "P34", name: "Spark", track: "DeFi", depth: "deep",
    checks: c("y","p","y","y","p","na","y","na","y"), redFlags: [],
    evidence: ev(true,true,true,true),
    note: "Dual proofs including a balance/solvency attestation (unique); on-chain receipt RLP parsing, amount bound, 300 tests, deep documented surface." },
  { id: "P35", name: "AttestDesk", track: "AI", depth: "light",
    checks: c("y","p","y","p","p","p","p","na","na"), redFlags: [],
    evidence: ev(false,false,false,false),
    note: "Invoice underwriter; verifyAndEmit in the same transaction. Thin submission, no demo or video." },
  { id: "P36", name: "BountyOps Verified Execution", track: "AI", depth: "solid",
    checks: c("y","p","y","y","p","p","p","na","p"), redFlags: [],
    evidence: ev(true,true,false,false),
    note: "Autonomous agent execution gated by on-chain proof; fail-closed; real end-to-end with source and CC3 hashes." },
  { id: "P37", name: "AttestGuard", track: "AI", depth: "solid",
    checks: c("y","p","y","y","p","p","y","na","p"), redFlags: [],
    evidence: ev(true,true,false,false),
    note: "Trade-finance advance; agent proposes, deterministic contract re-checks within a cap. Honest about what stays centralized; 17+8 tests." },
  { id: "P38", name: "BORROWIQ", track: "DeFi", depth: "light",
    checks: c("n","n","n","p","n","na","na","na","na"), redFlags: [],
    evidence: ev(true,true,true,false),
    note: "AI credit scoring from wallet behavior on Creditcoin; no clear cross-chain precompile integration described." },
  { id: "P39", name: "Emberline", track: "RWA", depth: "light",
    checks: c("p","p","p","p","p","na","p","na","p"), redFlags: [],
    evidence: ev(true,true,true,false),
    note: "Milestone funding with quorum attestations and privacy; precompile specifics are vague. Honest it does not claim software proves reality." },
  { id: "P40", name: "VeriSettle", track: "RWA", depth: "deep",
    checks: c("y","y","y","y","y","y","y","p","p"), redFlags: [],
    evidence: ev(true,true,true,false),
    note: "Receipt-bound escrow; rejects mismatched source/parties/order/terms, replay QueryAlreadyProcessed, V2/V3 governance, dispute refund, judge evidence page." },
  { id: "P41", name: "index41", track: "DeFi", depth: "deep",
    checks: c("p","y","y","y","y","na","y","na","y"), redFlags: [],
    evidence: ev(true,true,true,true),
    note: "Bonded MEV ordering court. calculateTxIndex as the load-bearing primitive (nobody else touches ordering); real mainnet sandwich ruling with payout; 145 tests, 256-leaf exhaustive; deepest documented protocol use." },
  { id: "P42", name: "Oracle-Free Council", track: "AI", depth: "solid",
    checks: c("y","p","y","y","p","na","p","p","p"), redFlags: [],
    evidence: ev(false,true,false,false),
    note: "Attested-in/attested-out AI treasury; Governor re-verifies proof on-chain with replay protection. Live E2E, but funded testnet Governor deploy is still next." },
  { id: "P43", name: "crosscredit", track: "DeFi", depth: "deep",
    checks: c("y","y","y","y","y","na","y","na","y"), redFlags: [],
    evidence: ev(true,true,true,true),
    note: "Reads real Aave MAINNET repayments (discovered chainKey 3); five checks incl (chainKey,emitter) pair auth; batch; live negative-path suite; documented undocumented protocol behavior; self-dealing capped by construction." },
  { id: "P44", name: "MoonCreditFi", track: "DeFi", depth: "absent",
    checks: c("n","n","n","p","n","na","na","na","na"), redFlags: [],
    evidence: ev(true,true,true,false),
    note: "Broad credit + DePIN funding, backend-heavy; USC integration is stated as a future capability rather than built. Sponsor tech essentially absent." },
  { id: "P45", name: "ProofYield", track: "RWA", depth: "solid",
    checks: c("p","p","y","p","p","na","p","na","p"), redFlags: [],
    evidence: ev(true,true,true,false),
    note: "ERC-4626 RWA vault; NAV rises only after inclusion is proven via harvestTrusted. Real on-chain proofs; lighter on enumerated binding checks." },
  { id: "P46", name: "Solar DePin", track: "DePIN", depth: "absent",
    checks: c("na","n","p","na","n","na","na","na","na"), redFlags: [],
    evidence: ev(true,true,true,false),
    note: "Physical solar + compute network on Casper/Solana/Base; Attestcoin use is vague and off the CC3 precompile." },
  { id: "P47", name: "MemeEco: Greedy World", track: "Gaming", depth: "absent",
    checks: c("na","na","na","na","na","na","na","na","na"), redFlags: [],
    evidence: ev(true,true,true,false),
    note: "Meme snake game and liquidity platform; no Attestcoin integration." },
  { id: "P48", name: "AttestFlow", track: "DeFi", depth: "absent",
    checks: c("n","n","p","n","n","na","n","na","na"),
    redFlags: ["B-12 core on-chain submission, Aave calls and event listening all mocked (self-disclosed)"],
    evidence: ev(true,false,true,false),
    note: "Liquidation sentinel with MCP tools; the submission states on-chain proof submission, Aave calls and event listening are mocked. Architecture, not a working integration." },

  // ── Late entrants (added after the first 48; source re-read and analyzer re-run on 2026-09-06) ──
  { id: "P49", name: "CarryProof", track: "DeFi", depth: "deep",
    checks: c("y","y","y","y","y","y","y","p","y"), redFlags: [],
    evidence: ev(true,true,false,false),
    note: "Real ERC-4626/Aave yield-rotation ledger. RotationVerifierASC decodes the receipt, reverts on status != 1, pins each log to the registered vault, checks the event signature and topic/data lengths, iterates every log (handles multi-event router paths), binds owner/assets/shares, and keys replay on the base queryId. Among the deepest third-check implementations in the field. Block window not explicitly constrained (height recorded, proofs expire naturally)." },
  { id: "P50", name: "Ledgerline", track: "DePIN", depth: "deep",
    checks: c("y","y","y","y","p","y","y","n","y"), redFlags: [],
    evidence: ev(true,false,true,false),
    note: "DePIN cross-network income aggregation for undercollateralized lending. IncomeRegistry checks receipt status, pins the emitter to registered networks, checks the PaymentMade signature and topic/data lengths, and keys replay on operator+source+period (fine-grained). Skips unregistered logs rather than reverting, citing the decoy-log censorship vector (gluwa/USC-Builder-Examples#37) — a deep, correct choice. No demo video; chain identity used at the base but credit is keyed on source address rather than chainKey." },
  { id: "P51", name: "Live-scan demo submission (withheld)", track: "DeFi", depth: "deep",
    checks: c("y","y","y","y","y","y","y","n","p"), redFlags: [],
    evidence: ev(true,false,true,false),
    note: "Attestation-triggered cross-chain liquidation, and itself an adversarial bench: a naive manager (guards removed) vs the hardened manager, plus an attacker and decoy vaults to execute the emitter-guard hole on-chain. Hardened path checks receipt status, pins sourceVault, checks event sig, topics.length and data.length. Carries an honest retraction of an earlier wrong B-01 claim in SECURITY.md. Takes logs[0] on a documented single-event-per-tx assumption. Thematically the closest submission to ThirdCheck, scoped to one product rather than the field." },
  { id: "P52", name: "RWAs by Attest", track: "DeFi", depth: "light",
    checks: c("p","n","n","y","p","n","n","y","na"), redFlags: [],
    evidence: ev(true,true,true,false),
    note: "RWA ownership attestation. OwnershipVerifier declares the 0x0FD2 constant but never calls the precompile on-chain: verifyAndMintReceipt is onlyOwner and trusts caller-supplied booleans (sourceTxSuccessful) and fields (wallet, assetId, sourceTxHash) rather than decoding them from a proof. It has a real replay guard and an explicit block window, but the proof is not bound to the business object on-chain — the header claims 'we check status ourselves' while the code takes the status as a parameter. Gated by owner trust, so not an unauthenticated exploit, but a genuine claim/code gap on the third check." },
  { id: "P53", name: "Farebox", track: "Infra", depth: "absent",
    checks: c("n","n","n","n","n","na","n","na","n"), redFlags: [],
    evidence: ev(true,true,true,false),
    note: "Prepaid account-less compute credits (metered RPC/AI inference) settled against an on-chain usage root. No public repository at review time (live testnet demo and video only), so the third check could not be assessed from source. Scored absent on evidence available, not on a defect." },
];

const DEPTH_SCORE: Record<Depth, number> = { deep: 1, solid: 0.7, light: 0.4, absent: 0.1 };
const MARK_SCORE: Record<Exclude<Mark, "na">, number> = { y: 1, p: 0.5, n: 0, flag: -0.75 };

/** Third-check coverage over applicable checks, blended with integration depth, 0..100. */
function score(row: Row): number {
  const marks = Object.values(row.checks).filter((m) => m !== "na") as Exclude<Mark, "na">[];
  const coverage = marks.length ? marks.reduce((s, m) => s + MARK_SCORE[m], 0) / marks.length : 0;
  const blended = 0.65 * Math.max(0, coverage) + 0.35 * DEPTH_SCORE[row.depth];
  const penalty = row.redFlags.length ? Math.min(0.2, 0.07 * row.redFlags.length) : 0;
  return Math.round(Math.max(0, blended - penalty) * 100);
}

const CHECK_KEYS: (keyof Checks)[] = ["receipt","emitter","event","replay","chain","order","fields","window","logsel"];
const CHECK_META: Record<keyof Checks, { id: string; label: string }> = {
  receipt: { id: "B-01", label: "receipt status read" },
  emitter: { id: "B-02", label: "emitting contract pinned" },
  event:   { id: "B-03", label: "event signature checked" },
  replay:  { id: "B-04", label: "replay guard on the proof" },
  chain:   { id: "B-05", label: "chain identity checked" },
  order:   { id: "B-06", label: "bound to the business object" },
  fields:  { id: "B-07", label: "payer/recipient/amount bound" },
  window:  { id: "B-08", label: "block window constrained" },
  logsel:  { id: "B-09", label: "correct log selected" },
};

function main() {
  const scored = ROWS.map((r) => ({ ...r, score: score(r) }));

  // Private artifact: named, full detail, ranked.
  const privateOut = {
    generatedAt: new Date().toISOString(),
    method: "Reading of public submission descriptions cross-checked against repositories and the ThirdCheck static analyzer. Reflects what a submission evidences, not a full audit. Basis for private responsible disclosure; do not publish.",
    total: scored.length,
    rows: [...scored].sort((a, b) => b.score - a.score),
  };
  writeFileSync(resolve(__dirname, "..", "data", "scorecard-private.json"), JSON.stringify(privateOut, null, 2));

  // Field-wide distributions (anonymous, safe to publish).
  const consumers = scored.filter((r) => r.depth !== "absent" || r.redFlags.length > 0);
  const dist = CHECK_KEYS.map((k) => {
    const applicable = scored.filter((r) => r.checks[k] !== "na");
    const yes = applicable.filter((r) => r.checks[k] === "y").length;
    const partial = applicable.filter((r) => r.checks[k] === "p").length;
    const flagged = applicable.filter((r) => r.checks[k] === "flag").length;
    return { id: CHECK_META[k].id, label: CHECK_META[k].label, applicable: applicable.length, yes, partial, flagged };
  });
  const depthCounts = (["deep","solid","light","absent"] as Depth[]).map((d) => ({ depth: d, count: scored.filter((r) => r.depth === d).length }));
  const withRedFlags = scored.filter((r) => r.redFlags.length > 0).length;

  // Public artifact: anonymised rows (track code + rank, no name/repo), plus distributions.
  const byTrack: Record<string, number> = {};
  const publicRows = [...scored].sort((a, b) => b.score - a.score).map((r) => {
    const n = (byTrack[r.track] = (byTrack[r.track] ?? 0) + 1);
    const code = `${r.track.toUpperCase().slice(0, 4)}-${String(n).padStart(2, "0")}`;
    return {
      code, track: r.track, depth: r.depth, score: r.score,
      checks: r.checks, redFlagCount: r.redFlags.length,
    };
  });

  const publicOut = {
    generatedAt: new Date().toISOString(),
    method: "ThirdCheck read every public BUIDL CTC submission, cross-checked the repositories, and ran its static analyzer. Rows are anonymised; each is what a submission evidences of the third check, not a security audit. Confirmed defects are disclosed privately to the affected teams and to team@creditcoin.org before any naming.",
    total: scored.length,
    consumersEvaluated: consumers.length,
    withRedFlags,
    checkLegend: CHECK_KEYS.map((k) => CHECK_META[k]),
    distribution: dist,
    depthCounts,
    rows: publicRows,
  };
  writeFileSync(resolve(__dirname, "..", "data", "scorecard.json"), JSON.stringify(publicOut, null, 2));

  // Console summary.
  console.log(`\n  ThirdCheck ecosystem scorecard — ${scored.length} submissions\n`);
  console.log(`  depth:  ${depthCounts.map((d) => `${d.depth} ${d.count}`).join("  ")}`);
  console.log(`  with confirmed/flagged defects: ${withRedFlags}\n`);
  console.log("  third-check coverage across the field:");
  for (const d of dist) {
    console.log(`    ${d.id}  ${d.label.padEnd(30)} ${d.yes}/${d.applicable} evidence it${d.flagged ? `, ${d.flagged} flagged` : ""}`);
  }
  console.log("\n  top of the field (private ranking):");
  for (const r of privateOut.rows.slice(0, 12)) {
    console.log(`    ${String(r.score).padStart(3)}  ${r.name} (${r.track}, ${r.depth})`);
  }
  console.log("\n  written: data/scorecard.json (public), data/scorecard-private.json (private)\n");
}

main();
