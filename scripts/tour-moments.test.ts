import { describe, expect, it } from "vitest";
import { compileInk } from "./ink-validation";
import { MODULES_FILE, MODULES_INK } from "./modules-ink";
import { readPlaceFile } from "./place-files";
import { placeScenes, tourMomentErrors } from "./scene-table";
import type { SceneEntry } from "../src/content/scene-schemas";

// A tour's steps in the scene table (tour stages 2b, 3; `# at: tour <tour> <step>`): a leg's narration (`# scene: tour_leg`), its
// in-car encounter (`# priority: after leg`) and the scenes before and after a step, and what content:build refuses: an unknown
// tour or step, `after leg` off a leg, a narration elsewhere than at one leg or with choices or effects, two narrations or two
// in-car encounters on one leg, and money, an AP reward, 「また今度」 or a repetition in an in-car encounter.

const top = "INCLUDE modules.ink\n-> DONE\n";
/** The fictional tour smp_x_tour_fort: out (a leg), visit (an event step), back (a leg), in the city x. */
const tourStep = (tourId: string, stepId: string) => tourId !== "smp_x_tour_fort" ? undefined
  : stepId === "out" || stepId === "back" ? { cityId: "x", kind: "leg" as const } : stepId === "visit" ? { cityId: "x", kind: "event" as const } : undefined;
const at = (step: string) => `# at: tour smp_x_tour_fort ${step}\n`;
const choice = (id: string, tags = "") => `* [Yes. # option: ${id} # translation: はい。]\n${tags}    y\n    -> END\n`;

/** The scene entries of one place file whose knots are [name, head, body]. */
function scenesOf(...knots: [name: string, head: string, body?: string][]): SceneEntry[] {
  const source = top + knots.map(([name, head, body = "x\n-> END\n"]) => `\n=== ${name} ===\n${head}${body}`).join("");
  const file = readPlaceFile("places/smp_x_tour_fort", source);
  const compiled = compileInk(file.source, "places/smp_x_tour_fort.ink", { [MODULES_FILE]: MODULES_INK });
  return placeScenes({ file, compiled, apCap: 12, mains: [], landmarkCity: () => "x", tourStep }).map((item) => item.entry);
}
const talk = (step: string, priority: string) => `# scene: talk\n${at(step)}# priority: ${priority}\n`;
const encounter = (step: string, extra = "") => `# scene: encounter\n# title: 車の中\n${at(step)}# priority: after leg\n${extra}`;
const narration = (step: string, extra = "") => `# scene: tour_leg\n${at(step)}${extra}`;

