import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring} from 'remotion';
import {C, FONT} from '../theme';
import {Backdrop} from '../lib/Backdrop';
import {Eyebrow, Panel, Stamp} from './_kit';
import {beatPulse} from '../lib/beats';
import {Sfx} from '../lib/Sfx';

const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

const GHOST_COLS = 14;
const GHOST_ROWS = 7;

// A faint field of integration patterns behind the hero — texture, not a claim. No count is
// stated and nothing is named; it just says "many patterns, and some of them ship broken".
const ghostState = (r: number, c: number): 'safe' | 'flag' => ((r * 13 + c * 7 + r * c * 5) % 9 === 0 ? 'flag' : 'safe');

// SC3 — we rebuilt the integration patterns a consumer reaches for. The ones most teams ship
// release on the wrong proof. Patterns, not projects; we name no one. One hero pattern holds,
// then the anchor line takes the frame.
export const Scorecard: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const hero = spring({frame: frame - 20, fps, config: {damping: 16, stiffness: 130}});
  const released = frame > 54;
  const pulse = released ? beatPulse(frame) : 0;
  const anchor = interpolate(frame, [332, 356], [0, 1], clamp);
  const desat = interpolate(frame, [332, 356], [1, 0.12], clamp);

  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Backdrop tint={C.amber} grid={false} />
      <Sfx src="whoosh.mp3" at={4} vol={0.4} />
      <Sfx src="stamp.mp3" at={54} vol={0.55} />
      <Sfx src="stamp.mp3" at={334} vol={0.6} />

      {/* ghost field of patterns, de-emphasised */}
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity: desat}}>
        <div style={{display: 'grid', gridTemplateColumns: `repeat(${GHOST_COLS}, 58px)`, gridAutoRows: '30px', gap: 10, opacity: interpolate(frame, [0, 40], [0, 0.5], clamp), filter: 'blur(0.4px)'}}>
          {Array.from({length: GHOST_ROWS * GHOST_COLS}).map((_, i) => {
            const r = Math.floor(i / GHOST_COLS);
            const c = i % GHOST_COLS;
            const flag = ghostState(r, c) === 'flag';
            const appear = interpolate(frame, [i * 0.4, i * 0.4 + 12], [0, 1], clamp);
            return (
              <div key={i} style={{
                borderRadius: 5, opacity: appear * (flag ? 0.7 : 0.32),
                background: flag ? C.amber : 'rgba(79,180,119,0.5)',
              }} />
            );
          })}
        </div>
      </AbsoluteFill>

      {/* the hero pattern: one integration a lot of teams ship, and it releases */}
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity: desat}}>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, transform: `scale(${interpolate(anchor, [0, 1], [1, 0.96])})`}}>
          <Eyebrow>we pressure-tested the integration patterns</Eyebrow>
          <div style={{
            transform: `translateY(${interpolate(hero, [0, 1], [16, 0])}px) scale(${1 + pulse * 0.015})`, opacity: hero,
          }}>
            <Panel style={{padding: '30px 40px', width: 720, border: `1px solid ${C.amber}66`, boxShadow: `0 0 ${28 + pulse * 26}px -6px ${C.amber}55, 0 32px 64px -40px rgba(0,0,0,0.9)`}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div style={{fontFamily: FONT.text, fontSize: 20, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.slateText}}>a common integration pattern</div>
                {released ? <Stamp at={54} color={C.amber} bg="rgba(224,145,58,0.16)">RELEASED</Stamp> : null}
              </div>
              <div style={{fontFamily: FONT.display, fontWeight: 700, fontSize: 52, letterSpacing: '-0.03em', color: C.white, margin: '12px 0 6px'}}>
                status-blind escrow
              </div>
              <div style={{fontFamily: FONT.text, fontSize: 26, color: C.amber}}>
                pays out on a proof of the wrong thing
              </div>
            </Panel>
          </div>
          <div style={{display: 'flex', gap: 26, alignItems: 'center', marginTop: 2}}>
            <Legend color="rgba(79,180,119,0.55)" label="rejects when the third check runs" />
            <Legend color={C.amber} label="releases on the wrong proof" />
          </div>
          <div style={{marginTop: 2}}><Stamp at={78} color={C.slateText}>patterns, not projects &middot; we name no one</Stamp></div>
        </div>
      </AbsoluteFill>

      {/* the anchor line takes the frame */}
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <div style={{textAlign: 'center', opacity: anchor, transform: `translateY(${interpolate(anchor, [0, 1], [16, 0])}px)`}}>
          <div style={{fontFamily: FONT.display, fontWeight: 700, fontSize: 92, letterSpacing: '-0.035em', lineHeight: 1.02, color: C.white}}>
            The proof is real.
          </div>
          <div style={{fontFamily: FONT.display, fontWeight: 700, fontSize: 92, letterSpacing: '-0.035em', lineHeight: 1.02, color: C.amber}}>
            The payment is wrong.
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Legend: React.FC<{color: string; label: string}> = ({color, label}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
    <div style={{width: 18, height: 18, borderRadius: 5, background: color}} />
    <span style={{fontFamily: FONT.text, fontSize: 19, color: C.slateText}}>{label}</span>
  </div>
);
