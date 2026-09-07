import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate} from 'remotion';
import {C, FONT, MONO} from '../theme';
import {Backdrop} from '../lib/Backdrop';
import {ScrollShot3D} from '../lib/ScrollShot3D';
import {Tick} from './_kit';
import {CountUp} from '../lib/ui';
import {Sfx} from '../lib/Sfx';
import {INFLOW, BRIDGE_LOSSES, short} from '../data/facts';

const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

const LossChip: React.FC<{at: number; name: string; usd: string}> = ({at, name, usd}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - at, fps, config: {damping: 16, stiffness: 150}});
  return (
    <div style={{
      opacity: p, transform: `translateY(${interpolate(p, [0, 1], [10, 0])}px)`,
      display: 'flex', flexDirection: 'column', gap: 1, padding: '8px 16px',
      border: `1px solid ${C.line}`, borderRadius: 9, background: 'rgba(255,255,255,0.02)',
    }}>
      <span style={{fontFamily: FONT.display, fontWeight: 700, fontSize: 27, letterSpacing: '-0.02em', color: C.red, fontVariantNumeric: 'tabular-nums'}}>{usd}</span>
      <span style={{fontFamily: FONT.text, fontSize: 14, color: C.slateText}}>{name}</span>
    </div>
  );
};

// SC-inflows — the sub-product shown on its real page. The cited losses set the stakes; the
// live /inflows page scrolling is the evidence the credit actually ran, not a mockup.
export const Inflows: React.FC = () => {
  const frame = useCurrentFrame();
  const amount = interpolate(frame, [150, 156], [0, 1], clamp);
  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Backdrop tint={C.green} />
      <Sfx src="whoosh.mp3" at={6} vol={0.35} />
      <Sfx src="confirm.mp3" at={150} vol={0.4} />
      <Sfx src="stamp.mp3" at={196} vol={0.5} />
      <AbsoluteFill style={{padding: '64px 84px', flexDirection: 'row', alignItems: 'center', gap: 56}}>
        <div style={{flex: '0 0 40%', display: 'flex', flexDirection: 'column', gap: 20}}>
          <div style={{fontFamily: FONT.text, fontSize: 17, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.slateText}}>
            where cross-chain money leaks
          </div>
          <div style={{display: 'flex', gap: 12}}>
            {BRIDGE_LOSSES.map((b, i) => (
              <LossChip key={b.name} at={10 + i * 8} name={b.name} usd={b.usd} />
            ))}
          </div>
          <div style={{fontFamily: FONT.text, fontSize: 13, color: C.slateText, marginTop: -8}}>public bridge-hack losses · aimed at the money coming in</div>

          <div style={{marginTop: 14, opacity: amount}}>
            <div style={{fontFamily: FONT.text, fontSize: 18, color: C.slateText}}>credited on a proven deposit</div>
            <div style={{fontFamily: FONT.display, fontWeight: 700, fontSize: 62, letterSpacing: '-0.03em', color: C.green, fontVariantNumeric: 'tabular-nums', lineHeight: 1}}>
              <CountUp to={Number(INFLOW.creditedAmount)} delay={150} duration={20} decimals={3} />
            </div>
            <div style={{fontFamily: MONO, fontSize: 16, color: C.slateText, marginTop: 6}}>to {short(INFLOW.beneficiary)}, a fresh address</div>
          </div>

          <div style={{opacity: interpolate(frame, [196, 212], [0, 1], clamp)}}>
            <span style={{display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(79,180,119,0.12)', border: `1px solid ${C.green}44`, color: C.green, fontFamily: FONT.text, fontWeight: 600, fontSize: 20, padding: '8px 16px', borderRadius: 999}}>
              <Tick at={198} size={20} /> no bridge trusted
            </span>
          </div>
        </div>
        <div style={{flex: 1, display: 'flex', justifyContent: 'center'}}>
          <ScrollShot3D src="stills_v6/inflows_full.png" imgW={2560} imgH={4226} winW={1040} winH={700} tiltX={5} tiltY={-12} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
