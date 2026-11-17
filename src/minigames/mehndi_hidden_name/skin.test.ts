import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MiniGameNames } from "../contract";
import type { SearchView } from "../engines/search/EnginePlay";
import { mehndiHiddenName } from "./definition";
import { mehndiSetup, type MehndiParams } from "./rules";
import { mehndiSkin } from "./Skin";

// The hidden name's field (docs/13 2.10, 2.12–2.13): the player's name in Latin letters in the Fasol SP hand (the user's
// decisions of 2026-11-16, no Japanese letters in the pattern, and 2026-11-17, the font), as text (never HTML), or no
// letters at all without a Latin form;
// an illegible mark with no letters where the story says Hindi, six places as buttons named by the pattern, and the use's
// art in its slots. The player's name as typed is kana here: it must never be drawn.
const view: SearchView = { total: 1, round: 0, searched: [], done: [], presses: {}, last: null, roundAt: 0, nudge: null, ending: null };
const field = (params: MehndiParams, latin: Pick<MiniGameNames, "playerLatin"> = { playerLatin: "Haruto" }, art: Record<string, string> = {},
  shown: SearchView = view) =>
  renderToStaticMarkup(createElement(mehndiSkin.Field, {
    params, still: false, seed: 1, cast: { heroine: null }, names: { player: "はると", heroine: "ヒロイン", ...latin }, art, sound: () => undefined,
    vibrate: () => undefined, setup: mehndiSetup(params), view: shown, live: true, search: () => undefined, active: () => undefined, frames: () => () => undefined,
  }));
/** The name's text element in the Fasol SP hand and what it says, if one is drawn. */
const lettering = (html: string) => html.match(/<text class="mg-mehndi-hidden-name-writing mg-mehndi-hidden-name-lettering"[^>]*>([^<]*)<\/text>/u);
const japanese = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;

