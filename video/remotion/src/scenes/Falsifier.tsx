import React from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
import {C, FONT, MONO} from '../theme';
import {Backdrop} from '../lib/Backdrop';
import {Eyebrow, Panel, Tick, QR, Stamp} from './_kit';
import {Sfx} from '../lib/Sfx';

const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

const ATTACKS = [
  {id: 'B-01', name: 'Reverted payment counts', hash: '0x7a3f…c1'},
  {id: 'B-04', name: 'Same proof replayed', hash: '0x2be9…04'},
  {id: 'B-09', name: 'Decoy log wins', hash: '0x9c14…7d'},
  {id: 'B-06', name: 'Proof not bound to order', hash: '0x58e1…97'},
];
const ROW_AT = (i: number) => 44 + i * 66;

const AttackRow: React.FC<{i: number; hardened: boolean}> = ({i, hardened}) => {
  const frame = useCurrentFrame();
  const at = ROW_AT(i);
  const p = interpolate(frame, [at, at + 12], [0, 1], clamp);
  const a = ATTACKS[i];
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 16, opacity: p, transform: `translateX(${interpolate(p, [0, 1], [hardened ? 16 : -16, 0])}px)`, padding: '13px 0', borderBottom: `1px solid ${C.line}`}}>
      <span style={{fontFamily: MONO, fontSize: 20, color: C.slateText, width: 62}}>{a.id}</span>
      <span style={{fontFamily: FONT.text, fontSize: 24, color: C.white, flex: 1}}>{a.name}</span>
      {hardened ? (
        <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
          <Tick at={at + 8} color={C.green} size={30} />
          <span style={{fontFamily: FONT.text, fontWeight: 700, fontSize: 20, color: C.green}}>REJECTED</span>
        </div>
      ) : (
        <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
          <Tick at={at + 8} color={C.amber} size={30} cross />
          <span style={{fontFamily: FONT.text, fontWeight: 700, fontSize: 20, color: C.amber}}>RELEASED</span>
        </div>
      )}
    </div>
  );
};

// SC4 — the falsifier. Same attacks, two escrows. Naive keeps paying; hardened rejects
// every one and settles only the correct payment. Real, mined, openable.
export const Falsifier: React.FC = () => {
  const frame = useCurrentFrame();
  const divider = interpolate(frame, [0, 16], [0, 1], clamp);
  const settle = interpolate(frame, [332, 348], [0, 1], clamp);
  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Backdrop tint={C.amber} grid={false} />
      <Sfx src="whoosh.mp3" at={2} vol={0.4} />
      {[52, 118, 184, 250].map((f) => <Sfx key={f} src="stamp.mp3" at={f} vol={0.4} />)}
      <Sfx src="confirm.mp3" at={334} vol={0.5} />
      <Sfx src="pop.mp3" at={384} vol={0.4} />
      <AbsoluteFill style={{padding: '96px 90px', flexDirection: 'row', gap: 60}}>
        {/* NAIVE */}
        <Panel style={{flex: 1, padding: '34px 40px', display: 'flex', flexDirection: 'column'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 20}}>
            <Eyebrow color={C.amber}>naive escrow</Eyebrow>
            <span style={{fontFamily: FONT.text, fontSize: 20, color: C.amber}}>valid proof, wrong payment</span>
          </div>
          {ATTACKS.map((_, i) => <AttackRow key={i} i={i} hardened={false} />)}
        </Panel>

        {/* divider */}
        <div style={{position: 'absolute', left: '50%', top: 96, bottom: 96, width: 2, background: C.line}}>
          <div style={{width: '100%', height: `${divider * 100}%`, background: `linear-gradient(${C.amber}, ${C.green})`}} />
        </div>

        {/* HARDENED */}
        <Panel style={{flex: 1, padding: '34px 40px', display: 'flex', flexDirection: 'column'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 20}}>
            <Eyebrow color={C.green}>hardened escrow</Eyebrow>
            <span style={{fontFamily: FONT.text, fontSize: 20, color: C.green}}>third check enforced</span>
          </div>
          {ATTACKS.map((_, i) => <AttackRow key={i} i={i} hardened />)}
          <div style={{marginTop: 22, paddingTop: 18, borderTop: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', gap: 14, opacity: settle}}>
            <Tick at={334} color={C.green} size={34} />
            <span style={{fontFamily: FONT.text, fontWeight: 700, fontSize: 24, color: C.green}}>only the correct payment settles</span>
          </div>
        </Panel>
      </AbsoluteFill>

      <div style={{position: 'absolute', right: 70, bottom: 60, display: 'flex', alignItems: 'center', gap: 20}}>
        <Stamp at={372} color={C.white}>every tx mined on Creditcoin</Stamp>
        <QR name="settle" at={384} size={120} caption="open it yourself" />
      </div>
    </AbsoluteFill>
  );
};
