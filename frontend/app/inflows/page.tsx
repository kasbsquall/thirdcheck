import type { Metadata } from "next";
import Link from "next/link";
import { loadInflow, loadAdopter, loadConformance, CC3_EXPLORER, SEPOLIA_EXPLORER } from "@/lib/reports";
import { InflowMark } from "@/components/Mark";
import {
  ShieldCheck,
  CheckCircle,
  ArrowSquareOut,
  ListChecks,
  Cube,
  Stack,
  ArrowLeft,
} from "@/components/icons";

export const metadata: Metadata = {
  title: "Verified Inflows — ThirdCheck",
  description:
    "The third check aimed at value entering Creditcoin: an inbound cross-chain deposit is proven independently before an app credits it. No bridge trusted.",
};

function short(h: string): string {
  return `${h.slice(0, 10)}…${h.slice(-6)}`;
}

// The binding checks the inbound path enforces, the same third check aimed at a deposit.
const INBOUND_CHECKS: { k: string; t: string }[] = [
  { k: "status", t: "The source transaction actually succeeded. The precompile does not check this." },
  { k: "emitter", t: "It came from the expected gateway, not a look-alike contract." },
  { k: "event", t: "It is the Deposited event, matched by signature, not another log." },
  { k: "deposit", t: "It is bound to this deposit id, so one proof credits one deposit." },
  { k: "chain", t: "It is on the right source chain, pinned at deploy, never the caller's claim." },
  { k: "window", t: "It sits inside a fresh block window, so a stale block cannot be replayed." },
  { k: "replay", t: "The proven position is consumed once; the deposit is credited at most once." },
  { k: "logsel", t: "The correct log is selected among many; a decoy that fails a later check is skipped." },
];