describe("the hidden name's field", () => {
  it("writes the player's name in Latin letters in the Fasol SP hand, never the name as typed", () => {
    const html = field({ target: "thumb", text: "player" }, { playerLatin: "Taichi" });
    expect(html).toContain('class="mg-mehndi-hidden-name"');
    const writing = lettering(html);
    expect(writing?.[1]).toBe("Taichi");
    expect(writing?.[0]).not.toMatch(japanese);
    // A short name at the largest size, unpressed (only a long one is pressed to its room), its small letters centred on
    // the place (the baseline 0.18 of the size under it).
    expect(writing?.[0]).toContain('font-size="16"');
    expect(writing?.[0]).toContain('y="2.88"');
    expect(writing?.[0]).not.toContain("textLength");
    expect(html).not.toContain("はると");
    for (const target of ["peacock", "vine"] as const) expect(lettering(field({ target, text: "player" }, { playerLatin: "Taichi" }))?.[1], target).toBe("Taichi");
    // A long name only ever pressed narrower, to the room (the thumb's 54 units), at the smallest size.
    const long = lettering(field({ target: "thumb", text: "player" }, { playerLatin: "Alexandria Konstantinopoulou" }))?.[0];
    expect(long).toContain('font-size="6"');
    expect(long).toContain('textLength="54"');
    expect(long).toContain('lengthAdjust="spacingAndGlyphs"');
    // A hyphen or an apostrophe stays in the name (the stylesheet leaves it to the fallback, never the demo's advert).
    for (const name of ["Jan-Poru", "O'Brien"]) expect(lettering(field({ target: "vine", text: "player" }, { playerLatin: name }))?.[1], name).toBe(name.replace("'", "&#x27;"));
  });

  it("writes the Latin name as text, never as HTML", () => {
    const html = field({ target: "thumb", text: "player" }, { playerLatin: "<b>Haru</b>" });
    expect(lettering(html)?.[1]).toBe("&lt;b&gt;Haru&lt;/b&gt;");
    expect(html).not.toContain("<b>");
  });

  it("draws the letterless mark at the target when the name has no Latin form (no letters of any script)", () => {
    // null, or left out of the names.
    for (const latin of [{ playerLatin: null }, {}]) {
      const html = field({ target: "thumb", text: "player" }, latin);
      expect(lettering(html)).toBeNull();
      const lit = html.split("mg-mehndi-hidden-name-lit")[1];
      expect(lit).toContain("mg-mehndi-hidden-name-mark");
      expect(lit).not.toMatch(/<text/u);
      expect(html).not.toContain("はると");
      expect(html).not.toMatch(/[ऀ-ॿ]/u);
    }
  });

  it("draws an illegible mark with no letters where the story says Hindi, and FARHANA over unreadable marks", () => {
    const illegible = field({ target: "peacock", text: "illegible" });
    expect(illegible).toContain("mg-mehndi-hidden-name-mark");
    expect(illegible).not.toContain("Haruto");
    expect(illegible).not.toMatch(/[ऀ-ॿ]/u);
    const farhana = field({ target: "vine", text: "farhana" });
    expect(farhana).toContain(">FARHANA<");
    // FARHANA keeps its own letters (the story's Latin capitals), not the player's name's hand.
    expect(farhana).not.toContain("mg-mehndi-hidden-name-lettering");
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
    const looking = field(thumb, undefined, {}, { ...view, searched: [0, 2, 5] });
    expect(looking.match(/mg-mehndi-hidden-name-mark-ring" data-wrong="true"/gu)).toHaveLength(3);
    expect(looking).not.toContain("data-writing");
    const found = field(thumb, undefined, {}, { ...view, searched: [0, 2, 3], ending: { kind: "found", spot: 3, misses: 2, helped: 0 } });
    expect(found.match(/data-wrong="true"/gu)).toHaveLength(2);
    expect(found).toContain("data-writing");
    // One line for how to play, before and during the play; no line under the label (she never shows the place).
    expect(mehndiSkin.hintJa).toBe(mehndiHiddenName.hintJa);
    expect(mehndiSkin.detailJa).toBeUndefined();
  });

  it("curls the five other places like writing (lit only), never the writing's own, and gives the pool the tuning's size", () => {
    for (const target of ["thumb", "peacock", "vine"] as const) {
      const html = field({ target, text: "player" });
      const places = [...html.matchAll(/mg-mehndi-hidden-name-lookalike" data-place="([a-z]+)"/gu)].map((match) => match[1]);
      expect(places.sort(), target).toEqual(["index", "peacock", "pinky", "thumb", "vine", "wrist"].filter((spot) => spot !== target).sort());
      // Only in the lit layer (the dark shows the broad lines only).
      expect(html.split("mg-mehndi-hidden-name-lit")[0]).not.toContain("lookalike");
    }
    expect(field({ target: "thumb", text: "player" })).toContain("--mehndi-lamp-r:max(8cqw, 18px)");
  });

  it("breaks the central vine's line behind the writing laid on it (in the vine, at the feather's base), in the lit pattern only", () => {
    for (const params of [{ target: "vine", text: "farhana" }, { target: "peacock", text: "player" }, { target: "peacock", text: "illegible" }] as const) {
      expect(field(params).match(/mask="url\(#[^)]*vinegap\)"/gu), params.target).toHaveLength(1);
    }
    expect(field({ target: "thumb", text: "farhana" })).not.toContain("vinegap");
  });

  it("loads the font's stylesheet with the play only: the definition (on the title page) imports no stylesheet or font file", () => {
    const definition = readFileSync(new URL("./definition.ts", import.meta.url), "utf8");
    expect([...definition.matchAll(/^import .*$/gmu)].map((line) => line[0])).toEqual(['import { z } from "zod";', 'import { defineMiniGame } from "../contract";']);
    expect(definition).not.toMatch(/\.css|\.otf|@font-face/u);
    expect(readFileSync(new URL("./Skin.tsx", import.meta.url), "utf8")).toContain('import "./skin.css";');
  });

  it("puts the use's pictures in its declared slots", () => {
    expect(mehndiHiddenName.artSlots.map((slot) => [slot.id, slot.kind])).toEqual([["palm", "sprite"], ["lamp", "sprite"]]);
    const html = field({ target: "thumb", text: "player" }, undefined, { palm: "/assets/minigames/palm.webp", lamp: "/assets/minigames/lamp.webp" });
    expect(html).toContain('src="/assets/minigames/palm.webp"');
    expect(html).toContain('src="/assets/minigames/lamp.webp"');
    // The writing is the game's, over the picture.
    expect(html).toContain(">Haruto<");
  });
});
