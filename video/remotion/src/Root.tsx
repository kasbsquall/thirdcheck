import {Composition} from 'remotion';
import {Video} from './Video';
import {FPS} from './theme';
import {TOTAL_FRAMES} from './timing';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Video"
      component={Video}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
