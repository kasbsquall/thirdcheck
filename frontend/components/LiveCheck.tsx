"use client";

import { useState } from "react";
import {
  FileMagnifyingGlass,
  Warning,
  CheckCircle,
  XCircle,
  Circle,
  ArrowSquareOut,
} from "@/components/icons";

interface LiveFinding {
  id: string;
  title: string;
  file: string;
  line: number;
  evidence: string;
  note: string;
  severity: "error" | "review";
}
interface CheckResult {
  scanned: string;
  filesScanned: number;
  verdict: "pass" | "review" | "fail";
  counts: { error: number; review: number };
  findings: LiveFinding[];
}

type Mode = "paste" | "url";

const VULN_SAMPLE = `// A cross-chain escrow that verifies against the real precompile
// and still releases against a proof of the wrong thing.
contract QuickEscrow {
    function release(
        uint64 chainKey, uint64 height, bytes calldata encodedTransaction,
        bytes calldata merkleProof, bytes calldata continuityProof, uint256 orderId
    ) external {
        bool proven = VERIFIER.verifyAndEmit(
            chainKey, height, encodedTransaction, merkleProof, continuityProof
        );
        require(proven, "invalid proof");

        // Decodes the receipt but never reads receiptStatus (B-01),
        // and takes the first log without pinning who emitted it (B-02).
        EvmV1Decoder.ReceiptFields memory receipt =
            EvmV1Decoder.decodeReceiptFields(encodedTransaction);
        EvmV1Decoder.LogEntry memory log = receipt.receiptLogs[0];
        require(log.topics[0] == PAYMENT_SIG, "wrong event");

        orders[orderId].released = true;
        payable(orders[orderId].seller).transfer(orders[orderId].amount);
    }
}`;

const CLEAN_SAMPLE = `// The same release, with the third check in place.
contract SafeEscrow {
    function release(
        uint64 chainKey, uint64 height, bytes calldata encodedTransaction,
        bytes calldata merkleProof, bytes calldata continuityProof, uint256 orderId
    ) external {
        require(VERIFIER.verifyAndEmit(
            chainKey, height, encodedTransaction, merkleProof, continuityProof
        ), "invalid proof");

        EvmV1Decoder.ReceiptFields memory receipt =
            EvmV1Decoder.decodeReceiptFields(encodedTransaction);
        require(receipt.receiptStatus == 1, "source tx reverted");     // B-01

        EvmV1Decoder.LogEntry[] memory logs =
            EvmV1Decoder.getLogsByEventSignature(receipt, PAYMENT_SIG);
        require(logs.length > 0, "no payment event");
        require(logs[0].address_ == sourceSettlement, "wrong emitter");  // B-02

        orders[orderId].released = true;
        payable(orders[orderId].seller).transfer(orders[orderId].amount);
    }
}`;

const VERDICT_STYLE = {
  pass: { color: "var(--safe)", bg: "var(--safe-bg)", Icon: CheckCircle, label: "passes the third check" },
  review: { color: "var(--ink)", bg: "transparent", Icon: Warning, label: "review-class findings" },
  fail: { color: "var(--vuln)", bg: "var(--vuln-bg)", Icon: XCircle, label: "would fail the CI gate" },
} as const;

