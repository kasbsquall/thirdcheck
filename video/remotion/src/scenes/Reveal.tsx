import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate} from 'remotion';
import {C, FONT} from '../theme';
import {Backdrop} from '../lib/Backdrop';
import {Sfx} from '../lib/Sfx';

const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

// The Verified Inflows seal, large: the green stamp drawing its check in.
const BigSeal: React.FC<{size: number; drawAt: number}> = ({size, drawAt}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame, fps, config: {damping: 14, stiffness: 120, mass: 0.8}});
  const draw = interpolate(frame - drawAt, [0, 16], [0, 1], clamp);
  const s = interpolate(p, [0, 1], [0.6, 1]);
  const rot = interpolate(p, [0, 1], [-8, 0]);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{transform: `scale(${s}) rotate(${rot}deg)`, filter: `drop-shadow(0 24px 60px ${C.green}55)`}}>
      <rect x="6" y="6" width="36" height="36" rx="12" fill={C.green} />
      <path
        d="M16 25 l5.5 5.5 l12 -13.5"
        fill="none"
        stroke={C.ink}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="30"
        strokeDashoffset={30 * (1 - draw)}
      />
    </svg>
  );
};

// SC-reveal — the sub-product's branded entrance. Logo only, one line. No data: this beat
// exists to name Verified Inflows as a product, not a feature.
export const Reveal: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const word = spring({frame: frame - 14, fps, config: {damping: 20, stiffness: 110}});
  const tag = interpolate(frame, [40, 58], [0, 1], clamp);
  const wordX = interpolate(word, [0, 1], [-24, 0]);
  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Backdrop tint={C.green} />
      <Sfx src="stamp.mp3" at={8} vol={0.5} />
      <Sfx src="confirm.mp3" at={16} vol={0.4} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 34}}>
          <BigSeal size={150} drawAt={8} />
          <div style={{overflow: 'hidden'}}>
            <div style={{
              fontFamily: FONT.display, fontWeight: 700, fontSize: 92, letterSpacing: '-0.035em',
              color: C.white, opacity: word, transform: `translateX(${wordX}px)`, lineHeight: 1,
            }}>
              Verified <span style={{color: C.green}}>Inflows</span>
            </div>
          </div>
        </div>
        <div style={{
          marginTop: 30, fontFamily: FONT.text, fontSize: 30, color: C.slateText, letterSpacing: '0.01em',
          opacity: tag, transform: `translateY(${interpolate(tag, [0, 1], [10, 0])}px)`,
        }}>
          the third check, aimed at the money coming in
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
