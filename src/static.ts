/**
 * The static analyzer — filesystem walker.
 *
 * This is the Node/CLI/gate entry point. It walks a directory tree and hands each Solidity/TS/JS
 * file to the pure engine in ./engine, which holds every check. Splitting the walker from the engine
 * lets the same checks run in a server route (the live web checker) without pulling in `fs`.
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative, extname } from "path";
import { analyzeSource, type StaticFinding } from "./engine";

export { analyzeSource } from "./engine";
export type { StaticFinding } from "./engine";

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

export function analyzeTree(root: string): StaticFinding[] {
  const files = walk(root);
  const findings: StaticFinding[] = [];
  for (const file of files) {
    const rel = relative(root, file).replace(/\\/g, "/");
    const content = readFileSync(file, "utf8");
    findings.push(...analyzeSource(rel, content));
  }
  return findings;
}