export default function InflowsPage() {
  const data = loadInflow();
  const adopter = loadAdopter();
  const conformance = loadConformance();
  const credited = data?.creditedAmount ?? data?.amount ?? null;
  const landed = data ? Number(data.beneficiaryDelta) > 0 : false;

  return (
    <main style={styles.main}>
      <div style={styles.shell}>
        {/* Masthead: the sub-identity, clearly part of ThirdCheck */}
        <header className="rise" style={styles.mast}>
          <div style={styles.brandRow}>
            <InflowMark size={26} />
            <span style={styles.brand}>Verified Inflows</span>
            <span style={styles.partOf}>part of ThirdCheck</span>
            <Link href="/" style={styles.back}>
              <ArrowLeft size={13} weight="light" /> the full bench
            </Link>
          </div>
          <div style={styles.kicker}>value crosses in only when the crossing is safe</div>
          <h1 style={styles.thesis}>
            The check on <em style={styles.em}>money coming in</em>. An inbound deposit is proven before
            an app credits it, independent of any bridge.
          </h1>
          <p style={styles.sub}>
            Crediting an inbound cross-chain transfer is the costliest step in the whole space. Roughly
            two billion dollars in bridge losses came from crediting a message without independently
            confirming it. Verified Inflows applies the third check to that exact step: the deposit is
            real, from the expected gateway, to that beneficiary for that amount, on the right chain, and
            never credited before, all proven through the Attestcoin precompile with no bridge and no
            relayer trusted.
          </p>
        </header>

        {/* The proof: a real inbound deposit credited end to end */}
        {data && data.credited && (
          <section className="rise" style={{ ...styles.section, animationDelay: "60ms" }}>
            <div style={styles.head}>
              <ShieldCheck size={16} weight="light" style={{ color: "var(--safe)" }} />
              <span style={styles.title}>Proven: a real deposit, checked then credited</span>
            </div>

            <div style={styles.proofGrid}>
              <div style={styles.tile}>
                <div style={styles.tileHead}>
                  <ListChecks size={14} weight="light" style={{ color: "var(--safe)" }} />
                  <span style={styles.tileLabel}>credited on a proven deposit</span>
                </div>
                <div style={styles.deltaRow}>
                  <div style={styles.deltaCol}>
                    <span className="num" style={styles.big}>{credited}</span>
                    <span style={styles.unit}>credited to the beneficiary</span>
                  </div>
                  {landed && (
                    <div style={styles.deltaCol}>
                      <span className="num" style={styles.bigGhost}>0 → {data.beneficiaryDelta}</span>
                      <span style={styles.unit}>a fresh address, distinct from payer and consumer</span>
                    </div>
                  )}
                </div>
                <div style={styles.subline}>
                  <CheckCircle size={12} weight="light" style={{ color: "var(--safe)" }} />
                  <span>no bridge and no relayer in the trust path; the credit waited on the proof (testnet)</span>
                </div>
              </div>

              <div style={styles.tile}>
                <div style={styles.tileHead}>
                  <Cube size={14} weight="light" style={{ color: "var(--safe)" }} />
                  <span style={styles.tileLabel}>the mined path, source to credit</span>
                </div>
                <div style={styles.flow}>
                  <a href={data.depositTx.url} target="_blank" rel="noreferrer" className="lift-safe" style={styles.flowStep}>
                    <span style={styles.flowChain}>deposit on Sepolia</span>
                    <span className="mono" style={styles.flowTx}>{short(data.depositTx.hash)}<ArrowSquareOut size={11} weight="light" /></span>
                  </a>
                  <span style={styles.arrow} aria-hidden>→</span>
                  <a href={data.creditTx.url} target="_blank" rel="noreferrer" className="lift-safe" style={styles.flowStep}>
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
        )}

        {/* The check, itemised */}
        <section className="rise" style={{ ...styles.section, animationDelay: "100ms" }}>
          <div style={styles.head}>
            <ListChecks size={16} weight="light" style={{ color: "var(--safe)" }} />
            <span style={styles.title}>What the inbox proves before it credits</span>
            <span style={styles.note}>
              The precompile at 0x0FD2 proves inclusion and continuity, then stops. Everything below is
              the third check, run by the consumer, in two library calls.
            </span>
          </div>
          <div style={styles.checkGrid}>
            {INBOUND_CHECKS.map((c, i) => (
              <div className="row lift-safe" key={c.k} style={{ ["--i" as string]: Math.min(i, 7), ...styles.checkItem }}>
                <CheckCircle size={14} weight="light" style={{ color: "var(--safe)", marginTop: 2 }} />
                <div>
                  <span className="mono" style={styles.checkKey}>{c.k}</span>
                  <span style={styles.checkText}>{c.t}</span>
                </div>
              </div>
            ))}
          </div>
          <p style={styles.mechNote}>
            In the library this is <span className="mono" style={styles.code}>verifyReceipt</span> plus{" "}
            <span className="mono" style={styles.code}>bindDeposit</span>, a second predicate over the same
            verified receipt, so the check generalises past payments without loosening a single guarantee.
            {conformance?.surface && (
              <> ThirdCheck exercises {conformance.surface.exercised} of {conformance.surface.totalEntryPoints}{" "}
              protocol entry points, where a typical consumer touches {conformance.surface.typicalConsumerEntryPoints}.</>
            )}
          </p>
        </section>

        {/* Why it matters: the user-expansion edge */}
        <section className="rise" style={{ ...styles.section, animationDelay: "140ms" }}>
          <div style={styles.whyPanel}>
            <div style={styles.whyTitle}>Why this is the growth edge, not just a guard</div>
            <p style={styles.whyText}>
              Value and users cross into Creditcoin from larger chains only when the crossing is safe.
              Every bridge, ramp and cross-chain deposit is a moment where a consumer can be credited off
              a lie, and that fear is what keeps liquidity out. Verified Inflows removes it at the exact
              step where the loss happens. Any wallet, ramp, lending or RWA app routes its inbound
              deposits through the inbox and credits safe by construction, and a verified operator settles
              at a lower rate. Safe inflow is how the ecosystem pulls in users and value it otherwise
              cannot.
            </p>
          </div>
        </section>

        {/* Reference adopter: a distinct app built on the library */}
        {adopter && (
          <section className="rise" style={{ ...styles.section, animationDelay: "160ms" }}>
            <div style={styles.head}>
              <Stack size={16} weight="light" style={{ color: "var(--safe)" }} />
              <span style={styles.title}>A reference adopter: a cross-chain credit line on the library</span>
              <span style={styles.note}>
                Not a third-party integration. A second app, built by the same team, to show the library
                is something products build on and not only the ThirdCheck contracts themselves. A user
                locks collateral on Sepolia; once the third check proves the inbound deposit, the app opens
                a credit line and the user draws against it, all on testnet.
              </span>
            </div>
            <div style={styles.proofGrid}>
              <div style={styles.tile}>
                <div style={styles.tileHead}>
                  <ListChecks size={14} weight="light" style={{ color: "var(--safe)" }} />
                  <span style={styles.tileLabel}>the line a real user opened</span>
                </div>
                <div style={styles.ladder}>
                  <div style={styles.rung}>
                    <span className="num" style={styles.rungNum}>{adopter.collateral}</span>
                    <span style={styles.rungLabel}>collateral verified</span>
                  </div>
                  <span style={styles.rungArrow} aria-hidden>→</span>
                  <div style={styles.rung}>
                    <span className="num" style={{ ...styles.rungNum, color: "var(--safe)" }}>{adopter.creditLimit}</span>
                    <span style={styles.rungLabel}>credit line · {(adopter.ltvBps / 100).toFixed(0)}% LTV</span>
                  </div>
                  <span style={styles.rungArrow} aria-hidden>→</span>
                  <div style={styles.rung}>
                    <span className="num" style={styles.rungNum}>{adopter.drawn}</span>
                    <span style={styles.rungLabel}>drawn · {adopter.available} still available</span>
                  </div>
                </div>
                <div style={styles.subline}>
                  <CheckCircle size={12} weight="light" style={{ color: "var(--safe)" }} />
                  <span>the credit line and the draw depend on the same verifyReceipt + bindDeposit, no check reimplemented</span>
                </div>
              </div>
              <div style={styles.tile}>
                <div style={styles.tileHead}>
                  <Cube size={14} weight="light" style={{ color: "var(--safe)" }} />
                  <span style={styles.tileLabel}>the mined path, collateral to draw</span>
                </div>
                <div style={styles.flow}>
                  <a href={adopter.depositTx.url} target="_blank" rel="noreferrer" className="lift-safe" style={styles.flowStep}>
                    <span style={styles.flowChain}>collateral on Sepolia</span>
                    <span className="mono" style={styles.flowTx}>{short(adopter.depositTx.hash)}<ArrowSquareOut size={11} weight="light" /></span>
                  </a>
                  <span style={styles.arrow} aria-hidden>→</span>
                  <a href={adopter.openLineTx.url} target="_blank" rel="noreferrer" className="lift-safe" style={styles.flowStep}>
                    <span style={styles.flowChain}>line opened on CC3</span>
                    <span className="mono" style={styles.flowTx}>{short(adopter.openLineTx.hash)}<ArrowSquareOut size={11} weight="light" /></span>
                  </a>
                  <span style={styles.arrow} aria-hidden>→</span>
                  <a href={adopter.drawTx.url} target="_blank" rel="noreferrer" className="lift-safe" style={styles.flowStep}>
                    <span style={styles.flowChain}>drawn on CC3</span>
                    <span className="mono" style={styles.flowTx}>{short(adopter.drawTx.hash)}<ArrowSquareOut size={11} weight="light" /></span>
                  </a>
                </div>
                <a
                  href={CC3_EXPLORER.replace("/tx/", "/address/") + adopter.app}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.addrRow}
                >
                  <span style={styles.addrLabel}>CreditLineApp · CC3</span>
                  <span className="mono" style={styles.addr}>{short(adopter.app)}<ArrowSquareOut size={11} weight="light" /></span>
                </a>
              </div>
            </div>
          </section>
        )}

        {/* Deployed */}
        <section className="rise" style={{ ...styles.section, animationDelay: "180ms" }}>
          <div style={styles.head}>
            <Cube size={16} weight="light" style={{ color: "var(--safe)" }} />
            <span style={styles.title}>Deployed on testnet</span>
          </div>
          <div style={styles.addrTable}>
            <AddrLine label="SourceGateway" net="Ethereum Sepolia" addr={data?.gateway ?? "0x879628662310232F9c287eF45d14d89B7cD5886E"} base={SEPOLIA_EXPLORER} />
            <AddrLine label="InflowConsumer" net="Creditcoin CC3" addr={data?.consumer ?? "0x037D8E868Ced6F3612EfEd070aBB316eF8fB82c0"} base={CC3_EXPLORER} />
            <AddrLine label="CreditLineApp" net="Creditcoin CC3" addr={adopter?.app ?? "0xE6049333594A454E5A73C38a8a3DaAC8D90191f7"} base={CC3_EXPLORER} />
          </div>
        </section>

        <footer style={styles.footer}>
          <span className="mono" style={styles.footNote}>
            Verified Inflows · part of ThirdCheck · BUIDL CTC 2026 Fall · testnet, every claim verifiable
          </span>
          <Link href="/" style={styles.footLink}>
            back to the bench <ArrowSquareOut size={11} weight="light" />
          </Link>
        </footer>
      </div>
    </main>
  );
}

