import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Story } from "inkjs";
import { buildContent } from "../../scripts/content-pipeline";
import { compileInk } from "../../scripts/ink-validation";
import { changeCatalogEntry, prepareContentFixture } from "./test-fixtures";
import { validateEpilogue } from "../../scripts/epilogue-validation";
import { validateJourney } from "../../scripts/journey-validation";
import { battleCatalogSchema, battleSchema, quizSchema } from "./schemas";
import { journeySchema } from "./journey-schemas";
import { tourismCatalogSchema } from "./tourism-schemas";
import { balance, battleQuizzes, getCities } from ".";
// Read-only data comes from the generated mirror; fixture edits use changeCatalogEntry.
import journeyData from "./generated/content/progression/journey.json";
import battleData from "./generated/content/battles/catalog.json";
import cityData from "./generated/content/cities/milano.json";
import tourismData from "./generated/content/tourism/catalog.json";

function milanJourney() {
  const journey = journeySchema.parse(journeyData);
  journey.episodes = journey.episodes.filter((episode) => episode.cityId === cityData.id);
  const episodeIds = new Set(journey.episodes.map((episode) => episode.id));
  const landmarkIds = new Set(cityData.landmarkIdsPlanned);
  journey.storyBattles = journey.storyBattles.filter((entry) => {
    const battle = battleData.battles.find((battle) => battle.id === entry.battleId);
    return !!battle?.landmarkId && landmarkIds.has(battle.landmarkId);
  });
  const battleIds = new Set(journey.storyBattles.map((entry) => entry.battleId));
  journey.rewards = journey.rewards.filter((rule) => rule.episodeId !== undefined
    ? episodeIds.has(rule.episodeId) : battleIds.has(rule.battleId!));
  return journey;
}

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
      result.tourism.landmarks.filter((landmark) => landmark.cityId === cityData.id).map((landmark) => landmark.id).sort(),
    ).toEqual([...cityData.landmarkIdsPlanned].sort());
    const stops = result.journey.episodes.filter(
      (episode) => episode.cityId === cityData.id && episode.kind !== "city_finale",
    );
    expect(stops).toHaveLength(4);
    expect(stops.map((episode) => episode.landmarkId)).toEqual([
      "duomo_milano", "galleria_vittorio_emanuele_ii", "last_supper", "castello_sforzesco",
    ]);
    // Milan's special battles only: other journeys (e.g. one made by journey:new --with-optional) have their own.
    const specialStops = result.journey.storyBattles.flatMap((entry) => {
      const battle = result.battles.find((item) => item.id === entry.battleId)!;
      if (result.tourism.landmarks.find((landmark) => landmark.id === battle.landmarkId)?.cityId !== cityData.id) return [];
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
      // The rewritten quiz set chooses difficulty per question instead of
      // requiring the previous easy/medium/hard sequence for every stop.
      expect(new Set(questions.map((question) => question.id)).size).toBe(3);
      return questions;
    });
    expect(normalQuestions).toHaveLength(12);
    const finale = result.battles.find(
      (battle) => battle.cityId === cityData.id && battle.scope === "city_finale",
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
      (battle) => battle.cityId === cityData.id && battle.scope === "city_finale",
    )!;
    const quiz = result.quizzes[boss.quizId];
    expect(() => quizSchema.parse({ ...quiz, scope: undefined })).toThrow("A normal quiz needs three questions; a city finale needs five");
    expect(() =>
      quizSchema.parse({ ...quiz, questions: quiz.questions.slice(0, 3) }),
    ).toThrow("A normal quiz needs three questions; a city finale needs five");
    expect(() =>
      battleSchema.parse({ ...boss, landmarkId: "last_supper" }),
    ).toThrow("Only a city finale has no landmark and four intermediate scenes");
    expect(() =>
      battleSchema.parse({
        ...boss,
        scenes: {
          ...boss.scenes,
          afterRounds: boss.scenes.afterRounds.slice(0, 2),
        },
      }),
    ).toThrow("Only a city finale has no landmark and four intermediate scenes");
    const ordinary = result.battles[0];
    expect(() =>
      battleSchema.parse({
        ...ordinary,
        scenes: { ...ordinary.scenes, afterRounds: boss.scenes.afterRounds },
      }),
    ).toThrow("Only a city finale has no landmark and four intermediate scenes");
  });

  it("rejects a finale quiz from another city", async () => {
    await changeCatalogEntry(fixture, "battles/catalog.json", "battles", "milano_city_boss_01", (finale: { scope?: string; cityId?: string }) => {
      expect(finale.scope).toBe("city_finale");
      finale.cityId = "unknown_city";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "City finale quiz mismatch",
    );
  });

  it("allows the sightseeing stops in any order while requiring all four for the finale", () => {
    const check = (journey: ReturnType<typeof journeySchema.parse>) => validateJourney(
      journey,
      cityData,
      balance.apCap,
      tourismCatalogSchema.parse(tourismData).landmarks,
      battleCatalogSchema.parse(battleData).battles,
      battleQuizzes,
    );
    const journey = milanJourney();
    const stops = journey.episodes.filter((episode) => episode.kind !== "city_finale");
    expect(stops).toHaveLength(4);
    expect(stops.every((episode) => episode.requiredEpisodeIds.length === 0)).toBe(true);
    expect(() => check(journey)).not.toThrow();
    const valid = milanJourney();
    valid.episodes.at(-1)!.requiredEpisodeIds = [valid.episodes.at(-2)!.id];
    expect(() => check(valid)).toThrow(
      "require every sightseeing episode",
    );
  });

  it("rejects a circular route and a city reward attached to a sightseeing stop", async () => {
    await changeCatalogEntry(fixture, "progression/journey.json", "episodes", "milano_galleria_episode", (episode: { requiredEpisodeIds: string[] }) => {
      episode.requiredEpisodeIds = ["milano_last_supper_episode"];
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "unordered episode prerequisite",
    );
    await changeCatalogEntry(fixture, "progression/journey.json", "rewards", "city_milano_first_clear", (rule: { trigger: string; episodeId?: string }) => {
      expect(rule.trigger).toBe("city_clear");
      rule.episodeId = "milano_duomo_episode";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "does not fit the episode",
    );
  });

  it("validates different relationship-aware epilogues without making anyone a couple", async () => {
    const result = await buildContent(fixture, false);
    const finale = result.journey.episodes.find(
      (episode) => episode.cityId === cityData.id && episode.kind === "city_finale",
    )!;
    const cityConversations = result.journey.episodes.filter((episode) => episode.epilogueStoryId).length +
      getCities().filter((city) => city.arrivalStoryId).length;
    expect(result.epilogueScenarios).toBe(8 * cityConversations);
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
    expect(date.when).toEqual({ all: [{ episodesCompleted: { city: "milano", atLeast: 1 } }, { cityCompleted: "milano" }] });
    expect(date.choiceCount).toBe(2);
    const normalDates = result.dates.filter((item) => item.kind === "normal");
    expect(normalDates.length).toBeGreaterThan(1);
    expect(normalDates.every((item) => item.allowAfterEnding)).toBe(true);
    // Unlocking ordinary destinations does not require this city-specific date.
    expect(normalDates.every((item) => !JSON.stringify(item.when ?? {}).includes(`"datePlayed":"${date.id}"`))).toBe(true);
  });
});
