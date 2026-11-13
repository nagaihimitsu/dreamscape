import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { effects, getCityContent, rewardRules, scenes } from "../../../src/content";
import { loadGame, saveGame, type StorageLike } from "../../../src/persistence";
import { journeyStorage } from "../../../src/persistence/journey-storage";
import { createDebugState } from "../../../src/dev/debug-state";
import { clearCity } from "../../../src/dev/scenario-builders";
import { departToNextCity, getNextCity } from "../../../src/domain/city-travel";
import { finalizeBattleProgress } from "../../../src/domain/chapter";
import { createGame, validateGameState, type GameState } from "../../../src/domain/game";
import { installTestGoldenTriangle } from "./test-journey";
import { getTravelEventDefinition, sleepAtHotel, waitForTravel } from "../../../src/domain/travel-game";

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

// The fixture is wholly in memory: amounts, places, stories, and routes are not production data.
function initialDelhi(): GameState {
  const base = createGame();
  const hotel = getCityContent("test_delhi").travelSettings.hotelPlaceId;
  return validateGameState({ ...base, currentCityId: "test_delhi", travelBudget: 123,
    travel: { ...base.travel, currentPlaceId: hotel, hotelPlaceId: hotel } });
}

describe("three-city journey using development-only fixtures", () => {
  let cleanup: () => void;
  beforeEach(() => { cleanup = installTestGoldenTriangle(); });
  afterEach(() => cleanup());

  it("starts independently, progresses Delhi → Agra → Jaipur and preserves saved history", () => {
    const initial = initialDelhi();
    expect(initial.completedCityIds).not.toContain("milano");
    expect(getNextCity(initial)).toBeUndefined();
    expect(getTravelEventDefinition(initial, "test_delhi_episode")).toBeDefined();
    expect(getTravelEventDefinition(initial, "test_agra_episode")).toBeUndefined();
    expect(getTravelEventDefinition(initial, "milano_duomo_episode")).toBeUndefined();
    let test_delhi = clearCity(initial);
    const memory = effects.find((entry) => entry.memoryId)?.memoryId ?? scenes.flatMap((scene) => scene.options.flatMap((option) => option.memory ?? []))[0];
    if (!memory) throw new Error("Expected a memory fixture");
    test_delhi = validateGameState({ ...test_delhi, playerName: "主人公", heroineName: "ヒロイン", affection: 3, trust: 2, spark: 1,
      memories: [memory], completedEncounterIds: [...test_delhi.completedEncounterIds, "test_delhi_encounter"],
      seenEncounterIds: [...test_delhi.seenEncounterIds, "test_delhi_encounter"], inventory: { test_delhi_item: "held" } });
    expect(getNextCity(test_delhi)?.city.id).toBe("test_agra");
    const storage = journeyStorage(new MemoryStorage(), "test_golden_triangle");
    expect(saveGame(storage, test_delhi).ok).toBe(true);
    expect(loadGame(storage)).toEqual({ status: "loaded", state: test_delhi });
    const test_agra = departToNextCity(test_delhi, test_delhi.revision);
    expect(test_agra.currentCityId).toBe("test_agra");
    expect(test_agra.travel).toMatchObject({ hotelPlaceId: "test_agra_hotel", currentPlaceId: "test_agra_hotel", day: 1, minute: 540 });
    expect(test_agra.inventory.test_delhi_item).toBe("left_behind");
    expect(test_agra.completedEncounterIds).toContain("test_delhi_encounter");
    for (const field of ["playerName", "heroineName", "ap", "pendingApRewards", "travelBudget", "affection", "trust", "spark", "romanceStage", "confessionStatus", "memories", "claimedRewardIds", "completedEpisodeIds", "completedCityIds", "battleRecords", "playedDateIds"] as const)
      expect(test_agra[field]).toEqual(test_delhi[field]);
    expect(departToNextCity(test_agra, test_delhi.revision)).toBe(test_agra);
    expect(saveGame(storage, test_agra, test_delhi).ok).toBe(true);
    expect(loadGame(storage)).toEqual({ status: "loaded", state: test_agra });
    const test_agraComplete = clearCity(test_agra);
    expect(getNextCity(test_agraComplete)?.city.id).toBe("test_jaipur");
    expect(saveGame(storage, test_agraComplete, test_agra).ok).toBe(true);
    expect(loadGame(storage)).toEqual({ status: "loaded", state: test_agraComplete });
    const concurrent = journeyStorage(new MemoryStorage(), "test_golden_triangle");
    expect(saveGame(concurrent, test_agraComplete).ok).toBe(true);
    const otherTab = waitForTravel(test_agraComplete, 30, test_agraComplete.revision);
    expect(otherTab).not.toBe(test_agraComplete);
    expect(saveGame(concurrent, otherTab, test_agraComplete).ok).toBe(true);
    const test_jaipur = departToNextCity(test_agraComplete, test_agraComplete.revision);
    expect(saveGame(concurrent, test_jaipur, test_agraComplete).ok).toBe(false);
    expect(loadGame(concurrent)).toEqual({ status: "loaded", state: otherTab });
    expect(test_jaipur.currentCityId).toBe("test_jaipur");
    expect(test_jaipur.inventory.test_delhi_item).toBe("left_behind");
    expect(test_jaipur.completedCityIds).toEqual(["test_delhi", "test_agra"]);
    expect(saveGame(storage, test_jaipur, test_agraComplete).ok).toBe(true);
    expect(loadGame(storage)).toEqual({ status: "loaded", state: test_jaipur });
    expect(getNextCity(clearCity(test_jaipur))).toBeUndefined();
  }, 120_000);

  it("preserves the game weekday when the local day resets on departure", () => {
    let test_delhi = clearCity(initialDelhi());
    test_delhi = validateGameState({ ...test_delhi, travel: { ...test_delhi.travel, day: 4,
      calendar: { journeyDay: 4, cityStartJourneyDay: 1, startWeekday: 0 } } });
    const test_agra = departToNextCity(test_delhi, test_delhi.revision);
    expect(test_agra.currentCityId).toBe("test_agra");
    expect(test_agra.travel.day).toBe(1);
    expect(test_agra.travel.calendar).toEqual({ journeyDay: 4, cityStartJourneyDay: 4, startWeekday: 0 });
    expect(validateGameState(test_agra)).toEqual(test_agra);
    const storage = new MemoryStorage();
    expect(saveGame(storage, test_agra).ok).toBe(true);
    expect(loadGame(storage)).toEqual({ status: "loaded", state: test_agra });
  }, 120_000);

  it("awards 4 AP once for an actual city finale and preserves it after loading", () => {
    const clearReward = rewardRules.find((rule) => rule.episodeId === "test_delhi_finale" && rule.trigger === "city_clear");
    if (!clearReward) throw new Error("Expected fixture city-clear reward");
    clearReward.ap = 4;
    let sawFinale = false;
    const completed = clearCity(initialDelhi(), { onResult: (result) => {
      const entry = result.battleRewardReceipt?.entries.find((item) => item.rewardId === clearReward.id);
      if (!result.completedCityIds.includes("test_delhi")) {
        expect(entry).toBeUndefined();
        expect(result.claimedRewardIds).not.toContain(clearReward.id);
      } else {
        sawFinale = true;
        expect(entry).toMatchObject({ rewardId: clearReward.id, earnedAp: 4 });
        expect(entry!.creditedAp + entry!.pendingAp).toBe(4);
      }
    } });
    expect(sawFinale).toBe(true);
    expect(completed.claimedRewardIds.filter((id) => id === clearReward.id)).toHaveLength(1);
    const storage = new MemoryStorage();
    expect(saveGame(storage, completed).ok).toBe(true);
    const reloaded = loadGame(storage);
    if (reloaded.status !== "loaded") throw new Error("Expected completed city to load");
    // Loading pays nothing again, and no battle result is open that could record the finale twice.
    expect(reloaded.state).toEqual(completed);
    expect(reloaded.state.activeBattle).toBeNull();
    expect(finalizeBattleProgress(reloaded.state)).toBe(reloaded.state);
    expect(reloaded.state.claimedRewardIds.filter((id) => id === clearReward.id)).toHaveLength(1);
  }, 120_000);

  it("uses a free overnight at the test hotel without reducing budget or AP", () => {
    getCityContent("test_delhi").travelSettings.lodgingCost = 0;
    const start = validateGameState({ ...initialDelhi(), ap: 4 });
    const rested = sleepAtHotel(start, "walk", start.revision);
    expect(rested).not.toBe(start);
    expect(rested.travel).toMatchObject({ day: 2, minute: 540 });
    expect(rested.travelBudget).toBe(start.travelBudget);
    expect(rested.ap).toBe(start.ap);
  });

  it.each(["test_delhi", "test_agra", "test_jaipur"])("opens all fixture scenes in %s Debug", (cityId) => {
    for (const [scene, id] of [["tourism", `${cityId}_landmark`], ["battle", `${cityId}_battle`], ["encounter", `${cityId}_encounter`], ["date", `${cityId}_date`]] as const) {
      const state = createDebugState({ cityId, scene, id, progress: "completed", ap: 12, affection: 0, trust: 0, spark: 0, roll: "positive" });
      expect(state.currentCityId).toBe(cityId);
      expect(state.activeTourism || state.activeBattle || state.activeEncounter || state.activeDate).toBeTruthy();
    }
  }, 120_000);

  it.each(["milano", "test_delhi", "test_agra", "test_jaipur"])("opens %s in isolated Debug", (cityId) => {
    const landmark = cityId === "milano" ? "duomo_milano" : `${cityId}_landmark`;
    const state = createDebugState({ cityId, scene: "tourism", id: landmark, progress: "initial", ap: 12, affection: 0, trust: 0, spark: 0, roll: "positive" });
    expect(state.currentCityId).toBe(cityId);
    expect(state.activeTourism?.landmarkId).toBe(landmark);
  }, 120_000);
});
