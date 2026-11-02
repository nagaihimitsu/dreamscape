import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Story } from "inkjs";
import { buildContent, compileInk } from "../../scripts/content-pipeline";
import { prepareContentFixture } from "./test-fixtures";
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
import battleData from "../../content/battles/catalog.json";
import tourismData from "../../content/tourism/catalog.json";

let fixture: string;
const source = () => battleCatalogSchema.parse(battleData).battles;
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
  const catalog = battleCatalogSchema.parse(structuredClone(battleData));
  change(catalog.battles.find((battle) => battle.format === format)!);
  await writeFile(
    path.join(fixture, "content/battles/catalog.json"),
    JSON.stringify(catalog),
  );
}

describe("special battle content contract", () => {
  it("preserves the legacy A definition without injecting default fields", () => {
    expect(battleSchema.parse(battleData.battles[0])).toEqual(
      battleData.battles[0],
    );
    expect(battleSchema.parse(battleData.battles[0])).not.toHaveProperty(
      "format",
    );
    expect(battleSchema.parse(battleData.battles[0])).not.toHaveProperty(
      "reasoning",
    );
  });

  it("validates all A/B/C scenes while keeping the normal episode linked only to A", async () => {
    const result = await buildContent(fixture, false);
    expect(
      result.battles.slice(0, 3).map((battle) => battle.format ?? "A"),
    ).toEqual(["A", "B", "C"]);
    // The two published cases remain available for saved games; the main
    // journey now uses two distinct cases at Scala and Brera.
    expect(result.reasoningBattles).toBe(4);
    expect(result.battleScenarios).toBeGreaterThanOrEqual(59);
    const original = result.journey.episodes.find(
      (episode) => episode.id === "milano_last_supper_episode",
    )!;
    expect(original.battleId).toBe(result.battles[0].id);
    expect(result.tourism.landmarks[0].battleId).toBe(result.battles[0].id);
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
    expect(result.journey.storyBattles.map((entry) => entry.battleId)).toEqual([newB.id, newC.id]);
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
      ).toThrow();
      expect(() =>
        battleSchema.parse({
          ...battle,
          reasoning: { ...reasoning, correctClueIds: ["missing"] },
        }),
      ).toThrow();
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
    ).toThrow();
    expect(() =>
      battleSchema.parse({
        ...b,
        reasoning: { ...b.reasoning, pressScene: undefined },
      }),
    ).toThrow();
    const c = special("C");
    expect(() =>
      battleSchema.parse({
        ...c,
        reasoning: { ...c.reasoning, pressScene: "press" },
      }),
    ).toThrow();
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
    ["Only English.\n-> END", "Battle dialogue must be Japanese"],
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
      expect(() =>
        validateBattleStory(compiled, battle, {
          effectIds: ["forbidden"],
          backgroundIds: [],
          emotionIds: [],
        }),
      ).toThrow(message);
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
