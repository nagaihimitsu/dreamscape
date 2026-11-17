// The player's name as the mehndi's writing (docs/13 2.10). The user's decisions: 2026-11-16 (案A: no Japanese letters in
// the pattern, the name in Latin letters in a hand of its own) and 2026-11-17 (「フォントはFasol SPにしましょう」). The hand
// is Fasol SP Demo by Sasha Pavljenko, bundled with the game as the unmodified file fonts/FasolSPDemo.otf under its demo
// licence (fonts/LICENSE-FasolSP.txt). skin.css declares it for the letters A–Z, a–z and the space only (its
// unicode-range): the demo draws an advert ("GET FULL FONT") in place of digits and punctuation, and a letter with marks
// (é, ø) without its marks, so a hyphen, an apostrophe or a letter with marks comes from the fallback (Noto Serif JP, the
// face of the scene's other writing). Its capitals and small letters share their shapes (one case). Only the play's module
// loads skin.css (play.ts → Skin.tsx), never the title page's. The size is worked out from the font's own advances
// (measured from the file), so the name fits its room and is never pressed wider than it is.

/** The writing's font family (skin.css declares it and names it, with the fallback after it). */
export const WRITING_FONT = "Fasol SP Demo";

/**
 * Fasol SP Demo's advance of each letter and the space, in em (its hmtx, 1000 units to the em). One case: a capital has
 * its small letter's glyph.
 */
const ADVANCE: Readonly<Record<string, number>> = {
  a: 0.557, b: 0.707, c: 0.54, d: 0.705, e: 0.545, f: 0.316, g: 0.552, h: 0.645, i: 0.169, j: 0.17, k: 0.65, l: 0.31, m: 0.815,
  n: 0.498, o: 0.55, p: 0.554, q: 0.558, r: 0.472, s: 0.517, t: 0.336, u: 0.527, v: 0.495, w: 0.757, x: 0.501, y: 0.528, z: 0.514,
  " ": 0.221,
};
/** The characters the font draws (skin.css's unicode-range): A–Z, a–z and the space. */
const DRAWN = /^[A-Za-z ]$/u;
/**
 * A character the fallback draws, in em, at least and at most: the punctuation a Latin name keeps (Noto Serif JP, and the
 * serif faces a phone falls back to without it: Times, Georgia, DejaVu Serif), and anything else as a letter with marks
 * (from ı to Œ).
 */
const FALLBACK: Readonly<Record<string, readonly [number, number]>> = {
  "-": [0.25, 0.5], "'": [0.15, 0.3], "’": [0.15, 0.4], ".": [0.2, 0.35],
};
const FALLBACK_LETTER = [0.2, 1.1] as const;
/**
 * The drawn letters' width against the sum of their advances: the font's kerning only narrows (its tightest pair, B and L,
 * by 0.098 em); measured in Chromium (geometricPrecision, as skin.css draws it) over 141 names at 6 to 100 units: 0.904 to
 * 1.006.
 */
const SHAPED_LOW = 0.9;
const SHAPED_HIGH = 1.01;
/**
 * The name's size (in the hand's units): at most WRITING_MAX_SIZE (its small letters 5.8 units high, about 7 px on a 390 px phone;
 * a kana name of up to about eight letters keeps 5), and down to MIN_SIZE for a longer one; under that, pressed to its room.
 */
export const WRITING_MAX_SIZE = 16;
const MIN_SIZE = 6;
/** Half the small letters' height (em): the alphabetic baseline this far under the writing's centre centres them on it. */
export const WRITING_BASELINE = 0.18;
/**
 * How far the letters reach from the baseline (em; the glyphs' bounds in the file): up to the tall strokes' tops (b d h
 * k l: 0.899) and down to the tails' ends (j p q y: 0.465).
 */
export const WRITING_ASCENT = 0.9;
export const WRITING_DESCENT = 0.465;

/**
 * The name's width in em, at least and at most: the font's letters by their advances (narrowed by the kerning), each other
 * character (with its marks) as the fallback draws it.
 */
export function writingWidth(name: string): { low: number; high: number } {
  let letters = 0;
  let low = 0;
  let high = 0;
  for (const [character] of name.normalize("NFC").matchAll(/\P{M}\p{M}*/gu)) {
    if (DRAWN.test(character)) {
      letters += ADVANCE[character.toLowerCase()];
      continue;
    }
    const [least, most] = FALLBACK[character] ?? FALLBACK_LETTER;
    low += least;
    high += most;
  }
  return { low: low + letters * SHAPED_LOW, high: high + letters * SHAPED_HIGH };
}

/**
 * The writing's size for a room `width` wide: as large as fits (never over WRITING_MAX_SIZE), smaller for a long name, never
 * cut. Under MIN_SIZE, MIN_SIZE pressed to the room (`squeeze`: SVG's textLength) only when the name is surely wider
 * than the room there, so it is only ever pressed narrower, never stretched; else just under MIN_SIZE, unpressed.
 */
export function writingSize(name: string, width: number): { fontSize: number; squeeze: boolean } {
  const { low, high } = writingWidth(name);
  if (!high) return { fontSize: WRITING_MAX_SIZE, squeeze: false };
  const fit = width / high;
  if (fit >= MIN_SIZE) return { fontSize: Math.min(WRITING_MAX_SIZE, fit), squeeze: false };
  return low * MIN_SIZE > width ? { fontSize: MIN_SIZE, squeeze: true } : { fontSize: fit, squeeze: false };
}

/**
 * Starts loading the font as the play's module loads (the name shows only in the lamp's light: it must not change its
 * hand there mid-play). Never throws: a font that cannot load leaves the fallback.
 */
export function warmWritingFont(fonts: Pick<FontFaceSet, "load"> | undefined = globalThis.document?.fonts): void {
  try {
    fonts?.load(`${WRITING_MAX_SIZE}px "${WRITING_FONT}"`, "Aa").catch(() => undefined);
  } catch {
    // A browser without the font loading API's load(): the font comes when the writing is drawn.
  }
}
