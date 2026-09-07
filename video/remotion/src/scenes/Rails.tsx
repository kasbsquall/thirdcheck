import React from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig} from 'remotion';
import {C, FONT, MONO} from '../theme';
import {Backdrop} from '../lib/Backdrop';
import {Eyebrow, Panel, Bar, Mark, Stamp} from './_kit';
import {Float, Sheen} from '../lib/Motion';
import {Reveal} from '../lib/ui';
import {Sfx} from '../lib/Sfx';
import {beatPulse} from '../lib/beats';
import {FEE} from '../data/facts';

const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

// Fixed diagram geometry so the connectors actually meet the nodes.
const BOX_W = 1680;
const BOX_H = 260;
const PROJ_X = 0;
const PROJ_W = 156;
const PROJ_YS = [0, 98, 196]; // node tops; node height 64 -> centers 32/130/228
const HUB_X = 725;
const HUB_W = 262;
const HUB_TOP = 82; // center y = 130
const SELLER_X = 1524;

const Node: React.FC<{label: string; accent?: boolean; style?: React.CSSProperties}> = ({label, accent, style}) => (
  <div style={{
    position: 'absolute', width: PROJ_W, height: 64, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: accent ? 'rgba(79,180,119,0.10)' : 'rgba(255,255,255,0.03)',
    border: `1px solid ${accent ? C.green + '55' : C.line}`,
    fontFamily: FONT.text, fontWeight: 600, fontSize: 23, color: C.white, ...style,
  }}>{label}</div>
);

