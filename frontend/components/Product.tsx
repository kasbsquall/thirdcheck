import type { BenchReport, Finding } from "@/lib/reports";
import { CC3_EXPLORER, SEPOLIA_EXPLORER } from "@/lib/reports";
import { ShieldCheck, ArrowSquareOut, Cube, CheckCircle, Stack } from "@/components/icons";

// Deployed testnet addresses (see README). The product is the hardened settlement escrow on CC3,
// releasing against payments proven from SourceSettlement on Sepolia.
const HARDENED_CC3 = "0xeC82270dc356948FC2e5E969a887ce6bE27e375A";
const SOURCE_SEPOLIA = "0xD8504B263104aa915974eCCE1002d7F7587e88cD";

function short(h: string): string {
  return `${h.slice(0, 10)}…${h.slice(-6)}`;
}

export function ProductSection({
  hardened,
  attacksRejected,
  attacksTotal,
}: {
  hardened: BenchReport | null;
  attacksRejected: number;
  attacksTotal: number;
}) {
  const pos: Finding | undefined = hardened?.findings.find((f) => f.id === "POS");
  const released = pos?.status === "accepted";

  return (
    <section className="rise" style={{ ...styles.section, animationDelay: "90ms" }}>
      <div style={styles.head}>
        <ShieldCheck size={16} weight="light" style={{ color: "var(--safe)" }} />
        <span style={styles.title}>Shipped: the settlement escrow that passes its own audit</span>
        <span style={styles.note}>
          The bench proves the field skips the third check. This is the drop-in that does not: a
          cross-chain settlement escrow with all twelve binding checks, deployed on CC3, moving real
          value against proofs from Sepolia. Not a reference; the product.
        </span>
      </div>

      <div style={styles.grid}>
        {/* The guarantee */}
        <div style={styles.tile}>
          <div style={styles.tileHead}>
            <ShieldCheck size={14} weight="light" style={{ color: "var(--safe)" }} />
            <span style={styles.tileLabel}>the guarantee</span>
          </div>
          <div style={styles.guaranteeRow}>
            <span className="num" style={styles.big}>12</span>
            <span style={styles.bigUnit}>/12 binding checks enforced</span>
          </div>
          <div style={styles.subline}>
            <span className="num" style={{ color: "var(--safe)" }}>{attacksRejected}</span>
            <span style={{ color: "var(--ink-faint)" }}>/{attacksTotal} bench attacks rejected</span>
            <span style={styles.dotsep}>·</span>
            <span style={{ color: released ? "var(--safe)" : "var(--ink-faint)" }}>
              {released ? "correct payment still releases" : "positive path pending"}
            </span>
          </div>
        </div>

        {/* Money moved, cross-chain, correctly */}
        <div style={styles.tile}>
          <div style={styles.tileHead}>
            <Cube size={14} weight="light" style={{ color: "var(--vuln)" }} />
            <span style={styles.tileLabel}>value settled, end to end</span>
          </div>
          {pos ? (
            <div style={styles.flow}>
              <a href={SEPOLIA_EXPLORER + pos.sourceTx} target="_blank" rel="noreferrer" style={styles.flowStep}>
                <span style={styles.flowChain}>payment on Sepolia</span>
                <span className="mono" style={styles.flowTx}>{short(pos.sourceTx || "")}<ArrowSquareOut size={11} weight="light" /></span>
              </a>
              <span style={styles.flowArrow} aria-hidden>→</span>
              <a href={CC3_EXPLORER + pos.evidenceTx} target="_blank" rel="noreferrer" style={styles.flowStep}>
                <span style={styles.flowChain}>release on CC3</span>
                <span className="mono" style={styles.flowTx}>{short(pos.evidenceTx || "")}<ArrowSquareOut size={11} weight="light" /></span>
              </a>
            </div>
          ) : (
            <div style={styles.subline}>run the bench to populate</div>
          )}
          <div style={styles.subline}>
            <CheckCircle size={12} weight="light" style={{ color: "var(--safe)" }} />
            <span>a real payment, proven through 0x0FD2, released to the seller — the same escrow that bounces every forgery below</span>
          </div>
        </div>
      </div>

      {/* Deployed + ship it */}
      <div style={styles.grid}>
        <div style={styles.tile}>
          <div style={styles.tileHead}>
            <Cube size={14} weight="light" />
            <span style={styles.tileLabel}>deployed, testnet</span>
          </div>
          <AddrRow label="HardenedEscrow · CC3" addr={HARDENED_CC3} href={CC3_EXPLORER.replace("/tx/", "/address/") + HARDENED_CC3} />
          <AddrRow label="SourceSettlement · Sepolia" addr={SOURCE_SEPOLIA} href={SEPOLIA_EXPLORER.replace("/tx/", "/address/") + SOURCE_SEPOLIA} />
        </div>

        <div style={styles.tile}>
          <div style={styles.tileHead}>
            <Stack size={14} weight="light" style={{ color: "var(--safe)" }} />
            <span style={styles.tileLabel}>ship it: the third check as a dependency</span>
          </div>
          <p style={styles.shipNote}>
            The audited logic is a Solidity library. A correct consumer is two calls, not twelve checks
            each team reimplements and gets wrong.
          </p>
          <pre style={styles.code}>{`import { ThirdCheckLib } from "thirdcheck/ThirdCheckLib.sol";

// the whole third check, in two calls:
receipt = ThirdCheckLib.verifyReceipt(consumedProof, /* chain, window, proof, replay, status */);
ThirdCheckLib.bindPayment(receipt, source, orderId, seller, amount); // emitter, event, order, fields`}</pre>
        </div>
      </div>
    </section>
  );
}

