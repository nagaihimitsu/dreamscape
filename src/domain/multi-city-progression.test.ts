import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Compiler } from "inkjs/compiler/Compiler";
import { cityContents, episodes, presentation, stories, tagContext } from "../content";
import { encounters } from "../content/encounters";
import { getBattleAvailability, startBattle } from "./battle";
import { getAvailableStoryBattles, getEpisodeAvailability, isEpisodeUnlocked } from "./chapter";
import { getEncounterAvailability, getTourismEncounterAvailability, hasPendingPlaceEncounter, proceedFromTourism, startEncounter } from "./encounter";
import { startCityEpilogue } from "./epilogue";
import { createGame } from "./game";
import { installTestCity } from "../dev/test-cities";
import { getTourismAvailability, openTourism } from "./tourism";

const record = (battleId: string) => ({ battleId, attempts: 1, firstScore: 0, bestScore: 0, lastScore: 0 });

describe("city-specific progression", () => {
  let cleanup: () => void;
  // Milan's IDs below (battles, landmarks, an encounter to copy) are part of the test.
  beforeEach(() => { cleanup = installTestCity({ templateCityId: "milano" }); });
  afterEach(() => cleanup());

  it("unlocks each city's finale using only its own special battles", () => {
    const finale = episodes.find((item) => item.id === "test_finale")!;
    const initial = { ...createGame(), currentCityId: "test_city", completedEpisodeIds: ["test_episode"] };
    const otherCityDone = { ...initial, battleRecords: [record("milano_la_scala_b01"), record("milano_brera_c01")] };
    expect(isEpisodeUnlocked(otherCityDone, finale)).toBe(false);
    const oneDone = { ...initial, battleRecords: [record("test_special_b")] };
    expect(isEpisodeUnlocked(oneDone, finale)).toBe(false);
    const thisCityDone = { ...initial, battleRecords: [record("test_special_b"), record("test_special_c")] };
    expect(isEpisodeUnlocked(thisCityDone, finale)).toBe(true);
    expect(getAvailableStoryBattles(initial).map((item) => item.battleId)).toEqual(["test_special_b", "test_special_c"]);
    expect(getAvailableStoryBattles(oneDone).map((item) => item.battleId)).toEqual(["test_special_c"]);
    expect(getAvailableStoryBattles(thisCityDone)).toEqual([]);
  });

  it("rejects direct access to sightseeing and battles from another city", () => {
    const milan = createGame();
    expect(getEpisodeAvailability(milan, "test_episode").available).toBe(false);
    expect(getBattleAvailability(milan, "test_special_b").available).toBe(false);
    expect(getTourismAvailability(milan, "test_landmark").available).toBe(false);
    const second = { ...milan, currentCityId: "test_city" };
    expect(getEpisodeAvailability(second, "test_episode").available).toBe(true);
    expect(getBattleAvailability(second, "test_special_b").available).toBe(true);
    expect(getTourismAvailability(second, "test_landmark").available).toBe(true);
    expect(getEpisodeAvailability(second, "milano_duomo_episode").available).toBe(false);
    expect(getBattleAvailability(second, "milano_la_scala_b01").available).toBe(false);
    expect(getTourismAvailability(second, "duomo_milano").available).toBe(false);
  });

  it("starts another city's tourism encounter through observation and respects its item and completion rules", () => {
    const source = encounters.encounters.find((item) => item.id === "galleria_fortune")!;
    const event = {
      ...structuredClone(source), id: "test_tourism_encounter", cityId: "test_city", landmarkId: "test_special_b_landmark",
      availability: "tourism" as const, repeatable: false, quiz: undefined,
      options: source.options.map((option) => ({ ...option, requiresItemId: "test_city_item" })),
    };
    encounters.encounters.push(event);
    encounters.items.push({ id: "test_city_item", cityId: "test_city", nameJa: "試験の品", descriptionJa: "テスト用の品。" });
    try {
      const initial = createGame();
      const city = { ...initial, currentCityId: "test_city", visitedLandmarkIds: ["test_special_b_landmark"],
        travel: { ...initial.travel, currentPlaceId: "test_place", hotelPlaceId: "test_hotel" } };
      expect(hasPendingPlaceEncounter(city, "test_special_b_landmark")).toBe(false);
      const withItem = { ...city, inventory: { test_city_item: "held" as const } };
      expect(hasPendingPlaceEncounter(withItem, "test_special_b_landmark")).toBe(true);
      expect(getEncounterAvailability(withItem, event.id).available).toBe(false);
      const observing = openTourism(withItem, "test_special_b_landmark");
      expect(getTourismEncounterAvailability(observing, event.id).available).toBe(true);
      const started = proceedFromTourism(observing, observing.revision, () => 0);
      expect(started.activeEncounter?.encounterId).toBe(event.id);
      expect(started.activeEncounter?.returnTourism?.landmarkId).toBe("test_special_b_landmark");
      expect(getTourismEncounterAvailability({ ...observing, completedEncounterIds: [event.id] }, event.id).available).toBe(false);
    } finally {
      encounters.encounters.pop();
      encounters.items.pop();
    }
  });

  it("uses the current city's location background when its story has no background tag", () => {
    const source = 'VAR player_name = ""\nVAR heroine_name = ""\n街の会話です。\n-> END\n';
    const json = new Compiler(source).Compile().ToJson();
    if (typeof json !== "string") throw new Error("Test Ink did not compile");
    const storyIds = ["test_city/guide", "test_city/test_battle", "test_city/encounter", "test_city/epilogue"];
    for (const id of storyIds) stories[id] = json;
    const backgroundId = "test_city_view";
    presentation.backgrounds[backgroundId] = { ...presentation.backgrounds.milano_cafe, nameJa: "試験都市" };
    tagContext.backgroundIds.push(backgroundId);
    cityContents.test_city.travel.places.find((place) => place.id === "test_place")!.backgroundId = backgroundId;
    try {
      const initial = createGame();
      const state = { ...initial, currentCityId: "test_city", travel: { ...initial.travel, currentPlaceId: "test_place", hotelPlaceId: "test_hotel" } };
      expect(openTourism(state, "test_landmark").activeTourism?.frame?.background).toBe(backgroundId);
      expect(startBattle(state, "test_battle").activeBattle?.frame?.background).toBe(backgroundId);
      expect(startEncounter(state, "test_encounter", () => 0).activeEncounter?.frame.background).toBe(backgroundId);
      expect(startCityEpilogue({ ...state, completedCityIds: ["test_city"] }, "test_city", state.revision).activeEpilogue?.frame.background).toBe(backgroundId);
    } finally {
      delete presentation.backgrounds[backgroundId];
      tagContext.backgroundIds.splice(tagContext.backgroundIds.indexOf(backgroundId), 1);
    }
  });
});
