import type { MehndiSpot } from "./rules";

// Her lines in the hidden name's look (docs/13 2.2; docs/09 for her voice): short, light, never a fixed tic, and true in
// every branch of the story (she knows what is written and where; or she knows a secret of her own is there; or, in
// FARHANA's, she knows that something is hidden but not what or where: she says 「ちゃんと、隠したものがあるんだから」 in
// every branch, and is surprised by what the player finds). None says 名前 (in two branches it is not his name), and none
// says what hides where. The words are kept here, out of the .tsx, with which of them she says when (mehndiAnswer) and for
// how long (mehndiSaidMs): pure, so that the tests can read them (lines.test.ts). No React and no browser (the story checks
// read this file through the definition's load()).

/** Her word at a wrong place (the look goes on), by the place, then before the hints; and her hint of the area. */
export const WRONG_JA: Record<MehndiSpot, string> = {
  index: "そこは、ただの花びら",
  pinky: "そこは、ただの花びら",
  peacock: "そこは、孔雀の羽だけ",
  thumb: "そこは、ただの蔓",
  vine: "そこは、ただの蔓",
  wrist: "そこは、手首の飾り",
};
/** Her first word at a wrong thing opens with this (round 2 playtest): she enjoys the mistake. Only the first (no fixed tic). */
export const FIRST_WRONG_JA = "ふふ、";
/** Her warning, at the wrong thing before the hints: a promise, kept by mehndiAnswer (the next wrong point brings her hint). */
export const AGAIN_JA = "そこでもないよ。次も外れたら、教えちゃうね";
export const HINT_JA = "このへん、かな";
/**
 * Her word at a decoration (the marks that look like writing), in turn: she sees that it is pattern, enjoys the mistake a
 * little, and notices the hand that drew it. True in every branch (in FARHANA's she does not know what Farhana hid, so the
 * third is a quiet irony); she never says that she knows what the real writing looks like.
 */
export const DECOY_JA = [
  "それは字じゃなくて、飾り。似てるでしょ",
  "字の形をまねた飾り。よく見ると、少し違うの",
  "ファルハーナさんの遊び心かな。字みたいな線、あちこちにあるね",
] as const;
/**
 * Her hand as the hot and cold: the lamp near the writing (she knows it is there / she does not), held long elsewhere.
 * They come again, in turn, each time the lamp comes near again or rests on another place again (2026-11-14 playtest: once
 * each, a long sweep went silent), at most once in the field's TELL_AGAIN_MS.
 */
export const NEAR_KNOWS_JA = ["ふふ……どうかな", "……さあ、どうでしょう", "あ、そこは……ううん、なんでもない"] as const;
export const NEAR_WONDERS_JA = ["ん？　そこ、何か……", "え、そこ？　何かある？", "……そこだけ、模様がこみいってる"] as const;
export const LINGER_JA = ["そこ、じっと見すぎ", "そこばっかり見てる", "……そこ、そんなに気になる？"] as const;

/**
 * Her answer to a wrong thing or place pointed at. Her words follow what the player did, not the places the rules count
 * (a player cannot see which place a decoration belongs to; 2026-11-17 review: after her 「次も外れたら、教えちゃうね」, three
 * more decorations of places already counted got no hint). `count`: the wrong things pointed at so far, each once (the
 * dashed rings: decorations and places), this one among them; `fresh`: this one is new (not one pointed at again).
 * - A new one: the first, 「ふふ、」 and her word (about decorations, in turn: `decoyWords` of them said so far; or about
 *   the pattern at the place); the one before the hints (`hintAfter` − 1), her warning; from `hintAfter` on, her hint.
 * - One pointed at again: her word alone (never 「ふふ、」 again); once she has warned (or hinted), her hint: the next
 *   wrong point after her promise always brings it.
 * `decoyWord`: a word about decorations was said (the caller counts them).
 */
export function mehndiAnswer(spot: MehndiSpot, decoration: boolean, pointed: { count: number; fresh: boolean }, hintAfter: number, decoyWords: number):
  { textJa: string; hint: boolean; decoyWord: boolean } {
  const { count, fresh } = pointed;
  if (count >= hintAfter || (!fresh && count >= hintAfter - 1)) return { textJa: HINT_JA, hint: true, decoyWord: false };
  if (fresh && count === hintAfter - 1) return { textJa: AGAIN_JA, hint: false, decoyWord: false };
  const word = decoration ? DECOY_JA[decoyWords % DECOY_JA.length] : WRONG_JA[spot];
  return { textJa: fresh && count === 1 ? `${FIRST_WRONG_JA}${word}` : word, hint: false, decoyWord: decoration };
}

/** Her word shows at least this long (the play's clock; her hint's ring with it). */
export const SAID_MS = 1600;
/** And long enough to read: this long a character (her longest word about decorations, 30 characters, was gone in 1.6 s). */
export const SAID_MS_PER_CHARACTER = 90;
/** How long a word of hers shows (ms): by its length, never under SAID_MS. */
export function mehndiSaidMs(textJa: string): number {
  return Math.max(SAID_MS, [...textJa].length * SAID_MS_PER_CHARACTER);
}
