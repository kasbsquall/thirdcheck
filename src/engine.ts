/**
 * The static analysis engine — pure, filesystem-free.
 *
 * Every check here operates on a single file's path and content and returns file:line findings.
 * It has no `fs` dependency, so it runs unchanged in Node (via the CLI/gate walker in static.ts)
 * and in a server route (the live web checker). Keeping one engine means the gate a judge runs in
 * CI and the verdict a judge gets in the browser come from exactly the same code.
 *
 * It is heuristic and line-oriented, not a full parser. A hackathon does not need a compiler front
 * end to catch these patterns, and every finding points at a line a human can read in five seconds.
 *
 *   B-01  a proven receipt is acted on without checking it succeeded (review)
 *   B-02  a proven log is acted on without pinning the emitting contract (review)
 *   B-11  the precompile can be swapped, or is addressed by a selector that does not exist
 *   B-12  an off-chain generator treats a failure as a negative observation
 */
import { extname } from "path";

export interface StaticFinding {
  id: string;
  title: string;
  file: string;
  line: number;
  evidence: string;
  note: string;
}

/** The only function names the block prover precompile actually answers to. */
export const REAL_SELECTORS = new Set(["verify", "verifyAndEmit", "calculateTxIndex"]);
/** Names that appear on the SDK class but are NOT on-chain selectors. */
export const FAKE_SELECTORS = ["verifySingle", "verifyBatch", "verifyAndEmitSingle", "verifyAndEmitBatch"];

/** extname without importing path in browser bundles that dislike it — but path.extname is safe here. */
function ext(file: string): string {
  return extname(file);
}

function lineOf(content: string, index: number): number {
  return content.slice(0, index).split("\n").length;
}

/**
 * Blank out // and comment blocks, preserving every newline and the exact character offsets so
 * lineOf stays accurate. Without this, a contract that omits a guard but *describes* the missing
 * guard in a comment would suppress its own finding — an evasion a real gate must not fall for.
 */
export function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, " "));
}

/** Test/mock scaffolding: a mock or SDK-name selector here is expected practice, not a defect. */
function isTestPath(rel: string): boolean {
  const f = rel.toLowerCase();
  return /(^|\/)(tests?|mocks?|helpers)\//.test(f) || /\.t\.sol$/.test(f);
}

/**
 * B-11a. An interface pointed at the precompile that declares a verification function whose name
 * is not a real selector. A call to it computes a selector the precompile does not implement.
 */
function checkFakeSelectors(file: string, rel: string, content: string): StaticFinding[] {
  if (ext(file) !== ".sol" || isTestPath(rel)) return [];
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
 * B-11b. A PROOF verifier address held in mutable storage with an owner setter. Distinguished from
 * an authorized-caller role (compared to msg.sender) and a write-once setter, both of which are fine.
 */
function checkSwappableVerifier(file: string, rel: string, content: string): StaticFinding[] {
  if (ext(file) !== ".sol") return [];
  const findings: StaticFinding[] = [];
  const setterRe = /function\s+(set\w*[Vv]erifier\w*)\s*\([^)]*\)[^{]*\{([^}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = setterRe.exec(content))) {
    const body = m[2];
    const assign = /(\w*[Vv]erifier\w*)\s*=(?!=)/.exec(body);
    if (!assign) continue;
    const varName = assign[1];
    const esc = varName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const roleGuard = new RegExp(`msg\\.sender\\s*[!=]=\\s*${esc}\\b|${esc}\\s*[!=]=\\s*msg\\.sender`).test(content);
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

/** B-11c. A mock of the verifier interface in the tree. Context alongside B-11b. */
function checkVerifierMock(file: string, rel: string, content: string): StaticFinding[] {
  if (ext(file) !== ".sol" || isTestPath(rel)) return [];
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

/** B-11d. Presents as an Attestcoin consumer but verifies with ecrecover and never calls the precompile. */
function checkSignatureInsteadOfPrecompile(file: string, rel: string, content: string): StaticFinding[] {
  if (ext(file) !== ".sol" || isTestPath(rel)) return [];
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
 * B-01. Decodes a proven receipt but never reads receiptStatus. On EVM sources a reverted tx carries
 * no logs, so a log-presence check often masks this — reported as review, not a build failure.
 */
function checkReceiptStatusUnchecked(file: string, rel: string, content: string): StaticFinding[] {
  if (ext(file) !== ".sol" || isTestPath(rel)) return [];
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
    /\.address_\s*[!=]=/.test(content) ||
    /[!=]=\s*[A-Za-z0-9_.\[\]]*\.address_/.test(content) ||
    /\[[^\]\n]*\.address_[^\]\n]*\]/.test(content)
  );
}

/**
 * B-02. Selects a log from a proven receipt but never pins the emitting contract. Any contract that
 * emits the same event signature is then trusted — the emitter-guard hole.
 */
function checkEmitterUnpinned(file: string, rel: string, content: string): StaticFinding[] {
  if (ext(file) !== ".sol" || isTestPath(rel)) return [];
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

/** B-12. Off-chain generator that treats a failure as a negative observation. TS/JS only. */
function checkCatchAsEvidence(file: string, rel: string, content: string): StaticFinding[] {
  if (ext(file) === ".sol") return [];
  const findings: StaticFinding[] = [];
  const proofRelated = /proof|absence|attest|evidence|inclusion|continuity/i.test(rel);
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!/\bcatch\b/.test(lines[i])) continue;
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

/**
 * Run every per-file check on one file. `rel` is the display path (also used to skip test scaffolding
 * and to gate the off-chain B-12 checks by filename); `content` is the raw file text.
 */
export function analyzeSource(rel: string, content: string): StaticFinding[] {
  const file = rel;
  // Comment-stripped view for presence/absence checks, so a guard described in a comment cannot
  // stand in for a guard missing from the code. Offsets are preserved, so lineOf is exact.
  const code = stripComments(content);
  return [
    ...checkFakeSelectors(file, rel, content),
    ...checkSwappableVerifier(file, rel, content),
    ...checkVerifierMock(file, rel, content),
    ...checkSignatureInsteadOfPrecompile(file, rel, content),
    ...checkReceiptStatusUnchecked(file, rel, code),
    ...checkEmitterUnpinned(file, rel, code),
    ...checkCatchAsEvidence(file, rel, content),
  ];
}
