import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MiniGamePlayProps } from "../contract";
import type { SearchView } from "../engines/search/EnginePlay";
import { parasolSearch } from "./definition";
import { Play, retune } from "./play";
import { PARASOL_TUNING, PARASOL_WARMUP_TARGET, parasolSetup, parasolTargets, type ParasolOutcome, type ParasolParams } from "./rules";
import { parasolSkin, parasolWarmupSkin } from "./Skin";

// The parasol's field (docs/13 2.12–2.13): each round's things as buttons named by what the picture shows (never whose),
// the old one where the tag says, the use's art in its slot, the round and its looks in the top band.
const view = (change: Partial<SearchView> = {}): SearchView => ({ total: 3, round: 0, searched: [], done: [], presses: {}, last: null, roundAt: 0, nudge: null, ending: null, ...change });
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
    expect(labels(second)).toHaveLength(7);
    expect(labels(second)[parasolTargets({ at: "middle" })[1]]).toBe("古い日傘の野菜の店の前の客、両手を振り上げている");
    // Two more with their arms up (no ₹ burst): the hint says what, never where.
    expect(labels(second).filter((name) => /両手を上げている|伸びをしている/u.test(name))).toHaveLength(2);
    expect(second.match(/₹!/gu)).toHaveLength(1);
    expect(parasolSkin.hintJa).toBeTypeOf("function");
    if (typeof parasolSkin.hintJa === "function") expect(parasolSkin.hintJa(view({ round: 1 }))).toBe("値段で揉めている客を押す");
    expect(second).toContain("data-shown=\"true\"");
    const third = field({ at: "middle" }, view({ round: 2, done: [{ searched: [hers], found: true }, { searched: [5], found: true }] }));
    expect(labels(third)).toHaveLength(5);
    expect(labels(third)[1]).toBe("通りを行く子ども、トマトを持っている");
    expect([...labels(third)].sort()).toEqual(["通りを行く子ども、トマトを持っている", "通りを行く子ども、凧を持っている", "通りを行く子ども、赤いボールを持っている",
      "通りを行く子ども、赤い花を持っている", "通りを行く子ども、青いボールを持っている"].sort());
  });

  it("draws every customer's gesture on either side of the road as well-formed shapes, whatever the seed deals", () => {
    const hers = parasolTargets({ at: "middle" })[0];
    for (const seed of [0, 1, 2, 3, 4, 5, 6, 7]) {
      const html = field({ at: "middle" }, view({ round: 1, done: [{ searched: [hers], found: true }] }), {}, seed);
      for (const [, d] of html.matchAll(/ d="([^"]*)"/gu)) expect(d, `seed ${seed}`).not.toMatch(/--|NaN|undefined/u);
    }
  });

  it("marks what was looked at, and at the end the find or her pointing", () => {
    const looked = field({ at: "middle" }, view({ searched: [1] }));
    expect(labels(looked)[1]).toMatch(/：違った$/u);
    expect(looked).toContain("mg-parasol-search-ring-wrong");
    // At the end the last round stays on show, its find in its list.
    const done = [{ searched: [10], found: true }, { searched: [5], found: true }, { searched: [0, 1], found: true }];
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

describe("the parasol's practice field (its own short look)", () => {
  const warm = (at: ParasolParams["at"] = "middle"): ParasolParams => ({ at, rounds: 3, warmup: "yes" });
  const one = (change: Partial<SearchView> = {}) => view({ total: 1, ...change });
  /** The places' buttons only (the hint, the band and 「どこ？」 are the engine's). */
  const buttons = (html: string) => [...html.matchAll(/<button[^>]*>/gu)].map((match) => match[0]);

  it("draws four plain umbrellas on the far pavement to look at, the blue one the only blue, and nothing else to press", () => {
    const html = field(warm());
    const names = labels(html);
    expect(names).toEqual(["赤白の縞の傘、ジュースの屋台", "黄色い傘、腕輪の店", "青い傘、果物の荷車", "橙の傘、花輪の店"]);
    expect(names[PARASOL_WARMUP_TARGET]).toBe("青い傘、果物の荷車");
    expect(names.filter((name) => name.includes("青い傘"))).toHaveLength(1);
    expect(html.match(/data-testid="minigame-spot-\d+"/gu)).toHaveLength(4);
    // All on the far pavement (the real look's finds are all on the near side), none walking.
    for (const button of buttons(html)) expect(button).toContain("top:22%");
    expect(html).not.toContain("data-walker");
  });

  it("has none of the real look's twists: no old parasols or vegetables, no customers or their bursts, no children or tomato", () => {
    for (const state of [one(), one({ searched: [0, 1] }), one({ searched: [PARASOL_WARMUP_TARGET], done: [{ searched: [PARASOL_WARMUP_TARGET], found: true }],
      ending: { kind: "found", spot: PARASOL_WARMUP_TARGET, misses: 0, helped: 0 } })]) {
      const html = field(warm(), state);
      expect(labels(html)).toHaveLength(4);
      for (const name of labels(html)) expect(name).not.toMatch(/古い日傘|生成り|野菜|客|子ども|トマト|車道を行く人/u);
      for (const sign of ["₹!", "♪!", "ん〜", "mg-parasol-search-handover", "data-tomato", "data-active"]) expect(html).not.toContain(sign);
    }
  });

  it("is the same street for every tag and seed: it never shows where the real look's old parasol is", () => {
    const first = field(warm("middle"), one(), {}, 0);
    for (const at of ["left", "middle", "right"] as const) for (const seed of [0, 1, 7, 99, 12345]) expect(field(warm(at), one(), {}, seed), `${at} ${seed}`).toBe(first);
    // The real look's own street does follow the tag (its old parasol at the tag's stall).
    expect(field({ at: "left" })).not.toBe(field({ at: "right" }));
  });

  it("marks a wrong look, and at the end the find or her pointing (a ring only: no face, no word)", () => {
    const looked = field(warm(), one({ searched: [0] }));
    expect(labels(looked)[0]).toMatch(/：違った$/u);
    expect(looked).toContain("mg-parasol-search-ring-wrong");
    const found = field(warm(), one({ searched: [0, PARASOL_WARMUP_TARGET], done: [{ searched: [0, PARASOL_WARMUP_TARGET], found: true }],
      ending: { kind: "found", spot: PARASOL_WARMUP_TARGET, misses: 1, helped: 0 } }));
    expect(found).toContain("mg-parasol-search-ring-found");
    const pointed = field(warm(), one({ done: [{ searched: [], found: false }], ending: { kind: "helped", misses: 0, helped: 1 } }));
    expect(pointed).toContain("mg-parasol-search-ring-pointed");
    expect(pointed).not.toContain("mg-parasol-search-ring-found");
  });

  it("says what to find above the buttons, and only the round and its looks in the band (none of the story's words)", () => {
    expect(parasolWarmupSkin.hintJa).toBe("青い傘を押す");
    expect(parasolWarmupSkin.statusJa?.(one(), null)).toBe("1/1　見た傘 0");
    expect(parasolWarmupSkin.statusJa?.(one({ searched: [0, 1] }), null)).toBe("1/1　見た傘 2");
    expect(parasolWarmupSkin.buttons).toEqual(parasolSkin.buttons);
    // A shorter hold than the real look's before 「次は本番！」.
    const ending = { kind: "found", spot: PARASOL_WARMUP_TARGET, misses: 0, helped: 0 } as const;
    expect(parasolWarmupSkin.endDelayMs(ending, false)).toBeLessThan(parasolSkin.endDelayMs(ending, false));
    // The real look's words stay as they were.
    expect(typeof parasolSkin.hintJa === "function" && parasolSkin.hintJa(view())).toBe("野菜を並べた、古い日傘を押す");
    expect(parasolSkin.statusJa?.(view(), null)).toBe("1/3　見た傘 0");
  });

  it("plays the practice's look when the params say warmup and the real look otherwise, retuned by Debug's room too", () => {
    const play = (Component: typeof Play, params: ParasolParams) => renderToStaticMarkup(createElement(Component, {
      params, auto: null, available: ["found", "found_slow", "pointed"], still: false, seed: 1,
      clock: { now: () => 0, at: () => 0, onFrame: () => () => undefined, after: () => () => undefined },
      cast: { heroine: null }, names: { player: "Haruto", heroine: "ヒロイン" }, art: {}, sound: () => undefined, vibrate: () => undefined,
      status: () => undefined, end: () => undefined, decided: () => undefined, practice: params.warmup === "yes",
    } as unknown as MiniGamePlayProps<ParasolParams, ParasolOutcome>));
    for (const Component of [Play, retune({ ...PARASOL_TUNING, idleMs: 7000 }).Play]) {
      const practice = play(Component, warm("left"));
      expect(practice).toContain("青い傘を押す");
      expect(practice.match(/data-testid="minigame-spot-\d+"/gu)).toHaveLength(4);
      expect(practice).toContain('data-testid="minigame-button-ask"');
      const real = play(Component, { at: "left", rounds: 3 });
      expect(real).toContain("野菜を並べた、古い日傘を押す");
      expect(real.match(/data-testid="minigame-spot-\d+"/gu)).toHaveLength(13);
    }
    expect(parasolSearch.practice).toEqual({ params: { warmup: "yes" } });
  });
});
