import {AbsoluteFill, useCurrentFrame, interpolate, Easing} from 'remotion';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {C, FONT, MONO} from '../theme';
import {Sfx} from '../lib/Sfx';
import {LEAGUE} from '../data/film';

// 9.9s. The standings, shot with a real camera rig: EXTREME CLOSE -> CRANE DOWN -> PUSH IN
// -> CRASH PULL-BACK, in a 3D stage with depth of field.
//
// WHAT THE PREVIOUS ATTEMPT GOT WRONG, because it is the useful part.
//
// It had no zoom at all. I had removed scale from the rig on the theory that animating scale
// on text re-rasterises it and shimmers. That conclusion was drawn from the wrong case: the
// shimmer came from a ±0.4% scale WOBBLE in an ambient-drift effect, where each frame
// resamples the glyphs at a nearly identical size and the subpixel grid jitters. A
// deliberate 3.6x-to-0.95x move is the opposite situation — every frame is at a clearly
// different size, Chrome re-rasterises the vector glyphs at each one, and the eye reads the
// difference as motion rather than as noise. Tiny scale wobble shimmers. Big scale moves are
// fine, and refusing them cost the shot its whole point.
//
// The second mistake was fitting the camera to the layout. A full-width 1400px table row is
// an object you cannot zoom into: it stops fitting sideways almost immediately. So the
// layout is now designed FOR the camera — each team is a compact block, narrow enough that a
// tight shot on one of them is a real composition, and the board only assembles at the end.
//
// THE SHOT, married to the narration rather than decorating it:
//    8.60  f0    extreme close on 85.8 alone, filling the frame
//    8.93  f10   pull back to reveal whose number it is
//    9.53  f28   the crane starts down through the league
//   12.04  f103  "scored twenty-six out of a hundred" — we arrive on 26.1 as it is spoken
//   13.67  f152  "last in the league" — the crash pull-back fires and the board assembles,
//                so the wide shot PROVES the word instead of illustrating it
// At 470 the neighbours sat 808 screen pixels away at travel zoom — just outside a 1080
// frame — so the descent showed exactly one block at a time and read as a slideshow. At 330
// they are 568 away and their edges stay in shot, so the camera is visibly moving THROUGH a
// stack rather than cutting between cards.
const PITCH_FAR = 330;
const PITCH_NEAR = 120; // the composed board
// THE BLOCK WIDENS AS IT COMPOSES. During the travel it is a compact card, narrow enough
// that a tight shot on one is a real composition. At the end it opens into a full-width
// table row. Animating the width alongside the zoom is what turns the pull-back from a
// scale change into a morph between two different layouts — and it fixes the wide shot,
// which at a fixed 900 was a cramped column with the scores jammed against the team names.
const BLOCK_W_NEAR = 900;
const BLOCK_W_WIDE = 1560;
const BLOCK_H = 120;

const F_OPEN = 12; // hold on the bare number
const F_REVEAL = 30; // block one is whole
const F_ARRIVE = 103; // 12.04s — "twenty-six"
const F_PUSH = 140; // the push-in on the subject completes
const F_PULL = 152; // 13.67s — "last in the league"
const F_WIDE = 190;

const Z_MACRO = 3.6; // on the digits
const Z_BLOCK = 1.72; // one team fills the frame
// 2.05 put the block edge to edge with ~18px to spare and clipped the tier label. The
// push-in has to stay inside what the block can occupy: at 1.90 the frame holds it with a
// 50px margin, which is the same rule the opening swing obeys.
const Z_PUSH = 1.9;
const Z_WIDE = 1.0; // the whole board

// Camera easings. A rig accelerates and settles; it never uses UI easing, which front-loads
// most of the travel into the first frames and reads as a snap.
const E_PULL = Easing.bezier(0.36, 0, 0.12, 1);
const E_FALL = Easing.bezier(0.42, 0, 0.14, 1);
const E_CRASH = Easing.bezier(0.5, 0, 0.16, 1);

const seg = (f: number, a: number, b: number, easing: (t: number) => number) =>
  interpolate(f, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing});