function AddrLine({ label, net, addr, base }: { label: string; net: string; addr: string; base: string }) {
  return (
    <a href={base.replace("/tx/", "/address/") + addr} target="_blank" rel="noreferrer" className="lift-safe" style={styles.addrTableRow}>
      <span style={styles.addrTableLabel}>{label}</span>
      <span style={styles.addrTableNet}>{net}</span>
      <span className="mono" style={styles.addrTableAddr}>{short(addr)}<ArrowSquareOut size={11} weight="light" /></span>
    </a>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: { minHeight: "100vh", padding: "clamp(1.5rem, 4vw, 5rem) 1.25rem" },
  shell: { maxWidth: 960, margin: "0 auto" },

  mast: { marginBottom: "2.5rem" },
  brandRow: { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.6rem", flexWrap: "wrap" },
  brand: { fontSize: 18, letterSpacing: "-0.015em", fontWeight: 600, color: "var(--ink)" },
  partOf: { fontSize: 11, color: "var(--ink-faint)", border: "1px solid var(--line)", borderRadius: 2,
    padding: "2px 7px", letterSpacing: "0.03em", textTransform: "uppercase" },
  back: { marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: 12.5,
    color: "var(--ink-dim)" },

  kicker: { fontFamily: "var(--mono)", fontSize: 12.5, letterSpacing: "0.02em", color: "var(--safe)", marginBottom: "0.9rem" },
  thesis: { fontSize: "clamp(1.5rem, 1rem + 2.4vw, 2.7rem)", lineHeight: 1.08, letterSpacing: "-0.022em",
    fontWeight: 600, margin: "0 0 1.1rem", maxWidth: 820, textWrap: "balance" },
  em: { fontStyle: "normal", color: "var(--safe)" },
  sub: { fontSize: "clamp(0.95rem, 0.9rem + 0.3vw, 1.05rem)", lineHeight: 1.6, color: "var(--ink-dim)",
    maxWidth: 680, margin: 0, textWrap: "pretty" },

  section: { marginTop: "2.6rem" },
  head: { display: "flex", alignItems: "baseline", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1.1rem" },
  title: { fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" },
  note: { fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.5, maxWidth: 60 + "ch" },

  proofGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 1,
    background: "var(--line)", border: "1px solid var(--line)", borderRadius: 3, overflow: "hidden" },
  tile: { position: "relative", background: "linear-gradient(180deg, rgba(255,255,255,0.018), rgba(255,255,255,0) 130px), var(--panel)", padding: "1.3rem 1.4rem" },
  tileHead: { display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.9rem" },
  tileLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-faint)" },
  deltaRow: { display: "flex", gap: "1.6rem", flexWrap: "wrap" },
  deltaCol: { display: "flex", flexDirection: "column", gap: "0.25rem" },
  big: { fontSize: "2rem", lineHeight: 0.9, letterSpacing: "-0.03em", fontWeight: 600, color: "var(--safe)",
    fontVariantNumeric: "tabular-nums" },
  bigGhost: { fontSize: "1.35rem", lineHeight: 1, letterSpacing: "-0.02em", fontWeight: 600, color: "var(--ink)",
    fontVariantNumeric: "tabular-nums" },
  unit: { fontSize: 12, color: "var(--ink-dim)", maxWidth: 220, lineHeight: 1.35 },
  subline: { display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", fontSize: 12,
    color: "var(--ink-dim)", marginTop: "0.95rem", lineHeight: 1.4 },

  flow: { display: "flex", alignItems: "stretch", gap: "0.6rem", flexWrap: "wrap" },
  flowStep: { display: "flex", flexDirection: "column", gap: "0.3rem", background: "var(--panel-2)",
    border: "1px solid var(--line)", borderRadius: 2, padding: "0.6rem 0.8rem", flex: 1, minWidth: 140 },
  flowChain: { fontSize: 11, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.04em" },
  flowTx: { display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: 11.5, color: "var(--ink)" },
  arrow: { alignSelf: "center", color: "var(--safe)", fontSize: 16 },
  addrRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem",
    padding: "0.55rem 0 0", marginTop: "0.9rem", borderTop: "1px solid var(--line)" },
  addrLabel: { fontSize: 12.5, color: "var(--ink-dim)", paddingTop: "0.55rem" },
  addr: { display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: 11.5, color: "var(--ink)", paddingTop: "0.55rem" },

  checkGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 1,
    background: "var(--line)", border: "1px solid var(--line)", borderRadius: 3, overflow: "hidden" },
  checkItem: { display: "flex", gap: "0.6rem", background: "var(--panel)", padding: "0.95rem 1.1rem", alignItems: "flex-start" },
  checkKey: { fontSize: 11, color: "var(--safe)", marginRight: "0.5rem", textTransform: "uppercase", letterSpacing: "0.04em" },
  checkText: { fontSize: 13, color: "var(--ink-dim)", lineHeight: 1.45 },

  ladder: { display: "flex", alignItems: "flex-end", gap: "0.9rem", flexWrap: "wrap" },
  rung: { display: "flex", flexDirection: "column", gap: "0.2rem", minWidth: 0 },
  rungNum: { fontSize: "1.5rem", lineHeight: 0.95, letterSpacing: "-0.03em", fontWeight: 600, color: "var(--ink)",
    fontVariantNumeric: "tabular-nums" },
  rungLabel: { fontSize: 11.5, color: "var(--ink-dim)", lineHeight: 1.3 },
  rungArrow: { alignSelf: "center", color: "var(--safe)", fontSize: 15, paddingBottom: "0.4rem" },
  mechNote: { fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.6, marginTop: "1.1rem", maxWidth: 74 + "ch" },
  code: { color: "var(--ink)", fontSize: 12 },

  whyPanel: { background: "var(--safe-bg)", border: "1px solid rgba(79,174,148,0.28)", borderRadius: 4,
    padding: "1.6rem 1.7rem" },
  whyTitle: { fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em", marginBottom: "0.7rem", color: "var(--ink)" },
  whyText: { fontSize: 14, color: "var(--ink-dim)", lineHeight: 1.65, margin: 0, maxWidth: 76 + "ch" },

  addrTable: { border: "1px solid var(--line)", borderRadius: 3, overflow: "hidden", background: "var(--panel)" },
  addrTableRow: { display: "grid", gridTemplateColumns: "1.1fr 1.2fr 1fr", gap: "1rem", alignItems: "center",
    padding: "0.85rem 1.1rem", borderTop: "1px solid var(--line)" },
  addrTableLabel: { fontSize: 13.5, color: "var(--ink)", fontWeight: 500 },
  addrTableNet: { fontSize: 12.5, color: "var(--ink-dim)" },
  addrTableAddr: { display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: 11.5, color: "var(--ink-dim)", justifyContent: "flex-end" },

  footer: { marginTop: "3.5rem", paddingTop: "1.25rem", borderTop: "1px solid var(--line)", display: "flex",
    alignItems: "center", gap: "1rem", flexWrap: "wrap" },
  footNote: { fontSize: 11.5, color: "var(--ink-faint)" },
  footLink: { marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: 12.5, color: "var(--safe)" },
};
