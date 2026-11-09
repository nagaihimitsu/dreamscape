import { describe, expect, it } from "vitest";
import { compileInk } from "./ink-validation";
import { MODULES_FILE, MODULES_INK } from "./modules-ink";
import { readPlaceFile } from "./place-files";
import { placeScenes, sceneTagRules, checkRuleIds, momentWarnings, thenLoopErrors, thenLoopWarnings } from "./scene-table";
import { walkScene } from "./scene-walk";
import type { SceneEntry } from "../src/content/scene-schemas";

// The build's walk of a tagged scene (3.3 check 6: A8, A10, the romance choice count) and the scene
// table's AP rules (made statically from the Ink text; their ID collisions) and the then: loop (A12).

const context = { effectIds: [], backgroundIds: [], emotionIds: ["neutral"] };
const top = "INCLUDE modules.ink\n-> DONE\n";

function scenesOf(source: string): { compiled: string; scenes: SceneEntry[] } {
  const file = readPlaceFile("places/smp_x_tower", source);
  const compiled = compileInk(file.source, "places/smp_x_tower.ink", { [MODULES_FILE]: MODULES_INK });
  const scenes = placeScenes({ file, compiled, apCap: 12, mains: [], landmarkCity: () => "x" }).map((item) => item.entry);
  return { compiled, scenes };
}
const walk = (source: string, extra: Partial<Parameters<typeof walkScene>[0]> = {}) => {
  const { compiled, scenes } = scenesOf(source);
  const scene = scenes[0];
  return walkScene({ compiled, start: scene.story.knot, label: scene.id, context, variables: {}, conds: scene.conds, options: scene.options,
    ...(scene.when ? { when: scene.when } : {}), headThen: !!scene.then, done: scene.done, itemIds: ["smp_x_card"], memoryIds: [], ...extra });
};
const talk = (head: string, body: string) => `${top}\n=== smp_x_talk ===\n# scene: talk\n# at: visit x\n# priority: +1\n${head}${body}`;

describe("the scene walk", () => {
  it("walks every choice with every cond text both ways, and the scene's own effects as it goes", () => {
    const source = talk("", '{ cond("item smp_x_card held"): has }\n* [A # option: give]\n    # give: smp_x_card heroine\n    { cond("item smp_x_card held"): still } done\n    -> END\n* [B]\n    b\n    -> END\n');
    // 2 truth values × (give needs the card: hidden when not guaranteed, but walked) → every path ends.
    expect(walk(source)).toBe(4);
  });

  it("stops a choice point where no choice can be chosen in some state (A10), unless the head guarantees it", () => {
    const body = "* [A # option: a]\n    # give: smp_x_card heroine\n    a\n    -> END\n* [B # option: b]\n    # ap: -2\n    b\n    -> END\n";
    expect(() => walk(talk("", body))).toThrow("No choice can be chosen");
    expect(walk(talk("# when: item smp_x_card held\n", body))).toBe(2);
    expect(walk(talk("# when: ap >= 2\n", body))).toBe(2);
    // An outer cond read true guarantees what it reads.
    expect(walk(talk("", `{ cond("item smp_x_card held"):\n${body}- else:\n    none\n    -> END\n}\n`))).toBe(3);
  });

  it("warns about a choice point with only 「また今度」 and choices needing an item not guaranteed there", () => {
    const warnings: string[] = [];
    walk(talk("", "* [A # option: a]\n    # give: smp_x_card heroine\n    a\n    -> END\n* [Later # option: later]\n    # later\n    l\n    -> END\n"),
      { onWarning: (message) => warnings.push(message) });
    expect(warnings).toHaveLength(1);
  });

  it("stops a path that meets two then: (A8, the head's counted)", () => {
    const body = "* [A # option: a]\n    # then: move x_square\n    a\n    -> END\n* [B]\n    b\n    -> END\n";
    expect(walk(talk("", body))).toBe(2);
    expect(() => walk(talk("# then: epilogue\n", body))).toThrow("meets 2 then:");
  });

  it("counts a date's romance choices on its own knot, not those of a helper knot", () => {
    const date = `${top}\n=== smp_x_date ===\n# scene: talk\n# at: visit x\n# priority: +1\nhi\n-> smp_x_aside ->\n* [A # option: a]\n    # profile: bold\n    a\n- -> END\n\n` +
      "=== smp_x_aside ===\n* [H # option: h]\n    h\n- ->->\n";
    expect(walk(date, { romanceChoices: { knot: "smp_x_date", count: 1 } })).toBe(2);
    expect(() => walk(date, { romanceChoices: { knot: "smp_x_date", count: 2 } })).toThrow("Expected 2 romance choice moments");
  });
});

