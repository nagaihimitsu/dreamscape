import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildContent } from "../../scripts/content-pipeline";
import { changeCatalogEntry, prepareContentFixture } from "./test-fixtures";
import { validateBattleEvidence } from "../../scripts/battle-validation";
import { tourismCatalogSchema } from "./tourism-schemas";
import { storyFileOf } from "./story-address";
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

  it("limits the gimmick to an existing quiz round", () => {
    const b = special("B");
    expect(() =>
      battleSchema.parse({
        ...b,
        reasoning: { ...b.reasoning, roundIndex: 3 },
      }),
    ).toThrow(/"roundIndex"[\s\S]*Too big: expected number to be <=2/);
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
    // No line of the battle's flow gives the English choice away.
    expect(result.stories[storyFileOf(battle.storyId)]).not.toMatch(/[A-C]が正解|正解は[A-C]/);
  });
});
