import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Story } from "inkjs";
import { buildContent, compileInk } from "../../scripts/content-pipeline";
import { prepareContentFixture } from "./test-fixtures";
import { validateEpilogue } from "../../scripts/epilogue-validation";
import { validateJourney } from "../../scripts/journey-validation";
import { battleCatalogSchema, battleSchema, quizSchema, trialProgressionSchema } from "./schemas";
import { journeySchema } from "./journey-schemas";
import { tourismCatalogSchema } from "./tourism-schemas";
import { balance, battleQuizzes } from ".";
import journeyData from "../../content/progression/journey.json";
import battleData from "../../content/battles/catalog.json";
import cityData from "../../content/cities/milano.json";
import tourismData from "../../content/tourism/catalog.json";
import trialData from "../../content/romance/trial_progression.json";

let fixture: string;
beforeEach(async () => {
  fixture = await mkdtemp(path.join(tmpdir(), "dreamscape-city-content-"));
  await prepareContentFixture(fixture);
});
afterEach(async () => {
  await rm(fixture, { recursive: true, force: true });
});

describe("Milan city content", () => {
  it("keeps four regular stops, separate special locations, and the five-question finale", async () => {
    const result = await buildContent(fixture, false);
    expect(
      result.tourism.landmarks.map((landmark) => landmark.id).sort(),
    ).toEqual([...cityData.landmarkIdsPlanned].sort());
    const stops = result.journey.episodes.filter(
      (episode) => episode.kind !== "city_finale",
    );
    expect(stops).toHaveLength(4);
    expect(stops.map((episode) => episode.landmarkId)).toEqual([
      "duomo_milano", "galleria_vittorio_emanuele_ii", "last_supper", "castello_sforzesco",
    ]);
    const specialStops = result.journey.storyBattles.map((entry) => {
      const battle = result.battles.find((item) => item.id === entry.battleId)!;
      expect(battle.reasoning).toBeDefined();
      expect(result.quizzes[battle.quizId].questions).toHaveLength(3);
      return battle.landmarkId;
    });
    expect(specialStops).toEqual(["la_scala_case", "brera_case"]);
    expect(new Set([...stops.map((episode) => episode.landmarkId), ...specialStops]).size).toBe(6);
    const normalQuestions = stops.flatMap((episode) => {
      const battle = result.battles.find(
        (item) => item.id === episode.battleId,
      )!;
      expect(battle.reasoning).toBeUndefined();
      expect(battle.scenes.afterRounds).toHaveLength(2);
      const questions = result.quizzes[battle.quizId].questions;
      expect(questions).toHaveLength(3);
      expect(questions.map((question) => question.difficulty)).toEqual([
        "easy",
        "medium",
        "hard",
      ]);
      return questions;
    });
    expect(normalQuestions).toHaveLength(12);
    const finale = result.battles.find(
      (battle) => battle.scope === "city_finale",
    )!;
    expect(finale.landmarkId).toBeNull();
    expect(finale.cityId).toBe("milano");
    expect(result.quizzes[finale.quizId].questions).toHaveLength(5);
    expect(finale.scenes.afterRounds).toHaveLength(4);
    expect(
      result.tourism.landmarks.some(
        (landmark) => landmark.battleId === finale.id,
      ),
    ).toBe(false);
    expect(result.battleScenarios).toBeGreaterThan(129);
  });

  it("allows five questions and four intermediate scenes only for a city finale", async () => {
    const result = await buildContent(fixture, false);
    const boss = result.battles.find(
      (battle) => battle.scope === "city_finale",
    )!;
    const quiz = result.quizzes[boss.quizId];
    expect(() => quizSchema.parse({ ...quiz, scope: undefined })).toThrow();
    expect(() =>
      quizSchema.parse({ ...quiz, questions: quiz.questions.slice(0, 3) }),
    ).toThrow();
    expect(() =>
      battleSchema.parse({ ...boss, landmarkId: "last_supper" }),
    ).toThrow();
    expect(() =>
      battleSchema.parse({
        ...boss,
        scenes: {
          ...boss.scenes,
          afterRounds: boss.scenes.afterRounds.slice(0, 2),
        },
      }),
    ).toThrow();
    const ordinary = result.battles[0];
    expect(() =>
      battleSchema.parse({
        ...ordinary,
        scenes: { ...ordinary.scenes, afterRounds: boss.scenes.afterRounds },
      }),
    ).toThrow();
  });

  it("rejects a finale quiz from another city", async () => {
    const catalog = battleCatalogSchema.parse(battleData);
    catalog.battles.find((battle) => battle.scope === "city_finale")!.cityId =
      "unknown_city";
    await writeFile(
      path.join(fixture, "content/battles/catalog.json"),
      JSON.stringify(catalog),
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "City finale quiz mismatch",
    );
  });

  it("rejects skipped route prerequisites and a boss that does not require all four stops", () => {
    const check = (journey: ReturnType<typeof journeySchema.parse>) => validateJourney(
      journey,
      cityData,
      balance.apCap,
      tourismCatalogSchema.parse(tourismData).landmarks,
      battleCatalogSchema.parse(battleData).battles,
      battleQuizzes,
      trialProgressionSchema.parse(trialData).milestones,
    );
    const journey = journeySchema.parse(journeyData);
    journey.episodes[1].requiredEpisodeIds = [];
    expect(() => check(journey)).toThrow(
      "preceding stop",
    );
    const valid = journeySchema.parse(journeyData);
    valid.episodes.at(-1)!.requiredEpisodeIds = [valid.episodes.at(-2)!.id];
    expect(() => check(valid)).toThrow(
      "require every sightseeing episode",
    );
  });

  it("rejects a circular route and a city reward attached to a sightseeing stop", async () => {
    const journey = journeySchema.parse(journeyData);
    journey.episodes[1].requiredEpisodeIds = [journey.episodes[2].id];
    await writeFile(
      path.join(fixture, "content/progression/journey.json"),
      JSON.stringify(journey),
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "unordered episode prerequisite",
    );
    const valid = journeySchema.parse(journeyData);
    valid.rewards.find((rule) => rule.trigger === "city_clear")!.episodeId =
      valid.episodes[0].id;
    await writeFile(
      path.join(fixture, "content/progression/journey.json"),
      JSON.stringify(valid),
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "does not fit the episode",
    );
  });

  it("validates different relationship-aware epilogues without making anyone a couple", async () => {
    const result = await buildContent(fixture, false);
    const finale = result.journey.episodes.find(
      (episode) => episode.kind === "city_finale",
    )!;
    expect(result.epilogueScenarios).toBe(8);
    const versions: string[] = [];
    for (const [stage, dating] of [
      [1, false],
      [3, false],
      [4, true],
    ] as const) {
      const story = new Story(result.stories[finale.epilogueStoryId!]);
      story.variablesState.$("romance_stage", stage);
      story.variablesState.$("ending_reached", dating);
      const lines: string[] = [];
      while (story.canContinue) lines.push(story.Continue() ?? "");
      expect(story.currentChoices).toHaveLength(0);
      versions.push(lines.join("\n"));
    }
    expect(new Set(versions).size).toBe(3);
  });

  it.each([
    ["# effect: forbidden\n不正な効果。\n-> END", "cannot grant"],
    ["* [交際する]\n    自動的に進める。\n    -> END", "linear conversation"],
    ["Only English.\n-> END", "must be Japanese"],
  ])(
    "forbids epilogue effects, choices and untranslated prose: %s",
    (body, message) => {
      const compiled = compileInk(
        [
          'VAR player_name = "名前"',
          'VAR heroine_name = "名前"',
          'VAR player_address = "名前さん"',
          "VAR romance_stage = 1",
          "VAR ending_reached = false",
          body,
        ].join("\n"),
      );
      expect(() =>
        validateEpilogue(compiled, {
          effectIds: ["forbidden"],
          backgroundIds: [],
          emotionIds: [],
        }),
      ).toThrow(message);
    },
  );

  it("keeps the city date gated while allowing every unplayed normal date after the relationship ending", async () => {
    const result = await buildContent(fixture, false);
    const date = result.dates.find((item) => item.id === "milano_city_date_01")!;
    expect(date.requiredCompletedCityIds).toEqual(["milano"]);
    expect(date.choiceCount).toBe(2);
    const normalDates = result.dates.filter((item) => item.kind === "normal");
    expect(normalDates.length).toBeGreaterThan(1);
    expect(normalDates.every((item) => item.allowAfterEnding)).toBe(true);
    // Unlocking ordinary destinations does not require this city-specific date.
    expect(normalDates.every((item) => !item.requiredPlayedDateIds.includes(date.id))).toBe(true);
  });
});
