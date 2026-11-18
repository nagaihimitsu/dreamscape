import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { SAMPLE_JOURNEY_DIRECTORY, SAMPLE_JOURNEY_ID } from "../../../scripts/content-layout";
import { contentSourcesFromTree, loadContentSources, selectJourneys, type ContentSources } from "../../../scripts/content-sources";
import { validateContent } from "../../../scripts/content-validation";
import { inspectJourneyReadiness, journeyReadinessInput } from "../../../scripts/journey-readiness";
import { momentQuizBattleIds } from "../../../scripts/place-files";

// content:build's checks of a reasoning quiz placed at a moment (時点のクイズ, 2026-11-18; 4.1, 4.2) on the sample journey
// (fictional), with its files changed in memory: what breaks play or a save stops (a moment other than the departure and the
// epilogue, no priority, a head then:, a quiz without reasoning, a quiz the map also opens, a head # on_done: that spends, an
// unknown clue in its condition); the rest are warnings (a guide or an observation of its landmark that never runs, tags of a
// quiz repeated always, a condition reading a clue nothing gives). Its # when: guarantees its cond("…") on every path.

const repository = path.resolve(".");
const prefix = `${SAMPLE_JOURNEY_DIRECTORY}/`;
const STOP = "stories/places/smp_mihon_coach_stop.ink";
const TOWER = "stories/places/smp_mihon_clock_tower.ink";
const BELL = "smp_obs_mihon_coach_bell";
const HEAD = "=== smp_mihon_special_b_coach ===\n# scene: battle\n# at: epilogue mihon\n# priority: -3\n";
let sample: ContentSources;

beforeAll(() => {
  sample = selectJourneys(loadContentSources(repository, { extraJourneyDirectories: [SAMPLE_JOURNEY_DIRECTORY] }), [SAMPLE_JOURNEY_ID]);
});

/** The sample's sources with some of its files changed (path inside the sample folder → change of its text). */
function sampleWith(changes: Record<string, (text: string) => string>): ContentSources {
  const files = new Map(sample.tree.files);
  for (const [file, change] of Object.entries(changes)) {
    const text = files.get(`${prefix}${file}`)!.toString("utf8");
    const changed = change(text);
    expect(changed, `${file} did not change`).not.toBe(text);
    files.set(`${prefix}${file}`, Buffer.from(changed));
  }
  return contentSourcesFromTree({ ...sample.tree, files });
}
/** The moment quiz's head with `from` replaced by `to`. */
const head = (from: string, to: string) => ({ [STOP]: (text: string) => text.replace(HEAD, HEAD.replace(from, to)) });
const json = (change: (value: Record<string, unknown>) => void) => (text: string) => {
  const value = JSON.parse(text) as Record<string, unknown>;
  change(value);
  return JSON.stringify(value);
};

