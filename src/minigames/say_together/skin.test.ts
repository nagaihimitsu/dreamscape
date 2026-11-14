import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { sayTogether } from "./definition";
import { SAY_COUNT_MS, SAY_GAME, SAY_WORDS_MS, type SayRecord } from "./rules";
import { SAY_WORDS_TEXT, sayEndsAt, sayTogetherSkin, sayView } from "./Skin";

// Saying it together's art slots (docs/13 2.12) and its four beats: a use's pictures in place of the drawn lawn and her
// standing picture, the CSS look without them; her count and a word a beat, the player's words as tapped, the end on
// the last word.
const field = (art: Record<string, string>) => renderToStaticMarkup(createElement(sayTogetherSkin.Field, {
  params: {}, still: false, seed: 1, cast: { heroine: createElement("i", { "data-testid": "standing-picture" }) }, names: { player: "主人公", heroine: "ヒロイン" },
  art, sound: () => undefined, vibrate: () => undefined, frames: () => () => undefined,
}));
const record = (taps: readonly number[]): SayRecord => ({ taps, stopMs: null });
const { wordsAt, countAt } = SAY_GAME;

describe("saying it together's field", () => {
  it("draws its own lawn and her standing picture without the use's art, her bubble and her name", () => {
    const html = field({});
    expect(html).toContain('class="mg-say-together"');
    expect(html).not.toContain("data-art-lawn");
    expect(html).toContain("mg-say-together-tomb-figure");
    expect(html).toContain("standing-picture");
    expect(html).not.toContain("<img");
    expect(html).toContain("ヒロイン");
    // The player's bubble comes only with a tap.
    expect(html).not.toContain("mg-say-together-bubble-yours");
  });

  it("puts the use's pictures in its declared slots", () => {
    expect(sayTogether.artSlots.map((slot) => [slot.id, slot.kind])).toEqual([["lawn", "backdrop"], ["heroine", "sprite"]]);
    const html = field({ lawn: "/assets/minigames/lawn.webp", heroine: "/assets/minigames/her.webp" });
    expect(html).toContain('data-art-lawn="true"');
    expect(html).toContain('src="/assets/minigames/lawn.webp"');
    expect(html).toContain('src="/assets/minigames/her.webp"');
    expect(html).not.toContain("mg-say-together-tomb-figure");
    expect(html).not.toContain("standing-picture");
  });

  it("counts 「せー」「の」 a beat each, then says a word a beat; the lane shows her count and her words", () => {
    const view = (ms: number, taps: readonly number[] = [], still = false) => sayView(SAY_GAME, ms, record(taps), false, still);
    expect(view(0)).toMatchObject({ lit: 0, her: 0, nod: false });
    expect(view(SAY_COUNT_MS)).toMatchObject({ lit: 1, her: 0, nod: true });
    expect(view(SAY_COUNT_MS, [], true)).toMatchObject({ lit: 1, nod: false });
    expect(view(countAt[1])).toMatchObject({ lit: 2, her: 0 });
    expect(view(SAY_WORDS_MS)).toMatchObject({ lit: 2, her: 1 });
    expect(view(wordsAt[3])).toMatchObject({ her: 4 });
    expect(SAY_WORDS_TEXT).toHaveLength(4);
    expect(sayTogetherSkin.countIn).toEqual(countAt);
    expect(sayTogetherSkin.tuning.beats).toEqual(wordsAt);
    expect(sayTogetherSkin.ignoreBeforeMs).toBe(SAY_COUNT_MS);
    expect(sayTogetherSkin.hintJa).toBe(sayTogether.hintJa);
  });

  it("shows the player's words as tapped: glowing with hers on her beat, the peak on the last word", () => {
    const view = (ms: number, taps: readonly number[], ended = false) => sayView(SAY_GAME, ms, record(taps), ended, false);
    expect(view(SAY_WORDS_MS + 10, [SAY_WORDS_MS])).toMatchObject({ yours: ["together", null, null, null], glow: true, peak: false });
    expect(view(wordsAt[1] + 10, [SAY_WORDS_MS, wordsAt[1] + 400])).toMatchObject({ yours: ["together", null, null, null], glow: false });
    expect(view(wordsAt[3] + 10, wordsAt)).toMatchObject({ glow: true, peak: true, lifted: false });
    // An early start: the player's first word alone, before hers.
    expect(view(countAt[1] + 10, [countAt[1]])).toMatchObject({ her: 0, yours: ["off", null, null, null] });
    // Over: the player's bubble lifts clear of the card; silent, she turns to look.
    expect(view(SAY_GAME.endMs, wordsAt, true)).toMatchObject({ lifted: true, look: false });
    expect(view(SAY_GAME.endMs, [], true)).toMatchObject({ lifted: true, look: true });
  });

  it("grows her held syllable as she holds it and shows her breath before the last word, then the last word", () => {
    const view = (ms: number, ended = false) => sayView(SAY_GAME, ms, record([]), ended, false);
    const { holdAt, breathAt } = SAY_GAME;
    expect(view(holdAt.from - 1)).toMatchObject({ her: 2, held: 0, breath: false });
    expect(view(holdAt.from)).toMatchObject({ her: 3, held: 0 });
    expect(view(holdAt.from + 1).held).toBe(1);
    expect(view(holdAt.to - 1).held).toBe(3);
    expect(view(breathAt.from)).toMatchObject({ held: 3, breath: true });
    expect(view(breathAt.to)).toMatchObject({ her: 4, breath: false });
    expect(view(breathAt.from, true).breath).toBe(false);
    expect(sayTogetherSkin.bigBeats).toEqual([3]);
  });

  it("ends the play on the last word as both voices say it, else as its window closes", () => {
    const last = wordsAt[3];
    expect(sayEndsAt(SAY_GAME, last - 1, record(wordsAt.map((at, index) => (index === 3 ? last - 60 : at))))).toBe(false);
    expect(sayEndsAt(SAY_GAME, last, record(wordsAt.map((at, index) => (index === 3 ? last - 60 : at))))).toBe(true);
    expect(sayEndsAt(SAY_GAME, last + 100, record(wordsAt.slice(0, 3)))).toBe(false);
    expect(sayEndsAt(SAY_GAME, last + SAY_GAME.numbers.laterLateMs - 1, record([]))).toBe(false);
    expect(sayEndsAt(SAY_GAME, last + SAY_GAME.numbers.laterLateMs, record([]))).toBe(true);
    // Always before the engine's own end (its fallback).
    expect(last + SAY_GAME.numbers.laterLateMs).toBeLessThan(SAY_GAME.endMs);
  });
});