export function LiveCheckSection() {
  const [mode, setMode] = useState<Mode>("paste");
  const [source, setSource] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(payload: { source?: string; url?: string }) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch("/api/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      setResult(data as CheckResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function onCheck() {
    if (mode === "paste") {
      if (!source.trim()) return;
      run({ source });
    } else {
      if (!url.trim()) return;
      run({ url });
    }
  }

  function loadSample(mode: Mode, value: string) {
    setMode(mode);
    if (mode === "paste") {
      setSource(value);
      run({ source: value });
    } else {
      setUrl(value);
      run({ url: value });
    }
  }

  return (
    <section className="rise" style={{ ...styles.section, animationDelay: "160ms" }}>
      <div style={styles.head}>
        <FileMagnifyingGlass size={16} weight="light" style={{ color: "var(--vuln)" }} />
        <span style={styles.title}>Check a contract yourself</span>
        <span style={styles.note}>
          Paste any Attestcoin consumer, or point at a GitHub repo or file. It runs the exact engine
          the CI gate runs, and returns the same verdict a pull request would get. No key, nothing
          stored.
        </span>
      </div>

      <div style={styles.examples}>
        <span style={styles.exLabel}>try</span>
        <button type="button" className="chip" style={styles.chip} onClick={() => loadSample("paste", VULN_SAMPLE)}>
          a consumer that skips it
        </button>
        <button type="button" className="chip" style={styles.chip} onClick={() => loadSample("paste", CLEAN_SAMPLE)}>
          one that does it right
        </button>
        <button
          type="button"
          className="chip"
          style={styles.chip}
          onClick={() => loadSample("url", "https://github.com/Nuel-osas/deadswitch")}
        >
          scan a live repo
        </button>
      </div>

      <div style={styles.tabs}>
        <button
          type="button"
          onClick={() => setMode("paste")}
          style={{ ...styles.tab, ...(mode === "paste" ? styles.tabOn : {}) }}
        >
          paste source
        </button>
        <button
          type="button"
          onClick={() => setMode("url")}
          style={{ ...styles.tab, ...(mode === "url" ? styles.tabOn : {}) }}
        >
          github url
        </button>
      </div>

      {mode === "paste" ? (
        <textarea
          className="mono"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="pragma solidity ^0.8.20; contract MyConsumer { ... }"
          spellCheck={false}
          style={styles.textarea}
        />
      ) : (
        <input
          className="mono"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onCheck()}
          placeholder="https://github.com/owner/repo  ·  or a link to one .sol file"
          style={styles.input}
        />
      )}

      <div style={styles.actions}>
        <button type="button" onClick={onCheck} disabled={loading} style={styles.run}>
          {loading ? "checking…" : "run the third check"}
        </button>
        {result && (
          <span className="mono" style={styles.scanned}>
            {result.filesScanned} file{result.filesScanned === 1 ? "" : "s"} scanned
          </span>
        )}
      </div>

      {loading && <div className="pulse" style={styles.skeleton} aria-hidden />}

      {error && (
        <div style={styles.error}>
          <XCircle size={14} weight="light" style={{ color: "var(--err)" }} />
          <span style={styles.errorText}>{error}</span>
        </div>
      )}

      {result && !loading && <Verdict result={result} />}
    </section>
  );
}

