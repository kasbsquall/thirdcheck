import {loadFont as loadDisplay} from '@remotion/google-fonts/BricolageGrotesque';
import {loadFont as loadText} from '@remotion/google-fonts/InstrumentSans';

// Type system: a display face with real character + a quieter companion for UI/body.
// Everything in one font at one weight is the #1 "template" tell.
//
// Both faces are OFL (safe to redistribute) and deliberately NOT the AI-default stack:
// Inter, Roboto, Arial, Open Sans, Helvetica, system fonts and the Space Grotesk +
// Instrument Serif + Geist combo are banned. Bricolage Grotesque additionally carries an
// optical-size axis. Swap per film to match the brand — any @remotion/google-fonts/*
// import works, or use @remotion/fonts to load a licensed local file.
const display = loadDisplay('normal', {weights: ['500', '700', '800']});
const text = loadText('normal', {weights: ['400', '500', '600', '700']});

export const FONT = {
  display: display.fontFamily, // headlines, section headers, the building sentence
  text: text.fontFamily, // UI, chips, captions, body
};

/** @deprecated legacy alias — use FONT.text. Named INTER for backwards compatibility
 *  with older scenes; it no longer loads Inter, which is a banned face. */
export const INTER = FONT.text;

// System monospace stack for hashes / code (guaranteed in headless Chrome).
export const MONO = "'JetBrains Mono', 'SF Mono', ui-monospace, 'Cascadia Mono', Consolas, monospace";

// ThirdCheck palette: cool near-black ground, a single amber accent, green for the
// correct/safe state. The lib primitives read `blue`/`blueLite` as their accent, so those
// keys carry amber here — one accent under 5% of pixels, per the brand.
export const C = {
  navy: '#12151b',
  navyDeep: '#0b0d11',
  blue: '#e0913a', // accent (amber) — the key name is legacy; the value is the brand accent
  blueLite: '#f0b46a',
  white: '#eceef1',
  paper: '#f4f1ea',
  ink: '#0d0f12',
  red: '#e0554e',
  amber: '#e0913a',
  green: '#4fb477',
  slate: 'rgba(150,160,175,0.22)',
  slateText: '#9aa1ab',
  line: 'rgba(255,255,255,0.08)',
};

export const FPS = 30;
