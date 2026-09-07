import {AbsoluteFill, Audio, Series, staticFile} from 'remotion';
import {SCENES} from './timing';
import {C} from './theme';
import {Captions} from './lib/Captions';
import {ColdOpen} from './scenes/ColdOpen';
import {Problem} from './scenes/Problem';
import {Scorecard} from './scenes/Scorecard';
import {Falsifier} from './scenes/Falsifier';
import {Inflows} from './scenes/Inflows';
import {Reveal} from './scenes/Reveal';
import {Library} from './scenes/Library';
import {Rails} from './scenes/Rails';
import {Settlement} from './scenes/Settlement';
import {Verify} from './scenes/Verify';
import {Close} from './scenes/Close';

const MAP: Record<string, React.FC> = {
  cold_open: ColdOpen,
  problem: Problem,
  scorecard: Scorecard,
  falsifier: Falsifier,
  reveal: Reveal,
  inflows: Inflows,
  library: Library,
  rails: Rails,
  settlement: Settlement,
  verify: Verify,
  close: Close,
};

const Placeholder: React.FC<{id: string}> = ({id}) => (
  <AbsoluteFill style={{background: C.navy, alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 60}}>
    {id}
  </AbsoluteFill>
);

export const Video: React.FC = () => {
  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Series>
        {SCENES.map((s) => {
          const Comp = MAP[s.id];
          return (
            <Series.Sequence key={s.id} durationInFrames={s.durF}>
              {Comp ? <Comp /> : <Placeholder id={s.id} />}
            </Series.Sequence>
          );
        })}
      </Series>
      {/* WAV, not MP3, and that is deliberate: the audio chain stays PCM end to end so the
          only lossy step in the whole film is the final encode. `audio_gen.py` writes
          `final_audio.wav`; these two names are the single wire between the audio half of
          the pipeline and the video half, and they were mismatched for a whole release. */}
      <Audio src={staticFile('final_audio.wav')} />
      <Captions />
    </AbsoluteFill>
  );
};
