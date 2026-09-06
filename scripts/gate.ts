/**
 * ThirdCheck CI gate. Runs the static analyzer over a repository and fails the build when an
 * Attestcoin consumer skips the third check in a way ThirdCheck stands behind.
 *
 *   ts-node scripts/gate.ts <path> <fail-on>
 *     <path>     directory to scan (default: $GITHUB_WORKSPACE or ".")
 *     <fail-on>  "confirmed" (default) fails only on defect-class findings; "any" fails on reviews too
 *
 * Emits GitHub Actions annotations (::error / ::warning) so findings show inline on the PR, and a
 * job summary when $GITHUB_STEP_SUMMARY is set. Exit code is non-zero when the threshold is crossed.
 */
import { resolve } from "path";
import { appendFileSync } from "fs";
import { analyzeTree, type StaticFinding } from "../src/static";

type Sev = "error" | "warning";

/** Which findings are defect-class (fail the build) vs review-class (warn). */
function severityOf(f: StaticFinding): Sev {
  const t = f.title.toLowerCase();
  if (t.includes("signature, not the precompile")) return "error";
  if (t.includes("selector the precompile does not implement")) return "error";
  if (t.includes("swappable after deployment")) return "error";
  if (t.includes("without verifying the proof")) return "error"; // discarded proof, forgeable record
  if (t.includes("reports success")) return "error"; // blanked proof but success:true
  return "warning"; // mock-in-src, catch-returns-null on a proof path
}

function ghEscape(s: string): string {
  return s.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

function main() {
  const target = resolve(process.argv[2] || process.env.GITHUB_WORKSPACE || ".");
  const failOn = (process.argv[3] || "confirmed").toLowerCase() === "any" ? "any" : "confirmed";

  let findings: StaticFinding[] = [];
  try {
    findings = analyzeTree(target);
  } catch (e) {
    console.error(`ThirdCheck gate: could not scan ${target}: ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
    return;
  }

  const errors = findings.filter((f) => severityOf(f) === "error");
  const warnings = findings.filter((f) => severityOf(f) === "warning");

  // Inline annotations.
  for (const f of findings) {
    const sev = severityOf(f);
    const msg = ghEscape(`[${f.id}] ${f.title} — ${f.evidence}. ${f.note}`);
    console.log(`::${sev} file=${f.file},line=${f.line},title=ThirdCheck ${f.id}::${msg}`);
  }

  // Human summary.
  const lines: string[] = [];
  lines.push("# ThirdCheck — the third check");
  lines.push("");
  if (findings.length === 0) {
    lines.push("No third-check binding defects found. Every proof consumer scanned reaches the");
    lines.push("precompile and binds what it acts on.");
  } else {
    lines.push(`Found **${errors.length}** defect-class and **${warnings.length}** review-class finding(s).`);
    lines.push("");
    lines.push("| sev | id | where | what |");
    lines.push("|---|---|---|---|");
    for (const f of [...errors, ...warnings]) {
      const sev = severityOf(f) === "error" ? "fail" : "review";
      lines.push(`| ${sev} | ${f.id} | \`${f.file}:${f.line}\` | ${f.title} |`);
    }
    lines.push("");
    lines.push("The precompile proves inclusion and continuity. Everything else is the third check.");
    lines.push("Reproduce and read more: https://github.com/kasbsquall/thirdcheck");
  }
  const summary = lines.join("\n");
  console.log("\n" + summary + "\n");
  if (process.env.GITHUB_STEP_SUMMARY) {
    try { appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + "\n"); } catch { /* best effort */ }
  }

  const failed = failOn === "any" ? findings.length > 0 : errors.length > 0;
  if (failed) {
    console.error(`\nThirdCheck gate: ${failOn === "any" ? findings.length : errors.length} blocking finding(s). Failing the build.`);
    process.exitCode = 1;
  } else {
    console.log(`ThirdCheck gate: passed${warnings.length ? ` (${warnings.length} review finding(s) to look at)` : ""}.`);
  }
}

main();