describe("a moment quiz, as content:build reads it", () => {
  it("lists it as a turn of its moment, with its priority and its condition read as its turn comes", () => {
    const quiz = validateContent(sample).scenes.scenes.find((scene) => scene.id === "smp_mihon_special_b_coach")!;
    expect(quiz).toMatchObject({ kind: "battle", main: { battle: "smp_mihon_special_b_coach" }, at: [{ epilogue: "mihon" }], priority: -3,
      repeat: "once", when: { clue: BELL } });
    // Its # when: is not a map condition: no episode or special battle takes it.
    expect(validateContent(sample).catalogOverrides["progression/journey.json"]).toBeUndefined();
  });

  it("stops a moment other than the departure and the epilogue, a missing # priority:, and a head # then:", () => {
    expect(() => validateContent(sampleWith(head("# at: epilogue mihon", "# at: hotel"))))
      .toThrow("時点のクイズは今は depart・epilogue にだけ置けます");
    expect(() => validateContent(sampleWith(head("# at: epilogue mihon", "# at: visit mihon_clock_tower"))))
      .toThrow("時点のクイズは今は depart・epilogue にだけ置けます");
    expect(() => validateContent(sampleWith(head("# priority: -3\n", "")))).toThrow("時点のクイズには # priority: が要ります");
    expect(() => validateContent(sampleWith(head("# priority: -3\n", "# priority: -3\n# then: epilogue\n")))).toThrow("時点のクイズの頭には # then: を書けません");
    // A position its moment lacks stops as for an inserted scene (A2): the epilogue has no after <part>.
    expect(() => validateContent(sampleWith(head("# priority: -3", "# priority: after battle")))).toThrow("has no after battle");
  });

  it("stops a quiz without reasoning (format A) and one the map also opens", () => {
    // The tower's normal battle (format A, an episode's) placed at the epilogue: both stop, in one message.
    const tower = { [TOWER]: (text: string) => text.replace("=== smp_mihon_main_clock_tower ===\n# scene: battle\n",
      "=== smp_mihon_main_clock_tower ===\n# scene: battle\n# at: epilogue mihon\n# priority: -4\n") };
    expect(() => validateContent(sampleWith(tower))).toThrow(/推理のある形式（B・C）だけです[\s\S]*時点のクイズは地図に置けません：smp_mihon_main_clock_tower_battle/u);
    // The coach stop's quiz listed as a special battle of the map.
    const special = { "progression/journey.json": json((value) => {
      const battles = value.storyBattles as Record<string, unknown>[];
      const { completionReward: _reward, ...copy } = battles[0];
      battles.push({ ...copy, battleId: "smp_mihon_special_b_coach" });
    }) };
    expect(() => validateContent(sampleWith(special))).toThrow("時点のクイズは地図に置けません：smp_mihon_special_b_coach");
  });

  it("stops a head # on_done: that spends money or AP, and lets one that gives", () => {
    expect(() => validateContent(sampleWith(head("# priority: -3\n", "# priority: -3\n# on_done: money -5\n"))))
      .toThrow("時点のクイズの頭の # on_done: は、お金・APを減らせません");
    expect(() => validateContent(sampleWith(head("# priority: -3\n", "# priority: -3\n# on_done: ap -1\n"))))
      .toThrow("時点のクイズの頭の # on_done: は、お金・APを減らせません");
    expect(() => validateContent(sampleWith(head("# priority: -3\n", "# priority: -3\n# on_done: money +5\n")))).not.toThrow();
  });

  it("stops an unknown clue in its condition, and walks a cond(\"clue …\") its # when: guarantees as true", () => {
    expect(() => validateContent(sampleWith({ [STOP]: (text) => text.replace(`# when: clue ${BELL}`, "# when: clue smp_no_such_clue") })))
      .toThrow("Unknown clue (tourism/catalog.json) in a condition of the scene smp_mihon_special_b_coach");
    // The else branch calls a helper whose only choice needs the clue: walked, it would stop (no choice can be chosen).
    const cond = `{ cond("clue ${BELL}"):\n    # speaker: heroine\n    鐘の話、覚えてる\n- else:\n    -> smp_mihon_zz_bell ->\n}\n`;
    const helper = `\n=== smp_mihon_zz_bell ===\n* [鐘の話をする # option: tell_bell]\n    # requires: clue ${BELL}\n    # speaker: heroine\n    鐘で出るんだって\n- ->->\n`;
    const withCond = (text: string) => `${text.replace("# speaker: enemy\nまずは、この停留所のことから\n", `${cond}# speaker: enemy\nまずは、この停留所のことから\n`)}${helper}`;
    expect(() => validateContent(sampleWith({ [STOP]: withCond }))).not.toThrow();
    expect(() => validateContent(sampleWith({ [STOP]: (text) => withCond(text).replace(`# when: clue ${BELL}\n`, "") })))
      .toThrow("No choice can be chosen at a choice point");
  });
});

