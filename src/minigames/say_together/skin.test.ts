import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { sayTogether } from "./definition";
import { SAY_COUNT_MS, SAY_END_MS, SAY_FIELD, SAY_TUNING, SAY_WORDS_MS } from "./rules";
import { SAY_FIELD_POINTS, sayTogetherSkin } from "./Skin";

// Saying it together's art slots (docs/13 2.12) and its count: a use's pictures in place of the drawn lawn and her
// standing picture, the CSS look without them, and a count that reads without sound (one dot a beat, the words on the third).
const field = (art: Record<string, string>) => renderToStaticMarkup(createElement(sayTogetherSkin.Field, {
  params: {}, still: false, seed: 1, cast: { heroine: createElement("i", { "data-testid": "standing-picture" }) }, names: { player: "主人公", heroine: "ヒロイン" },
  art, sound: () => undefined, vibrate: () => undefined, frames: () => () => undefined,
}));

describe("saying it together's field", () => {
  it("draws its own lawn and her standing picture without the use's art, her bubble with its three dots and her name", () => {
    const html = field({});
    expect(html).toContain('class="mg-say-together"');
    expect(html).not.toContain("data-art-lawn");
    expect(html).toContain("mg-say-together-tomb-figure");
    expect(html).toContain("standing-picture");
    expect(html).not.toContain("<img");
    expect(html.match(/mg-say-together-dots/g)).toHaveLength(1);
    expect(html).toContain("ヒロイン");
    // The player's bubble comes only with the tap.
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

  it("counts one dot a beat, says the words from the third, and shows each voice from its own start", () => {
    const { viewAt, BEATS_AT, WORDS } = SAY_FIELD_POINTS;
    expect(BEATS_AT).toEqual([SAY_COUNT_MS, SAY_COUNT_MS + SAY_FIELD.beatMs]);
    expect(viewAt(0, null, null, false)).toMatchObject({ lit: 0, her: 0, yours: null });
    expect(viewAt(SAY_COUNT_MS, null, null, false)).toMatchObject({ lit: 1, her: 0, nod: true });
    expect(viewAt(SAY_COUNT_MS, null, null, true)).toMatchObject({ lit: 1, nod: false });
    expect(viewAt(SAY_COUNT_MS + SAY_FIELD.beatMs, null, null, false)).toMatchObject({ lit: 2, her: 0 });
    expect(viewAt(SAY_WORDS_MS, null, null, false)).toMatchObject({ lit: 3, her: 1 });
    expect(viewAt(SAY_WORDS_MS + SAY_FIELD.wordsMs, null, null, false)).toMatchObject({ her: WORDS.length });
    // The player first (early): the player's words from the tap, hers from her beat.
    const early = SAY_COUNT_MS + SAY_FIELD.beatMs;
    expect(viewAt(early + 1, early, "early", false)).toMatchObject({ her: 0, yours: 1, together: false });
    // Together: both bubbles glow from the beat; silent: she turns to look.
    expect(viewAt(SAY_WORDS_MS, SAY_WORDS_MS - 50, "together", false)).toMatchObject({ together: true });
    expect(viewAt(SAY_END_MS + 1, null, "silent", false)).toMatchObject({ look: true, her: WORDS.length });
  });

  it("closes a ring on the gold dot through the last beat, and writes the last word large", () => {
    const { closingAt, BEATS_AT } = SAY_FIELD_POINTS;
    expect(closingAt(BEATS_AT[0])).toBeNull();
    expect(closingAt(BEATS_AT[1])).toBe(1);
    expect(closingAt(SAY_WORDS_MS - 1)).toBeCloseTo(0, 2);
    expect(closingAt(SAY_WORDS_MS)).toBeNull();
    expect(sayTogetherSkin.hintJa).toBe(sayTogether.hintJa);
  });

  it("ends each outcome after what it shows, before the host shows the outcome", () => {
    const at = (outcome: "together" | "early" | "late" | "silent", tapMs: number | null) => sayTogetherSkin.endAt({ outcome, tapMs }, false);
    expect(at("together", SAY_WORDS_MS)).toBeGreaterThan(SAY_WORDS_MS + SAY_FIELD.wordsMs);
    expect(at("early", SAY_COUNT_MS)).toBeGreaterThan(SAY_WORDS_MS);
    expect(at("late", SAY_WORDS_MS + SAY_TUNING.nearLateMs)).toBeGreaterThan(SAY_WORDS_MS + SAY_TUNING.nearLateMs);
    expect(at("silent", null)).toBeGreaterThan(SAY_END_MS);
  });
});
