/**
 * Loads the bench and static-analysis reports from the repo's data directory at build time.
 * Server-only: uses fs, runs in a server component.
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const DATA_DIR = resolve(process.cwd(), "..", "data");

export type AttackStatus = "accepted" | "rejected" | "error";

export interface Finding {
  id: string;
  title: string;
  status: AttackStatus;
  detail: string;
  evidenceTx?: string;
  sourceTx?: string;
}

export interface BenchReport {
  target: string;
  escrow: string;
  chainKey: number;
  generatedAt: string;
  findings: Finding[];
}

export interface StaticFinding {
  id: string;
  title: string;
  file: string;
  line: number;
  evidence: string;
  note: string;
}

export interface StaticReport {
  target: string;
  generatedAt: string;
  findings: StaticFinding[];
}

function readJson<T>(name: string): T | null {
  const path = resolve(DATA_DIR, name);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function loadVulnerable(): BenchReport | null {
  return readJson<BenchReport>("bench-vulnerable.json");
}

export function loadHardened(): BenchReport | null {
  return readJson<BenchReport>("bench-hardened.json");
}

export function loadStatic(name: string): StaticReport | null {
  return readJson<StaticReport>(`static-${name}.json`);
}

/** Catalogue metadata, so the bulletin can show all twelve entries with coverage, not only the run ones. */
export interface CatalogueEntry {
  id: string;
  title: string;
  detection: "dynamic" | "static" | "documented";
}

export const CATALOGUE: CatalogueEntry[] = [
  { id: "B-01", title: "Receipt status not read; a reverted payment counts", detection: "dynamic" },
  { id: "B-02", title: "Emitting contract not pinned; a look-alike forges the event", detection: "dynamic" },
  { id: "B-03", title: "Event signature not checked", detection: "documented" },
  { id: "B-04", title: "No replay guard on the proof itself", detection: "dynamic" },
  { id: "B-05", title: "Chain identity of the proof not checked", detection: "documented" },
  { id: "B-06", title: "Proven transaction not bound to the business object", detection: "dynamic" },
  { id: "B-07", title: "Fields not bound: payer, recipient, amount", detection: "documented" },
  { id: "B-08", title: "Block window not constrained", detection: "documented" },
  { id: "B-09", title: "Only the first log read; a decoy wins", detection: "dynamic" },
  { id: "B-10", title: "Acts before the attestation frontier advances", detection: "static" },
  { id: "B-11", title: "Verifier swappable, or addressed by a non-existent selector", detection: "static" },
  { id: "B-12", title: "Off-chain failure treated as a negative observation", detection: "static" },
];

export const CC3_EXPLORER = "https://creditcoin-testnet.blockscout.com/tx/";
export const SEPOLIA_EXPLORER = "https://sepolia.etherscan.io/tx/";
