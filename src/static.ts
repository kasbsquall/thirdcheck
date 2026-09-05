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
 * B-11a. An interface pointed at the precompile that declares a verification function whose name
 * is not a real selector. A call to it computes a selector the precompile does not implement, so
 * the contract cannot be talking to the real precompile.
 */
function checkFakeSelectors(file: string, rel: string, content: string): StaticFinding[] {
  if (extname(file) !== ".sol") return [];
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
 * B-11b. A verifier address held in mutable storage with an owner-only setter. If the verifier can
 * be pointed at a mock, every cryptographic guarantee becomes the owner's discretion.
 */
function checkSwappableVerifier(file: string, rel: string, content: string): StaticFinding[] {
  if (extname(file) !== ".sol") return [];
  const findings: StaticFinding[] = [];
  // A setter that assigns to a state var whose name suggests it is the verifier.
  const setterRe = /function\s+(set\w*[Vv]erifier\w*)\s*\([^)]*\)[^{]*\{([^}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = setterRe.exec(content))) {
    const body = m[2];
    const assign = /(\w*[Vv]erifier\w*)\s*=/.exec(body);
    if (assign) {
      findings.push({
        id: "B-11",
        title: "Verifier address is swappable after deployment",
        file: rel,
        line: lineOf(content, m.index),
        evidence: `${m[1]}(...) assigns ${assign[1]}`,
        note: "The verifier target lives in mutable storage. If the owner can point it at a mock, on-chain verification is decorative. Address the precompile as an immutable constant instead.",
      });
    }
  }
  return findings;
}

/**
 * B-11c. A mock of the verifier interface in the tree. Not a defect by itself, but a mock plus a
 * swappable verifier is how a demo ends up not touching the real precompile at all. Reported as
 * context alongside B-11b.
 */
function checkVerifierMock(file: string, rel: string, content: string): StaticFinding[] {
  if (extname(file) !== ".sol") return [];
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
 * B-12. An off-chain generator whose catch block returns a value that upstream reads as a negative
 * observation, or that returns success while zeroing the proof. A failure to look is being reported
 * as having looked and found nothing.
 */
function checkCatchAsEvidence(file: string, rel: string, content: string): StaticFinding[] {
  if (extname(file) === ".sol") return [];
  const findings: StaticFinding[] = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!/\bcatch\b/.test(lines[i])) continue;
    // Inspect the next few lines of the catch body.
    const body = lines.slice(i, Math.min(i + 12, lines.length)).join("\n");
    const returnsNull = /return\s+null\s*;/.test(body);
    const zeroesProof = /(continuityProof|merkleProof|proof)\s*=\s*["']0x/.test(body);
    const stillSucceeds = /success\s*:\s*true/.test(body);
    if (returnsNull) {
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
    findings.push(...checkFakeSelectors(file, rel, content));
    findings.push(...checkSwappableVerifier(file, rel, content));
    findings.push(...checkVerifierMock(file, rel, content));
    findings.push(...checkCatchAsEvidence(file, rel, content));
  }
  return findings;
}
