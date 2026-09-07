import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring} from 'remotion';
import {C, MONO, FONT} from '../theme';
import {Backdrop} from '../lib/Backdrop';
import {Letterbox, Sheen} from '../lib/Motion';
import {Panel, Stamp} from './_kit';
import {Sfx} from '../lib/Sfx';

const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

// Receipt lines draw in one by one so the panel is alive from frame 0 (during the music lead).
const LINES = [
  'receipt   0x94d9…399c',
  'emitter   0x1Af6…4155 · block 11,649,456',
  'inclusion ✓   continuity ✓',
];

// SC1 — the proof that lied. The voice enters at frame 48; the receipt is already building,
// PROOF: VALID lands, then the payment slams in and the amount shoots up against it.
export const ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // The voice tells the story first (a seller shipped, the proof checked out) and only then
  // says "released"; the slam tracks that word, ~5.5s into the 7.2s line.
  const released = frame > 206;
  // local impact on the payment block (a spring, not a global camera shake)
  const impact = spring({frame: frame - 206, fps, config: {damping: 10, stiffness: 240, mass: 0.6}});
  const impactScale = 1 + 0.06 * (1 - impact);
  const flash = interpolate(frame, [206, 214, 228], [0, 0.5, 0], clamp);
  const amount = interpolate(frame, [208, 224], [0, 0.001], clamp).toFixed(3);
  const strike = interpolate(frame, [226, 240], [0, 1], clamp);

  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Backdrop tint={C.amber} />
      <Sfx src="whoosh.mp3" at={4} vol={0.35} />
      <Sfx src="stamp.mp3" at={96} vol={0.5} />
      <Sfx src="impact.mp3" at={206} vol={0.75} />
      <Letterbox progress={interpolate(frame, [0, 20], [1, 0.42], clamp)} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        {/* static receipt — no float/zoom on the opening hero shot */}
        <div style={{position: 'relative', borderRadius: 14, overflow: 'hidden'}}>
            <Panel style={{padding: '38px 46px', width: 980}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22}}>
                <div style={{fontFamily: FONT.text, fontSize: 20, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.slateText, opacity: interpolate(frame, [4, 16], [0, 1], clamp)}}>
                  Attestcoin BlockProver · 0x0FD2 · live precompile
                </div>
                <div style={{position: 'relative'}}>
                  <Stamp at={96} color={C.green} bg="rgba(79,180,119,0.12)">PROOF: VALID</Stamp>
                  <svg style={{position: 'absolute', inset: 0, pointerEvents: 'none'}} width="100%" height="100%" viewBox="0 0 220 48" preserveAspectRatio="none">
                    <line x1="6" y1="24" x2="214" y2="24" stroke={C.red} strokeWidth="3" strokeDasharray="210" strokeDashoffset={210 * (1 - strike)} strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              {/* receipt body, drawing in line by line */}
              <div style={{fontFamily: MONO, fontSize: 24, lineHeight: 1.75, color: C.slateText}}>
                {LINES.map((l, i) => {
                  const at = 8 + i * 12;
                  const p = interpolate(frame, [at, at + 10], [0, 1], clamp);
                  return (
                    <div key={i} style={{opacity: p, transform: `translateX(${interpolate(p, [0, 1], [-10, 0])}px)`}}>{l}</div>
                  );
                })}
              </div>

              <div style={{height: 1, background: C.line, margin: '26px 0'}} />

              {/* the contradiction: valid proof, money released */}
              <div style={{display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', position: 'relative', transform: `scale(${impactScale})`, transformOrigin: 'left bottom'}}>
                <div>
                  <div style={{fontFamily: FONT.text, fontSize: 19, color: C.slateText, letterSpacing: '0.04em'}}>seller shipped · escrow released</div>
                  <div style={{fontFamily: FONT.display, fontWeight: 700, fontSize: 96, letterSpacing: '-0.04em', color: released ? C.amber : 'rgba(154,161,171,0.35)', fontVariantNumeric: 'tabular-nums', lineHeight: 1}}>
                    {released ? amount : '—'} <span style={{fontSize: 40}}>ETH</span>
                  </div>
                </div>
                {released ? <Stamp at={82} color={C.amber} bg="rgba(224,145,58,0.16)">PAYMENT: RELEASED</Stamp> : null}
              </div>

              {/* amber flash on the slam */}
              <AbsoluteFill style={{background: C.amber, opacity: flash, mixBlendMode: 'overlay', pointerEvents: 'none'}} />
            </Panel>
            <Sheen at={30} dur={34} opacity={0.16} />
          </div>

        <div style={{marginTop: 30, opacity: interpolate(frame, [236, 250], [0, 1], clamp), fontFamily: FONT.text, fontSize: 24, color: C.slateText}}>
          The proof did its job. The code didn&rsquo;t.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
