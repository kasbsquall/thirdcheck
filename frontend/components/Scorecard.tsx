import {
  type Scorecard,
  type ScorecardRow,
  type ScoreMark,
  type ScoreDepth,
  type ScorecardChecks,
  CHECK_ORDER,
} from "@/lib/reports";
import { Stack, ChartBarHorizontal, Flag, Scales, CheckCircle } from "@/components/icons";

const DEPTH_LABEL: Record<ScoreDepth, string> = {
  deep: "deep",
  solid: "solid",
  light: "light",
  absent: "off-core",
};

/** One binding check across the whole field: how much of it actually performs the check. */
function DistributionBar({
  id,
  label,
  applicable,
  yes,
  partial,
  flagged,
  index,
}: {
  id: string;
  label: string;
  applicable: number;
  yes: number;
  partial: number;
  flagged: number;
  index: number;
}) {
  const yesPct = applicable ? (yes / applicable) * 100 : 0;
  const partialPct = applicable ? (partial / applicable) * 100 : 0;

  return (
    <div style={styles.distRow}>
      <div style={styles.distHead}>
        <span className="mono" style={styles.distId}>
          {id}
        </span>
        <span style={styles.distLabel}>{label}</span>
      </div>

      <div style={styles.distTrack}>
        <div
          className="bar"
          style={{
            ...styles.distFill,
            width: `${yesPct}%`,
            background: "var(--safe)",
            animationDelay: `${index * 40}ms`,
          }}
        />
        <div
          className="bar"
          style={{
            ...styles.distFill,
            width: `${partialPct}%`,
            background: "var(--vuln)",
            opacity: 0.55,
            animationDelay: `${index * 40}ms`,
          }}
        />
      </div>

      <div style={styles.distCount}>
        <span className="num" style={styles.distNum}>
          {yes}
        </span>
        <span style={styles.distDenom}>/{applicable} fully</span>
        {partial > 0 && (
          <span className="num" style={styles.distPartial}>
            +{partial}
          </span>
        )}
        {flagged > 0 && (
          <span className="mono" style={styles.distFlag}>
            <Flag size={11} weight="light" /> {flagged}
          </span>
        )}
      </div>
    </div>
  );
}

const MARK_STYLE: Record<ScoreMark, { bg: string; border: string; sym: string; color: string }> = {
  y: { bg: "var(--safe-bg)", border: "var(--safe)", sym: "", color: "var(--safe)" },
  p: { bg: "var(--vuln-bg)", border: "var(--vuln)", sym: "", color: "var(--vuln)" },
  n: { bg: "transparent", border: "var(--line-strong)", sym: "", color: "var(--ink-faint)" },
  na: { bg: "transparent", border: "transparent", sym: "·", color: "var(--ink-faint)" },
  flag: { bg: "rgba(181, 82, 90, 0.14)", border: "var(--err)", sym: "!", color: "var(--err)" },
};

function MarkGrid({ checks }: { checks: ScorecardChecks }) {
  return (
    <div style={styles.markGrid}>
      {CHECK_ORDER.map((k) => {
        const m = checks[k];
        const s = MARK_STYLE[m];
        return (
          <span
            key={k}
            className="mono"
            title={k}
            style={{
              ...styles.mark,
              background: s.bg,
              border: `1px solid ${s.border}`,
              color: s.color,
            }}
          >
            {s.sym}
          </span>
        );
      })}
    </div>
  );
}

function DepthPill({ depth }: { depth: ScoreDepth }) {
  const tone =
    depth === "deep" ? "var(--safe)" : depth === "absent" ? "var(--ink-faint)" : "var(--ink-dim)";
  return (
    <span className="mono" style={{ ...styles.depthPill, color: tone, borderColor: tone }}>
      {DEPTH_LABEL[depth]}
    </span>
  );
}

function ScoreRow({ row, rank, index }: { row: ScorecardRow; rank: number; index: number }) {
  return (
    <div className="row" style={{ ["--i" as string]: Math.min(index, 7), ...styles.scoreRow }}>
      <span className="num" style={styles.rank}>
        {String(rank).padStart(2, "0")}
      </span>
      <div style={styles.codeCell}>
        <span className="mono" style={styles.code}>
          {row.code}
        </span>
        <DepthPill depth={row.depth} />
      </div>
      <MarkGrid checks={row.checks} />
      <div style={styles.scoreCell}>
        {row.redFlagCount > 0 && (
          <span className="mono" style={styles.rowFlag}>
            <Flag size={11} weight="light" />
            {row.redFlagCount}
          </span>
        )}
        <span className="num" style={styles.score}>
          {row.score}
        </span>
      </div>
    </div>
  );
}

