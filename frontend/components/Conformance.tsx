import {
  type Conformance,
  type ConformanceEntry,
  type ConformanceKind,
} from "@/lib/reports";
import { Cube, ListChecks } from "@/components/icons";

const KIND_STYLE: Record<ConformanceKind, { color: string; label: string }> = {
  live: { color: "var(--safe)", label: "live" },
  onchain: { color: "var(--safe)", label: "on-chain" },
  probed: { color: "var(--vuln)", label: "probed" },
  enumerated: { color: "var(--ink-faint)", label: "enumerated" },
};

function EntryRow({ e, index }: { e: ConformanceEntry; index: number }) {
  const st = KIND_STYLE[e.kind];
  const exercised = e.kind !== "enumerated";
  return (
    <div className="row" style={{ ["--i" as string]: Math.min(index, 7), ...styles.entry }}>
      <span
        style={{
          ...styles.dot,
          background: exercised ? st.color : "transparent",
          border: `1px solid ${st.color}`,
        }}
      />
      <span className="mono" style={styles.sigCell}>
        {e.signature}
      </span>
      <span className="mono" style={styles.selCell}>
        {e.selector}
      </span>
      <span className="mono" style={{ ...styles.kindCell, color: st.color }}>
        {st.label}
      </span>
    </div>
  );
}

export function ConformanceSection({ data }: { data: Conformance }) {
  const s = data.surface;
  const byPre = data.entries.reduce<Record<string, ConformanceEntry[]>>((acc, e) => {
    (acc[e.precompile] ??= []).push(e);
    return acc;
  }, {});
  const order = Object.keys(byPre);
  let running = -1;

  return (
    <section className="rise" style={{ ...styles.section, animationDelay: "200ms" }}>
      <div style={styles.head}>
        <Cube size={16} weight="light" style={{ color: "var(--vuln)" }} />
        <span style={styles.title}>Protocol surface exercised</span>
        <span style={styles.note}>
          Auditing the third check means understanding the whole precompile. ThirdCheck exercises the
          full surface, read-only, against live CC3. A consumer that ships one product touches one
          entry point.
        </span>
      </div>

      <div style={styles.headline}>
        <div style={styles.bigStat}>
          <span className="num" style={styles.bigNum}>
            {s.exercised}
          </span>
          <span style={styles.bigDenom}>/{s.totalEntryPoints}</span>
          <span style={styles.bigLabel}>precompile entry points exercised</span>
        </div>
        <div style={styles.vs}>
          <span className="num" style={styles.vsNum}>
            {s.typicalConsumerEntryPoints}
          </span>
          <span style={styles.vsLabel}>touched by a typical consumer</span>
        </div>
        <div style={styles.vs}>
          <span className="num" style={styles.vsNum}>
            {data.decoderSurface.length}
          </span>
          <span style={styles.vsLabel}>decoder functions understood</span>
        </div>
      </div>

      {order.map((pre) => (
        <div key={pre} style={styles.group}>
          <div style={styles.groupHead}>
            <ListChecks size={13} weight="light" />
            <span className="mono" style={styles.groupName}>
              {pre}
            </span>
            <span className="mono" style={styles.groupAddr}>
              {data.precompiles[pre]?.address}
            </span>
          </div>
          <div style={styles.entryList}>
            {byPre[pre].map((e) => {
              running += 1;
              return <EntryRow key={e.selector} e={e} index={running} />;
            })}
          </div>
        </div>
      ))}

      <div style={styles.legend}>
        <LegendDot color="var(--safe)" label="exercised: live call or on-chain evidence" />
        <LegendDot color="var(--vuln)" label="probed: reached and input-validated" />
        <LegendDot color="var(--ink-faint)" hollow label="enumerated: needs a funded batch run" />
      </div>
    </section>
  );
}

function LegendDot({ color, label, hollow }: { color: string; label: string; hollow?: boolean }) {
  return (
    <span style={styles.legendItem}>
      <span style={{ ...styles.legendDot, background: hollow ? "transparent" : color, border: `1px solid ${color}` }} />
      <span style={styles.legendLabel}>{label}</span>
    </span>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: { marginTop: "3.5rem" },
  head: { display: "flex", alignItems: "baseline", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1.5rem" },
  title: { fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" },
  note: { fontSize: 12, color: "var(--ink-faint)", lineHeight: 1.45, maxWidth: 560 },

  headline: {
    display: "grid",
    gridTemplateColumns: "1.4fr 1fr 1fr",
    gap: 1,
    background: "var(--line)",
    border: "1px solid var(--line)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: "2rem",
  },
  bigStat: { background: "var(--panel)", padding: "1.3rem 1.5rem", display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "0.3rem" },
  bigNum: { fontSize: "2.6rem", lineHeight: 0.9, letterSpacing: "-0.03em", fontWeight: 600, color: "var(--safe)" },
  bigDenom: { fontSize: "1.3rem", color: "var(--ink-faint)" },
  bigLabel: { fontSize: 12, color: "var(--ink-dim)", flexBasis: "100%", marginTop: "0.5rem", lineHeight: 1.4 },
  vs: { background: "var(--panel)", padding: "1.3rem 1.5rem" },
  vsNum: { fontSize: "2rem", lineHeight: 0.9, letterSpacing: "-0.03em", fontWeight: 600, color: "var(--ink)" },
  vsLabel: { fontSize: 12, color: "var(--ink-dim)", marginTop: "0.55rem", lineHeight: 1.4, display: "block" },

  group: { marginBottom: "1.5rem" },
  groupHead: { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.7rem" },
  groupName: { fontSize: 12.5, color: "var(--ink)", fontWeight: 500 },
  groupAddr: { fontSize: 11, color: "var(--ink-faint)" },
  entryList: { border: "1px solid var(--line)", borderRadius: 3, overflow: "hidden", background: "var(--panel)" },
  entry: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr) auto auto",
    gap: "0.9rem",
    alignItems: "center",
    padding: "0.6rem 1.1rem",
    borderTop: "1px solid var(--line)",
  },
  dot: { width: 9, height: 9, borderRadius: "50%", flexShrink: 0 },
  sigCell: { fontSize: 11.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  selCell: { fontSize: 11, color: "var(--ink-faint)", flexShrink: 0 },
  kindCell: { fontSize: 11, textAlign: "right", minWidth: 74, flexShrink: 0 },

  legend: { display: "flex", gap: "1.3rem", flexWrap: "wrap", marginTop: "0.5rem" },
  legendItem: { display: "inline-flex", alignItems: "center", gap: "0.4rem" },
  legendDot: { width: 9, height: 9, borderRadius: "50%", display: "inline-block" },
  legendLabel: { fontSize: 11.5, color: "var(--ink-dim)" },
};
