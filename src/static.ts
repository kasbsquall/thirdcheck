/**
 * The static analyzer.
 *
 * Some binding defects are visible in source without a live chain. This scans a directory tree of
 * Solidity and TypeScript for three of them, each with file:line evidence so the report can cite
 * exactly where it lives.
 *
 * It is heuristic and line-oriented, not a full parser. A hackathon does not need a compiler front
 * end to catch these patterns, and every finding points at a line a human can read in five seconds.
 * False positives are possible; the report labels these findings as "review", not "confirmed".
 *
 *   B-01  a proven receipt is acted on without checking it succeeded (review)
 *   B-02  a proven log is acted on without pinning the emitting contract (review)
 *   B-11  the precompile can be swapped, or is addressed by a selector that does not exist
 *   B-12  an off-chain generator treats a failure as a negative observation
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative, extname } from "path";

export interface StaticFinding {
  id: string;
  title: string;
  file: string;
  line: number;
  evidence: string;
  note: string;
}

/** The only function names the block prover precompile actually answers to. */
const REAL_SELECTORS = new Set(["verify", "verifyAndEmit", "calculateTxIndex"]);
/** Names that appear on the SDK class but are NOT on-chain selectors. */
const FAKE_SELECTORS = ["verifySingle", "verifyBatch", "verifyAndEmitSingle", "verifyAndEmitBatch"];

const SKIP_DIRS = new Set(["node_modules", ".git", "artifacts", "cache", "dist", "typechain-types"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if ([".sol", ".ts", ".js"].includes(extname(name))) out.push(full);
  }
  return out;
}

function lineOf(content: string, index: number): number {
  return content.slice(0, index).split("\n").length;
}

/**
 * Blank out // and /* *\/ comments, preserving every newline and the exact character offsets so
 * lineOf stays accurate. Without this, a contract that omits a guard but *describes* the missing
 * guard in a comment (`// no require(log.address_ == sourceVault)`) would suppress its own finding —
 * an evasion a real gate must not fall for.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, " "));
}

/** Test/mock scaffolding: a mock or SDK-name selector here is expected practice, not a defect. */
function isTestPath(rel: string): boolean {
  const f = rel.toLowerCase();
  return /(^|\/)(tests?|mocks?|helpers)\//.test(f) || /\.t\.sol$/.test(f);
}

/**
 * B-11a. An interface pointed at the precompile that declares a verification function whose name
 * is not a real selector. A call to it computes a selector the precompile does not implement, so
 * the contract cannot be talking to the real precompile.
 */
function checkFakeSelectors(file: string, rel: string, content: string): StaticFinding[] {
  if (extname(file) !== ".sol" || isTestPath(rel)) return [];
  const findings: StaticFinding[] = [];
  for (const fake of FAKE_SELECTORS) {
    const re = new RegExp(`function\\s+${fake}\\s*\\(`, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(content))) {
      findings.push({
        id: "B-11",
        title: "Verification via a selector the precompile does not implement",
        file: rel,
        line: lineOf(content, m.index),
        evidence: `declares ${fake}(...)`,
        note: `${fake} is an SDK method name, not an on-chain selector. The precompile exposes only ${[...REAL_SELECTORS].join(", ")}. A contract calling ${fake} at 0x0FD2 cannot reach the real precompile.`,
      });
    }
  }
  return findings;
}

/**
 * B-11b. A PROOF verifier address held in mutable storage with an owner setter. If the verifier can
 * be pointed at a mock, every cryptographic guarantee becomes the owner's discretion.
 *
 * The hard part is not finding `setVerifier` — it is telling a swappable *proof verifier* apart from
 * an authorized-*caller* role that happens to be named "verifier". Two discriminators, both read from
 * the source, decide it (this is what a v1 name-only heuristic got wrong on 8 sound contracts):
 *   - if the var is compared against `msg.sender` anywhere, it is an authorized-caller role, not a
 *     proof verifier. Suppress.
 *   - if the setter body guards on the state var being zero (write-once), it is not swappable.
 *     Suppress.
 * Only a setter that is neither leaves a genuinely swappable proof verifier.
 */