function Verdict({ result }: { result: CheckResult }) {
  const v = VERDICT_STYLE[result.verdict];
  return (
    <div style={styles.result}>
      <div style={{ ...styles.verdictBar, borderColor: v.color }}>
        <span style={{ ...styles.verdictBadge, color: v.color, background: v.bg }}>
          <v.Icon size={15} weight="light" />
          <span className="mono">{v.label}</span>
        </span>
        <span className="mono" style={styles.counts}>
          {result.counts.error} defect-class · {result.counts.review} review
        </span>
      </div>

      {result.findings.length === 0 ? (
        <p style={styles.clean}>
          Every proof consumer scanned reaches the precompile and binds what it acts on. Nothing to
          flag.
        </p>
      ) : (
        <div style={styles.findingList}>
          {result.findings.map((f, i) => (
            <div
              className="row"
              key={`${f.file}:${f.line}:${f.id}:${i}`}
              style={{ ["--i" as string]: Math.min(i, 7), ...styles.finding }}
            >
              <div style={styles.findingTop}>
                <span
                  className="mono"
                  style={{
                    ...styles.sev,
                    color: f.severity === "error" ? "var(--vuln)" : "var(--ink-dim)",
                    borderColor: f.severity === "error" ? "var(--vuln)" : "var(--line-strong)",
                  }}
                >
                  {f.severity === "error" ? "fail" : "review"}
                </span>
                <span className="mono" style={styles.fid}>
                  {f.id}
                </span>
                <span style={styles.ftitle}>{f.title}</span>
              </div>
              <div className="mono" style={styles.floc}>
                {f.file}:{f.line} · {f.evidence}
              </div>
              <p style={styles.fnote}>{f.note}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: { marginTop: "3.5rem" },
  head: { display: "flex", alignItems: "baseline", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1.25rem" },
  title: { fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" },
  note: { fontSize: 12, color: "var(--ink-faint)", lineHeight: 1.45, maxWidth: 560 },

  examples: { display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" },
  exLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-faint)" },
  chip: {
    fontSize: 12,
    color: "var(--ink-dim)",
    background: "var(--panel)",
    border: "1px solid var(--line)",
    borderRadius: 2,
    padding: "4px 10px",
    cursor: "pointer",
  },

  tabs: { display: "flex", gap: "0.4rem", marginBottom: "0.6rem" },
  tab: {
    fontSize: 12,
    color: "var(--ink-faint)",
    background: "transparent",
    border: "1px solid var(--line)",
    borderRadius: 2,
    padding: "4px 12px",
    cursor: "pointer",
  },
  tabOn: { color: "var(--ink)", borderColor: "var(--line-strong)", background: "var(--panel)" },

  textarea: {
    width: "100%",
    minHeight: 220,
    resize: "vertical",
    fontSize: 12.5,
    lineHeight: 1.55,
    color: "var(--ink)",
    background: "var(--panel)",
    border: "1px solid var(--line)",
    borderRadius: 3,
    padding: "0.9rem 1rem",
    outlineColor: "var(--vuln)",
  },
  input: {
    width: "100%",
    fontSize: 12.5,
    color: "var(--ink)",
    background: "var(--panel)",
    border: "1px solid var(--line)",
    borderRadius: 3,
    padding: "0.75rem 1rem",
    outlineColor: "var(--vuln)",
  },

  actions: { display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.9rem" },
  run: {
    fontSize: 13,
    fontWeight: 500,
    color: "var(--ground)",
    background: "var(--ink)",
    border: "1px solid var(--ink)",
    borderRadius: 3,
    padding: "0.55rem 1.2rem",
    cursor: "pointer",
  },
  scanned: { fontSize: 11.5, color: "var(--ink-faint)" },

  skeleton: {
    marginTop: "1.5rem",
    height: 90,
    borderRadius: 3,
    background: "var(--panel)",
    border: "1px solid var(--line)",
  },

  error: { display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1.25rem" },
  errorText: { fontSize: 12.5, color: "var(--err)" },

  result: { marginTop: "1.5rem" },
  verdictBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
    flexWrap: "wrap",
    border: "1px solid",
    borderRadius: 3,
    padding: "0.8rem 1.1rem",
    marginBottom: "1rem",
  },
  verdictBadge: { display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: 13, padding: "3px 9px", borderRadius: 2 },
  counts: { fontSize: 11.5, color: "var(--ink-faint)" },

  clean: { fontSize: 13, color: "var(--ink-dim)", lineHeight: 1.5, margin: 0 },

  findingList: { border: "1px solid var(--line)", borderRadius: 3, overflow: "hidden", background: "var(--panel)" },
  finding: { padding: "0.9rem 1.1rem", borderTop: "1px solid var(--line)" },
  findingTop: { display: "flex", alignItems: "baseline", gap: "0.6rem", flexWrap: "wrap" },
  sev: { fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em", border: "1px solid", borderRadius: 2, padding: "1px 6px" },
  fid: { fontSize: 12, color: "var(--ink-dim)" },
  ftitle: { fontSize: 13.5, color: "var(--ink)", lineHeight: 1.35 },
  floc: { fontSize: 11.5, color: "var(--ink-faint)", marginTop: "0.35rem" },
  fnote: { fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5, margin: "0.5rem 0 0", maxWidth: 720 },
};
