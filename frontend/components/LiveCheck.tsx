"use client";

import { useState } from "react";
import {
  FileMagnifyingGlass,
  Warning,
  CheckCircle,
  XCircle,
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

// A real third-party submission from the field. Its repo carries a self-declared
// vulnerable control (NaiveManager) the scan flags, and a hardened path it does not.
const REAL_REPO = "https://github.com/Nuel-osas/deadswitch";

// ThirdCheck's own shipped consumer: the complete third-check-complete escrow, built on
// ThirdCheckLib in two calls. It passes the same gate every submission is measured against.
const SHIPPED_CONSUMER = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// SettlementConsumer: a complete Attestcoin consumer in two library calls.
// The whole third check is a dependency here, not something reimplemented per team.
contract SettlementConsumer {
    mapping(bytes32 => Order) public orders;
    mapping(bytes32 => bool) private consumedProof;

    function release(
        bytes32 orderId,
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        INativeQueryVerifier.MerkleProof calldata merkleProof,
        INativeQueryVerifier.ContinuityProof calldata continuityProof
    ) external {
        Order storage order = orders[orderId];
        require(order.amount > 0 && !order.released, "bad order");

        // Chain, window, proof, replay, receipt status: one call.
        EvmV1Decoder.ReceiptFields memory receipt = ThirdCheckLib.verifyReceipt(
            consumedProof,
            order.expectedChainKey, order.minHeight, order.maxHeight,
            chainKey, height, encodedTransaction, merkleProof, continuityProof
        );
        // Emitter, event, order, recipient, amount, log selection: the second.
        ThirdCheckLib.bindPayment(receipt, order.expectedSource, orderId, order.seller, order.amount);

        order.released = true;
        (bool ok, ) = payable(order.seller).call{ value: order.amount }("");
        require(ok, "payout failed");
    }
}`;

const VERDICT_STYLE = {
  pass: { color: "var(--safe)", bg: "var(--safe-bg)", Icon: CheckCircle, label: "passes the third check" },
  review: { color: "var(--vuln)", bg: "var(--vuln-bg)", Icon: Warning, label: "findings to review, none blocking" },
  fail: { color: "var(--err)", bg: "var(--err-bg)", Icon: XCircle, label: "would fail the CI gate" },
} as const;

/** Turn a raw fetch/route error into something a judge can act on. */
function humanError(raw: string): string {
  if (/\b403\b/.test(raw)) return "GitHub is rate-limiting anonymous requests (60/hour, shared). Wait a minute and retry, or paste the source directly.";
  if (/\b404\b/.test(raw)) return "That repository or file could not be found. It may be private, renamed, or the link may be a page rather than a repo or a .sol file.";
  if (/No Solidity/i.test(raw)) return "No Solidity or TypeScript files were found in that repository.";
  if (/too large/i.test(raw)) return "That source is over the 400 KB limit for a single paste.";
  return raw;
}

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
      setError(humanError(e instanceof Error ? e.message : String(e)));
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

  // Switching mode invalidates a verdict tied to the other input; clear it.
  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setResult(null);
    setError(null);
  }

  function loadPaste(value: string) {
    switchMode("paste");
    setSource(value);
    run({ source: value });
  }
  function loadRepo(value: string) {
    switchMode("url");
    setUrl(value);
    run({ url: value });
  }

  const canRun = !loading && (mode === "paste" ? source.trim().length > 0 : url.trim().length > 0);

  return (
    <section className="rise" style={{ marginTop: "3.5rem" }}>
      <div className="lc-card">
        <div className="lc-head">
          <FileMagnifyingGlass size={17} weight="light" style={{ color: "var(--vuln)" }} />
          <span className="lc-title">Check any contract, or scan a live GitHub repo</span>
          <span className="lc-live">live</span>
        </div>
        <p className="lc-note">
          This is the instrument behind the scorecard below. Paste an Attestcoin consumer, or give it any
          GitHub repo or <span className="mono">.sol</span> link and it pulls and scans the live code right
          here. Every submission the scorecard summarizes is public, so run the gate on any of them yourself.
          Same engine the CI gate runs, same verdict a pull request would get. No clone, no install, no key,
          nothing stored — a judge verifies every claim from this page.
        </p>

        {/* Mode switch: a real segmented control, distinct from the example row below. */}
        <div className="lc-modes" role="tablist" aria-label="Input mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "paste"}
            className="lc-mode"
            onClick={() => switchMode("paste")}
          >
            paste source
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "url"}
            className="lc-mode"
            onClick={() => switchMode("url")}
          >
            <span className="lc-dot" aria-hidden />
            scan github repo
          </button>
        </div>

        {mode === "paste" ? (
          <>
            <textarea
              className="lc-field"
              value={source}
              onChange={(e) => { setSource(e.target.value); if (error) setError(null); }}
              onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onCheck(); }}
              placeholder="pragma solidity ^0.8.20; contract MyConsumer { ... }"
              spellCheck={false}
              aria-label="Solidity source to check"
            />
            <div className="lc-srcnote">
              <span className="lc-hint">press <span className="lc-kbd">Ctrl/Cmd + Enter</span> to run</span>
            </div>
          </>
        ) : (
          <>
            <input
              className="lc-url mono"
              value={url}
              onChange={(e) => { setUrl(e.target.value); if (error) setError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") onCheck(); }}
              placeholder="https://github.com/owner/repo  ·  or a link to one .sol file"
              aria-label="GitHub repository or file URL to scan"
            />
            <div className="lc-srcnote">
              It fetches the repository&rsquo;s Solidity live and scans every consumer. Two anonymous GitHub
              calls per run, so if it rate-limits, wait a minute or paste the source instead.
            </div>
          </>
        )}

        <div className="lc-actions">
          <button type="button" className="lc-run" onClick={onCheck} disabled={!canRun}>
            {loading ? "checking…" : "run the third check"}
          </button>
          {result && (
            <span className="lc-scanned" title={result.scanned}>
              {result.filesScanned} file{result.filesScanned === 1 ? "" : "s"} scanned · {result.scanned}
            </span>
          )}
        </div>

        {/* Examples sit below the controls; secondary weight, clearly a different row. */}
        <div className="lc-examples">
          <span className="lc-exlabel">try</span>
          <button type="button" className="lc-chip" onClick={() => loadPaste(VULN_SAMPLE)}>
            a consumer that skips the check
          </button>
          <button type="button" className="lc-chip" onClick={() => loadPaste(CLEAN_SAMPLE)}>
            one that does it right
          </button>
          <button type="button" className="lc-chip" onClick={() => loadPaste(SHIPPED_CONSUMER)}>
            our shipped consumer
          </button>
          <button type="button" className="lc-chip" onClick={() => loadRepo(REAL_REPO)}>
            scan a real submission
          </button>
        </div>

        <div aria-live="polite" aria-busy={loading}>
          {loading && <div className="lc-skeleton pulse" aria-hidden />}

          {error && !loading && (
            <div className="lc-error">
              <XCircle size={15} weight="light" style={{ color: "var(--err)", flexShrink: 0, marginTop: 1 }} />
              <span className="lc-errtext">{error}</span>
            </div>
          )}

          {result && !loading && <Verdict result={result} />}
        </div>
      </div>
    </section>
  );
}

function Verdict({ result }: { result: CheckResult }) {
  const v = VERDICT_STYLE[result.verdict];
  return (
    <div className="lc-result">
      <div className="lc-verdict">
        <span className="lc-badge" style={{ color: v.color, background: v.bg }}>
          <v.Icon size={15} weight="light" />
          <span className="mono">{v.label}</span>
        </span>
        <span className="lc-counts">
          {result.counts.error} defect-class · {result.counts.review} review
        </span>
      </div>
      <p className="lc-legend">
        Defect-class findings fail the gate; review findings flag something a human should confirm.
      </p>

      {result.findings.length === 0 ? (
        <p className="lc-clean">
          Every proof consumer scanned reaches the precompile and binds what it acts on. Nothing to flag.
        </p>
      ) : (
        <div className="lc-list">
          {result.findings.map((f, i) => {
            const isErr = f.severity === "error";
            return (
              <div
                className="lc-finding row"
                key={`${f.file}:${f.line}:${f.id}:${i}`}
                style={{ ["--i" as string]: Math.min(i, 7) }}
              >
                <div className="lc-ftop">
                  <span
                    className="lc-sev"
                    style={{
                      color: isErr ? "var(--err)" : "var(--vuln)",
                      borderColor: isErr ? "var(--err)" : "var(--vuln)",
                    }}
                  >
                    {isErr ? "defect" : "review"}
                  </span>
                  <span className="lc-fid">{f.id}</span>
                  <span className="lc-ftitle">{f.title}</span>
                </div>
                <div className="lc-floc">
                  {f.file}:{f.line} · {f.evidence}
                </div>
                <p className="lc-fnote">{f.note}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
