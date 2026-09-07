import React from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
import {C, FONT} from '../theme';
import {Backdrop} from '../lib/Backdrop';
import {Eyebrow, Tick} from './_kit';
import {Reveal} from '../lib/ui';
import {Sfx} from '../lib/Sfx';

const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

const UNPROVEN = [
  {plain: 'Did it actually succeed?', tag: 'receipt status'},
  {plain: 'Did it come from the contract you expect?', tag: 'emitter identity'},
  {plain: 'Have you already counted it?', tag: 'replay'},
];

const Row: React.FC<{children: React.ReactNode; tag?: string; at: number; ok?: boolean}> = ({children, tag, at, ok}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 10], [0, 1], clamp);
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 22, opacity: p, transform: `translateY(${interpolate(p, [0, 1], [10, 0])}px)`}}>
      {ok ? <Tick at={at + 2} color={C.green} size={40} /> : (
        <div style={{width: 40, height: 40, borderRadius: 999, border: `2.5px solid ${C.amber}`, flexShrink: 0}} />
      )}
      <div style={{fontFamily: FONT.display, fontWeight: 500, fontSize: 46, letterSpacing: '-0.02em', color: ok ? C.white : C.white}}>{children}</div>
      {tag ? <div style={{fontFamily: FONT.text, fontSize: 20, color: C.slateText, border: `1px solid ${C.line}`, borderRadius: 6, padding: '3px 12px'}}>{tag}</div> : null}
    </div>
  );
};

// SC2 — what the precompile proves, and the gap it leaves. One guarantee, three unproven
// questions in plain words, grouped under THE THIRD CHECK.
export const Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const bracket = interpolate(frame, [188, 210], [0, 1], clamp);
  const handoff = interpolate(frame, [250, 268], [0, 1], clamp);
  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Backdrop tint={C.amber} />
      <Sfx src="confirm.mp3" at={14} vol={0.4} />
      <Sfx src="pop.mp3" at={92} vol={0.3} />
      <Sfx src="pop.mp3" at={112} vol={0.3} />
      <Sfx src="pop.mp3" at={132} vol={0.3} />
      <Sfx src="whoosh.mp3" at={190} vol={0.4} />
      <AbsoluteFill style={{padding: '0 0 0 150px', justifyContent: 'center'}}>
        <div style={{marginBottom: 40}}><Reveal><Eyebrow>what the precompile proves</Eyebrow></Reveal></div>
        <div style={{marginBottom: 46}}><Row at={10} ok>Included in a block.</Row></div>

        <div style={{position: 'relative', display: 'flex', flexDirection: 'column', gap: 30, paddingLeft: 60}}>
          {/* grouping bracket */}
          <svg style={{position: 'absolute', left: 0, top: -6, height: 240, width: 46, overflow: 'visible'}} viewBox="0 0 46 240" fill="none">
            <path d="M40 4 H14 V236 H40" stroke={C.amber} strokeWidth="3" strokeLinecap="round"
              strokeDasharray="500" strokeDashoffset={500 * (1 - bracket)} />
          </svg>
          {UNPROVEN.map((u, i) => (
            <Row key={u.tag} at={92 + i * 20} tag={u.tag}>{u.plain}</Row>
          ))}
          <div style={{position: 'absolute', left: 70, top: 250, opacity: bracket, fontFamily: FONT.display, fontWeight: 700, fontSize: 30, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.amber}}>
            {handoff > 0.5 ? 'the third check · left to you' : 'the third check'}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
