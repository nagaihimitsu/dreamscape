import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SearchView } from "../engines/search/EnginePlay";
import { parasolSearch } from "./definition";
import { parasolSetup, parasolTargets, type ParasolParams } from "./rules";
import { parasolSkin } from "./Skin";

// The parasol's field (docs/13 2.12–2.13): each round's things as buttons named by what the picture shows (never whose),
// the old one where the tag says, the use's art in its slot, the round and its looks in the top band.
const view = (change: Partial<SearchView> = {}): SearchView => ({ round: 0, searched: [], done: [], presses: {}, last: null, nudge: null, ending: null, ...change });
const field = (params: ParasolParams, current = view(), art: Record<string, string> = {}, seed = 1) => renderToStaticMarkup(createElement(parasolSkin.Field, {
  params, still: false, seed, cast: { heroine: null }, names: { player: "Haruto", heroine: "ヒロイン" }, art, sound: () => undefined, vibrate: () => undefined,
  setup: parasolSetup(params), view: current, live: true, search: () => undefined, active: () => undefined, frames: () => () => undefined,
}));
const labels = (html: string) => [...html.matchAll(/aria-label="([^"]*)"/gu)].map((match) => match[1]);

describe("the parasol's field", () => {
  it("draws the street through the window, with thirteen umbrellas to look at in round 1", () => {
    const html = field({ at: "middle" });
    expect(html).toContain('class="mg-parasol-search"');
    expect(labels(html)).toHaveLength(13);
    expect(html.match(/data-testid="minigame-spot-\d+"/gu)).toHaveLength(13);
    expect(html).toContain('data-round="1"');
  });

  it("names each umbrella by its colour and what is under it, never by whose it is", () => {
    const names = labels(field({ at: "middle" }));
    for (const name of ["古い日傘、野菜の店", "古い日傘、チャイの屋台", "古い日傘、花輪の店", "新しい生成りの日傘、野菜の店", "緑の傘、野菜の店"]) expect(names).toContain(name);
    for (const name of names) expect(name).not.toMatch(/ガウラ|探す|当たり/u);
  });

  it("puts the old parasol at the tag's stall, whatever the seed shuffles round it", () => {
    for (const at of ["left", "middle", "right"] as const) for (const seed of [1, 2, 99]) {
      expect(labels(field({ at }, view(), {}, seed))[parasolTargets({ at })[0]]).toBe("古い日傘、野菜の店");
    }
  });

  it("brings the customers in round 2 (her stall's one arguing) and the children in round 3, as buttons in place of the umbrellas", () => {
    const hers = parasolTargets({ at: "middle" })[0];
    const second = field({ at: "middle" }, view({ round: 1, done: [{ searched: [hers], found: true }] }));
    expect(labels(second)).toHaveLength(5);
    expect(labels(second)[parasolTargets({ at: "middle" })[1]]).toBe("古い日傘の野菜の店の前の客、両手を振り上げている");
    expect(second).toContain("data-shown=\"true\"");
    const third = field({ at: "middle" }, view({ round: 2, done: [{ searched: [hers], found: true }, { searched: [3], found: true }] }));
    expect(labels(third)).toEqual(["通りを行く子ども、凧を持っている", "通りを行く子ども、トマトを持っている", "通りを行く子ども、青いボールを持っている"]);
  });

  it("marks what was looked at, and at the end the find or her pointing", () => {
    const looked = field({ at: "middle" }, view({ searched: [1] }));
    expect(labels(looked)[1]).toMatch(/：違った$/u);
    expect(looked).toContain("mg-parasol-search-ring-wrong");
    // At the end the last round stays on show, its find in its list.
    const done = [{ searched: [10], found: true }, { searched: [3], found: true }, { searched: [0, 1], found: true }];
    const found = field({ at: "middle" }, view({ round: 2, searched: [0, 1], done, ending: { kind: "found", spot: 1, misses: 1, helped: 0 } }));
    expect(found).toContain("mg-parasol-search-ring-found");
    expect(labels(found)[1]).toBe("通りを行く子ども、トマトを持っている");
    expect(labels(found)[0]).toMatch(/：違った$/u);
    expect(parasolSkin.statusJa?.(view({ round: 2, searched: [0, 1], done }), null)).toBe("3/3　見た子 1");
    const pointed = field({ at: "middle" }, view({ round: 2, done: [...done.slice(0, 2), { searched: [], found: false }], ending: { kind: "helped", misses: 0, helped: 1 } }));
    expect(pointed).toContain("mg-parasol-search-ring-pointed");
    expect(pointed).not.toContain("mg-parasol-search-ring-found");
  });

  it("says the round and its looks in the top band, and the round's thing above the buttons", () => {
    expect(parasolSkin.statusJa?.(view({ searched: [1, 2] }), null)).toBe("1/3　見た傘 2");
    expect(parasolSkin.statusJa?.(view({ round: 1 }), null)).toBe("2/3　見た人 0");
    expect(typeof parasolSkin.hintJa === "function" && parasolSkin.hintJa(view({ round: 2 }))).toContain("トマト");
  });

  it("puts the use's street picture in its slot, and still draws the umbrellas", () => {
    expect(parasolSearch.artSlots.map((slot) => [slot.id, slot.kind])).toEqual([["street", "backdrop"]]);
    const html = field({ at: "middle" }, view(), { street: "/assets/minigames/street.webp" });
    expect(html).toContain('src="/assets/minigames/street.webp"');
    expect(html).toContain('data-art-street="true"');
    expect(labels(html)).toHaveLength(13);
  });
});
