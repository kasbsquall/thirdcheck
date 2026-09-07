import React from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig} from 'remotion';
import {C, FONT, MONO} from '../theme';
import {Backdrop} from '../lib/Backdrop';
import {Eyebrow, Panel, Stamp, QR, Tick} from './_kit';
import {CountUp} from '../lib/ui';
import {Sfx} from '../lib/Sfx';
import {SETTLEMENT, short} from '../data/facts';

const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

const FlowNode: React.FC<{at: number; chain: string; label: string; hash?: string}> = ({at, chain, label, hash}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - at, fps, config: {damping: 18, stiffness: 120}});
  return (
    <Panel style={{padding: '18px 22px', minWidth: 250, opacity: p, transform: `translateY(${interpolate(p, [0, 1], [14, 0])}px)`}}>
      <div style={{fontFamily: FONT.text, fontSize: 17, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.amber}}>{chain}</div>
      <div style={{fontFamily: FONT.text, fontWeight: 600, fontSize: 23, color: C.white, margin: '4px 0'}}>{label}</div>
      {hash ? <div style={{fontFamily: MONO, fontSize: 18, color: C.slateText}}>{short(hash)}</div> : null}
    </Panel>
  );
};

const Party: React.FC<{at: number; role: string; addr: string}> = ({at, role, addr}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 12], [0, 1], clamp);
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 6, opacity: p, transform: `translateY(${interpolate(p, [0, 1], [10, 0])}px)`}}>
      <span style={{fontFamily: FONT.text, fontSize: 18, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.slateText}}>{role}</span>
      <span style={{fontFamily: MONO, fontSize: 22, color: C.white}}>{short(addr)}</span>
    </div>
  );
};

// SC7 — one real order, three distinct parties, end to end. Sepolia paid, attested to
// Creditcoin, settled on CC3. Every hash resolves on a public explorer.
export const Settlement: React.FC = () => {
  const frame = useCurrentFrame();
  const line = interpolate(frame, [40, 150], [0, 1], clamp);
  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Backdrop tint={C.amber} />
      <Sfx src="pop.mp3" at={20} vol={0.4} />
      <Sfx src="pop.mp3" at={80} vol={0.4} />
      <Sfx src="pop.mp3" at={140} vol={0.4} />
      <Sfx src="stamp.mp3" at={290} vol={0.55} />
      <Sfx src="confirm.mp3" at={312} vol={0.45} />
      <AbsoluteFill style={{padding: '70px 90px', justifyContent: 'center', gap: 40}}>
        <Eyebrow>one order · settled end to end</Eyebrow>

        {/* cross-chain flow */}
        <div style={{position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <div style={{position: 'absolute', left: 250, right: 250, top: '50%', height: 2, background: C.line}}>
            <div style={{height: '100%', width: `${line * 100}%`, background: `linear-gradient(90deg, ${C.amber}, ${C.green})`}} />
            {line >= 1 && (
              <div style={{position: 'absolute', top: -3, left: 0, width: 8, height: 8, borderRadius: 999, background: C.green,
                boxShadow: `0 0 12px ${C.green}`, animation: 'none', transform: `translateX(${((frame % 60) / 60) * 100}%)`}} />
            )}
          </div>
          <FlowNode at={20} chain="Sepolia" label="payment" hash={SETTLEMENT.sourceTx} />
          <FlowNode at={80} chain="cross-chain" label="attested to Creditcoin" />
          <FlowNode at={140} chain="CC3" label="settled" hash={SETTLEMENT.settleTx} />
        </div>

        {/* three parties */}
        <div style={{display: 'flex', alignItems: 'center', gap: 70, marginTop: 6}}>
          <Party at={196} role="operator" addr={SETTLEMENT.operator} />
          <Party at={222} role="seller" addr={SETTLEMENT.seller} />
          <Party at={248} role="treasury" addr={SETTLEMENT.treasury} />
          <div style={{marginLeft: 8}}>{frame > 288 ? <Stamp at={290} color={C.green} bg="rgba(79,180,119,0.12)"><span style={{display: 'inline-flex', alignItems: 'center', gap: 8}}><Tick at={292} size={22} /> 3 distinct addresses</span></Stamp> : null}</div>
        </div>

        {/* deltas + proof — who got paid what, one code to open it */}
        <div style={{display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8}}>
          <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
            <div style={{display: 'flex', gap: 54}}>
              <Delta at={312} label="seller received" value={0.0009975} color={C.green} />
              <Delta at={330} label="protocol fee" value={0.0000025} color={C.amber} />
            </div>
            <div style={{opacity: interpolate(frame, [348, 368], [0, 1], clamp), fontFamily: FONT.text, fontSize: 22, color: C.slateText}}>
              the seller was paid, the protocol kept its fee, three different wallets.
            </div>
          </div>
          <QR name="settle" at={360} size={132} caption="open the settlement" />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Delta: React.FC<{at: number; label: string; value: number; color: string}> = ({at, label, value, color}) => {
  const frame = useCurrentFrame();
  const show = interpolate(frame, [at - 6, at + 4], [0, 1], clamp);
  return (
  <div style={{opacity: show}}>
    <div style={{fontFamily: FONT.text, fontSize: 19, color: C.slateText}}>{label}</div>
    <div style={{fontFamily: FONT.display, fontWeight: 700, fontSize: 54, letterSpacing: '-0.03em', color, fontVariantNumeric: 'tabular-nums'}}>
      +<CountUp to={value} delay={at} duration={20} decimals={7} />
    </div>
  </div>
  );
};
