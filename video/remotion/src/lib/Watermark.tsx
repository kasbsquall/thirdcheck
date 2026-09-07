import {useCurrentFrame} from 'remotion';
import React from 'react';
import {C, FONT} from '../theme';
import {Logo} from './Logo';
import {SCENES} from '../timing';

// The mark, pinned top-left for the WHOLE film.
//
// Two reasons it lives here and not inside the scenes. First, a judge scoring forty
// entries needs the name available at any second they happen to be looking, not only in
// the seconds a title card is up. Second, and this is the mechanical part: mounted at the
// film level it sits OUTSIDE every scene's camera rig, so no push-in, drift or zoom can
// scale it, crop it or drag it toward an edge. It is nailed to the frame, not to the shot.
//
// LIGHT AND DARK. A white mark vanishes on the light scenes and an ink mark vanishes on
// the dark ones, so the tone is switched per scene. It is declared rather than sampled:
// the film knows which scenes are light, and a declared value cannot be wrong at render
// time the way a heuristic can. Geometry, position and size never change between the two,
// so the mark reads as one fixed object that the background passes behind.
//
// A soft scrim underneath buys contrast when a capture is busy at that corner, tinted with
// the scene's own ground so it never announces itself as a plate.
const LIGHT = new Set(['what']);

// Kept clear of the frame edge. A mark tight to the border reads as a crop, and it is the
// first thing to be swallowed if a platform pads or letterboxes the file.
const INSET = 64;

export const Watermark: React.FC = () => {
  const frame = useCurrentFrame();
  const scene = SCENES.find((s) => frame >= s.startF && frame < s.startF + s.durF) ?? SCENES[0];
  const onLight = LIGHT.has(scene.id);

  const fg = onLight ? C.ink : C.white;
  const plate = onLight ? C.white : C.ink;

  return (
    <div
      style={{
        position: 'absolute',
        left: INSET,
        top: INSET,
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: -26,
          top: -22,
          right: -30,
          bottom: -22,
          background: `radial-gradient(ellipse at 30% 50%, ${plate}B8 0%, ${plate}00 72%)`,
        }}
      />
      <div style={{position: 'relative', display: 'flex', alignItems: 'center', gap: 13}}>
        <Logo size={38} color={fg} bg={plate} />
        <span
          style={{
            fontFamily: FONT.display,
            fontWeight: 700,
            fontSize: 27,
            letterSpacing: '-0.03em',
            color: fg,
          }}
        >
          {PRODUCT}
        </span>
      </div>
    </div>
  );
};
