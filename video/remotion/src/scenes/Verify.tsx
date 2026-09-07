import React from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
import {C, FONT, MONO} from '../theme';
import {Backdrop} from '../lib/Backdrop';
import {Eyebrow, Panel, Tick} from './_kit';
import {Typewriter} from '../lib/Type';
import {CountUp} from '../lib/ui';
import {Sfx} from '../lib/Sfx';

const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

const CHECKS = [
  'receipt status read', 'emitter pinned', 'event signature', 'replay guarded', 'chain identity',
  'order bound', 'fields bound', 'block window', 'log selection', 'attestation frontier', 'settlement released',
];

// A streaming check line. When `fail` it turns red with a cross and reads FAIL.
const Line: React.FC<{i: number; text: string; base: number; step: number; fail?: boolean}> = ({i, text, base, step, fail}) => {
  const frame = useCurrentFrame();
  const at = base + i * step;
  const p = interpolate(frame, [at, at + 8], [0, 1], clamp);
  const color = fail ? C.red : C.green;
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 14, opacity: p, transform: `translateY(${interpolate(p, [0, 1], [8, 0])}px)`, padding: '5px 0'}}>
      <Tick at={at + 2} size={24} color={color} cross={fail} />
      <span style={{fontFamily: MONO, fontSize: 26, color: fail ? C.red : C.white}}>{text}</span>
      {fail ? <span style={{fontFamily: FONT.text, fontWeight: 700, fontSize: 20, color: C.red, letterSpacing: '0.08em'}}>FAIL</span> : null}
    </div>
  );
};

const Dot: React.FC<{c: string}> = ({c}) => <div style={{width: 15, height: 15, borderRadius: 999, background: c}} />;

// SC8 — falsifiability that bites. First a tampered proof makes a check fail on the spot, then
// the real one reproduces every claim off the public chain.
export const Verify: React.FC = () => {
  const frame = useCurrentFrame();
  const tampered = interpolate(frame, [154, 170], [1, 0], clamp); // tampered run clears
  const clean = interpolate(frame, [164, 180], [0, 1], clamp);    // real run takes over

  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Backdrop tint={C.amber} />
      <Sfx src="click.mp3" at={30} vol={0.4} />
      <Sfx src="impact.mp3" at={110} vol={0.5} />
      <Sfx src="whoosh.mp3" at={156} vol={0.35} />
      <Sfx src="click.mp3" at={172} vol={0.4} />
      {[180, 214, 244].map((f) => <Sfx key={f} src="click.mp3" at={f} vol={0.22} />)}
      <Sfx src="stamp.mp3" at={250} vol={0.6} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 26}}>
        <Eyebrow>don&rsquo;t trust us · reproduce it</Eyebrow>
        <Panel style={{padding: '30px 40px', width: 980, minHeight: 470, position: 'relative'}}>
          <div style={{display: 'flex', gap: 10, marginBottom: 18}}>
            <Dot c="#e0554e" /><Dot c="#e0913a" /><Dot c="#4fb477" />
          </div>

          {/* tampered run — one check fails on the spot */}
          <div style={{position: 'absolute', left: 40, right: 40, opacity: tampered}}>
            <div style={{fontFamily: MONO, fontSize: 28, marginBottom: 14}}>
              <span style={{color: C.slateText}}>$ </span>
              <Typewriter text="npm run judge:verify --proof=tampered" at={30} charsPerSec={44} style={{color: C.amber}} />
            </div>
            <Line i={0} text="receipt status read" base={74} step={11} />
            <Line i={1} text="emitter pinned" base={74} step={11} />
            <Line i={2} text="event signature" base={74} step={11} />
            <Line i={3} text="replay guarded" base={74} step={11} fail />
            <div style={{marginTop: 16, opacity: interpolate(frame, [120, 132], [0, 1], clamp), display: 'flex', alignItems: 'center', gap: 12}}>
              <span style={{fontFamily: FONT.display, fontWeight: 700, fontSize: 34, color: C.red}}>proof rejected</span>
              <span style={{fontFamily: FONT.text, fontSize: 22, color: C.slateText}}>the check caught it, nothing settles</span>
            </div>
          </div>

          {/* real run — every claim reproduces */}
          <div style={{opacity: clean}}>
            <div style={{fontFamily: MONO, fontSize: 28, color: C.green, marginBottom: 14}}>
              <span style={{color: C.slateText}}>$ </span>
              <Typewriter text="npm run judge:verify" at={172} charsPerSec={44} style={{color: C.green}} />
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 40}}>
              {CHECKS.map((t, i) => <Line key={t} i={i} text={t} base={180} step={6} />)}
            </div>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 16, marginTop: 18, borderTop: `1px solid ${C.line}`, paddingTop: 16}}>
              <span style={{fontFamily: FONT.display, fontWeight: 700, fontSize: 52, color: C.green, fontVariantNumeric: 'tabular-nums'}}>
                <CountUp to={11} delay={250} duration={10} /> / 11
              </span>
              <span style={{fontFamily: FONT.text, fontSize: 24, color: C.slateText}}>checks pass, straight off the public chain</span>
            </div>
          </div>
        </Panel>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
