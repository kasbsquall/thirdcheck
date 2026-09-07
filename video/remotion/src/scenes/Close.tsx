import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring} from 'remotion';
import {C, FONT} from '../theme';
import {Backdrop} from '../lib/Backdrop';
import {Sheen} from '../lib/Motion';
import {QR} from './_kit';
import {Sfx} from '../lib/Sfx';
import {REPO} from '../data/facts';

const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

// The mark builds: three bars rise in sequence, the check draws on the third.
const AnimatedMark: React.FC<{size: number}> = ({size}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const bar = (at: number) => {
    const p = spring({frame: frame - at, fps, config: {damping: 14, stiffness: 150}});
    return {scaleY: p, opacity: p};
  };
  const b1 = bar(6), b2 = bar(14), b3 = bar(22);
  const check = interpolate(frame, [34, 46], [0, 1], clamp);
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

// SC9 — the brand moment. Clean: the mark builds, the wordmark resolves, the repo + QR hold
// for scanning. The spoken anchor lands in the VO; the screen belongs to the brand.
export const Close: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const wm = spring({frame: frame - 30, fps, config: {damping: 18, stiffness: 110}});
  const tag = interpolate(frame, [46, 60], [0, 1], clamp);
  const bottom = interpolate(frame, [64, 80], [0, 1], clamp);

  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Backdrop tint={C.amber} />
      <Sfx src="pop.mp3" at={6} vol={0.35} />
      <Sfx src="pop.mp3" at={14} vol={0.35} />
      <Sfx src="pop.mp3" at={22} vol={0.4} />
      <Sfx src="confirm.mp3" at={34} vol={0.5} />
      <Sfx src="whoosh.mp3" at={30} vol={0.4} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 30}}>
        {/* lockup */}
        <div style={{position: 'relative', display: 'flex', alignItems: 'center', gap: 22, overflow: 'hidden', padding: '8px 10px', borderRadius: 16}}>
          <AnimatedMark size={96} />
          <div style={{
            fontFamily: FONT.display, fontWeight: 600, fontSize: 96, letterSpacing: '-0.03em',
            opacity: wm, transform: `translateX(${interpolate(wm, [0, 1], [-16, 0])}px)`,
          }}>
            <span style={{color: C.white}}>Third</span><span style={{color: C.amber}}>Check</span>
          </div>
          <Sheen at={52} dur={32} opacity={0.2} />
        </div>

        <div style={{opacity: tag, transform: `translateY(${interpolate(tag, [0, 1], [8, 0])}px)`, fontFamily: FONT.text, fontSize: 30, color: C.slateText, letterSpacing: '0.01em'}}>
          the third check, by construction
        </div>

        <div style={{display: 'flex', alignItems: 'center', gap: 26, marginTop: 14, opacity: bottom, transform: `translateY(${interpolate(bottom, [0, 1], [12, 0])}px)`}}>
          <QR name="repo" at={66} size={132} />
          <div style={{display: 'flex', flexDirection: 'column', gap: 9}}>
            <div style={{fontFamily: FONT.text, fontWeight: 600, fontSize: 30, color: C.white}}>{REPO}</div>
            <div style={{fontFamily: FONT.text, fontSize: 21, color: C.slateText}}>testnet · every claim verifiable</div>
            <div style={{fontFamily: FONT.text, fontSize: 18, color: C.slateText, letterSpacing: '0.05em'}}>Creditcoin &middot; Credit Labs &middot; Attestcoin</div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
