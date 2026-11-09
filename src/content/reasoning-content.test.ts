import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Story } from "inkjs";
import { buildContent } from "../../scripts/content-pipeline";
import { compileInk } from "../../scripts/ink-validation";
import { changeCatalogEntry, prepareContentFixture } from "./test-fixtures";
import {
  validateBattleEvidence,
  validateBattleStory,
} from "../../scripts/battle-validation";
import { tourismCatalogSchema } from "./tourism-schemas";
import {
  battleCatalogSchema,
  battleSchema,
  type BattleDefinition,
} from "./schemas";
// Source catalogs that the tests rewrite in their fixture; read-only runtime data comes from the generated mirror.
import battleData from "./generated/content/battles/catalog.json";
import tourismData from "./generated/content/tourism/catalog.json";

let fixture: string;
// This file checks Milan's special battles; other journeys' battles may come before or after them.
const landmarkCity = new Map(tourismCatalogSchema.parse(tourismData).landmarks.map((landmark) => [landmark.id, landmark.cityId]));
const inMilan = (battle: { landmarkId?: string | null; cityId?: string }) =>
  (battle.landmarkId ? landmarkCity.get(battle.landmarkId) : battle.cityId) === "milano";
const source = () => battleCatalogSchema.parse(battleData).battles.filter(inMilan);
const plainA = battleData.battles.find((battle) => battle.id === "milano_last_supper_01")!;
const special = (format: "B" | "C") =>
  source().find((battle) => battle.format === format)!;

beforeEach(async () => {
  fixture = await mkdtemp(path.join(tmpdir(), "dreamscape-reasoning-content-"));
  await prepareContentFixture(fixture);
});
afterEach(async () => {
  await rm(fixture, { recursive: true, force: true });
});

async function changeBattle(
  format: "B" | "C",
  change: (battle: BattleDefinition) => void,
) {
  await changeCatalogEntry(fixture, "battles/catalog.json", "battles", special(format).id, change);
}

