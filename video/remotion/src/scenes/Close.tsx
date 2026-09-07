import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring} from 'remotion';
import {C, FONT, MONO} from '../theme';
import {Backdrop} from '../lib/Backdrop';
import {Sheen} from '../lib/Motion';
import {Panel, QR, Stamp, Tick} from './_kit';
import {Sfx} from '../lib/Sfx';
import {REPO, SETTLEMENT, FEE, short} from '../data/facts';

const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

// Phase A fills the spoken "route through the hub, settle safe, verified operator pays less"
// with the real settlement instead of a static hold, then hands off to the brand card.
const SWITCH = 250;

const FlowNode: React.FC<{at: number; chain: string; label: string; hash?: string}> = ({at, chain, label, hash}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - at, fps, config: {damping: 18, stiffness: 120}});
  return (
    <Panel style={{padding: '16px 22px', minWidth: 270, opacity: p, transform: `translateY(${interpolate(p, [0, 1], [14, 0])}px)`}}>
      <div style={{fontFamily: FONT.text, fontSize: 16, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.amber}}>{chain}</div>
      <div style={{fontFamily: FONT.text, fontWeight: 600, fontSize: 22, color: C.white, margin: '4px 0'}}>{label}</div>
      {hash ? <div style={{fontFamily: MONO, fontSize: 17, color: C.slateText}}>{short(hash)}</div> : null}
    </Panel>
  );
};

const RailPhase: React.FC = () => {
  const frame = useCurrentFrame();
  const line = interpolate(frame, [40, 130], [0, 1], clamp);
  const out = interpolate(frame, [SWITCH - 16, SWITCH], [1, 0], clamp);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity: out}}>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34}}>
        <div style={{fontFamily: FONT.text, fontWeight: 600, fontSize: 20, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.amber, opacity: interpolate(frame, [6, 20], [0, 1], clamp)}}>
          routed through the hub, settled safe by construction
        </div>
        <div style={{position: 'relative', display: 'flex', alignItems: 'center', gap: 90}}>
          <div style={{position: 'absolute', left: 270, right: 270, top: '50%', height: 2, background: C.line}}>
            <div style={{height: '100%', width: `${line * 100}%`, background: `linear-gradient(90deg, ${C.amber}, ${C.green})`}} />
          </div>
          <FlowNode at={20} chain="Sepolia" label="payment" hash={SETTLEMENT.sourceTx} />
          <FlowNode at={110} chain="CC3" label="settled, fee taken" hash={SETTLEMENT.settleTx} />
        </div>
        {frame > 150 ? (
          <Stamp at={152} color={C.green} bg="rgba(79,180,119,0.12)">
            <span style={{display: 'inline-flex', alignItems: 'center', gap: 8}}>
              <Tick at={154} size={20} /> a verified operator settles at {(FEE.verifiedNetBps / 100).toFixed(2)}% vs {(FEE.bps / 100).toFixed(2)}%
            </span>
          </Stamp>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

// The mark builds: three bars rise, the check draws on the third. Driven off a local clock so
// it can start when the brand phase takes over.
const AnimatedMark: React.FC<{size: number; startAt: number}> = ({size, startAt}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = frame - startAt;
  const bar = (at: number) => {
    const p = spring({frame: f - at, fps, config: {damping: 14, stiffness: 150}});
    return {scaleY: p, opacity: p};
  };
  const b1 = bar(4), b2 = bar(11), b3 = bar(18);
  const check = interpolate(f, [28, 40], [0, 1], clamp);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <rect x="7" y="26" width="7" height="15" rx="3.5" fill={C.slateText} style={{transform: `scaleY(${b1.scaleY})`, transformOrigin: '10px 41px', opacity: b1.opacity}} />
      <rect x="18" y="19" width="7" height="22" rx="3.5" fill={C.white} style={{transform: `scaleY(${b2.scaleY})`, transformOrigin: '21px 41px', opacity: b2.opacity}} />
      <rect x="29" y="9" width="7" height="32" rx="3.5" fill={C.amber} style={{transform: `scaleY(${b3.scaleY})`, transformOrigin: '32px 41px', opacity: b3.opacity}} />
      <path d="M30 22.5 l3.4 3.4 l6.2 -6.6" fill="none" stroke={C.ink} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray="16" strokeDashoffset={16 * (1 - check)} />
    </svg>
  );
};

// Hands the screen from the brand card to the closing slogan near the end of the scene.
const BRAND_OUT = 430;
const SLOGAN_IN = 438;

const BrandPhase: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = frame - SWITCH;
  const inn = interpolate(frame, [SWITCH, SWITCH + 16], [0, 1], clamp) *
    interpolate(frame, [BRAND_OUT, BRAND_OUT + 16], [1, 0], clamp);
  const wm = spring({frame: f - 24, fps, config: {damping: 18, stiffness: 110}});
  const tag = interpolate(f, [40, 54], [0, 1], clamp);
  const bottom = interpolate(f, [58, 74], [0, 1], clamp);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 30, opacity: inn}}>
      <div style={{position: 'relative', display: 'flex', alignItems: 'center', gap: 22, overflow: 'hidden', padding: '8px 10px', borderRadius: 16}}>
        <AnimatedMark size={96} startAt={SWITCH} />
        <div style={{fontFamily: FONT.display, fontWeight: 600, fontSize: 96, letterSpacing: '-0.03em', opacity: wm, transform: `translateX(${interpolate(wm, [0, 1], [-16, 0])}px)`}}>
          <span style={{color: C.white}}>Third</span><span style={{color: C.amber}}>Check</span>
        </div>
        <Sheen at={SWITCH + 22} dur={32} opacity={0.2} />
      </div>
      <div style={{opacity: tag, transform: `translateY(${interpolate(tag, [0, 1], [8, 0])}px)`, fontFamily: FONT.text, fontSize: 30, color: C.slateText, letterSpacing: '0.01em'}}>
        the check every Attestcoin integrator runs before mainnet
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 26, marginTop: 14, opacity: bottom, transform: `translateY(${interpolate(bottom, [0, 1], [12, 0])}px)`}}>
        <QR name="repo" at={SWITCH + 60} size={132} />
        <div style={{display: 'flex', flexDirection: 'column', gap: 9}}>
          <div style={{fontFamily: FONT.text, fontWeight: 600, fontSize: 30, color: C.white}}>{REPO}</div>
          <div style={{fontFamily: FONT.text, fontSize: 21, color: C.slateText}}>testnet · every claim verifiable</div>
          <div style={{fontFamily: FONT.text, fontSize: 18, color: C.slateText, letterSpacing: '0.05em'}}>Creditcoin &middot; Credit Labs &middot; Attestcoin</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// The closing slogan: the sticky one-liner, held to the end.
