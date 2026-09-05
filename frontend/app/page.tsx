import {
  loadVulnerable,
  loadHardened,
  loadStatic,
  CATALOGUE,
  CC3_EXPLORER,
  SEPOLIA_EXPLORER,
  type Finding,
  type BenchReport,
} from "@/lib/reports";
import {
  ShieldWarning,
  ShieldCheck,
  Warning,
  CheckCircle,
  XCircle,
  ArrowSquareOut,
  Cube,
  FnIcon,
  ListChecks,
  Clock,
  FileMagnifyingGlass,
  Circle,
} from "@/components/icons";

function shortHash(h?: string): string {
  if (!h) return "";
  return `${h.slice(0, 10)}…${h.slice(-6)}`;
}

function findingById(report: BenchReport | null, id: string): Finding | undefined {
  return report?.findings.find((f) => f.id === id);
}

/** One catalogue row across both targets. */
function ContrastRow({
  id,
  title,
  index,
  vuln,
  hard,
}: {
  id: string;
  title: string;
  index: number;
  vuln?: Finding;
  hard?: Finding;
}) {
  const vulnHit = vuln?.status === "accepted";
  const hardSafe = hard?.status === "rejected";

  return (
    <div className="row" style={{ ["--i" as string]: Math.min(index, 7) }}>
      <div style={styles.rowGrid}>
        <div style={styles.rowHead}>
          <span className="mono" style={styles.rowId}>
            {id}
          </span>
          <span style={styles.rowTitle}>{title}</span>
        </div>

        <div style={styles.cell}>
          {vuln ? (
            <Verdict
              kind={vulnHit ? "vuln" : vuln.status === "error" ? "err" : "safe"}
              label={vulnHit ? "released" : vuln.status === "error" ? "error" : "rejected"}
              tx={vuln.evidenceTx}
              explorer={CC3_EXPLORER}
            />
          ) : (
            <Pending />
          )}
        </div>

        <div style={styles.cell}>
          {hard ? (
            <Verdict
              kind={hardSafe ? "safe" : hard.status === "error" ? "err" : "vuln"}
              label={hardSafe ? "rejected" : hard.status === "error" ? "error" : "released"}
              tx={hard.evidenceTx}
              explorer={CC3_EXPLORER}
              sub={hardSafe ? hard.detail.replace(/^reverted:\s*/, "") : undefined}
            />
          ) : (
            <Pending />
          )}
        </div>
      </div>
    </div>
  );
}

function Verdict({
  kind,
  label,
  tx,
  explorer,
  sub,
}: {
  kind: "vuln" | "safe" | "err";
  label: string;
  tx?: string;
  explorer: string;
  sub?: string;
}) {
  const color = kind === "vuln" ? "var(--vuln)" : kind === "safe" ? "var(--safe)" : "var(--err)";
  const bg = kind === "vuln" ? "var(--vuln-bg)" : kind === "safe" ? "var(--safe-bg)" : "transparent";
  const Icon = kind === "vuln" ? Warning : kind === "safe" ? CheckCircle : XCircle;
  return (
    <div>
      <span style={{ ...styles.badge, color, background: bg }}>
        <Icon size={13} weight="light" />
        <span className="mono">{label}</span>
      </span>
      {sub && (
        <div className="mono" style={styles.revertReason}>
          {sub}
        </div>
      )}
      {tx && (
        <a
          href={explorer + tx}
          target="_blank"
          rel="noreferrer"
          className="mono"
          style={styles.txLink}
        >
          {shortHash(tx)}
          <ArrowSquareOut size={11} weight="light" />
        </a>
      )}
    </div>
  );
}

function Pending() {
  return (
    <span className="mono" style={styles.pending}>
      <Circle size={12} weight="light" /> not run
    </span>
  );
}

