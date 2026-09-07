import React from 'react';
import {useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile} from 'remotion';
import {C, MONO, FONT} from '../theme';

const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

// The Triad isotype: three ascending bars, the third amber with the check.
export const Mark: React.FC<{size?: number; draw?: number}> = ({size = 64, draw = -1}) => {
  const frame = useCurrentFrame();
  const dp = draw < 0 ? 1 : interpolate(frame - draw, [0, 12], [0, 1], clamp);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <rect x="7" y="26" width="7" height="15" rx="3.5" fill={C.slateText} />
      <rect x="18" y="19" width="7" height="22" rx="3.5" fill={C.white} />
      <rect x="29" y="9" width="7" height="32" rx="3.5" fill={C.amber} />
      <path
        d="M30 22.5 l3.4 3.4 l6.2 -6.6"
        fill="none"
        stroke={C.ink}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="16"
        strokeDashoffset={16 * (1 - dp)}
      />
    </svg>
  );
};

// Wordmark lockup.
export const Wordmark: React.FC<{size?: number}> = ({size = 40}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: size * 0.24}}>
    <Mark size={size * 1.15} />
    <div style={{fontFamily: FONT.display, fontWeight: 600, fontSize: size, letterSpacing: '-0.03em', color: C.white}}>
      Third<span style={{color: C.amber}}>Check</span>
    </div>
  </div>
);

// A surface panel with the brand's quiet border and inset light.
export const Panel: React.FC<{style?: React.CSSProperties; children: React.ReactNode}> = ({style, children}) => (
  <div
    style={{
      background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.008) 40%), #15181d',
      border: `1px solid ${C.line}`,
      borderRadius: 14,
      boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 32px 64px -40px rgba(0,0,0,0.9)',
      ...style,
    }}
  >
    {children}
  </div>
);

// Uppercase micro-label.
export const Eyebrow: React.FC<{children: React.ReactNode; color?: string}> = ({children, color = C.amber}) => (
  <div style={{fontFamily: FONT.text, fontWeight: 600, fontSize: 20, letterSpacing: '0.22em', textTransform: 'uppercase', color}}>
    {children}
  </div>
);

// Draw-on check or cross, animated by stroke-dashoffset.
export const Tick: React.FC<{at?: number; size?: number; color?: string; cross?: boolean}> = ({
  at = 0,
  size = 34,
  color = C.green,
  cross = false,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - at, [0, 11], [0, 1], clamp);
  const d = cross ? 'M9 9 L25 25 M25 9 L9 25' : 'M8 18 l6 6 l12 -14';
  return (
    <svg width={size} height={size} viewBox="0 0 34 34">
      <circle cx="17" cy="17" r="15.5" fill="none" stroke={`${color}44`} strokeWidth="2" />
      <path d={d} fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray="40" strokeDashoffset={40 * (1 - p)} />
    </svg>
  );
};

// Mono hash with an explorer chip, springing in.
export const HashRow: React.FC<{label: string; hash: string; at?: number; chain?: string}> = ({
  label,
  hash,
  at = 0,
  chain = 'explorer',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - at, fps, config: {damping: 18, stiffness: 120}});
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 8, opacity: p, transform: `translateY(${interpolate(p, [0, 1], [12, 0])}px)`}}>
      <div style={{fontFamily: FONT.text, fontSize: 18, letterSpacing: '0.05em', textTransform: 'uppercase', color: C.slateText}}>{label}</div>
      <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
        <span style={{fontFamily: MONO, fontSize: 26, color: C.white, fontVariantNumeric: 'tabular-nums'}}>
          {`${hash.slice(0, 12)}…${hash.slice(-8)}`}
        </span>
        <span style={{fontFamily: FONT.text, fontSize: 17, color: C.amber, border: `1px solid ${C.amber}55`, borderRadius: 6, padding: '3px 10px'}}>{chain}</span>
      </div>
    </div>
  );
};

// Animated horizontal meter (scaleX from the left).
export const Bar: React.FC<{at?: number; pct: number; color?: string; w?: number; h?: number}> = ({
  at = 0,
  pct,
  color = C.amber,
  w = 460,
  h = 16,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - at, fps, config: {damping: 20, stiffness: 90}});
  return (
    <div style={{width: w, height: h, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden'}}>
      <div style={{width: `${pct}%`, height: '100%', borderRadius: 999, background: color, transform: `scaleX(${p})`, transformOrigin: 'left'}} />
    </div>
  );
};

// A QR that draws in, from a generated SVG in public/qr.
export const QR: React.FC<{name: string; at?: number; size?: number; caption?: string}> = ({name, at = 0, size = 150, caption}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - at, fps, config: {damping: 20, stiffness: 120}});
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, opacity: p, transform: `scale(${interpolate(p, [0, 1], [0.9, 1])})`}}>
      <div style={{padding: 12, background: C.white, borderRadius: 12}}>
        <Img src={staticFile(`qr/${name}.png`)} style={{width: size, height: size, display: 'block', imageRendering: 'pixelated'}} />
      </div>
      {caption ? <div style={{fontFamily: FONT.text, fontSize: 16, color: C.slateText, letterSpacing: '0.04em'}}>{caption}</div> : null}
    </div>
  );
};

// Spring-in chip with an optional accent ground.
export const Stamp: React.FC<{at?: number; children: React.ReactNode; color?: string; bg?: string}> = ({
  at = 0,
  children,
  color = C.white,
  bg = 'rgba(255,255,255,0.06)',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - at, fps, config: {damping: 12, stiffness: 160}});
  return (
    <div style={{
      transform: `scale(${interpolate(p, [0, 1], [0.9, 1])})`, opacity: p,
      background: bg, color, fontFamily: FONT.text, fontWeight: 600, fontSize: 22,
      padding: '9px 18px', borderRadius: 999, border: `1px solid ${color}33`, whiteSpace: 'nowrap',
    }}>
      {children}
    </div>
  );
};
