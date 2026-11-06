import { describe, expect, it } from "vitest";
import {
  allRewardRules, battleQuizzes, battles, cityContents, dateDestinations, dates, episodes, journeyConfig, landmarks,
  rewardRules, stories, tourismClues,
} from "../content";
import { encounters } from "../content/encounters";
import { getJourney, journeys } from "../content/journeys";
import { storyBattlesForCity } from "../domain/chapter";
import { validateGameState } from "../domain/game";
import { createDebugState, debugTargets, type DebugSettings } from "./debug-state";
import { sampleJourneyId } from "./fixture-template";
import { clearCity, cityStart } from "./scenario-builders";
import { debugTemplate, installTestCity } from "./test-cities";

const settings = (scene: DebugSettings["scene"], id: string): DebugSettings =>
  ({ cityId: "test_city", scene, id, progress: "completed", ap: 12, affection: 0, trust: 0, spark: 0, roll: "positive" });
/** Everything installTestCity may change, as values (and the catalogs' array identities). */
const snapshot = () => ({
  arrays: [episodes, battles, landmarks, tourismClues, dates, dateDestinations, journeyConfig.storyBattles, rewardRules,
    allRewardRules, encounters.items, encounters.encounters],
  values: structuredClone({ episodes, battles, landmarks, tourismClues, dates, dateDestinations, storyBattles: journeyConfig.storyBattles,
    rewardRules, allRewardRules, items: encounters.items, encounters: encounters.encounters, journeys,
    stories: Object.keys(stories), quizzes: Object.keys(battleQuizzes), cities: Object.keys(cityContents) }),
  cities: { ...cityContents },
});

