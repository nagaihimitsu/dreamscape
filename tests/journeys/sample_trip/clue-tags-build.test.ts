import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { SAMPLE_JOURNEY_DIRECTORY, SAMPLE_JOURNEY_ID } from "../../../scripts/content-layout";
import { contentSourcesFromTree, loadContentSources, selectJourneys, type ContentSources } from "../../../scripts/content-sources";
import { validateContent } from "../../../scripts/content-validation";

// content:build reads a clue heard in conversation (2026-11-18) on the sample journey (fictional), with its files changed in
// memory: a choice's # clue: and a head's # on_done: clue go into the scene table, a clue no catalog lists stops (A2), the
// condition clue <ID> names a clue that exists, and the walk of every branch reads a cond("clue …") after the choice that
// records it as true.

const repository = path.resolve(".");
const prefix = `${SAMPLE_JOURNEY_DIRECTORY}/`;
const TOWER = "stories/places/smp_mihon_clock_tower.ink";
const RAIN = "smp_obs_mihon_market_rain";
const HANDS = "smp_obs_mihon_clock_tower_hands";
const STAY = "* [下から見上げておく # option: stay_below]\n";
const GEARS = "=== smp_mihon_clock_gears ===\n# scene: talk\n";
let sample: ContentSources;

beforeAll(() => {
  sample = selectJourneys(loadContentSources(repository, { extraJourneyDirectories: [SAMPLE_JOURNEY_DIRECTORY] }), [SAMPLE_JOURNEY_ID]);
});

/** The sample's sources with its clock tower's place file changed. */
function towerWith(change: (text: string) => string): ContentSources {
  const files = new Map(sample.tree.files);
  const file = `${prefix}${TOWER}`;
  const text = files.get(file)!.toString("utf8");
  const changed = change(text);
  expect(changed).not.toBe(text);
  files.set(file, Buffer.from(changed));
  return contentSourcesFromTree({ ...sample.tree, files });
}
const heardOnChoice = (clue: string, after = "") => (text: string) => text.replace(STAY, `${STAY}    # clue: ${clue}\n${after}`);
const heardAtEnd = (clue: string) => (text: string) => text.replace(GEARS, `${GEARS}# on_done: clue ${clue}\n`);

describe("a clue heard in conversation, as content:build reads it", () => {
  it("writes a choice's # clue: and a head's # on_done: clue into the scene table, and the other scenes keep their fingerprints", () => {
    const before = validateContent(sample).scenes.scenes;
    const after = validateContent(towerWith((text) => heardAtEnd(HANDS)(heardOnChoice(RAIN)(text)))).scenes.scenes;
    const bell = after.find((scene) => scene.id === "smp_mihon_clock_bell")!;
    expect(bell.options.find((option) => option.id === "stay_below")).toEqual({ id: "stay_below", knot: "smp_mihon_clock_bell", clues: [RAIN] });
    expect(bell.options.find((option) => option.id === "climb")).not.toHaveProperty("clues");
    expect(after.find((scene) => scene.id === "smp_mihon_clock_gears")!.done).toEqual({ ap: 1, clues: [HANDS] });
    const changed = after.filter((scene) => before.find((item) => item.id === scene.id)?.fingerprint !== scene.fingerprint).map((scene) => scene.id);
    expect(changed.sort()).toEqual(["smp_mihon_clock_bell", "smp_mihon_clock_gears"]);
  });

  it("stops a clue no tourism catalog lists, on a choice and at a scene's end (A2)", () => {
    expect(() => validateContent(towerWith(heardOnChoice("smp_no_such_clue"))))
      .toThrow("Unknown clue in the choice stay_below (# clue:) of places/smp_mihon_clock_tower (smp_mihon_clock_bell): smp_no_such_clue");
    expect(() => validateContent(towerWith(heardAtEnd("smp_no_such_clue"))))
      .toThrow("Unknown clue in # on_done: clue of places/smp_mihon_clock_tower (smp_mihon_clock_gears): smp_no_such_clue");
  });

  it("reads the condition clue <ID> in a head and a cond(), and stops one that names no clue", () => {
    expect(() => validateContent(towerWith((text) => text.replace(GEARS, `${GEARS}# when: clue ${HANDS}\n`)))).not.toThrow();
    expect(() => validateContent(towerWith((text) => text.replace(GEARS, `${GEARS}# when: not clue smp_no_such_clue\n`))))
      .toThrow("Unknown clue (tourism/catalog.json) in a condition of");
  });

  it("walks a cond(\"clue …\") after the choice that records the clue as true (its else is never walked there)", () => {
    // The else branch calls a helper knot whose only choice needs the clue: walked, it would stop (A10, no choice can be chosen).
    const after = `    { cond("clue ${RAIN}"):\n        # speaker: heroine\n        雨の日の話、覚えておこう\n    - else:\n        -> smp_mihon_zz_rain ->\n    }\n`;
    const helper = `\n=== smp_mihon_zz_rain ===\n* [雨の話をする # option: tell_rain]\n    # requires: clue ${RAIN}\n    # speaker: heroine\n` +
      "    雨の日は休みなんだって\n- ->->\n";
    expect(() => validateContent(towerWith((text) => `${heardOnChoice(RAIN, after)(text)}${helper}`))).not.toThrow();
    // Without the choice's # clue:, the else branch is walked and the choice point stops the build.
    expect(() => validateContent(towerWith((text) => `${text.replace(STAY, `${STAY}${after}`)}${helper}`))).toThrow("No choice can be chosen at a choice point");
  });
});