function checkSwappableVerifier(file: string, rel: string, content: string): StaticFinding[] {
  if (extname(file) !== ".sol") return [];
  const findings: StaticFinding[] = [];
  const setterRe = /function\s+(set\w*[Vv]erifier\w*)\s*\([^)]*\)[^{]*\{([^}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = setterRe.exec(content))) {
    const body = m[2];
    // A real assignment (single `=`), not a `==`/`!=` comparison on a param zero-check.
    const assign = /(\w*[Vv]erifier\w*)\s*=(?!=)/.exec(body);
    if (!assign) continue;
    const varName = assign[1];
    const esc = varName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Authorized-caller role: the var gates msg.sender somewhere. Not a proof verifier.
    const roleGuard = new RegExp(`msg\\.sender\\s*[!=]=\\s*${esc}\\b|${esc}\\s*[!=]=\\s*msg\\.sender`).test(content);
    // Write-once: the setter refuses to run if the state var is already set.
    const writeOnce = new RegExp(`${esc}\\s*!=\\s*address\\(0\\)`).test(body) || new RegExp(`require\\s*\\(\\s*${esc}\\s*==\\s*address\\(0\\)`).test(body);
    if (roleGuard || writeOnce) continue;

    findings.push({
      id: "B-11",
      title: "Proof verifier is swappable after deployment",
      file: rel,
      line: lineOf(content, m.index),
      evidence: `${m[1]}(...) assigns ${varName}`,
      note: "The proof verifier target lives in mutable storage with no write-once or timelock guard, and is not an authorized-caller role. If the owner can point it at a mock, on-chain verification is decorative. Address the precompile as an immutable constant instead.",
    });
  }
  return findings;
}

/**
 * B-11c. A mock of the verifier interface in the tree. Not a defect by itself, but a mock plus a
 * swappable verifier is how a demo ends up not touching the real precompile at all. Reported as
 * context alongside B-11b.
 */
function checkVerifierMock(file: string, rel: string, content: string): StaticFinding[] {
  if (extname(file) !== ".sol" || isTestPath(rel)) return [];
  const re = /contract\s+(\w*Mock\w*(?:Verifier|Prover|Precompile)\w*|\w*(?:Verifier|Prover|Precompile)\w*Mock\w*)\s+is\s+/g;
  const findings: StaticFinding[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    findings.push({
      id: "B-11",
      title: "A mock verifier is present in the source tree",
      file: rel,
      line: lineOf(content, m.index),
      evidence: `contract ${m[1]}`,
      note: "A mock is fine for tests. Combined with a swappable verifier address it is the mechanism by which a deployed demo can bypass the real precompile. Confirm production never points the verifier here.",
    });
  }
  return findings;
}

/**
 * B-11d. A contract that presents itself as an Attestcoin consumer but verifies its "attestation"
 * with an off-chain signature (ecrecover) and never calls the precompile. The protocol's
 * inclusion+continuity proof is replaced by a single trusted signer, so the whole guarantee reduces
 * to one key the owner controls. Flagged only when the precompile is genuinely absent from the file.
 */