describe("a tour's steps in the scene table (tour stages 2b, 3)", () => {
  it("reads a leg's narration, its in-car encounter and the scenes before and after the steps, in the tour's city", () => {
    const scenes = scenesOf(["smp_x_morning", talk("out", "-1")], ["smp_x_out_leg", narration("out")],
      ["smp_x_out_car", encounter("out"), choice("yes", "    # rel: trust +1\n    # set: smp_x_flag\n")],
      ["smp_x_after_visit", talk("visit", "+1")], ["smp_x_home", talk("back", "+1")]);
    expect(scenes.map(({ id, kind, cityId, at: moments, priority }) => ({ id, kind, cityId, at: moments, priority }))).toEqual([
      { id: "smp_x_morning", kind: "talk", cityId: "x", at: [{ tour: "smp_x_tour_fort", step: "out" }], priority: -1 },
      { id: "smp_x_out_leg", kind: "tour_leg", cityId: "x", at: [{ tour: "smp_x_tour_fort", step: "out" }] },
      { id: "smp_x_out_car", kind: "encounter", cityId: "x", at: [{ tour: "smp_x_tour_fort", step: "out" }], priority: "after leg" },
      { id: "smp_x_after_visit", kind: "talk", cityId: "x", at: [{ tour: "smp_x_tour_fort", step: "visit" }], priority: 1 },
      { id: "smp_x_home", kind: "talk", cityId: "x", at: [{ tour: "smp_x_tour_fort", step: "back" }], priority: 1 },
    ]);
    expect(scenes[2].options).toEqual([{ id: "yes", knot: "smp_x_out_car", translated: true, rel: { trust: 1 }, set: ["smp_x_flag"] }]);
    // A narration may read cond("…") (the walk sets each both ways) and spend nothing; an in-car encounter may spend AP.
    expect(scenesOf(["smp_x_out_leg", narration("out"), '{ cond("couple"): a | b }\n-> END\n'])[0].conds).toEqual(["couple"]);
    expect(tourMomentErrors(scenes)).toEqual([]);
    expect(tourMomentErrors(scenesOf(["smp_x_out_car", encounter("out"), choice("yes", "    # ap: -1\n")]))).toEqual([]);
  });

  const refusals: [what: string, knots: [string, string, string?][], message: string][] = [
    ["an unknown tour", [["smp_x_a", "# scene: talk\n# at: tour smp_x_tour_nowhere out\n# priority: -1\n"]], "Unknown tour or tour step in # at: tour smp_x_tour_nowhere step out"],
    ["an unknown step", [["smp_x_a", talk("lunch", "-1")]], "Unknown tour or tour step in # at: tour smp_x_tour_fort step lunch"],
    ["after leg at an event step", [["smp_x_a", encounter("visit")]], "# priority: after leg needs a leg of the tour"],
    ["after leg at a visit", [["smp_x_a", "# scene: talk\n# at: visit x_fort\n# priority: after leg\n"]], "has no after leg"],
    ["a narration at an event step", [["smp_x_a", narration("visit")]], "A tour leg's narration names its leg once"],
    ["a narration at two legs", [["smp_x_a", `${narration("out")}${at("back")}`]], "A tour leg's narration names its leg once"],
    ["a narration with a priority", [["smp_x_a", narration("out", "# priority: -1\n")]], "takes no # priority:"],
    ["a narration with an effect", [["smp_x_a", narration("out", "# on_done: set smp_x_flag\n")]], "takes no # on_done:"],
    ["a narration with a condition", [["smp_x_a", narration("out", "# when: couple\n")]], "takes no # when:"],
    ["a narration with choices", [["smp_x_a", narration("out"), "* [Hm.]\n    h\n    -> END\n"]], "A tour leg's narration has no choices"],
  ];
  it.each(refusals)("refuses %s", (_what, knots, message) => {
    expect(() => scenesOf(...knots)).toThrow(message);
  });

  it("refuses two narrations or two in-car encounters on one leg, and money, an AP reward, 「また今度」 or a repetition in the car", () => {
    expect(tourMomentErrors(scenesOf(["smp_x_a", narration("out")], ["smp_x_b", narration("out")])))
      .toEqual(["A tour leg has one narration: smp_x_a, smp_x_b are all # scene: tour_leg at # at: tour smp_x_tour_fort step out"]);
    expect(tourMomentErrors(scenesOf(["smp_x_a", encounter("back")], ["smp_x_b", encounter("back")])))
      .toEqual(["A tour leg has at most one in-car encounter: smp_x_a, smp_x_b are all # priority: after leg at # at: tour smp_x_tour_fort step back"]);
    // One narration and one in-car encounter on each leg is the shape.
    expect(tourMomentErrors(scenesOf(["smp_x_a", narration("out")], ["smp_x_b", narration("back")], ["smp_x_c", encounter("out")], ["smp_x_d", encounter("back")])))
      .toEqual([]);
    for (const [extra, body, named] of [
      ["", choice("pay", "    # money: -100\n"), "the choice pay's # money:"],
      ["# on_done: money +50\n", undefined, "# on_done: money"],
      ["", choice("gain", "    # ap: +1\n"), "the choice gain's # ap: +1"],
      ["", choice("wait", "    # later\n"), "the choice wait's # later (「また今度」)"],
      ["# repeat: always\n", undefined, "# repeat: always"],
    ] as const) {
      const [problem] = tourMomentErrors(scenesOf(["smp_x_car", encounter("out", extra), body]));
      expect(problem, named).toContain(`The in-car encounter smp_x_car (# at: tour smp_x_tour_fort step out, # priority: after leg) takes no ${named}`);
    }
  });
});