describe("the tags' AP rules", () => {
  it("are made from the Ink text, also in a branch the walk does not take, a helper knot's per scene that calls it", () => {
    const { scenes } = scenesOf(`${top}\n=== smp_x_a ===\n# scene: talk\n# at: visit x\n# priority: +1\n# on_done: ap +1\n-> smp_x_help ->\n` +
      "* {romance_stage >= 3} [A # option: a]\n    # ap: +2\n    a\n    -> END\n* [B]\n    -> END\n\n" +
      "=== smp_x_b ===\n# scene: talk\n# at: visit x\n# priority: +2\n-> smp_x_help ->\n-> END\n\n" +
      "=== smp_x_help ===\n* [H # option: h]\n    # ap: +1\n    h\n- ->->\n");
    const rules = sceneTagRules(scenes, (scene) => scene.id);
    expect(rules.map((rule) => [rule.id, rule.ap])).toEqual([["smp_x_a__a", 2], ["smp_x_a__h", 1], ["smp_x_a__on_done", 1], ["smp_x_b__h", 1]]);
    expect(rules.every((rule) => rule.trigger === "scene_tag" && rule.minScore === null)).toBe(true);
  });

  it("stop at an ID collision: an option named on_done and the head's on_done, and the __ in names", () => {
    const rule = (id: string, origin: string) => ({ id, sceneId: "s", trigger: "scene_tag" as const, ap: 1, minScore: null, titleJa: "t", origin });
    expect(() => checkRuleIds([rule("a__on_done", "choice on_done"), rule("a__on_done", "head")], [])).toThrow("Two AP rules have the ID a__on_done");
    expect(() => checkRuleIds([rule("a__b__c", "scene a, option b__c"), rule("a__b__c", "scene a__b, option c")], [])).toThrow("a__b__c");
    expect(() => checkRuleIds([rule("x_reward", "tag")], [{ id: "x_reward", origin: "authored" }])).toThrow("authored");
  });
});

describe("the then: loop (A12)", () => {
  it("stops a scene that moves on by its head to a place whose visit runs it again, repeated always without a condition", () => {
    const { scenes } = scenesOf(`${top}\n=== smp_x_loop ===\n# scene: talk\n# at: visit x_tower\n# priority: -1\n# repeat: always\n# then: move x_tower\nx\n-> END\n`);
    expect(thenLoopErrors(scenes, (place) => (place === "x_tower" ? ["x_tower"] : []))[0]).toContain("An endless then: loop");
    expect(thenLoopErrors([{ ...scenes[0], when: { flag: "f" } }], () => ["x_tower"])).toEqual([]);
    // With a condition the loop is left only when it turns false: a warning, not a stop (3.3).
    expect(thenLoopWarnings([{ ...scenes[0], when: { flag: "f" } }], () => ["x_tower"])[0]).toContain("A then: loop left only conditionally");
    expect(thenLoopWarnings(scenes, () => ["x_tower"])).toEqual([]);
  });
});

