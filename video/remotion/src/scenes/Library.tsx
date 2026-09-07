import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring} from 'remotion';
import {C, FONT, MONO} from '../theme';
import {Backdrop} from '../lib/Backdrop';
import {Eyebrow, Panel, Tick} from './_kit';
import {Typewriter} from '../lib/Type';
import {Reveal} from '../lib/ui';
import {Sfx} from '../lib/Sfx';
import {CATALOGUE} from '../data/facts';

const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

// SC5 — the catalogue collapses to two calls. The twelve converge to the centre and dissolve
// as the code panel rises from the same point (a crossfade, not a hard swap).
export const Library: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const collapse = interpolate(frame, [60, 96], [0, 1], clamp); // chips move to centre + fade
  const chipsOut = interpolate(frame, [78, 100], [1, 0], clamp);
  const panelIn = spring({frame: frame - 92, fps, config: {damping: 18, stiffness: 120}});

  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Backdrop tint={C.amber} />
      <Sfx src="whoosh.mp3" at={62} vol={0.45} />
      <Sfx src="pop.mp3" at={92} vol={0.4} />
      <Sfx src="confirm.mp3" at={178} vol={0.45} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <div style={{marginBottom: 70}}><Reveal><Eyebrow>from twelve checks to two calls</Eyebrow></Reveal></div>

        <div style={{position: 'relative', width: 820, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          {/* the twelve, staggering in then converging */}
          <div style={{position: 'absolute', display: 'grid', gridTemplateColumns: 'repeat(6, 96px)', gap: 14, opacity: chipsOut}}>
            {CATALOGUE.map((id, i) => {
              const inAt = i * 3;
              const appear = spring({frame: frame - inAt, fps, config: {damping: 16, stiffness: 140}});
              const cx = (i % 6) - 2.5;
              const cy = Math.floor(i / 6) - 0.5;
              return (
                <div key={id} style={{
                  height: 54, borderRadius: 8, border: `1px solid ${C.line}`, background: 'rgba(255,255,255,0.03)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: MONO, fontSize: 20, color: C.slateText,
                  opacity: appear,
                  transform: `translate(${-cx * 56 * collapse}px, ${-cy * 40 * collapse}px) scale(${interpolate(collapse, [0, 1], [1, 0.6])})`,
                }}>{id}</div>
              );
            })}
          </div>

          {/* the two calls, rising from the centre */}
          <Panel style={{padding: '32px 44px', position: 'absolute', minWidth: 720, opacity: panelIn, transform: `translateY(${interpolate(panelIn, [0, 1], [24, 0])}px) scale(${interpolate(panelIn, [0, 1], [0.94, 1])})`}}>
            <div style={{fontFamily: MONO, fontSize: 32, lineHeight: 1.9, color: C.white, whiteSpace: 'nowrap'}}>
              <span style={{color: C.slateText}}>// twelve checks, by construction</span><br />
              <Typewriter text="ThirdCheckLib.check(proof);" at={104} charsPerSec={44} style={{color: C.white}} /><br />
              <Typewriter text="ThirdCheckLib.bind(proof, order);" at={130} charsPerSec={44} style={{color: C.white}} />
            </div>
          </Panel>
        </div>

        <div style={{marginTop: 34, display: 'flex', alignItems: 'center', gap: 12, opacity: interpolate(frame, [176, 190], [0, 1], clamp)}}>
          <Tick at={178} color={C.green} size={30} />
          <span style={{fontFamily: FONT.text, fontSize: 24, color: C.slateText}}>any consumer drops it in</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