describe("the moment quiz's warnings (4.2)", () => {
  const kinds = (sources: ContentSources, kind: string) => validateContent(sources).warnings.filter((warning) => warning.kind === kind).map((warning) => warning.message);

  it("warns of its landmark's guide or observation, which never run, and not of the sample's (it has neither)", () => {
    expect(kinds(sample, "moment-quiz-landmark")).toEqual([]);
    const observed = { "tourism/catalog.json": json((value) => {
      const stop = (value.landmarks as Record<string, unknown>[]).find((landmark) => landmark.id === "mihon_coach_stop")!;
      delete stop.observation;
    }) };
    expect(kinds(sampleWith(observed), "moment-quiz-landmark")).toEqual([expect.stringContaining("mihon_coach_stop of the moment quiz smp_mihon_special_b_coach")]);
  });

  it("warns of a quiz repeated always whose tags apply once", () => {
    expect(kinds(sample, "moment-quiz-repeat-tags")).toEqual([]);
    const always = sampleWith(head("# priority: -3\n", "# priority: -3\n# repeat: always\n# on_done: money +5\n"));
    expect(kinds(always, "moment-quiz-repeat-tags")).toEqual([expect.stringContaining("head # on_done: (money)")]);
  });

  it("warns of a condition reading a clue no scene gives and no observation finds; a quiz's case evidence is never unfindable", () => {
    expect(kinds(sample, "unfindable-clue")).toEqual([]);
    // Without the bell talk's # clue:, nothing records the clue: the quiz's # when: never holds (a warning, not stopped).
    const notes = kinds(sampleWith({ [TOWER]: (text) => text.replace(`    # clue: ${BELL}\n`, "") }), "unfindable-clue");
    expect(notes).toEqual([expect.stringContaining(`the scene smp_mihon_special_b_coach (when) reads clue ${BELL}`)]);
  });
});

describe("the journey report", () => {
  it("counts the conversation clues, and none of a landmark without an observation as observation-only", () => {
    const line = validateContent(sample).journeyContents.find((item) => item.id === SAMPLE_JOURNEY_ID)!;
    expect(line.counts).toEqual(expect.arrayContaining([["clues", 11], ["observation-only clues", 4], ["conversation clues", 1]]));
  });
});

describe("the tools that do not build the scene table (journey:readiness, content:unused)", () => {
  it("find the moment quiz from its knot's # at:, and only it", () => {
    const source = (storyId: string) => sample.storyFiles.find((story) => story.id === storyId)?.source;
    const input = journeyReadinessInput(sample, SAMPLE_JOURNEY_ID);
    expect(momentQuizBattleIds(input.battles, source)).toEqual(["smp_mihon_special_b_coach"]);
    expect(input.momentQuizIds).toEqual(["smp_mihon_special_b_coach"]);
    // A whole-file address or a file that is not there names no knot: none.
    expect(momentQuizBattleIds([{ id: "x", storyId: "places/smp_mihon_coach_stop" }, { id: "y", storyId: "places/none.k" }], source)).toEqual([]);
  });

  it("journey:readiness checks the moment quiz in its city (no map event reaches it): its landmark's photo", () => {
    const input = journeyReadinessInput(sample, SAMPLE_JOURNEY_ID);
    expect(inspectJourneyReadiness(input).cities.flatMap((city) => city.issues)).toEqual([]);
    const stop = input.tourism.landmarks.find((landmark) => landmark.id === "mihon_coach_stop")!;
    const missing = { ...input, tourism: { ...input.tourism, landmarks: input.tourism.landmarks.map((landmark) =>
      landmark === stop ? { ...landmark, imageAssetId: "smp_no_such_image" } : landmark) } };
    expect(inspectJourneyReadiness(missing).cities.flatMap((city) => city.issues)).toEqual([
      { code: "observation_image_missing", detail: "時点のクイズの観光地の画像が未完成: mihon_coach_stop（smp_mihon_special_b_coach）" }]);
  });
});