export function ScorecardSection({ data }: { data: Scorecard }) {
  const deep = data.depthCounts.find((d) => d.depth === "deep")?.count ?? 0;

  return (
    <section className="rise" style={{ ...styles.section, animationDelay: "160ms" }}>
      <div style={styles.head}>
        <Scales size={16} weight="light" style={{ color: "var(--vuln)" }} />
        <span style={styles.title}>The field, checked</span>
        <span style={styles.note}>
          ThirdCheck read every BUIDL CTC submission and applied its own catalogue. Rows are
          anonymised; each mark is what a submission evidences of the third check, not a security
          audit. Confirmed defects are disclosed privately to the affected teams first.
        </span>
      </div>

      <div style={styles.subStats}>
        <SubStat icon={<Stack size={15} weight="light" />} value={String(data.total)} label="submissions read" />
        <SubStat
          icon={<CheckCircle size={15} weight="light" style={{ color: "var(--safe)" }} />}
          value={String(deep)}
          label="with deep protocol integration"
        />
        <SubStat
          icon={<Flag size={15} weight="light" style={{ color: "var(--err)" }} />}
          value={String(data.withRedFlags)}
          label="with a confirmed binding defect"
        />
      </div>

      {/* The field-wide picture: which checks the ecosystem systematically skips. */}
      <div style={styles.block}>
        <div style={styles.blockLabel}>
          <ChartBarHorizontal size={13} weight="light" /> how much of the field performs each check
        </div>
        <div style={styles.distList}>
          {data.distribution.map((d, i) => (
            <DistributionBar
              key={d.id}
              id={d.id}
              label={d.label}
              applicable={d.applicable}
              yes={d.yes}
              partial={d.partial}
              flagged={d.flagged}
              index={i}
            />
          ))}
        </div>
        <div style={styles.legend}>
          <LegendSwatch color="var(--safe)" label="fully performs it" />
          <LegendSwatch color="var(--vuln)" faded label="partial or implicit" />
          <span style={styles.legendNote}>
            bar spans only the submissions where the check applies
          </span>
        </div>
      </div>

      {/* The ranked, anonymised table. */}
      <div style={styles.block}>
        <div style={styles.blockLabel}>every submission, ranked by third-check coverage</div>
        <div style={styles.tableHead}>
          <span style={styles.thRank}>#</span>
          <span style={styles.thCode}>project</span>
          <div style={styles.markGrid}>
            {CHECK_ORDER.map((k, i) => (
              <span key={k} className="mono" style={styles.thMark} title={data.checkLegend[i]?.label}>
                {data.checkLegend[i]?.id.replace("B-", "")}
              </span>
            ))}
          </div>
          <span style={styles.thScore}>score</span>
        </div>
        <div style={styles.table}>
          {data.rows.map((row, i) => (
            <ScoreRow key={row.code} row={row} rank={i + 1} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SubStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div style={styles.subStat}>
      <div style={styles.subStatTop}>
        {icon}
        <span className="num" style={styles.subStatValue}>
          {value}
        </span>
      </div>
      <div style={styles.subStatLabel}>{label}</div>
    </div>
  );
}

function LegendSwatch({ color, label, faded }: { color: string; label: string; faded?: boolean }) {
  return (
    <span style={styles.legendItem}>
      <span style={{ ...styles.legendSwatch, background: color, opacity: faded ? 0.55 : 1 }} />
      <span style={styles.legendLabel}>{label}</span>
    </span>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: { marginTop: "3.5rem" },
  head: { display: "flex", alignItems: "baseline", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1.5rem" },
  title: { fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" },
  note: { fontSize: 12, color: "var(--ink-faint)", lineHeight: 1.45, maxWidth: 560 },

  subStats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 1,
    background: "var(--line)",
    border: "1px solid var(--line)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: "2.25rem",
  },
  subStat: { background: "var(--panel)", padding: "1.1rem 1.25rem" },
  subStatTop: { display: "flex", alignItems: "center", gap: "0.55rem" },
  subStatValue: { fontSize: "1.9rem", lineHeight: 1, letterSpacing: "-0.03em", fontWeight: 600 },
  subStatLabel: { fontSize: 12, color: "var(--ink-dim)", marginTop: "0.55rem", lineHeight: 1.4 },

  block: { marginBottom: "2.5rem" },
  blockLabel: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--ink-faint)",
    marginBottom: "1rem",
  },

  distList: {
    border: "1px solid var(--line)",
    borderRadius: 3,
    overflow: "hidden",
    background: "var(--panel)",
  },
  distRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 2fr) auto",
    gap: "1rem",
    alignItems: "center",
    padding: "0.7rem 1.1rem",
    borderTop: "1px solid var(--line)",
  },
  distHead: { display: "flex", gap: "0.6rem", alignItems: "baseline", minWidth: 0 },
  distId: { fontSize: 11.5, color: "var(--ink-dim)", flexShrink: 0 },
  distLabel: { fontSize: 12.5, color: "var(--ink)", lineHeight: 1.3 },
  distTrack: {
    display: "flex",
    height: 7,
    borderRadius: 1,
    overflow: "hidden",
    background: "rgba(255,255,255,0.04)",
  },
  distFill: { height: "100%", transformOrigin: "left" },
  distCount: { display: "flex", alignItems: "baseline", gap: "0.3rem", flexShrink: 0, minWidth: 118, justifyContent: "flex-end" },
  distNum: { fontSize: 14.5, color: "var(--safe)", fontWeight: 600 },
  distDenom: { fontSize: 11, color: "var(--ink-faint)" },
  distPartial: { fontSize: 11.5, color: "var(--vuln)", opacity: 0.85 },
  distFlag: { display: "inline-flex", alignItems: "center", gap: "0.2rem", fontSize: 11, color: "var(--err)", marginLeft: "0.5rem" },

  legend: { display: "flex", alignItems: "center", gap: "1.1rem", marginTop: "0.9rem", flexWrap: "wrap" },
  legendItem: { display: "inline-flex", alignItems: "center", gap: "0.4rem" },
  legendSwatch: { width: 20, height: 7, borderRadius: 1, display: "inline-block" },
  legendLabel: { fontSize: 11.5, color: "var(--ink-dim)" },
  legendNote: { fontSize: 11, color: "var(--ink-faint)", fontStyle: "italic" },

  tableHead: {
    display: "grid",
    gridTemplateColumns: "2rem minmax(0, 1fr) auto auto",
    gap: "1rem",
    alignItems: "center",
    padding: "0 1.1rem 0.6rem",
  },
  thRank: { fontSize: 10.5, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.05em" },
  thCode: { fontSize: 10.5, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.05em" },
  thMark: { fontSize: 9.5, color: "var(--ink-faint)", width: 18, textAlign: "center" },
  thScore: { fontSize: 10.5, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right", minWidth: 54 },

  table: { border: "1px solid var(--line)", borderRadius: 3, overflow: "hidden", background: "var(--panel)" },
  scoreRow: {
    display: "grid",
    gridTemplateColumns: "2rem minmax(0, 1fr) auto auto",
    gap: "1rem",
    alignItems: "center",
    padding: "0.6rem 1.1rem",
    borderTop: "1px solid var(--line)",
  },
  rank: { fontSize: 12, color: "var(--ink-faint)" },
  codeCell: { display: "flex", alignItems: "center", gap: "0.6rem", minWidth: 0 },
  code: { fontSize: 12.5, color: "var(--ink)", letterSpacing: "0.01em" },
  depthPill: {
    fontSize: 10,
    padding: "1px 6px",
    borderRadius: 2,
    border: "1px solid",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    flexShrink: 0,
  },

  markGrid: { display: "flex", gap: 3 },
  mark: {
    width: 18,
    height: 18,
    borderRadius: 2,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    lineHeight: 1,
    flexShrink: 0,
  },

  scoreCell: { display: "flex", alignItems: "center", gap: "0.6rem", justifyContent: "flex-end", minWidth: 54 },
  rowFlag: { display: "inline-flex", alignItems: "center", gap: "0.2rem", fontSize: 11, color: "var(--err)" },
  score: { fontSize: 14, color: "var(--ink)", fontWeight: 600, letterSpacing: "-0.01em" },
};
