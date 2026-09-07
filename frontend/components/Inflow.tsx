import Link from "next/link";
import type { Inflow } from "@/lib/reports";
import { CC3_EXPLORER } from "@/lib/reports";
import { ArrowSquareOut, ShieldCheck, CheckCircle, ListChecks, Cube } from "@/components/icons";

function short(h: string): string {
  return `${h.slice(0, 10)}…${h.slice(-6)}`;
}

// Verified Inflows: the third check aimed at value entering the chain. A real inbound deposit on Sepolia is
// proven and credited to a fresh beneficiary on CC3, independent of any bridge. Fed by data/inflow.json.
export function InflowSection({ data }: { data: Inflow | null }) {
  if (!data || !data.credited) return null;

  const credited = data.creditedAmount ?? data.amount;
  const landed = Number(data.beneficiaryDelta) > 0;

  return (
    <section className="rise" style={{ ...styles.section, animationDelay: "125ms" }}>
      <div style={styles.head}>
        <ShieldCheck size={16} weight="light" style={{ color: "var(--safe)" }} />
        <span style={styles.title}>Verified inflow: value entering the chain, checked before it lands</span>
        <span style={styles.note}>
          The costliest step in cross-chain is the one that credits an inbound deposit. Roughly two billion
          dollars in bridge losses came from crediting a transfer without independently confirming it. Here a
          real deposit was locked on Sepolia naming a fresh Creditcoin beneficiary, and the consumer credited
          them only after proving, through the precompile and the third check, that the deposit was real, from
          the expected gateway, to that beneficiary for that amount, and never credited before. Both
          transactions are public.
        </span>
        <Link href="/inflows" style={styles.deepLink}>
          the full Verified Inflows story
          <ArrowSquareOut size={12} weight="light" />
        </Link>
      </div>

      <div style={styles.grid}>
        {/* What the beneficiary received */}
        <div style={styles.tile}>
          <div style={styles.tileHead}>
            <ListChecks size={14} weight="light" style={{ color: "var(--safe)" }} />
            <span style={styles.tileLabel}>credited on a proven deposit</span>
          </div>
          <div style={styles.splitRow}>
            <div style={styles.splitCol}>
              <span className="num" style={styles.big}>{credited}</span>
              <span style={styles.splitUnit}>credited to the beneficiary</span>
            </div>
          </div>
          {landed && (
            <div style={styles.subline}>
              <CheckCircle size={12} weight="light" style={{ color: "var(--safe)" }} />
              <span>
                the beneficiary is a fresh address, distinct from the payer and the consumer; its on-chain
                balance went from zero to {data.beneficiaryDelta} (testnet)
              </span>
            </div>
          )}
          <div style={styles.subline}>
            <ListChecks size={12} weight="light" style={{ color: "var(--safe)" }} />
            <span>
              the model: safe inbound value is how users and money enter Creditcoin; a consumer routes
              deposits through this inbox and credits safe by construction, and it is recorded as a verified
              app in the registry
            </span>
          </div>
        </div>

        {/* The two-transaction flow */}
        <div style={styles.tile}>
          <div style={styles.tileHead}>
            <Cube size={14} weight="light" style={{ color: "var(--safe)" }} />
            <span style={styles.tileLabel}>the mined path, source to credit</span>
          </div>
          <div style={styles.flow}>
            <a href={data.depositTx.url} target="_blank" rel="noreferrer" style={styles.flowStep}>
              <span style={styles.flowChain}>deposit on Sepolia</span>
              <span className="mono" style={styles.flowTx}>{short(data.depositTx.hash)}<ArrowSquareOut size={11} weight="light" /></span>
            </a>
            <span style={styles.flowArrow} aria-hidden>→</span>
            <a href={data.creditTx.url} target="_blank" rel="noreferrer" style={styles.flowStep}>
              <span style={styles.flowChain}>credit on CC3</span>
              <span className="mono" style={styles.flowTx}>{short(data.creditTx.hash)}<ArrowSquareOut size={11} weight="light" /></span>
            </a>
          </div>
          <a
            href={CC3_EXPLORER.replace("/tx/", "/address/") + data.consumer}
            target="_blank"
            rel="noreferrer"
            style={styles.addrRow}
          >
            <span style={styles.addrLabel}>InflowConsumer · CC3</span>
            <span className="mono" style={styles.addr}>{short(data.consumer)}<ArrowSquareOut size={11} weight="light" /></span>
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
  deepLink: { display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: 12.5, color: "var(--safe)",
    borderBottom: "1px solid transparent" },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 1,
    background: "var(--line)", border: "1px solid var(--line)", borderRadius: 3, overflow: "hidden" },
  tile: { background: "var(--panel)", padding: "1.3rem 1.4rem" },
  tileHead: { display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.9rem" },
  tileLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-faint)" },

  splitRow: { display: "flex", gap: "1.6rem", flexWrap: "wrap" },
  splitCol: { display: "flex", flexDirection: "column", gap: "0.25rem" },
  big: { fontSize: "2rem", lineHeight: 0.9, letterSpacing: "-0.03em", fontWeight: 600, color: "var(--safe)",
    fontVariantNumeric: "tabular-nums" },
  splitUnit: { fontSize: 12, color: "var(--ink-dim)" },
  subline: { display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", fontSize: 12,
    color: "var(--ink-dim)", marginTop: "0.9rem", lineHeight: 1.4 },

  flow: { display: "flex", alignItems: "stretch", gap: "0.6rem", flexWrap: "wrap" },
  flowStep: { display: "flex", flexDirection: "column", gap: "0.3rem", background: "var(--panel-2)",
    border: "1px solid var(--line)", borderRadius: 2, padding: "0.6rem 0.8rem", flex: 1, minWidth: 140 },
  flowChain: { fontSize: 11, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.04em" },
  flowTx: { display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: 11.5, color: "var(--ink)" },
  flowArrow: { alignSelf: "center", color: "var(--safe)", fontSize: 16 },

  addrRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem",
    padding: "0.55rem 0 0", marginTop: "0.9rem", borderTop: "1px solid var(--line)" },
  addrLabel: { fontSize: 12.5, color: "var(--ink-dim)", paddingTop: "0.55rem" },
  addr: { display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: 11.5, color: "var(--ink)", paddingTop: "0.55rem" },
};