// SC6 — the library becomes rails. Projects route through the hub; the third check runs by
// construction; a capped fee is taken; verified operators pay less.
export const Rails: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const arrows = interpolate(frame, [26, 92], [0, 1], clamp);
  const outArrow = interpolate(frame, [70, 120], [0, 1], clamp);
  const ring = interpolate(frame, [116, 142], [0, 1], clamp);
  const pulse = frame > 130 ? beatPulse(frame) : 0;
  const showFee = frame > 196;

  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Backdrop tint={C.amber} />
      <Sfx src="whoosh.mp3" at={26} vol={0.4} />
      <Sfx src="stamp.mp3" at={116} vol={0.55} />
      <Sfx src="pop.mp3" at={200} vol={0.4} />
      <Sfx src="pop.mp3" at={228} vol={0.4} />
      <AbsoluteFill style={{padding: '70px 120px', justifyContent: 'center', gap: 44}}>
        <Reveal><Eyebrow>then we turned it into rails</Eyebrow></Reveal>

        {/* diagram */}
        <div style={{position: 'relative', width: BOX_W, height: BOX_H, margin: '0 auto', maxWidth: '100%'}}>
          {/* connectors, behind the nodes */}
          <svg width={BOX_W} height={BOX_H} viewBox={`0 0 ${BOX_W} ${BOX_H}`} style={{position: 'absolute', inset: 0}}>
            {PROJ_YS.map((y, i) => {
              const cy = y + 32;
              const len = 900;
              return (
                <path key={i} d={`M${PROJ_X + PROJ_W} ${cy} C ${PROJ_X + PROJ_W + 200} ${cy}, ${HUB_X - 200} 130, ${HUB_X} 130`}
                  fill="none" stroke={C.amber} strokeWidth="2.5" opacity={0.75}
                  strokeDasharray={len} strokeDashoffset={len * (1 - arrows)} />
              );
            })}
            {/* hub -> seller */}
            <path d={`M${HUB_X + HUB_W} 130 C ${HUB_X + HUB_W + 160} 130, ${SELLER_X - 160} 130, ${SELLER_X} 130`}
              fill="none" stroke={C.green} strokeWidth="2.5" strokeDasharray={600} strokeDashoffset={600 * (1 - outArrow)} />
            {/* travelling pulse dot along one rail once arrows are drawn */}
            {arrows >= 1 && (
              <circle r="4" fill={C.amber}>
                <animateMotion dur="1.6s" repeatCount="indefinite" path={`M${PROJ_X + PROJ_W} 130 C ${PROJ_X + PROJ_W + 200} 130, ${HUB_X - 200} 130, ${HUB_X} 130`} />
              </circle>
            )}
          </svg>

          {/* project nodes */}
          {PROJ_YS.map((y, i) => (
            <Node key={i} label={`project ${String.fromCharCode(65 + i)}`} style={{left: PROJ_X, top: y}} />
          ))}

          {/* hub node with a ring that frames it exactly */}
          <div style={{position: 'absolute', left: HUB_X, top: HUB_TOP, width: HUB_W, height: 96, transform: `scale(${1 + pulse * 0.03})`, transformOrigin: 'center'}}>
            <svg style={{position: 'absolute', left: -9, top: -9, width: HUB_W + 18, height: 96 + 18, pointerEvents: 'none'}}
              viewBox={`0 0 ${HUB_W + 18} ${114}`}>
              <rect x="2" y="2" width={HUB_W + 14} height={110} rx="16" fill="none" stroke={C.amber} strokeWidth="2.5"
                strokeDasharray={2 * (HUB_W + 14 + 110)} strokeDashoffset={2 * (HUB_W + 14 + 110) * (1 - ring)} />
            </svg>
            <div style={{position: 'relative', width: '100%', height: '100%', borderRadius: 14, overflow: 'hidden'}}>
              <Panel style={{width: '100%', height: '100%', padding: '0 22px', display: 'flex', alignItems: 'center', gap: 14}}>
                <Mark size={40} draw={118} />
                <div>
                  <div style={{fontFamily: FONT.display, fontWeight: 700, fontSize: 27, color: C.white, letterSpacing: '-0.02em', whiteSpace: 'nowrap'}}>SettlementHub</div>
                  <div style={{fontFamily: FONT.text, fontSize: 16, color: ring > 0.8 ? C.amber : C.slateText, whiteSpace: 'nowrap'}}>third check · by construction</div>
                </div>
              </Panel>
              <Sheen at={132} dur={30} opacity={0.14} />
            </div>
          </div>

          {/* seller */}
          <Node label="seller" accent style={{left: SELLER_X, top: 98, width: 132}} />
        </div>

        {/* why the hub, not just the free library */}
        <div style={{textAlign: 'center', marginTop: -6, opacity: interpolate(frame, [150, 172], [0, 1], clamp), fontFamily: FONT.text, fontSize: 22, color: C.slateText}}>
          one neutral rail &middot; settlement a project can&rsquo;t run for itself
        </div>

        {/* fee schedule */}
        {showFee && (
          <div style={{display: 'flex', gap: 60, alignItems: 'flex-end', marginTop: 4}}>
            <FeeMeter at={200} label="unverified fee" bps={FEE.bps} cap={FEE.maxBps} color={C.amber} />
            <FeeMeter at={228} label="verified operator" bps={FEE.verifiedNetBps} cap={FEE.maxBps} color={C.green} />
            <div style={{marginBottom: 4}}><Stamp at={250} color={C.slateText}>free to audit · priced to settle</Stamp></div>
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const FeeMeter: React.FC<{at: number; label: string; bps: number; cap: number; color: string}> = ({at, label, bps, cap, color}) => (
  <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
    <div style={{display: 'flex', justifyContent: 'space-between', width: 460}}>
      <span style={{fontFamily: FONT.text, fontSize: 20, color: C.slateText}}>{label}</span>
      <span style={{fontFamily: FONT.display, fontWeight: 700, fontSize: 30, color, fontVariantNumeric: 'tabular-nums'}}>{bps} bps</span>
    </div>
    <Bar at={at} pct={(bps / cap) * 100} color={color} w={460} />
    <span style={{fontFamily: MONO, fontSize: 15, color: C.slateText}}>ceiling {cap} bps, enforced on-chain</span>
  </div>
);
