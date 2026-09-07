import {useCurrentFrame, interpolate} from 'remotion';
import React from 'react';
import {C, FONT} from '../theme';
import {Icon} from './Icon';
import {SCENES} from '../timing';

// Where the thing on screen can be checked, stated on the shots that show real product.
//
// Naming the source is the cheapest credibility a film can buy: a judge who can go and
// look is a judge who stops interrogating whether the screen was mocked. It only appears
// over shots that ARE real product — putting it under a diagram would be the exact
// borrowed authority it exists to avoid.
//
// TWO MECHANICAL POINTS, both learned the hard way:
//
// 1. It is mounted at film level, above the Series, so a scene's push-in cannot scale it,
//    drag it toward a corner or crop it. A caption that survives the cut has to live
//    outside the camera.
// 2. INSET is generous on purpose. The version this replaces rode inside a screenshot and
//    sat a few pixels off the border, so as soon as the shot pushed in it was squeezed
//    against the edge and became unreadable. Type near a frame edge also reads as a crop,
//    and is the first thing lost if a platform pads or letterboxes the file.
const INSET_RIGHT = 74;
// The subtitles own the bottom ~130px of the frame. The first attempt at this badge sat at
// 74 from the bottom and collided with a caption, which is the same class of mistake as
// text crossing a rule: two layers laid out independently, neither aware of the other.
// Anything pinned to the bottom edge has to clear that band by construction.
const INSET_BOTTOM = 152;

// Declared per scene, never guessed, and ONLY on shots that are genuine captures.
//
// Only the live leaderboard qualifies. The DataHub panels already print their own source
// line inside the capture, so a second badge over them was redundant and sat on top of the
// first. The scoring-weights panel is drawn by this film rather than captured, so it gets
// nothing at all: a source badge under a redrawn screen is borrowed authority, and a judge
// who follows the link and finds something else has caught the film doing the exact thing
// it accuses everyone else of.
const SOURCE: Record<string, {label: string; icon: 'link' | 'database'}> = {
  league: {label: 'live · {LIVE_URL}', icon: 'link'},
};

export const Provenance: React.FC = () => {
  const frame = useCurrentFrame();
  const scene = SCENES.find((s) => frame >= s.startF && frame < s.startF + s.durF);
  const src = scene && SOURCE[scene.id];
  if (!scene || !src) return null;

  const local = frame - scene.startF;
  const o = Math.min(
    interpolate(local, [10, 24], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
    interpolate(local, [scene.durF - 14, scene.durF - 4], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );

  return (
    <div
      style={{
        position: 'absolute',
        right: INSET_RIGHT,
        bottom: INSET_BOTTOM,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        opacity: o * 0.92,
        pointerEvents: 'none',
      }}
    >
      <Icon name={src.icon} size={17} color={C.gold} strokeWidth={1.5} />
      <span style={{fontFamily: FONT.text, fontSize: 19, color: C.mute, letterSpacing: '0.01em'}}>
        {src.label}
      </span>
    </div>
  );
};
