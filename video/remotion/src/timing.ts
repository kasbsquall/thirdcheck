import data from './data/scene_timing.json';
import {FPS} from './theme';

export const VO = data.vo;
// Room after the last word for the brand moment to breathe and the music to ring out.
export const TAIL = 3.0;
export const TOTAL_FRAMES = Math.round((VO + TAIL) * FPS);

type Raw = {id: string; start: number; end: number; dur: number};
const raw = data.scenes as Raw[];

export type SceneId = Raw['id'];

// Each scene occupies [start_i, start_{i+1}) so its visuals line up with the VO beat.
// The first scene starts at frame 0 so it absorbs the 1.6s music lead-in that the audio
// carries before the voice enters; every later scene begins exactly at its VO onset. Using
// the scene's own absolute startF here (instead of 0) would shift the whole visual timeline
// 1.6s ahead of the voice.
export const SCENES = raw.map((s, i) => {
  const startF = i === 0 ? 0 : Math.round(s.start * FPS);
  const nextStart = i < raw.length - 1 ? raw[i + 1].start : VO + TAIL;
  const durF = Math.round(nextStart * FPS) - startF;
  return {id: s.id, start: s.start, end: s.end, startF, durF};
});
