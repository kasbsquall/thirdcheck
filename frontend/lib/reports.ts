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

/** Ecosystem scorecard: ThirdCheck's own catalogue applied to every submission, anonymised. */
export type ScoreMark = "y" | "p" | "n" | "na" | "flag";
export type ScoreDepth = "deep" | "solid" | "light" | "absent";

export interface ScorecardChecks {
  receipt: ScoreMark;
  emitter: ScoreMark;
  event: ScoreMark;
  replay: ScoreMark;
  chain: ScoreMark;
  order: ScoreMark;
  fields: ScoreMark;
  window: ScoreMark;
  logsel: ScoreMark;
}

export interface ScorecardRow {
  code: string;
  track: string;
  depth: ScoreDepth;
  score: number;
  checks: ScorecardChecks;
  redFlagCount: number;
}

export interface ScorecardDistribution {
  id: string;
  label: string;
  applicable: number;
  yes: number;
  partial: number;
  flagged: number;
}

export interface Scorecard {
  generatedAt: string;
  method: string;
  total: number;
  consumersEvaluated: number;
  withRedFlags: number;
  checkLegend: { id: string; label: string }[];
  distribution: ScorecardDistribution[];
  depthCounts: { depth: ScoreDepth; count: number }[];
  rows: ScorecardRow[];
}

export function loadScorecard(): Scorecard | null {
  return readJson<Scorecard>("scorecard.json");
}

/** Precompile conformance: the full protocol surface ThirdCheck exercises. */
export type ConformanceKind = "live" | "onchain" | "probed" | "enumerated";
export interface ConformanceEntry {
  precompile: string;
  signature: string;
  selector: string;
  mutability: string;
  kind: ConformanceKind;
  detail: string;
}
export interface Conformance {
  generatedAt: string;
  precompiles: Record<string, { address: string; entryPoints: number }>;
  surface: {
    totalEntryPoints: number;
    exercised: number;
    live: number;
    onchain: number;
    probed: number;
    enumerated: number;
    typicalConsumerEntryPoints: number;
  };
  decoderSurface: string[];
  entries: ConformanceEntry[];
}

export function loadConformance(): Conformance | null {
  return readJson<Conformance>("conformance.json");
}

export const CHECK_ORDER: (keyof ScorecardChecks)[] = [
  "receipt", "emitter", "event", "replay", "chain", "order", "fields", "window", "logsel",
];

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

/** A real end-to-end settlement through the SettlementHub, mined on CC3. */
export interface HubSettlement {
  hub: string;
  orderId: string;
  operator: string;
  seller: string;
  amount: string;
  chainKey: number;
  payout: string | null;
  fee: string | null;
  released: boolean;
  sourceTx: { hash: string; block: number; url: string };
  openOrderTx: { hash: string; url: string };
  settleTx: { hash: string; block: number; url: string };
  generatedAt: string;
}

export function loadHubSettlement(): HubSettlement | null {
  // Prefer the three-distinct-parties settlement; fall back to the first (self-operator) one.
  return readJson<HubSettlement>("hub-settlement-counterparty.json")
    ?? readJson<HubSettlement>("hub-settlement.json");
}

export const CC3_EXPLORER = "https://creditcoin-testnet.blockscout.com/tx/";
export const SEPOLIA_EXPLORER = "https://sepolia.etherscan.io/tx/";
