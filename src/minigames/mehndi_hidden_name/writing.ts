// The player's name as the mehndi's writing (docs/13 2.10). The user's decision of 2026-11-16 (案A: no Japanese letters
// in the pattern; 「名前の文字のフォントを筆記体っぽいやつにして」): the name in Latin letters (names.playerLatin) in a
// cursive hand. The hand is Playwrite IN (TypeTogether's joined school cursive after Indian handwriting; SIL Open Font
// License 1.1), bundled with the game from @fontsource/playwrite-in: its latin file (which also has the Latin letters
// with marks, ā ō é) at weight 400, its only weight there. Imported here, in the play's own module (never the title
// page's); the licence comes with the build's third-party licence file. The size is worked out from the font's own
// advances (measured from the file), so the name fits its room and is never pressed wider than it is.
import "@fontsource/playwrite-in/latin-400.css";

/** The writing's font family (skin.css names the same, with `cursive` after it). */
export const WRITING_FONT = "Playwrite IN";

/**
 * Playwrite IN's advance of each letter, in em (its hmtx, 1000 units to the em). A letter with marks counts as its base
 * letter (é as e: the marks add at most 0.06 em); a letter not listed (ß, ø, æ…) as anything from NARROWEST to WIDEST.
 */
const ADVANCE: Readonly<Record<string, number>> = {
  a: 0.622, b: 0.614, c: 0.522, d: 0.641, e: 0.526, f: 0.438, g: 0.622, h: 0.676, i: 0.3, j: 0.316, k: 0.564, l: 0.394, m: 0.989,
  n: 0.671, o: 0.588, p: 0.636, q: 0.623, r: 0.568, s: 0.55, t: 0.388, u: 0.646, v: 0.604, w: 0.888, x: 0.64, y: 0.64, z: 0.465,
  A: 1.049, B: 1.01, C: 0.876, D: 1.152, E: 0.789, F: 1.046, G: 1.067, H: 1.218, I: 0.581, J: 0.677, K: 1.129, L: 0.921, M: 1.587,
  N: 1.233, O: 1.05, P: 0.939, Q: 1.078, R: 1.054, S: 1.009, T: 0.815, U: 1.077, V: 1.027, W: 1.442, X: 1.018, Y: 1.031, Z: 0.881,
  " ": 0.3, "'": 0.169, "’": 0.213, "-": 0.576, ".": 0.313,
};
/** The narrowest and widest letter of the font (ı, M), for a letter the table does not list. */
const NARROWEST = 0.3;
const WIDEST = 1.6;
/**
 * The joined hand's shaped width against the sum of its advances (its contextual joins and kerning): measured in
 * Chromium over 125 names (kana names in Hepburn, Western names, long and two-letter ones), 0.935 to 1.074 of the sum.
 */
const SHAPED_LOW = 0.92;
const SHAPED_HIGH = 1.08;
/**
 * The name's size (in the hand's units): at most MAX_SIZE (an x-height of 6 units, about 7 px on a 390 px phone; a name
 * of up to about eight letters keeps 6 px), and down to MIN_SIZE for a longer one; under that, pressed to its room.
 */
const MAX_SIZE = 12;
const MIN_SIZE = 4.5;
/** Half the x-height (em): the alphabetic baseline this far under the writing's centre puts the small letters on it. */
export const WRITING_BASELINE = 0.25;

/** The name's width in em, at least and at most (the advances' sum, widened by how the joins may shape it). */
export function writingWidth(name: string): { low: number; high: number } {
  let low = 0;
  let high = 0;
  for (const char of name.normalize("NFD")) {
    if (/\p{M}/u.test(char)) continue;
    const advance = ADVANCE[char];
    low += advance ?? NARROWEST;
    high += advance ?? WIDEST;
  }
  return { low: low * SHAPED_LOW, high: high * SHAPED_HIGH };
}

/**
 * The writing's size for a room `width` wide: as large as fits (never over MAX_SIZE), smaller for a long name, never
 * cut. Under MIN_SIZE, MIN_SIZE pressed to the room (`squeeze`: SVG's textLength) only when the name is surely wider
 * than the room there, so it is only ever pressed narrower, never stretched; else just under MIN_SIZE, unpressed.
 */
export function writingSize(name: string, width: number): { fontSize: number; squeeze: boolean } {
  const { low, high } = writingWidth(name);
  if (!high) return { fontSize: MAX_SIZE, squeeze: false };
  const fit = width / high;
  if (fit >= MIN_SIZE) return { fontSize: Math.min(MAX_SIZE, fit), squeeze: false };
  return low * MIN_SIZE > width ? { fontSize: MIN_SIZE, squeeze: true } : { fontSize: fit, squeeze: false };
}

/**
 * Starts loading the font as the play's module loads (the name shows only in the lamp's light: it must not change its
 * hand there mid-play). Never throws: a font that cannot load leaves the fallback (`cursive`).
 */
export function warmWritingFont(fonts: Pick<FontFaceSet, "load"> | undefined = globalThis.document?.fonts): void {
  try {
    fonts?.load(`${MAX_SIZE}px "${WRITING_FONT}"`, "Aa").catch(() => undefined);
  } catch {
    // A browser without the font loading API's load(): the font comes when the writing is drawn.
  }
}