export default function Page() {
  const vulnerable = loadVulnerable();
  const hardened = loadHardened();
  const vaultbridge = loadStatic("VaultBridge");

  const dynamicIds = CATALOGUE.filter((c) => c.detection === "dynamic").map((c) => c.id);
  const vulnCount = dynamicIds.filter((id) => findingById(vulnerable, id)?.status === "accepted").length;
  const hardSafeCount = dynamicIds.filter((id) => findingById(hardened, id)?.status === "rejected").length;
  const positiveVuln = findingById(vulnerable, "POS");
  const positiveHard = findingById(hardened, "POS");

  return (
    <main style={styles.main}>
      <div style={styles.shell}>
        {/* Masthead */}
        <header className="rise" style={styles.masthead}>
          <div style={styles.brandRow}>
            <FileMagnifyingGlass size={22} weight="light" style={{ color: "var(--vuln)" }} />
            <span className="mono" style={styles.brand}>
              ThirdCheck
            </span>
            <span style={styles.tag}>Attestcoin binding audit</span>
          </div>
          <h1 style={styles.thesis}>
            The precompile proves <em style={styles.em}>inclusion</em> and{" "}
            <em style={styles.em}>continuity</em>. Everything a contract needs before it moves money
            is the third check, and it is left to the developer.
          </h1>
          <p style={styles.sub}>
            ThirdCheck builds legitimate Attestcoin proofs of things that are not the payment for the
            order they release, and submits them. Every proof below passes the precompile. What
            varies is whether the consumer&rsquo;s third check catches it.
          </p>
        </header>

        {/* Headline stats */}
        <section className="rise" style={{ ...styles.stats, animationDelay: "60ms" }}>
          <Stat
            icon={<ShieldWarning size={18} weight="light" style={{ color: "var(--vuln)" }} />}
            value={`${vulnCount}/${dynamicIds.length}`}
            label="attacks accepted by the vulnerable escrow"
            tone="vuln"
          />
          <Stat
            icon={<ShieldCheck size={18} weight="light" style={{ color: "var(--safe)" }} />}
            value={hardened ? `${hardSafeCount}/${dynamicIds.length}` : "—"}
            label="attacks rejected by the hardened escrow"
            tone="safe"
          />
          <Stat
            icon={<Clock size={18} weight="light" style={{ color: "var(--ink-dim)" }} />}
            value="~8 min"
            label="attestation frontier lag, Sepolia to CC3, measured"
            tone="dim"
          />
        </section>

        {/* The contrast table */}
        <section className="rise" style={{ animationDelay: "100ms" }}>
          <div style={styles.tableHead}>
            <div style={styles.rowGrid}>
              <span style={styles.colLabel}>
                <ListChecks size={14} weight="light" /> binding check
              </span>
              <span style={styles.colLabel}>
                <Cube size={14} weight="light" /> vulnerable escrow
              </span>
              <span style={styles.colLabel}>
                <ShieldCheck size={14} weight="light" /> hardened escrow
              </span>
            </div>
          </div>

          <div style={styles.table}>
            {CATALOGUE.filter((c) => c.detection === "dynamic").map((c, i) => (
              <ContrastRow
                key={c.id}
                id={c.id}
                title={c.title}
                index={i}
                vuln={findingById(vulnerable, c.id)}
                hard={findingById(hardened, c.id)}
              />
            ))}

            {/* Positive path sits apart: the proof the honest flow depends on. */}
            <div className="row" style={{ ["--i" as string]: 6, borderTop: "1px solid var(--line-strong)" }}>
              <div style={styles.rowGrid}>
                <div style={styles.rowHead}>
                  <span className="mono" style={{ ...styles.rowId, color: "var(--safe)" }}>
                    POS
                  </span>
                  <span style={styles.rowTitle}>A correct payment must still release</span>
                </div>
                <div style={styles.cell}>
                  {positiveVuln ? (
                    <Verdict
                      kind={positiveVuln.status === "accepted" ? "safe" : "err"}
                      label={positiveVuln.status === "accepted" ? "released" : positiveVuln.status}
                      tx={positiveVuln.evidenceTx}
                      explorer={CC3_EXPLORER}
                    />
                  ) : (
                    <Pending />
                  )}
                </div>
                <div style={styles.cell}>
                  {positiveHard ? (
                    <Verdict
                      kind={positiveHard.status === "accepted" ? "safe" : "err"}
                      label={positiveHard.status === "accepted" ? "released" : positiveHard.status}
                      tx={positiveHard.evidenceTx}
                      explorer={CC3_EXPLORER}
                    />
                  ) : (
                    <Pending />
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Static findings */}
        {vaultbridge && (
          <section className="rise" style={{ ...styles.staticSection, animationDelay: "140ms" }}>
            <div style={styles.staticHead}>
              <FnIcon size={16} weight="light" style={{ color: "var(--vuln)" }} />
              <span style={styles.staticTitle}>Source-visible defects</span>
              <span style={styles.staticNote}>
                found statically, no chain needed. Target shown is a public submission, cited as
                evidence that the catalogue describes real code.
              </span>
            </div>
            <div style={styles.staticList}>
              {dedupeStatic(vaultbridge.findings).map((f, i) => (
                <div className="row" key={`${f.file}:${f.line}:${f.evidence}`} style={{ ["--i" as string]: Math.min(i, 7), ...styles.staticRow }}>
                  <div style={styles.staticRowTop}>
                    <span className="mono" style={styles.rowId}>
                      {f.id}
                    </span>
                    <span style={styles.staticRowTitle}>{f.title}</span>
                  </div>
                  <div className="mono" style={styles.staticLoc}>
                    {f.file}:{f.line} · {f.evidence}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Catalogue coverage */}
        <section className="rise" style={{ animationDelay: "180ms" }}>
          <div style={styles.catHead}>catalogue coverage</div>
          <div style={styles.catGrid}>
            {CATALOGUE.map((c) => (
              <div key={c.id} style={styles.catItem}>
                <span className="mono" style={styles.catId}>
                  {c.id}
                </span>
                <span style={styles.catTitle}>{c.title}</span>
                <span
                  className="mono"
                  style={{
                    ...styles.catBadge,
                    color:
                      c.detection === "dynamic"
                        ? "var(--vuln)"
                        : c.detection === "static"
                        ? "var(--safe)"
                        : "var(--ink-faint)",
                  }}
                >
                  {c.detection}
                </span>
              </div>
            ))}
          </div>
        </section>

        <footer style={styles.footer}>
          <span className="mono" style={styles.footNote}>
            BUIDL CTC 2026 Fall · Creditcoin &amp; Credit Labs · targets on CC3 testnet &amp; Sepolia
          </span>
        </footer>
      </div>
    </main>
  );
}

function dedupeStatic<T extends { file: string; line: number; evidence: string }>(items: T[]): T[] {
  // Collapse the test-file duplicates; keep the first occurrence of each (file,line,evidence).
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    const k = `${it.file}:${it.line}:${it.evidence}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

function Stat({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  tone: "vuln" | "safe" | "dim";
}) {
  const color = tone === "vuln" ? "var(--vuln)" : tone === "safe" ? "var(--safe)" : "var(--ink)";
  return (
    <div style={styles.stat}>
      <div style={styles.statTop}>{icon}</div>
      <div className="num" style={{ ...styles.statValue, color }}>
        {value}
      </div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: { minHeight: "100vh", padding: "clamp(1.5rem, 4vw, 5rem) 1.25rem" },
  shell: { maxWidth: 1080, margin: "0 auto" },

  masthead: { marginBottom: "3rem" },
  brandRow: { display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.75rem" },
  brand: { fontSize: 15, letterSpacing: "0.02em", fontWeight: 500 },
  tag: {
    fontSize: 11,
    color: "var(--ink-faint)",
    border: "1px solid var(--line)",
    borderRadius: 2,
    padding: "2px 7px",
    letterSpacing: "0.03em",
    textTransform: "uppercase",
  },
  thesis: {
    fontSize: "clamp(1.5rem, 1rem + 2.4vw, 2.9rem)",
    lineHeight: 1.08,
    letterSpacing: "-0.022em",
    fontWeight: 600,
    margin: "0 0 1.1rem",
    maxWidth: 880,
    textWrap: "balance",
  },
  em: { fontStyle: "normal", color: "var(--vuln)" },
  sub: {
    fontSize: "clamp(0.95rem, 0.9rem + 0.3vw, 1.08rem)",
    lineHeight: 1.6,
    color: "var(--ink-dim)",
    maxWidth: 680,
    margin: 0,
    textWrap: "pretty",
  },

  stats: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 1, background: "var(--line)", border: "1px solid var(--line)", borderRadius: 3, marginBottom: "3rem", overflow: "hidden" },
  stat: { background: "var(--panel)", padding: "1.4rem 1.5rem" },
  statTop: { marginBottom: "0.9rem" },
  statValue: { fontSize: "clamp(2rem, 1.4rem + 2vw, 3.1rem)", lineHeight: 0.95, letterSpacing: "-0.03em", fontWeight: 600 },
  statLabel: { fontSize: 12.5, color: "var(--ink-dim)", marginTop: "0.6rem", lineHeight: 1.4, maxWidth: 220 },

  tableHead: { padding: "0 0 0.7rem" },
  table: { border: "1px solid var(--line)", borderRadius: 3, overflow: "hidden", background: "var(--panel)" },
  rowGrid: { display: "grid", gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr)", gap: "1rem", alignItems: "start" },
  colLabel: { display: "flex", alignItems: "center", gap: "0.4rem", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-faint)" },

  rowHead: { display: "flex", gap: "0.7rem", alignItems: "baseline", minWidth: 0 },
  rowId: { fontSize: 12, color: "var(--ink-dim)", flexShrink: 0 },
  rowTitle: { fontSize: 13.5, lineHeight: 1.35, color: "var(--ink)" },
  cell: { minWidth: 0 },

  badge: { display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: 12, padding: "3px 8px", borderRadius: 2 },
  revertReason: { fontSize: 11, color: "var(--ink-faint)", marginTop: "0.35rem", lineHeight: 1.3 },
  txLink: { display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: 11, color: "var(--ink-dim)", marginTop: "0.4rem" },
  pending: { display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: 12, color: "var(--ink-faint)" },

  staticSection: { marginTop: "3rem" },
  staticHead: { display: "flex", alignItems: "baseline", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1rem" },
  staticTitle: { fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" },
  staticNote: { fontSize: 12, color: "var(--ink-faint)", lineHeight: 1.4, maxWidth: 520 },
  staticList: { border: "1px solid var(--line)", borderRadius: 3, overflow: "hidden", background: "var(--panel)" },
  staticRow: { padding: "0.85rem 1.1rem", borderTop: "1px solid var(--line)" },
  staticRowTop: { display: "flex", gap: "0.7rem", alignItems: "baseline" },
  staticRowTitle: { fontSize: 13.5, color: "var(--ink)" },
  staticLoc: { fontSize: 11.5, color: "var(--ink-faint)", marginTop: "0.3rem" },

  catHead: { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-faint)", margin: "3rem 0 1rem" },
  catGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 1, background: "var(--line)", border: "1px solid var(--line)", borderRadius: 3, overflow: "hidden" },
  catItem: { display: "flex", alignItems: "center", gap: "0.7rem", background: "var(--panel)", padding: "0.7rem 0.9rem" },
  catId: { fontSize: 11.5, color: "var(--ink-dim)", flexShrink: 0 },
  catTitle: { fontSize: 12.5, color: "var(--ink)", flex: 1, lineHeight: 1.3 },
  catBadge: { fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0 },

  footer: { marginTop: "3.5rem", paddingTop: "1.25rem", borderTop: "1px solid var(--line)" },
  footNote: { fontSize: 11.5, color: "var(--ink-faint)" },
};