describe("special battle content contract", () => {
  it("keeps an A battle without format or reasoning as written, injecting no defaults", () => {
    expect(battleSchema.parse(plainA)).toEqual(plainA);
    expect(battleSchema.parse(plainA)).not.toHaveProperty(
      "format",
    );
    expect(battleSchema.parse(plainA)).not.toHaveProperty(
      "reasoning",
    );
  });

  it("validates all A/B/C scenes while keeping the normal episode linked only to A", async () => {
    const result = await buildContent(fixture, false);
    const milan = result.battles.filter(inMilan);
    expect(milan[0].id).toBe(plainA.id);
    expect(
      milan.slice(0, 3).map((battle) => battle.format ?? "A"),
    ).toEqual(["A", "B", "C"]);
    // The two published cases remain available for saved games; the main
    // journey now uses two distinct cases at Scala and Brera.
    expect(milan.filter((battle) => battle.reasoning)).toHaveLength(4);
    expect(result.reasoningBattles).toBe(result.battles.filter((battle) => battle.reasoning).length);
    expect(result.battleScenarios).toBeGreaterThanOrEqual(59);
    const original = result.journey.episodes.find(
      (episode) => episode.id === "milano_last_supper_episode",
    )!;
    expect(original.battleId).toBe(plainA.id);
    expect(result.tourism.landmarks.find((landmark) => landmark.id === "last_supper")!.battleId).toBe(plainA.id);
    expect(
      result.journey.episodes.every(
        (episode) =>
          !result.battles.find((battle) => battle.id === episode.battleId)
            ?.reasoning,
      ),
    ).toBe(true);
    for (const battle of result.battles.filter((item) => item.reasoning)) {
      const reasoning = battle.reasoning!;
      const quiz = result.quizzes[battle.quizId];
      expect(quiz.questions).toHaveLength(3);
      for (const question of quiz.questions) {
        expect(new Set(question.options.map((option) => option.id)).size).toBe(3);
        expect(question.options.filter((option) => option.id === question.correctOptionId)).toHaveLength(1);
      }
      expect(
        reasoning.correctClueIds.every((id) =>
          reasoning.caseClueIds.includes(id),
        ),
      ).toBe(true);
      const conclusion = quiz.questions[reasoning.roundIndex];
      expect(
        conclusion.options.filter(
          (option) => option.id === conclusion.correctOptionId,
        ),
      ).toHaveLength(1);
    }
    expect(special("B").reasoning!.correctClueIds).toEqual([
      "last_supper_doorway",
    ]);
    expect(new Set(special("C").reasoning!.correctClueIds)).toEqual(
      new Set(["last_supper_apostle_groups", "last_supper_perspective"]),
    );
    const newB = result.battles.find((battle) => battle.id === "milano_la_scala_b01")!;
    const newC = result.battles.find((battle) => battle.id === "milano_brera_c01")!;
    expect(newB.landmarkId).toBe("la_scala_case");
    expect(newB.reasoning!.correctClueIds).toEqual(["scala_mobile"]);
    expect(newC.landmarkId).toBe("brera_case");
    expect(new Set(newC.reasoning!.correctClueIds)).toEqual(
      new Set(["brera_colours", "brera_show"]),
    );
    expect(result.journey.storyBattles.map((entry) => entry.battleId).filter((id) => milan.some((battle) => battle.id === id)))
      .toEqual([newB.id, newC.id]);
  });

  it.each(["B", "C"] as const)(
    "requires %s format and reasoning kind to match",
    (format) => {
      const battle = special(format);
      expect(() =>
        battleSchema.parse({ ...battle, reasoning: undefined }),
      ).toThrow("must agree");
      expect(() => battleSchema.parse({ ...battle, format: "A" })).toThrow(
        "must agree",
      );
      expect(() =>
        battleSchema.parse({ ...battle, format: format === "B" ? "C" : "B" }),
      ).toThrow("must agree");
    },
  );

  it("requires one B proof or exactly two distinct C proofs, all available in the case", () => {
    for (const format of ["B", "C"] as const) {
      const battle = special(format);
      const reasoning = battle.reasoning!;
      expect(() =>
        battleSchema.parse({
          ...battle,
          reasoning: { ...reasoning, correctClueIds: [] },
        }),
      ).toThrow(/"correctClueIds"[\s\S]*Too small: expected array to have exactly/);
      expect(() =>
        battleSchema.parse({
          ...battle,
          reasoning: { ...reasoning, correctClueIds: ["missing"] },
        }),
      ).toThrow("Correct evidence must be available in the case materials");
      expect(() =>
        battleSchema.parse({
          ...battle,
          reasoning: {
            ...reasoning,
            caseClueIds: [...reasoning.caseClueIds, reasoning.caseClueIds[0]],
          },
        }),
      ).toThrow("must be unique");
    }
    const battle = special("C");
    expect(() =>
      battleSchema.parse({
        ...battle,
        reasoning: {
          ...battle.reasoning,
          correctClueIds: [
            "last_supper_perspective",
            "last_supper_perspective",
          ],
        },
      }),
    ).toThrow("must be unique");
  });

  it("limits the gimmick to an existing quiz round and keeps pursuit specific to B", () => {
    const b = special("B");
    expect(() =>
      battleSchema.parse({
        ...b,
        reasoning: { ...b.reasoning, roundIndex: 3 },
      }),
    ).toThrow(/"roundIndex"[\s\S]*Too big: expected number to be <=2/);
    expect(() =>
      battleSchema.parse({
        ...b,
        reasoning: { ...b.reasoning, pressScene: undefined },
      }),
    ).toThrow(/"pressScene"[\s\S]*Invalid input: expected string, received undefined/);
    const c = special("C");
    expect(() =>
      battleSchema.parse({
        ...c,
        reasoning: { ...c.reasoning, pressScene: "press" },
      }),
    ).toThrow(/Unrecognized key: .*pressScene/);
  });

  it("rejects missing case evidence and evidence from a different landmark", async () => {
    await changeBattle("B", (battle) => {
      battle.reasoning!.caseClueIds[0] = "missing_clue";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Unknown or mismatched battle evidence",
    );
    await changeBattle("B", () => {});
    const tourism = tourismCatalogSchema.parse(structuredClone(tourismData));
    tourism.clues.find(
      (clue) => clue.id === "last_supper_doorway",
    )!.landmarkId = "duomo_milano";
    expect(() => validateBattleEvidence(special("B"), tourism.clues)).toThrow(
      "Unknown or mismatched battle evidence",
    );
  });

  it("rejects colliding special scenes and nonexistent special Ink routes", async () => {
    await changeBattle("B", (battle) => {
      battle.reasoning!.failureScene = battle.scenes.outro;
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Duplicate battle scene",
    );
    await changeBattle("B", (battle) => {
      battle.reasoning!.failureScene = "missing_scene";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Empty battle scene",
    );
  });

  it.each([
    // English lines are accepted (decision 28); an endless loop is not (decision 38).
    ["Only English.\n-> END", null],
    ["- (again)\n輪の中の一行。\n-> again", "Story reads more than 1000 lines without a choice or an end"],
    [
      "# effect: forbidden\n不正な報酬。\n-> END",
      "Battle story cannot apply effects",
    ],
    [
      "* [余分な選択]\n    進む。\n    -> END",
      "Battle story cannot contain choices",
    ],
  ])(
    "validates failure branches as rigorously as the main battle: %s",
    (invalid, message) => {
      const battle = special("B");
      const compiled = compileInk(
        [
          'VAR player_name = "名前"',
          'VAR heroine_name = "名前"',
          'VAR battle_scene = "intro"',
          "VAR answer_correct = false",
          "VAR battle_score = 0",
          `{ battle_scene == "${battle.reasoning!.failureScene}" && answer_correct:`,
          "-> invalid_branch",
          "}",
          "検証用の日本語。",
          "-> END",
          "=== invalid_branch ===",
          invalid,
        ].join("\n"),
      );
      const validate = () =>
        validateBattleStory(compiled, battle, {
          effectIds: ["forbidden"],
          backgroundIds: [],
          emotionIds: [],
        });
      if (message === null) expect(validate()).toBeGreaterThan(0);
      else expect(validate).toThrow(message);
    },
  );

  it("keeps C's combined conclusion an interpretation, with a separately scored English choice", async () => {
    const result = await buildContent(fixture, false);
    const battle = result.battles.find((item) => item.format === "C")!;
    const conclusion =
      result.quizzes[battle.quizId].questions[battle.reasoning!.roundIndex];
    expect(
      conclusion.sources.some(
        (source) => source.claimType === "interpretation",
      ),
    ).toBe(true);
    const story = new Story(result.stories[battle.storyId]);
    story.variablesState.$("battle_scene", battle.reasoning!.successScene);
    const lines: string[] = [];
    while (story.canContinue) lines.push(story.Continue() ?? "");
    expect(story.currentChoices).toHaveLength(0);
    expect(lines.join("\n")).not.toMatch(/[A-C]が正解|正解は[A-C]/);
  });
});
