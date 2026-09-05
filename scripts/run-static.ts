/**
 * Runs the static analyzer over a source tree and prints findings.
 *
 *   npx ts-node scripts/run-static.ts <path-to-repo>
 *
 * Writes a JSON report to data/static-<name>.json.
 */
import { writeFileSync } from "fs";
import { resolve, basename } from "path";
import { analyzeTree } from "../src/static";

function main() {
  const target = process.argv[2];
  if (!target) {
    console.error("\n  usage: npx ts-node scripts/run-static.ts <path-to-repo>\n");
    process.exitCode = 1;
    return;
  }

  const root = resolve(target);
  const findings = analyzeTree(root);

  console.log(`\n  ThirdCheck static analyzer`);
  console.log(`  target: ${root}\n`);

  if (findings.length === 0) {
    console.log("  no static binding defects found\n");
  } else {
    for (const f of findings) {
      console.log(`  ${f.id}  ${f.title}`);
      console.log(`        ${f.file}:${f.line}  (${f.evidence})`);
      console.log(`        ${f.note}\n`);
    }
    console.log(`  ${findings.length} finding(s)\n`);
  }

  const name = basename(root);
  const path = resolve(__dirname, "..", "data", `static-${name}.json`);
  writeFileSync(path, JSON.stringify({ target: root, generatedAt: new Date().toISOString(), findings }, null, 2));
  console.log(`  report written to ${path}\n`);
}

main();