export const Why: React.FC = () => {
  const frame = useCurrentFrame();

  // --- rig ---------------------------------------------------------------------------
  const pOpen = seg(frame, F_OPEN, F_REVEAL, E_PULL); // macro -> block
  const pFall = seg(frame, F_REVEAL, F_ARRIVE, E_FALL); // block 1 -> block 5
  const pPush = seg(frame, F_ARRIVE, F_PUSH, E_PULL); // settle onto the subject
  const pCrash = seg(frame, F_PULL, F_WIDE, E_CRASH); // out to the board

  // The blocks converge into a board as the camera opens out. Animating the pitch is what
  // lets one shot be both a long vertical journey and a tight composition at the end.
  const pitch = PITCH_FAR + (PITCH_NEAR - PITCH_FAR) * pCrash;
  const BLOCK_W = BLOCK_W_NEAR + (BLOCK_W_WIDE - BLOCK_W_NEAR) * pCrash;
  const blockY = (i: number) => i * pitch;
  const boardH = pitch * (LEAGUE.length - 1) + BLOCK_H;

  const focus = pFall * (LEAGUE.length - 1); // which block the camera is on, fractional

  // zoom: macro -> block -> push -> crash out
  const zoom =
    (Z_MACRO + (Z_BLOCK - Z_MACRO) * pOpen) * (1 - pPush) +
    (Z_BLOCK + (Z_PUSH - Z_BLOCK) * pPush) * pPush;
  const z = zoom + (Z_WIDE - zoom) * pCrash;

  // where the camera looks. It starts on the NUMBER (right of the block), swings to the
  // block's centre as it pulls back, drifts left through the fall so the move is not a
  // straight vertical drop, and centres for the board.
  // Where the camera looks, in ARTBOARD coordinates. It starts on the digits themselves,
  // swings to the block's centre as it pulls back, drifts a little left through the fall so
  // the move is not a straight vertical drop, and centres for the board.
  const SCORE_X = BLOCK_W / 2 + 182; // the score is right-aligned inside the block
  // The swing from the digits to the block's centre is driven by the ZOOM, not by a clock.
  // Tying it to time cut "Data Platform Team" against the left edge halfway through the
  // pull-back: the camera had already travelled to the centre while the frame was still too
  // tight to hold the whole block, so the name ran off. Half the visible artboard width is
  // 960/z, and the swing only completes once that is wide enough to contain the block. The
  // name then enters from the left as the frame widens, which is a better reveal anyway.
  const halfVis = 960 / z;
  const centreness = interpolate(halfVis, [BLOCK_W * 0.36, BLOCK_W * 0.52], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const camX =
    SCORE_X + (BLOCK_W / 2 - SCORE_X) * centreness + interpolate(pFall, [0, 1], [0, -40]) * centreness * (1 - pCrash);
  const camY = (blockY(focus) + BLOCK_H / 2) * (1 - pCrash) + (boardH / 2) * pCrash;

  // a slow living creep so the held shots are never frozen
  const breathe = Math.sin(frame / 44) * 1.6 * (1 - pCrash);

  return (
    <AbsoluteFill style={{background: C.ink, overflow: 'hidden'}}>
      {/* A pool of light that belongs to whichever block the camera is on. It warms toward
          the accent early and turns to the risk colour as we reach the subject, so the
          scene is colour-graded by act rather than lit evenly throughout. */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 1700,
          height: 1200,
          transform: 'translate(-50%,-50%)',
          background: `radial-gradient(closest-side, ${focus > 2.6 ? C.risk : C.gold}${Math.round(
            Math.min(0.1 + 0.13 * (focus / 4), 1) * 255 * (1 - pCrash * 0.4)
          )
            .toString(16)
            .padStart(2, '0')} 0%, transparent 72%)`,
          filter: 'blur(110px)',
          pointerEvents: 'none',
        }}
      />

      <CameraMotionBlur samples={6} shutterAngle={170}>
        <AbsoluteFill
          style={{
            // Blocks dissolve at the top and bottom of the viewport rather than being cut
            // by it. A block sliding out through the top corner otherwise drives straight
            // through the persistent mark, and a hard clip is not what a lens does.
            WebkitMaskImage: `linear-gradient(to bottom, transparent 0px, #000 ${(150 - 140 * pCrash).toFixed(
              0
            )}px, #000 calc(100% - ${(130 - 120 * pCrash).toFixed(0)}px), transparent 100%)`,
            maskImage: `linear-gradient(to bottom, transparent 0px, #000 ${(150 - 140 * pCrash).toFixed(
              0
            )}px, #000 calc(100% - ${(130 - 120 * pCrash).toFixed(0)}px), transparent 100%)`,
            // The stage is a 3D space. Without perspective, translateZ does nothing and the
            // depth below would be a flat scale.
            perspective: 1800,
            perspectiveOrigin: '50% 50%',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: BLOCK_W,
              height: boardH,
              transformStyle: 'preserve-3d',
              // With transformOrigin at 0 0 a point p maps to (A + z*p). So to put the
              // camera's focus point dead centre of frame, A = 960 - z*camX and
              // B = 540 - z*camY. The first version used a 50% origin and chained two
              // translates around the scale, which put the focus somewhere else entirely —
              // the camera was landing on a block it had not reached yet.
              transform: `translate(${(960 - z * camX).toFixed(2)}px, ${(
                540 -
                z * (camY + breathe)
              ).toFixed(2)}px) scale(${z.toFixed(4)})`,
              transformOrigin: '0 0',
              willChange: 'transform',
            }}
          >
            {LEAGUE.map((r, i) => {
              const isSubject = r.team === 'Marketing';
              const tier =
                r.tier === 'GOLD' ? C.gold : r.tier === 'SILVER' ? C.silver : r.tier === 'BRONZE' ? C.bronze : C.risk;

              // distance from the camera's focus, in blocks — drives depth, blur and fade
              const d = i - focus;
              const ad = Math.abs(d);

              // DEPTH OF FIELD. Blocks away from the focal plane sit further back and go
              // soft, exactly as a lens would render them. Released on the pull-back,
              // because the board has to be sharp end to end when it assembles.
              const soft = Math.min(ad * 3.4, 9) * (1 - pCrash);
              const zPush = -Math.min(ad, 2.2) * 190 * (1 - pCrash);
              const tilt = d * 2.1 * (1 - pCrash);

              // A block exists once the camera is close enough to it, and never dims again.
              const arrived = interpolate(focus, [i - 1.05, i - 0.35], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              // interpolate needs an ascending input range, so the falloff is written
              // ascending and the OUTPUT is inverted: near the focal plane is bright, far
              // from it is dim.
              const near = interpolate(ad, [0.9, 2.4], [1, 0.35], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              const o = (i === 0 ? 1 : arrived) * Math.max(near, pCrash);

              // the score resolves from soft to sharp as its block arrives
              const scoreIn = i === 0 ? 1 : arrived;

              return (
                <div
                  key={r.team}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: blockY(i),
                    width: BLOCK_W,
                    height: BLOCK_H,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 26,
                    padding: '0 26px',
                    opacity: o,
                    filter: soft > 0.15 ? `blur(${soft.toFixed(2)}px)` : undefined,
                    transform: `translateZ(${zPush.toFixed(1)}px) rotateX(${tilt.toFixed(2)}deg)`,
                    transformStyle: 'preserve-3d',
                    background: isSubject ? `${C.panel}${pCrash > 0.5 ? 'ff' : 'cc'}` : 'transparent',
                    border: isSubject ? `1px solid ${C.risk}33` : '1px solid transparent',
                    borderRadius: 5,
                  }}
                >
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 24,
                      color: C.mute,
                      width: 62,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {r.rank}
                  </span>
                  <span
                    style={{
                      fontFamily: FONT.text,
                      fontWeight: 600,
                      fontSize: 40,
                      color: isSubject ? C.white : C.mute,
                      flex: 1,
                      whiteSpace: 'nowrap',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {r.team}
                  </span>
                  <span
                    style={{
                      fontFamily: FONT.display,
                      fontWeight: 700,
                      fontSize: 72,
                      lineHeight: 1,
                      color: tier,
                      fontVariantNumeric: 'tabular-nums lining-nums',
                      letterSpacing: '-0.035em',
                      opacity: scoreIn,
                      transform: `translateY(${((1 - scoreIn) * 14).toFixed(2)}px)`,
                    }}
                  >
                    {r.score.toFixed(1)}
                  </span>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 21,
                      color: tier,
                      width: 116,
                      textAlign: 'right',
                      letterSpacing: '0.06em',
                      opacity: scoreIn * 0.85,
                    }}
                  >
                    {r.tier.toLowerCase().replace(' ', '-')}
                  </span>
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      </CameraMotionBlur>

      {/* Frame furniture belongs to the wide shot. Putting it up during the move would
          announce the composition the pull-back exists to deliver. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 148,
          textAlign: 'center',
          fontFamily: FONT.text,
          fontSize: 19,
          letterSpacing: '0.3em',
          color: C.gold,
          opacity: seg(frame, F_PULL + 18, F_WIDE + 10, Easing.linear),
        }}
      >
        THIS WEEK&rsquo;S STANDINGS
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 892, // clear of the board, which spans roughly y240-840 in the wide shot
          textAlign: 'center',
          fontFamily: FONT.text,
          fontSize: 26,
          color: C.mute,
          opacity: seg(frame, F_PULL + 24, F_WIDE + 14, Easing.linear),
        }}
      >
        The refused dataset belongs to <span style={{color: C.risk}}>Marketing</span>. Last in the league.
      </div>

      <Sfx src="whoosh.mp3" at={F_OPEN} vol={0.15} />
      {[1, 2, 3, 4].map((i) => (
        <Sfx key={i} src="tick.mp3" at={F_REVEAL + Math.round(((F_ARRIVE - F_REVEAL) * i) / 4) - 4} vol={0.08} />
      ))}
      <Sfx src="error.mp3" at={F_ARRIVE} vol={0.22} />
      <Sfx src="whoosh.mp3" at={F_PULL} vol={0.22} />
    </AbsoluteFill>
  );
};