describe("the fictional test cities", () => {
  it("copy the sample journey when it is loaded, else Milan", () => {
    expect(debugTemplate().city.city.id).toBe(getJourney(sampleJourneyId) ? "mihon" : "milano");
  });

  it.each(["milano", "mihon"])("copy every role of %s under the test city's own IDs and restore everything", (templateCityId) => {
    if (templateCityId === "mihon" && !getJourney(sampleJourneyId))
      throw new Error("見本の旅（sample_trip）が生成物にありません。npm run content:build -- --with-sample を実行してから、もう一度テストしてください。");
    const before = snapshot();
    const template = debugTemplate(templateCityId);
    const cleanup = installTestCity({ templateCityId });
    try {
      expect(cityContents[templateCityId].city.nextCityId).toBe("test_city");
      expect(journeys.find((journey) => journey.id === template.journey.id)!.cities.at(-1)).toEqual({ id: "test_city", nameJa: "試験都市" });
      expect(debugTargets("test_city")).toEqual({
        tourism: [["test_landmark", template.normal.landmark], ["test_special_b_landmark", template.special_b!.landmark],
          ["test_special_c_landmark", template.special_c!.landmark]].map(([id, source]) => ({ id, name: (source as typeof template.normal.landmark).nameJa })),
        battle: [["test_battle", template.normal.battle], ["test_special_b", template.special_b!.battle], ["test_special_c", template.special_c!.battle],
          ["test_final_battle", template.finale.battle]].map(([id, source]) => ({ id, name: (source as typeof template.normal.battle).titleJa })),
        encounter: [{ id: "test_encounter", name: template.encounter!.encounter.titleJa }],
        date: [{ id: "test_date", name: template.date!.date.titleJa }],
        epilogue: [{ id: "test_finale", name: "試験都市のエピローグ" }],
      });
      expect(storyBattlesForCity("test_city").map((item) => item.battleId)).toEqual(["test_special_b", "test_special_c"]);
      // Each special battle's evidence points at the copies of its own landmark's clues.
      for (const kind of ["b", "c"] as const) {
        const battle = battles.find((item) => item.id === `test_special_${kind}`)!;
        const source = template[`special_${kind}`]!.battle.reasoning!;
        expect(battle.reasoning!.caseClueIds).toEqual(source.caseClueIds.map((id) => `test_${id}`));
        expect(battle.reasoning!.correctClueIds).toEqual(source.correctClueIds.map((id) => `test_${id}`));
        for (const id of battle.reasoning!.caseClueIds)
          expect(tourismClues.find((clue) => clue.id === id)?.landmarkId).toBe(`test_special_${kind}_landmark`);
        expect(rewardRules.filter((rule) => rule.battleId === battle.id).map((rule) => rule.id))
          .toEqual(rewardRules.filter((rule) => rule.battleId === template[`special_${kind}`]!.battle.id).map((rule) => `test_${rule.id}`));
      }
      expect(encounters.encounters.find((item) => item.id === "test_encounter")).toMatchObject({ cityId: "test_city",
        landmarkId: "test_landmark", completionItemId: "test_item", storyId: "test_city/encounter" });
      expect(encounters.items.find((item) => item.id === "test_item")?.cityId).toBe("test_city");
      expect(cityContents.test_city.travel.events.map((event) => event.id))
        .toEqual(["test_episode", "test_special_b", "test_special_c", "test_finale", "test_date"]);
      // Every scene of the test city opens, after the template city was cleared and left.
      for (const [scene, targets] of Object.entries(debugTargets("test_city")) as Array<[DebugSettings["scene"], { id: string }[]]>)
        for (const { id } of targets) {
          const game = createDebugState(settings(scene, id));
          expect(game.currentCityId, `${scene} ${id}`).toBe("test_city");
          expect(validateGameState(game)).toEqual(game);
        }
    } finally { cleanup(); }
    const after = snapshot();
    after.arrays.forEach((array, index) => expect(array).toBe(before.arrays[index]));
    expect(after.values).toEqual(before.values);
    for (const [id, city] of Object.entries(before.cities)) expect(cityContents[id]).toBe(city);
  }, 120_000);

  it("leave out the special battles and the encounter when the template city has none (Delhi)", () => {
    const cleanup = installTestCity({ templateCityId: "delhi", previousCityId: null });
    try {
      const targets = debugTargets("test_city");
      expect(targets.tourism.map((item) => item.id)).toEqual(["test_landmark"]);
      expect(targets.battle.map((item) => item.id)).toEqual(["test_battle", "test_final_battle"]);
      expect(targets.encounter).toEqual([]);
      expect(targets.date.map((item) => item.id)).toEqual(["test_date"]);
      expect(storyBattlesForCity("test_city")).toEqual([]);
      expect(cityContents.test_city.travel.places.find((place) => place.id === "test_place")?.landmarkIds).toEqual(["test_landmark"]);
      // The finale opens without special battles; the city can be cleared and its scenes opened.
      const cleared = clearCity(cityStart("test_city"));
      expect(cleared.completedCityIds).toContain("test_city");
      for (const [scene, id] of [["tourism", "test_landmark"], ["battle", "test_final_battle"], ["date", "test_date"], ["epilogue", "test_finale"]] as const)
        expect(validateGameState(createDebugState(settings(scene, id))).currentCityId).toBe("test_city");
    } finally { cleanup(); }
    expect(cityContents.test_city).toBeUndefined();
  }, 120_000);

  it("are opened by Debug from their current copy after being installed again from another city", () => {
    const opened = (templateCityId: string) => {
      const cleanup = installTestCity({ templateCityId, previousCityId: null });
      try {
        return createDebugState(settings("tourism", "test_landmark"));
      } finally { cleanup(); }
    };
    expect(opened("milano").battleRecords.map((record) => record.battleId)).toContain("test_special_b");
    // Debug keeps cleared states while it is open; a new copy must not reuse the old one.
    const delhi = opened("delhi");
    expect(delhi.battleRecords.map((record) => record.battleId)).toEqual(["test_battle", "test_final_battle"]);
  }, 120_000);

  it("refuse a template city without the required roles", () => {
    const before = snapshot();
    expect(() => installTestCity({ templateCityId: "tashkent" })).toThrow("都市「tashkent」は仮の場面の元にできません。");
    expect(snapshot().values).toEqual(before.values);
  });
});
