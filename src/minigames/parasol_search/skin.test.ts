import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SearchView } from "../engines/search/EnginePlay";
import { parasolSearch } from "./definition";
import { parasolSetup, type ParasolParams } from "./rules";
import { parasolSkin } from "./Skin";

// The parasol's field (docs/13 2.12–2.13): nine umbrellas as buttons named by what the picture shows (never whose), the
// old one where the tag says, the use's art in its slot.
const view = (searched: number[] = [], ending: SearchView["ending"] = null): SearchView => ({ searched, presses: {}, last: null, ending });
const field = (params: ParasolParams, current = view(), art: Record<string, string> = {}) => renderToStaticMarkup(createElement(parasolSkin.Field, {
  params, still: false, seed: 1, cast: { heroine: null }, names: { player: "Haruto", heroine: "ヒロイン" }, art, sound: () => undefined, vibrate: () => undefined,
  setup: parasolSetup(params), view: current, live: true, search: () => undefined, active: () => undefined, frames: () => () => undefined,
}));
const labels = (html: string) => [...html.matchAll(/aria-label="([^"]*)"/gu)].map((match) => match[1]);

describe("the parasol's field", () => {
  it("draws the street through the window, with nine umbrellas to look at", () => {
    const html = field({ at: "middle" });
    expect(html).toContain('class="mg-parasol-search"');
    expect(labels(html)).toHaveLength(9);
    expect(html.match(/data-testid="minigame-spot-\d"/gu)).toHaveLength(9);
  });

  it("names each umbrella by its colour and what is under it, never by whose it is", () => {
    const names = labels(field({ at: "middle" }));
    expect(names).toContain("古い日傘、野菜の店");
    expect(names).toContain("古い日傘、チャイの屋台");
    expect(names).toContain("緑の傘、野菜の店");
    for (const name of names) expect(name).not.toMatch(/ガウラ|探す|当たり/u);
  });

  it("puts the old parasol at the tag's stall, and the stall that was there in the middle", () => {
    expect(labels(field({ at: "middle" })).slice(6)).toEqual(["緑の傘、野菜の店", "古い日傘、野菜の店", "橙の傘、花輪の店"]);
    expect(labels(field({ at: "left" })).slice(6)).toEqual(["古い日傘、野菜の店", "緑の傘、野菜の店", "橙の傘、花輪の店"]);
    expect(labels(field({ at: "right" })).slice(6)).toEqual(["緑の傘、野菜の店", "橙の傘、花輪の店", "古い日傘、野菜の店"]);
  });

  it("marks what was looked at, the find, and the one she points out", () => {
    const looked = field({ at: "middle" }, view([1, 7], { kind: "found", spot: 7, misses: 1 }));
    expect(labels(looked)[1]).toBe("古い日傘、チャイの屋台：違った");
    expect(labels(looked)[7]).toBe("古い日傘、野菜の店：見つけた");
    expect(looked).toContain("mg-parasol-search-ring-found");
    const pointed = field({ at: "middle" }, view([], { kind: "button", button: "ask", misses: 0 }));
    expect(pointed).toContain("mg-parasol-search-ring-pointed");
    expect(pointed).not.toContain("mg-parasol-search-ring-found");
  });

  it("puts the use's street picture in its slot, and still draws the umbrellas", () => {
    expect(parasolSearch.artSlots.map((slot) => [slot.id, slot.kind])).toEqual([["street", "backdrop"]]);
    const html = field({ at: "middle" }, view(), { street: "/assets/minigames/street.webp" });
    expect(html).toContain('src="/assets/minigames/street.webp"');
    expect(html).toContain('data-art-street="true"');
    expect(labels(html)).toHaveLength(9);
  });
});