function checkSignatureInsteadOfPrecompile(file: string, rel: string, content: string): StaticFinding[] {
  if (extname(file) !== ".sol" || isTestPath(rel)) return [];
  const usesEcrecover = /\becrecover\s*\(/.test(content);
  const claimsAttestation = /attest(ation|coin)?/i.test(content);
  const callsPrecompile = /verifyAndEmit|calculateTxIndex|BlockProver|0x0*0?FD2|\.verify\s*\(/i.test(content);
  if (!usesEcrecover || !claimsAttestation || callsPrecompile) return [];
  const m = /\becrecover\s*\(/.exec(content);
  return [{
    id: "B-11",
    title: "Attestation verified by signature, not the precompile",
    file: rel,
    line: m ? lineOf(content, m.index) : 1,
    evidence: "ecrecover(...) with no precompile call in the file",
    note: "The contract presents itself as an Attestcoin consumer but verifies its attestation with an off-chain ECDSA signature (ecrecover) and never calls the precompile at 0x0FD2. The inclusion+continuity proof is replaced by a single owner-set signer; a compromised or malicious validator key mints arbitrary attestations.",
  }];
}

/**
 * B-01. A consumer that decodes a proven receipt but never reads receiptStatus. The precompile
 * proves inclusion, not success. On EVM sources a reverted transaction carries no logs, so a
 * log-presence check often masks this — which is why it is reported as review, not a build failure.
 * On non-EVM sources or with a custom decoder, an included-but-reverted transaction is consumed as
 * if it had succeeded. Fires only when the file decodes a receipt and no receiptStatus read appears
 * anywhere in it.
 */
function checkReceiptStatusUnchecked(file: string, rel: string, content: string): StaticFinding[] {
  if (extname(file) !== ".sol" || isTestPath(rel)) return [];
  const decodes = /decodeReceiptFields\s*\(/.exec(content);
  if (!decodes) return [];
  if (/receiptStatus/.test(content)) return [];
  return [{
    id: "B-01",
    title: "Acts on a proven receipt without checking it succeeded",
    file: rel,
    line: lineOf(content, decodes.index),
    evidence: "decodeReceiptFields(...) with no receiptStatus read in the file",
    note: "The precompile proves inclusion, not success. This file decodes a receipt but never reads receiptStatus. On EVM sources a reverted transaction carries no logs, so a log-presence check usually masks this; on non-EVM sources or with a custom decoder, an included-but-reverted transaction is consumed as if it succeeded. Read receipt.receiptStatus == 1 explicitly.",
  }];
}

/** True if the file pins a proven log's emitter: compares log.address_ or indexes a map by it. */
function pinsEmitter(content: string): boolean {
  return (
    /\.address_\s*[!=]=/.test(content) ||               // log.address_ == X
    /[!=]=\s*[A-Za-z0-9_.\[\]]*\.address_/.test(content) || // X == log.address_
    /\[[^\]\n]*\.address_[^\]\n]*\]/.test(content)      // registry[log.address_]
  );
}

/**
 * B-02. A consumer that selects a log from a proven receipt but never pins the emitting contract.
 * Any contract that emits the same event signature is then trusted: an attacker deploys a look-alike,
 * emits the event, proves it, and drives the consumer. This is the emitter-guard hole demonstrated
 * on-chain by more than one team in this field. Fires only when the file selects a log and no
 * emitter comparison or registry lookup on log.address_ appears anywhere in it.
 */
function checkEmitterUnpinned(file: string, rel: string, content: string): StaticFinding[] {
  if (extname(file) !== ".sol" || isTestPath(rel)) return [];
  const selects = /getLogsByEventSignature\s*\(|\.receiptLogs\b/.exec(content);
  if (!selects) return [];
  if (pinsEmitter(content)) return [];
  return [{
    id: "B-02",
    title: "Selects a proven log without pinning the emitting contract",
    file: rel,
    line: lineOf(content, selects.index),
    evidence: "log selection with no log.address_ emitter check in the file",
    note: "The receipt is proven, but the log is trusted by event signature alone. Any contract that emits the same signature is accepted, so an attacker deploys a look-alike, emits the event, and proves it. Pin the emitter: require log.address_ to equal the registered source contract (or index a registry by it).",
  }];
}

/**
 * B-12. An off-chain generator whose catch block returns a value that upstream reads as a negative
 * observation, or that returns success while zeroing the proof. A failure to look is being reported
 * as having looked and found nothing.
 */
function checkCatchAsEvidence(file: string, rel: string, content: string): StaticFinding[] {
  if (extname(file) === ".sol") return [];
  const findings: StaticFinding[] = [];
  // A plain catch-returns-null is only a B-12 when the file actually generates a proof or absence
  // observation. In off-chain UI/worker code it is ordinary error handling, not a manufactured
  // negative. The strong pattern (blanked proof but success:true) is always reported.
  const proofRelated = /proof|absence|attest|evidence|inclusion|continuity/i.test(rel);
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!/\bcatch\b/.test(lines[i])) continue;
    // Inspect the next few lines of the catch body.
    const body = lines.slice(i, Math.min(i + 12, lines.length)).join("\n");
    const returnsNull = /return\s+null\s*;/.test(body);
    const zeroesProof = /(continuityProof|merkleProof|proof)\s*=\s*["']0x/.test(body);
    const stillSucceeds = /success\s*:\s*true/.test(body);
    if (returnsNull && proofRelated) {
      findings.push({
        id: "B-12",
        title: "Generator returns null on failure, read upstream as absence",
        file: rel,
        line: i + 1,
        evidence: "catch { ... return null }",
        note: "A scan that throws and returns null cannot be distinguished from a scan that found nothing. If null means 'no payment' anywhere upstream, a dead RPC manufactures a negative result.",
      });
    }
    if (zeroesProof && stillSucceeds) {
      findings.push({
        id: "B-12",
        title: "Generator zeroes the proof on failure but still reports success",
        file: rel,
        line: i + 1,
        evidence: "catch { proof = '0x'; ... success: true }",
        note: "The proof generation failed, the proof was blanked, and the result still claims success. A consumer trusting that flag acts on an empty proof.",
      });
    }
  }
  return findings;
}

export function analyzeTree(root: string): StaticFinding[] {
  const files = walk(root);
  const findings: StaticFinding[] = [];
  for (const file of files) {
    const rel = relative(root, file).replace(/\\/g, "/");
    const content = readFileSync(file, "utf8");
    // Comment-stripped view for presence/absence checks, so a guard described in a comment cannot
    // stand in for a guard that is missing from the code. Offsets are preserved, so lineOf is exact.
    const code = stripComments(content);
    findings.push(...checkFakeSelectors(file, rel, content));
    findings.push(...checkSwappableVerifier(file, rel, content));
    findings.push(...checkVerifierMock(file, rel, content));
    findings.push(...checkSignatureInsteadOfPrecompile(file, rel, content));
    findings.push(...checkReceiptStatusUnchecked(file, rel, code));
    findings.push(...checkEmitterUnpinned(file, rel, code));
    findings.push(...checkCatchAsEvidence(file, rel, content));
  }
  return findings;
}