function AddrRow({ label, addr, href }: { label: string; addr: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={styles.addrRow}>
      <span style={styles.addrLabel}>{label}</span>
      <span className="mono" style={styles.addr}>{short(addr)}<ArrowSquareOut size={11} weight="light" /></span>
    </a>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: { marginTop: "3rem" },
  head: { display: "flex", alignItems: "baseline", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1.25rem" },
  title: { fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" },
  note: { fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.5, maxWidth: 62 + "ch" },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 1,
    background: "var(--line)", border: "1px solid var(--line)", borderRadius: 3, overflow: "hidden", marginBottom: 1 },
  tile: { background: "var(--panel)", padding: "1.3rem 1.4rem" },
  tileHead: { display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.9rem" },
  tileLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-faint)" },

  guaranteeRow: { display: "flex", alignItems: "baseline", gap: "0.5rem" },
  big: { fontSize: "2.6rem", lineHeight: 0.9, letterSpacing: "-0.03em", fontWeight: 600, color: "var(--safe)" },
  bigUnit: { fontSize: 12.5, color: "var(--ink-dim)" },
  subline: { display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", fontSize: 12,
    color: "var(--ink-dim)", marginTop: "0.7rem", lineHeight: 1.4 },
  dotsep: { color: "var(--ink-faint)" },

  flow: { display: "flex", alignItems: "stretch", gap: "0.6rem", flexWrap: "wrap" },
  flowStep: { display: "flex", flexDirection: "column", gap: "0.3rem", background: "var(--panel-2)",
    border: "1px solid var(--line)", borderRadius: 2, padding: "0.6rem 0.8rem", flex: 1, minWidth: 140 },
  flowChain: { fontSize: 11, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.04em" },
  flowTx: { display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: 11.5, color: "var(--ink)" },
  flowArrow: { alignSelf: "center", color: "var(--vuln)", fontSize: 16 },

  addrRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem",
    padding: "0.55rem 0", borderTop: "1px solid var(--line)" },
  addrLabel: { fontSize: 12.5, color: "var(--ink-dim)" },
  addr: { display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: 11.5, color: "var(--ink)" },

  shipNote: { fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5, margin: "0 0 0.8rem" },
  code: { fontFamily: "var(--mono)", fontSize: 11, lineHeight: 1.6, color: "var(--ink-dim)",
    background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 2, padding: "0.8rem 0.9rem",
    margin: 0, overflowX: "auto", whiteSpace: "pre" },
};
