import React from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
import {C, FONT} from '../theme';
import {Backdrop} from '../lib/Backdrop';
import {ScrollShot3D} from '../lib/ScrollShot3D';
import {Eyebrow, Stamp} from './_kit';
import {Sfx} from '../lib/Sfx';

const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

// SC4 — the field scan, shown as the real audit bulletin scrolling. A rendered bar chart of
// "53" is an assertion; the live page listing the field is evidence it ran at scale.
export const Scorecard: React.FC = () => {
  const frame = useCurrentFrame();
  const label = interpolate(frame, [8, 24], [0, 1], clamp);
  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Backdrop tint={C.amber} />
      <Sfx src="whoosh.mp3" at={6} vol={0.35} />
      <AbsoluteFill style={{padding: '70px 84px', flexDirection: 'row', alignItems: 'center', gap: 60}}>
        <div style={{flex: '0 0 40%', display: 'flex', flexDirection: 'column', gap: 22, opacity: label, transform: `translateX(${interpolate(label, [0, 1], [-20, 0])}px)`}}>
          <Eyebrow>the live audit bulletin</Eyebrow>
          <div style={{fontFamily: FONT.display, fontWeight: 700, fontSize: 60, letterSpacing: '-0.03em', lineHeight: 0.98, color: C.white}}>
            fifty-three<br />submissions,<br />one catalogue
          </div>
          <div style={{display: 'flex', gap: 12, marginTop: 6}}>
            {frame > 40 ? <Stamp at={42} color={C.amber} bg="rgba(224,145,58,0.12)">chain identity · 14/49</Stamp> : null}
          </div>
          <div style={{display: 'flex', gap: 12}}>
            {frame > 54 ? <Stamp at={56} color={C.amber} bg="rgba(224,145,58,0.12)">correct log · 8/37</Stamp> : null}
          </div>
          <div style={{fontFamily: FONT.text, fontSize: 21, color: C.slateText, lineHeight: 1.5, marginTop: 6}}>
            the precompile is only as safe as its consumers, and most skip the check.
          </div>
        </div>
        <div style={{flex: 1, display: 'flex', justifyContent: 'center'}}>
          <ScrollShot3D src="stills_v6/home_full.png" imgW={2560} imgH={8400} winW={1080} winH={700} tiltX={5} tiltY={-12} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