describe("the moments of stage 4 in the scene table (2.3)", () => {
  const scenesAt = (at: string, priority = "-1", input: Partial<Parameters<typeof placeScenes>[0]> = {}) => {
    const file = readPlaceFile("places/smp_x_tower", `${top}\n=== smp_x_moment ===\n# scene: talk\n# at: ${at}\n# priority: ${priority}\nx\n-> END\n`);
    const compiled = compileInk(file.source, "places/smp_x_tower.ink", { [MODULES_FILE]: MODULES_INK });
    return placeScenes({ file, compiled, apCap: 12, mains: [], landmarkCity: () => "x", placeCity: (place) => (place.startsWith("x_") ? "x" : undefined),
      dateCity: (date) => (date === "smp_x_date" ? "x" : undefined), cityExists: (city) => city === "x", ...input }).map((item) => item.entry);
  };
  it("gives each scene its moments' city, and stops at a date, a place or a city it does not know (A2)", () => {
    expect(scenesAt("date smp_x_date", "after date")[0]).toMatchObject({ cityId: "x", at: [{ date: "smp_x_date" }], priority: "after date" });
    expect(scenesAt("hotel x_hotel")[0].cityId).toBe("x");
    expect(scenesAt("trip walk from x_hotel to x_tower")[0].at).toEqual([{ trip: "walk", from: "x_hotel", to: "x_tower" }]);
    expect(() => scenesAt("date smp_y_date")).toThrow("Unknown date in # at: date smp_y_date");
    expect(() => scenesAt("ticket y_gate")).toThrow("Unknown place in # at: ticket y_gate");
    expect(() => scenesAt("depart y")).toThrow("Unknown city in # at: depart y");
    // A bare hotel or a trip without places names no city: the city of the file's other scenes; alone, it stops.
    expect(() => scenesAt("hotel")).toThrow("which names no city");
  });

  it("stops an epilogue's scene that reopens the epilogue by its head's then:, repeated always without a condition (the 3.3 example)", () => {
    const loop = { ...scenesAt("epilogue x")[0], repeat: "always" as const, then: { epilogue: true as const } };
    expect(thenLoopErrors([loop], () => [])[0]).toContain("reopens it by its head's then: epilogue");
    expect(thenLoopErrors([{ ...loop, when: { flag: "f" } }], () => [])).toEqual([]);
    expect(thenLoopWarnings([{ ...loop, when: { flag: "f" } }], () => [])[0]).toContain("A then: loop left only conditionally");
    expect(thenLoopErrors([{ ...loop, repeat: "once" }], () => [])).toEqual([]);
  });

  it("stops a scene before the night, the departure or the epilogue that always moves elsewhere: that step never comes (A12)", () => {
    const away = (at: string, priority = "-1") => ({ ...scenesAt(at, priority)[0], repeat: "always" as const, then: { move: "x_tower" } });
    const context = { departs: (city: string) => city === "x", epilogueRequired: () => true };
    expect(thenLoopErrors([away("hotel x_hotel")], () => [], context)[0]).toMatch(/An endless then: loop: .*before the night/u);
    expect(thenLoopErrors([away("depart x")], () => [], context)[0]).toMatch(/before the departure from x/u);
    expect(thenLoopErrors([away("epilogue x")], () => [], context)[0]).toMatch(/before the epilogue of x/u);
    // After the night or the epilogue, a departure that never opens, a once-only scene: no loop.
    expect(thenLoopErrors([away("hotel x_hotel", "+1"), away("epilogue x", "+1"), { ...away("hotel x_hotel"), repeat: "once" as const }], () => [], context)).toEqual([]);
    expect(thenLoopErrors([away("depart x")], () => [], { departs: () => false })).toEqual([]);
    // With a condition, a warning; an epilogue the player may leave the city without: a warning too.
    expect(thenLoopErrors([{ ...away("hotel x_hotel"), when: { flag: "f" } }], () => [], context)).toEqual([]);
    expect(thenLoopWarnings([{ ...away("hotel x_hotel"), when: { flag: "f" } }], () => [], context)[0]).toContain("A then: loop left only conditionally");
    expect(thenLoopErrors([away("epilogue x")], () => [], { epilogueRequired: () => false })).toEqual([]);
    expect(thenLoopWarnings([away("epilogue x")], () => [], { epilogueRequired: () => false })[0]).toContain("A then: loop that may not end");
    // A then: epilogue there opens the epilogue once (read, it does nothing): no loop.
    expect(thenLoopErrors([{ ...away("hotel x_hotel"), then: { epilogue: true as const } }], () => [], context)).toEqual([]);
  });

  it("warns at every moment, not only a visit: the same priority in two files, a repetition without until, 「また今度」 that never comes back (2.5, 2.6)", () => {
    const places = { landmarksAt: (place: string) => (place === "x_tower" ? ["x_tower"] : []), datesAt: (place: string) => (place === "x_square" ? ["smp_x_date"] : []),
      finaleAt: (place: string) => (place === "x_square" ? "x" : undefined) };
    const at = (moment: string, priority = "-1", file = "places/smp_x_tower") => ({ ...scenesAt(moment, priority)[0], story: { storyId: file, knot: "smp_x_moment" } });
    const kinds = (scenes: ReturnType<typeof at>[]) => momentWarnings(scenes, places).map((warning) => warning.kind);
    // The hotel's -1 in two files; the date's -1 by date and by its place; a trip's from two places never meet.
    const hotel = momentWarnings([{ ...at("hotel x_hotel"), id: "a" }, { ...at("hotel x_hotel", "-1", "places/smp_x_end"), id: "b" }], places);
    expect(hotel).toEqual([{ kind: "same-priority", message: expect.stringMatching(/^Scenes share a priority: a, b have priority -1 at hotel x; .*places\/smp_x_tower, places\/smp_x_end/u) }]);
    expect(kinds([{ ...at("date smp_x_date"), id: "a" }, { ...at("place x_square", "-1", "places/smp_x_end"), id: "b" }])).toEqual(["same-priority"]);
    expect(kinds([{ ...at("hotel x_hotel"), id: "a" }, { ...at("hotel x_hotel", "+1", "places/smp_x_end"), id: "b" }, { ...at("hotel x_hotel"), id: "c" }])).toEqual([]);
    const trip = (from: string, file: string, id: string) => ({ ...at("hotel x_hotel", "-1", file), id, at: [{ trip: "walk", from }] });
    expect(kinds([trip("x_hotel", "places/smp_x_tower", "a"), trip("x_gate", "places/smp_x_end", "b")])).toEqual([]);
    expect(kinds([trip("x_hotel", "places/smp_x_tower", "a"), { ...trip("x_hotel", "places/smp_x_end", "b"), at: [{ trip: "walk" }] }])).toEqual(["same-priority"]);
    // Repeated always: without until it warns; with an until (a not in its when), or at a visit (read there), not.
    expect(momentWarnings([{ ...at("hotel x_hotel"), repeat: "always" as const }], places)[0].message).toContain("Repeated scene without until: smp_x_moment");
    expect(kinds([{ ...at("hotel x_hotel"), repeat: "always" as const, when: { not: { flag: "f" } } }])).toEqual([]);
    expect(kinds([{ ...at("hotel x_hotel"), repeat: "always" as const, at: [{ hotel: "x_hotel" }, { visit: "x_tower" }] }])).toEqual([]);
    // 「また今度」 at the epilogue, or after the finale's battle: that moment comes once.
    const later = (moment: string, priority: string) => ({ ...at(moment, priority), options: [{ id: "later", knot: "smp_x_moment", later: true as const }] });
    expect(kinds([later("epilogue x", "-1")])).toEqual(["later-never-again"]);
    expect(kinds([later("finale x", "+1")])).toEqual(["later-never-again"]);
    expect(kinds([later("finale x", "-1"), later("hotel x_hotel", "-1"), { ...later("epilogue x", "-1"), at: [{ epilogue: "x" }, { hotel: "x_hotel" }] }])).toEqual([]);
  });

  it("counts a trip's then: move as a loop only when the move goes by the trip's mode (4.4: by, else walking, else the only mode)", () => {
    const routes = [{ fromPlaceId: "x_hotel", toPlaceId: "x_tower", mode: "walk" }, { fromPlaceId: "x_hotel", toPlaceId: "x_tower", mode: "x_bike" },
      { fromPlaceId: "x_gate", toPlaceId: "x_tower", mode: "x_bike" }];
    const context = { routes: () => routes };
    // (A trip names no city: the scene of the file's city, its # at: given.)
    const ride = (at: string, then: { move: string; by?: string }) => {
      const [, trip, ...rest] = at.split(" ");
      const narrow = Object.fromEntries(rest.flatMap((word, index) => (index % 2 === 0 ? [[word, rest[index + 1]]] : [])));
      return { ...scenesAt("hotel x_hotel")[0], at: [{ trip, ...narrow }], repeat: "always" as const, then };
    };
    // By another mode (the bicycle's scene, a move on foot): its trip never runs it again.
    expect(thenLoopErrors([ride("trip x_bike", { move: "x_tower", by: "walk" })], () => [], context)).toEqual([]);
    expect(thenLoopErrors([ride("trip x_bike from x_hotel", { move: "x_tower" })], () => [], context)).toEqual([]);
    expect(thenLoopWarnings([ride("trip x_bike from x_hotel", { move: "x_tower" })], () => [], context)).toEqual([]);
    // By its own mode: the trip there runs it again.
    expect(thenLoopErrors([ride("trip x_bike", { move: "x_tower", by: "x_bike" })], () => [], context)[0]).toContain("An endless then: loop");
    expect(thenLoopErrors([ride("trip x_bike from x_gate", { move: "x_tower" })], () => [], context)[0]).toContain("An endless then: loop");
    expect(thenLoopErrors([ride("trip walk from x_hotel", { move: "x_tower" })], () => [], context)[0]).toContain("An endless then: loop");
    // From anywhere: walking from the hotel, the bicycle from the gate; not fixed, so a warning.
    expect(thenLoopErrors([ride("trip x_bike", { move: "x_tower" })], () => [], context)).toEqual([]);
    expect(thenLoopWarnings([ride("trip x_bike", { move: "x_tower" })], () => [], context)[0]).toContain("A then: loop that may not end");
    // Its trip leaves from the place it moves to, or goes elsewhere: no trip there runs it.
    expect(thenLoopErrors([ride("trip x_bike from x_tower", { move: "x_tower", by: "x_bike" }), ride("trip x_bike to x_gate", { move: "x_tower", by: "x_bike" })], () => [], context)).toEqual([]);
  });
});
