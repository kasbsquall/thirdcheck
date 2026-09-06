/**
 * Day 7 fan-out: run the static analyzer over every cloned submission repo and aggregate.
 *
 *   npx ts-node scripts/run-day7.ts <dir-of-cloned-repos>
 *
 * Reads only. Never installs or executes anything from the target repos. Writes one aggregate
 * report to data/day7-findings.json: per repo, the static binding-defect findings with file:line.
 * Author names are not recorded; the repo folder name is kept only so we can privately disclose.
 */
import { readdirSync, statSync, writeFileSync } from "fs";
import { join, resolve } from "path";

import { analyzeTree } from "../src/static";

function main() {
  const base = process.argv[2];
  if (!base) {
    console.error("\n  usage: npx ts-node scripts/run-day7.ts <dir-of-cloned-repos>\n");
    process.exitCode = 1;
    return;
  }
  const root = resolve(base);
  const repos = readdirSync(root).filter((n) => {
    try { return statSync(join(root, n)).isDirectory(); } catch { return false; }
  });

  const results: { repo: string; findingCount: number; findings: ReturnType<typeof analyzeTree> }[] = [];
  for (const repo of repos) {
    let findings: ReturnType<typeof analyzeTree> = [];
    try {
      findings = analyzeTree(join(root, repo));
    } catch (e) {
      console.log(`  ${repo}: skipped (${e instanceof Error ? e.message : String(e)})`);
      continue;
    }
    results.push({ repo, findingCount: findings.length, findings });
    console.log(`  ${repo.padEnd(38)} ${findings.length} finding(s)`);
  }

  results.sort((a, b) => b.findingCount - a.findingCount);
  const withFindings = results.filter((r) => r.findingCount > 0);
  const totalFindings = results.reduce((s, r) => s + r.findingCount, 0);

  const report = {
    generatedAt: new Date().toISOString(),
    reposScanned: results.length,
    reposWithFindings: withFindings.length,
    totalFindings,
    results,
  };
  const path = resolve(__dirname, "..", "data", "day7-findings.json");
  writeFileSync(path, JSON.stringify(report, null, 2));
  console.log(`\n  ${results.length} repos scanned, ${withFindings.length} with findings, ${totalFindings} findings total`);
  console.log(`  report written to ${path}\n`);
}

main();
