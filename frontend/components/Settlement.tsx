import type { HubSettlement } from "@/lib/reports";
import { CC3_EXPLORER, SEPOLIA_EXPLORER } from "@/lib/reports";
import { ArrowSquareOut, Cube, CheckCircle, ListChecks } from "@/components/icons";

const HUB_ADDR = "0x676a74fa6542BEd2dD4A16EF122f75968329B1B0";

function short(h: string): string {
  return `${h.slice(0, 10)}…${h.slice(-6)}`;
}

// The rails proven, not just deployed: a real order opened, paid on Sepolia, and settled through the
// hub on CC3, with the protocol fee taken on release. Fed by data/hub-settlement.json.
export function SettlementSection({ data }: { data: HubSettlement | null }) {
  if (!data || !data.released) return null;

  return (
    <section className="rise" style={{ ...styles.section, animationDelay: "115ms" }}>
      <div style={styles.head}>
        <Cube size={16} weight="light" style={{ color: "var(--vuln)" }} />
        <span style={styles.title}>Proven: a real order settled through the rails</span>
        <span style={styles.note}>
          Not a deployment claim. An order was opened and funded on the hub, paid on Sepolia through
          SourceSettlement, and once the source block crossed the attestation frontier the hub ran the
          full third check, took the protocol fee, and paid the seller. Both transactions are public.
        </span>
      </div>

      <div style={styles.grid}>
        {/* The fee split the protocol captured */}
        <div style={styles.tile}>
          <div style={styles.tileHead}>
            <ListChecks size={14} weight="light" style={{ color: "var(--vuln)" }} />
            <span style={styles.tileLabel}>settled, with the fee taken</span>
          </div>
          <div style={styles.splitRow}>
            <div style={styles.splitCol}>
              <span className="num" style={styles.big}>{data.payout}</span>
              <span style={styles.splitUnit}>paid to the seller</span>
            </div>
            <div style={styles.splitCol}>
              <span className="num" style={styles.feeNum}>{data.fee}</span>
              <span style={styles.splitUnit}>protocol fee, 0.25% unverified</span>
            </div>
          </div>
          <div style={styles.subline}>
            <CheckCircle size={12} weight="light" style={{ color: "var(--safe)" }} />
            <span>on {data.amount} settled through the audited ThirdCheckLib path, by construction</span>
          </div>
        </div>

        {/* The two-transaction flow */}
        <div style={styles.tile}>
          <div style={styles.tileHead}>
            <Cube size={14} weight="light" style={{ color: "var(--vuln)" }} />
            <span style={styles.tileLabel}>the mined path, end to end</span>
          </div>
          <div style={styles.flow}>
            <a href={data.sourceTx.url} target="_blank" rel="noreferrer" style={styles.flowStep}>
              <span style={styles.flowChain}>payment on Sepolia</span>
              <span className="mono" style={styles.flowTx}>{short(data.sourceTx.hash)}<ArrowSquareOut size={11} weight="light" /></span>
            </a>
            <span style={styles.flowArrow} aria-hidden>→</span>
            <a href={data.settleTx.url} target="_blank" rel="noreferrer" style={styles.flowStep}>
              <span style={styles.flowChain}>settlement on CC3</span>
              <span className="mono" style={styles.flowTx}>{short(data.settleTx.hash)}<ArrowSquareOut size={11} weight="light" /></span>
            </a>
          </div>
          <a
            href={CC3_EXPLORER.replace("/tx/", "/address/") + HUB_ADDR}
            target="_blank"
            rel="noreferrer"
            style={styles.addrRow}
          >
            <span style={styles.addrLabel}>SettlementHub · CC3</span>
            <span className="mono" style={styles.addr}>{short(HUB_ADDR)}<ArrowSquareOut size={11} weight="light" /></span>
          </a>
        </div>
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: { marginTop: "3rem" },
  head: { display: "flex", alignItems: "baseline", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1.25rem" },
  title: { fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" },
  note: { fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.5, maxWidth: 62 + "ch" },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 1,
    background: "var(--line)", border: "1px solid var(--line)", borderRadius: 3, overflow: "hidden" },
  tile: { background: "var(--panel)", padding: "1.3rem 1.4rem" },
  tileHead: { display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.9rem" },
  tileLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-faint)" },

  splitRow: { display: "flex", gap: "1.6rem", flexWrap: "wrap" },
  splitCol: { display: "flex", flexDirection: "column", gap: "0.25rem" },
  big: { fontSize: "2rem", lineHeight: 0.9, letterSpacing: "-0.03em", fontWeight: 600, color: "var(--safe)",
    fontVariantNumeric: "tabular-nums" },
  feeNum: { fontSize: "2rem", lineHeight: 0.9, letterSpacing: "-0.03em", fontWeight: 600, color: "var(--vuln)",
    fontVariantNumeric: "tabular-nums" },
  splitUnit: { fontSize: 12, color: "var(--ink-dim)" },
  subline: { display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", fontSize: 12,
    color: "var(--ink-dim)", marginTop: "0.9rem", lineHeight: 1.4 },

  flow: { display: "flex", alignItems: "stretch", gap: "0.6rem", flexWrap: "wrap" },
  flowStep: { display: "flex", flexDirection: "column", gap: "0.3rem", background: "var(--panel-2)",
    border: "1px solid var(--line)", borderRadius: 2, padding: "0.6rem 0.8rem", flex: 1, minWidth: 140 },
  flowChain: { fontSize: 11, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.04em" },
  flowTx: { display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: 11.5, color: "var(--ink)" },
  flowArrow: { alignSelf: "center", color: "var(--vuln)", fontSize: 16 },

  addrRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem",
    padding: "0.55rem 0 0", marginTop: "0.9rem", borderTop: "1px solid var(--line)" },
  addrLabel: { fontSize: 12.5, color: "var(--ink-dim)", paddingTop: "0.55rem" },
  addr: { display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: 11.5, color: "var(--ink)", paddingTop: "0.55rem" },
};
