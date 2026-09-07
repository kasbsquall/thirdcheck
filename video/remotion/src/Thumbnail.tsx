import {AbsoluteFill} from 'remotion';
import {C, FONT, MONO} from './theme';
import {Logo} from './lib/Logo';

// The YouTube thumbnail, BUILT rather than grabbed.
//
// Left to itself YouTube picks a frame at random and it is almost never one that means
// anything. But the fix is not to pick a better frame either: a still from the film is
// composed for a 1920px canvas, and YouTube shows thumbnails as small as 168x94 in a
// sidebar. Type that reads beautifully at full size becomes a grey smear at a seventh of it.
//
// So a thumbnail is its own composition, obeying its own rules:
//   * 1280x720, the 16:9 size YouTube wants, under 2MB
//   * THREE OR FOUR WORDS, at a size that survives 168px wide
//   * one high-contrast object, here the refusal stamp, which is the film's whole argument
//     compressed into one shape
//   * the mark, so a viewer who never clicks still registers the product
//
// The line is the film's sticky one-liner, the one the narration lands three times. A
// thumbnail and a film that quote each other are one piece; a thumbnail with its own clever
// copy is a second piece competing with the first.
export const Thumbnail: React.FC = () => (
  <AbsoluteFill style={{background: C.ink}}>
    {/* a single pool of light behind the stamp, same grammar as the film */}
    <div
      style={{
        position: 'absolute',
        left: '30%',
        top: '52%',
        width: 900,
        height: 700,
        transform: 'translate(-50%,-50%)',
        background: `radial-gradient(closest-side, ${C.risk}2E 0%, transparent 70%)`,
        filter: 'blur(70px)',
      }}
    />

    <div style={{position: 'absolute', left: 54, top: 44, display: 'flex', alignItems: 'center', gap: 14}}>
      <Logo size={40} />
      <span
        style={{fontFamily: FONT.display, fontWeight: 700, fontSize: 34, color: C.white, letterSpacing: '-0.03em'}}
      >
        TrustBoard
      </span>
    </div>

    <AbsoluteFill style={{flexDirection: 'row', alignItems: 'center', padding: '0 64px', gap: 56}}>
      {/* THE OBJECT. Rotated and oversized so its silhouette alone reads at sidebar size,
          long before any letter inside it is legible. */}
      <div style={{flexShrink: 0, transform: 'rotate(-9deg)'}}>
        <div
          style={{
            fontFamily: FONT.display,
            fontWeight: 800,
            fontSize: 132,
            lineHeight: 1,
            letterSpacing: '-0.04em',
            color: C.risk,
            border: `9px solid ${C.risk}`,
            borderRadius: 10,
            padding: '18px 40px 26px',
            background: `${C.ink}CC`,
          }}
        >
          NO-GO
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 21,
            color: C.mute,
            marginTop: 18,
            textAlign: 'center',
            letterSpacing: '-0.01em',
          }}
        >
          order_details · at-risk
        </div>
      </div>

      {/* THE LINE. Four words, set as large as the frame allows. */}
      <div style={{flex: 1}}>
        <div
          style={{
            fontFamily: FONT.display,
            fontWeight: 800,
            fontSize: 104,
            lineHeight: 0.94,
            letterSpacing: '-0.045em',
            color: C.white,
            textWrap: 'balance',
          }}
        >
          Nobody told
          <br />
          it to.
        </div>
        <div
          style={{
            fontFamily: FONT.text,
            fontSize: 30,
            color: C.gold,
            marginTop: 22,
            letterSpacing: '-0.01em',
          }}
        >
          An agent asked the catalog first.
        </div>
      </div>
    </AbsoluteFill>
  </AbsoluteFill>
);
