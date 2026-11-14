import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SearchView } from "../engines/search/EnginePlay";
import { mehndiHiddenName } from "./definition";
import { mehndiSetup, type MehndiParams } from "./rules";
import { mehndiSkin } from "./Skin";

// The hidden name's field (docs/13 2.10, 2.12–2.13): the writing as text (the name as typed, never HTML), an illegible mark
// with no letters where the story says Hindi, six places as buttons named by the pattern, and the use's art in its slots.
const view: SearchView = { total: 1, round: 0, searched: [], done: [], presses: {}, last: null, nudge: null, ending: null };
const field = (params: MehndiParams, player = "Haruto", art: Record<string, string> = {}, shown: SearchView = view) => renderToStaticMarkup(createElement(mehndiSkin.Field, {
  params, still: false, seed: 1, cast: { heroine: null }, names: { player, heroine: "ヒロイン" }, art, sound: () => undefined, vibrate: () => undefined,
  setup: mehndiSetup(params), view: shown, live: true, search: () => undefined, active: () => undefined, frames: () => () => undefined,
}));

describe("the hidden name's field", () => {
  it("writes the player's name as typed, as text", () => {
    const html = field({ target: "thumb", text: "player" }, "<b>ハル</b>");
    expect(html).toContain('class="mg-mehndi-hidden-name"');
    expect(html).toContain("&lt;b&gt;ハル&lt;/b&gt;");
    expect(html).not.toContain("<b>");
  });

  it("draws an illegible mark with no letters where the story says Hindi, and FARHANA over unreadable marks", () => {
    const illegible = field({ target: "peacock", text: "illegible" });
    expect(illegible).toContain("mg-mehndi-hidden-name-mark");
    expect(illegible).not.toContain("Haruto");
    expect(illegible).not.toMatch(/[ऀ-ॿ]/u);
    const farhana = field({ target: "vine", text: "farhana" });
    expect(farhana).toContain(">FARHANA<");
    // Her number is a row of marks: no digits are written.
    expect(farhana).not.toMatch(/>[^<]*\d[^<]*</u);
  });

  it("names the six places by the pattern there, never by what hides in it", () => {
    const html = field({ target: "vine", text: "farhana" });
    for (const label of ["人差し指の花", "小指の側の花", "孔雀の羽の付け根", "親指の付け根の蔓", "真ん中の蔓", "手首の模様"]) expect(html).toContain(`aria-label="${label}"`);
    expect(html).not.toMatch(/aria-label="[^"]*(文字|名前)/u);
  });

  it("rings each wrong place pointed at while the look goes on, and the writing once the player found it", () => {
    const thumb: MehndiParams = { target: "thumb", text: "player" };
    const looking = field(thumb, "Haruto", {}, { ...view, searched: [0, 2, 5] });
    expect(looking.match(/mg-mehndi-hidden-name-mark-ring" data-wrong="true"/gu)).toHaveLength(3);
    expect(looking).not.toContain("data-writing");
    const found = field(thumb, "Haruto", {}, { ...view, searched: [0, 2, 3], ending: { kind: "found", spot: 3, misses: 2, helped: 0 } });
    expect(found.match(/data-wrong="true"/gu)).toHaveLength(2);
    expect(found).toContain("data-writing");
    // One line for how to play, before and during the play; no line under the label (she never shows the place).
    expect(mehndiSkin.hintJa).toBe(mehndiHiddenName.hintJa);
    expect(mehndiSkin.detailJa).toBeUndefined();
  });

  it("breaks the central vine's line behind the writing hidden in it, in the lit pattern only", () => {
    const vine = field({ target: "vine", text: "farhana" });
    expect(vine.match(/mask="url\(#[^)]*vinegap\)"/gu)).toHaveLength(1);
    expect(field({ target: "thumb", text: "farhana" })).not.toContain("vinegap");
  });

  it("puts the use's pictures in its declared slots", () => {
    expect(mehndiHiddenName.artSlots.map((slot) => [slot.id, slot.kind])).toEqual([["palm", "sprite"], ["lamp", "sprite"]]);
    const html = field({ target: "thumb", text: "player" }, "Haruto", { palm: "/assets/minigames/palm.webp", lamp: "/assets/minigames/lamp.webp" });
    expect(html).toContain('src="/assets/minigames/palm.webp"');
    expect(html).toContain('src="/assets/minigames/lamp.webp"');
    // The writing is the game's, over the picture.
    expect(html).toContain(">Haruto<");
  });
});
