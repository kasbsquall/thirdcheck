/**
 * Live third-check verdict. POST { source } to analyze pasted Solidity, or { url } to fetch and
 * analyze a GitHub file or repository. Runs the SAME engine as the CI gate (src/engine.ts), so the
 * verdict a judge gets here is the verdict the gate would give in a pull request.
 */
import { NextResponse } from "next/server";
import { analyzeSource, type StaticFinding } from "../../../../src/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SOURCE_BYTES = 400_000;
const MAX_REPO_FILES = 40;

interface Analyzed {
  file: string;
  findings: StaticFinding[];
}

/** Turn a github.com blob/tree URL into { owner, repo, branch?, path? }. */
function parseGitHub(url: string): { owner: string; repo: string; branch?: string; path?: string } | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com" && u.hostname !== "raw.githubusercontent.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const [owner, repo, kind, branch, ...rest] = parts;
    if (u.hostname === "raw.githubusercontent.com") {
      // raw: owner/repo/branch/path...
      const [, , b, ...p] = parts;
      return { owner, repo, branch: b, path: p.join("/") };
    }
    if (kind === "blob" || kind === "tree") {
      return { owner, repo, branch, path: rest.join("/") || undefined };
    }
    return { owner, repo };
  } catch {
    return null;
  }
}

async function ghJson(url: string): Promise<any> {
  const r = await fetch(url, { headers: { accept: "application/vnd.github+json", "user-agent": "thirdcheck" } });
  if (!r.ok) throw new Error(`GitHub ${r.status} for ${url}`);
  return r.json();
}

async function ghText(url: string): Promise<string> {
  const r = await fetch(url, { headers: { "user-agent": "thirdcheck" } });
  if (!r.ok) throw new Error(`fetch ${r.status} for ${url}`);
  return r.text();
}

/** Collect the analyzable files behind a GitHub URL: one file, or a repo's .sol/.ts tree (capped). */
async function collectFromGitHub(url: string): Promise<Analyzed[]> {
  const g = parseGitHub(url);
  if (!g) throw new Error("Not a github.com URL. Paste a repo, a file, or the contract source itself.");

  // Single file (blob or raw).
  if (g.path && /\.(sol|ts|js)$/.test(g.path)) {
    const branch = g.branch || "main";
    const raw = `https://raw.githubusercontent.com/${g.owner}/${g.repo}/${branch}/${g.path}`;
    const content = await ghText(raw);
    return [{ file: g.path, findings: analyzeSource(g.path, content) }];
  }

  // Whole repo: resolve default branch, list the tree, take .sol first (then .ts), capped.
  let branch = g.branch;
  if (!branch) {
    const meta = await ghJson(`https://api.github.com/repos/${g.owner}/${g.repo}`);
    branch = meta.default_branch || "main";
  }
  const tree = await ghJson(`https://api.github.com/repos/${g.owner}/${g.repo}/git/trees/${branch}?recursive=1`);
  const all: string[] = (tree.tree || [])
    .filter((n: any) => n.type === "blob")
    .map((n: any) => n.path as string)
    .filter((p: string) => /\.(sol|ts|js)$/.test(p))
    .filter((p: string) => !/node_modules\/|\/lib\/forge-std\/|artifacts\/|typechain/.test(p));
  const sol = all.filter((p) => p.endsWith(".sol"));
  const rest = all.filter((p) => !p.endsWith(".sol"));
  const picked = [...sol, ...rest].slice(0, MAX_REPO_FILES);
  if (picked.length === 0) throw new Error("No Solidity/TypeScript files found in that repository.");

  const out: Analyzed[] = [];
  for (const p of picked) {
    try {
      const raw = `https://raw.githubusercontent.com/${g.owner}/${g.repo}/${branch}/${p}`;
      const content = await ghText(raw);
      out.push({ file: p, findings: analyzeSource(p, content) });
    } catch {
      // Skip an unreadable file rather than failing the whole scan.
    }
  }
  return out;
}

export async function POST(req: Request) {
  let body: { source?: string; url?: string; filename?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON { source } or { url }." }, { status: 400 });
  }

  try {
    let analyzed: Analyzed[];
    let scanned: string;

    if (body.source && body.source.trim()) {
      if (body.source.length > MAX_SOURCE_BYTES) {
        return NextResponse.json({ error: "Source too large (400 KB max)." }, { status: 413 });
      }
      const name = (body.filename || "pasted.sol").replace(/[^a-zA-Z0-9._/-]/g, "");
      analyzed = [{ file: name, findings: analyzeSource(name, body.source) }];
      scanned = name;
    } else if (body.url && body.url.trim()) {
      analyzed = await collectFromGitHub(body.url.trim());
      scanned = body.url.trim();
    } else {
      return NextResponse.json({ error: "Paste a contract or give a GitHub URL." }, { status: 400 });
    }

    const findings = analyzed.flatMap((a) => a.findings);
    const errorClass = findings.filter((f) => isErrorClass(f));
    const reviewClass = findings.filter((f) => !isErrorClass(f));

    return NextResponse.json({
      scanned,
      filesScanned: analyzed.length,
      verdict: errorClass.length > 0 ? "fail" : reviewClass.length > 0 ? "review" : "pass",
      counts: { error: errorClass.length, review: reviewClass.length },
      findings: [...errorClass, ...reviewClass].map((f) => ({ ...f, severity: isErrorClass(f) ? "error" : "review" })),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}

/** Mirror of the gate's severity rule so the web verdict matches CI exactly. */
function isErrorClass(f: StaticFinding): boolean {
  const t = f.title.toLowerCase();
  return (
    t.includes("signature, not the precompile") ||
    t.includes("selector the precompile does not implement") ||
    t.includes("swappable after deployment") ||
    t.includes("reports success")
  );
}