const SloganPhase: React.FC = () => {
  const frame = useCurrentFrame();
  const inn = interpolate(frame, [SLOGAN_IN, SLOGAN_IN + 18], [0, 1], clamp);
  const rise = interpolate(frame, [SLOGAN_IN, SLOGAN_IN + 22], [14, 0], clamp);
  const wrong = interpolate(frame, [SLOGAN_IN + 20, SLOGAN_IN + 36], [0, 1], clamp);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 26, opacity: inn}}>
      <div style={{transform: `translateY(${rise}px)`, textAlign: 'center', fontFamily: FONT.display, fontWeight: 700, fontSize: 74, letterSpacing: '-0.03em', lineHeight: 1.08, color: C.white}}>
        The proof is real.<br />
        <span>The payment is </span><span style={{color: C.amber, opacity: wrong}}>wrong.</span>
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 12, opacity: interpolate(frame, [SLOGAN_IN + 30, SLOGAN_IN + 46], [0, 1], clamp)}}>
        <span style={{fontFamily: FONT.display, fontWeight: 600, fontSize: 26, letterSpacing: '-0.02em'}}>
          <span style={{color: C.white}}>Third</span><span style={{color: C.amber}}>Check</span>
        </span>
        <span style={{color: C.slateText, fontSize: 22}}>·</span>
        <span style={{fontFamily: FONT.text, fontSize: 22, color: C.slateText}}>thirdcheck.vercel.app</span>
      </div>
    </AbsoluteFill>
  );
};

// SC9 — rail proof, the brand moment, then the closing slogan. The spoken product line plays
// over a real settlement; the mark + QR hold for the scan; the film lands on the one-liner.
export const Close: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Backdrop tint={C.amber} />
      <Sfx src="pop.mp3" at={20} vol={0.35} />
      <Sfx src="pop.mp3" at={110} vol={0.4} />
      <Sfx src="stamp.mp3" at={152} vol={0.5} />
      <Sfx src="whoosh.mp3" at={SWITCH} vol={0.4} />
      <Sfx src="confirm.mp3" at={SWITCH + 28} vol={0.5} />
      <Sfx src="stamp.mp3" at={SLOGAN_IN + 20} vol={0.4} />
      {frame < SWITCH + 4 ? <RailPhase /> : null}
      {frame >= SWITCH - 4 && frame < BRAND_OUT + 20 ? <BrandPhase /> : null}
      {frame >= BRAND_OUT ? <SloganPhase /> : null}
    </AbsoluteFill>
  );
};
