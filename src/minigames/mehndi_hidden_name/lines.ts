import type { MehndiSpot } from "./rules";

// Her lines in the hidden name's look (docs/13 2.2; docs/09 for her voice): short, light, never a fixed tic, and true in
// every branch of the story (she knows what is written and where; or she knows a secret of her own is there; or, in
// FARHANA's, she believes nothing is written at all). None says 名前 (in two branches it is not his name), and none says
// what hides where. The field (Skin.tsx) chooses among them; the words are kept here, out of the .tsx.

/** Her word at a wrong place (the look goes on), by the place, then before the hints; and her hint of the area. */
export const WRONG_JA: Record<MehndiSpot, string> = {
  index: "そこは、ただの花びら",
  pinky: "そこは、ただの花びら",
  peacock: "そこは、孔雀の羽だけ",
  thumb: "そこは、ただの蔓",
  vine: "そこは、ただの蔓",
  wrist: "そこは、手首の飾り",
};
export const AGAIN_JA = "そこでもないよ。次も外れたら、教えちゃうね";
export const HINT_JA = "このへん、かな";
/**
 * Her word at a decoration (the marks that look like writing), in turn: she sees that it is pattern, enjoys the mistake a
 * little, and notices the hand that drew it. True in every branch (in FARHANA's she believes nothing is written at all, so
 * the third is a quiet irony); she never says that she knows what the real writing looks like.
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
