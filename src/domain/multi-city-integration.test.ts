import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { effects } from "../content";
import { loadGame, saveGame, type StorageLike } from "../persistence";
import { getBattleAvailability, startBattle } from "./battle";
import { clearCity, playBattleToResult } from "../dev/scenario-builders";
import { departToNextCity, getNextCity } from "./city-travel";
import { getEpisodeAvailability, leaveBattleResult, startEpisode } from "./chapter";
import { advanceEncounter, chooseEncounter, encounterCanFinish, finishEncounter, proceedFromTourism, startEncounter } from "./encounter";
import { startCityEpilogue } from "./epilogue";
import { createGame, getDateAvailability, startDate, validateGameState, type GameState } from "./game";
import { installTestCity } from "../dev/test-cities";
import { openTourism, skipTourismGuide, startTourismBattle } from "./tourism";
import { beginTravelEvent, waitForTravel } from "./travel-game";

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

/** Complete real Ink/quiz/reasoning logic, including the saved travel reservation, and leave the result as its screen does. */
function finishBattle(initial: GameState): GameState {
  const state = playBattleToResult(initial);
  return leaveBattleResult(state, state.revision);
}

const finishMilan = () => clearCity(createGame());

describe("two registered cities through the real game runtime", () => {
  let cleanup: () => void;
  // Milan's IDs below (dates, encounters, items) are part of the test.
  beforeEach(() => { cleanup = installTestCity({ templateCityId: "milano" }); });
  afterEach(() => cleanup());

  it("departs once, preserves histories and saves, then plays the second city's actual scenes", () => {
    const newGame = createGame();
    expect(newGame.currentCityId).toBe("milano");
    expect(getNextCity(newGame)).toBeUndefined();
    const reached = finishMilan();
    const memory = effects.find((effect) => effect.memoryId)?.memoryId;
    if (!memory) throw new Error("No existing memory fixture");
    const before = validateGameState({ ...reached, inventory: { ...reached.inventory, blue_pick: "held" },
      completedEncounterIds: [...reached.completedEncounterIds, "duomo_string"], memories: [memory] });
    expect(getNextCity(before)?.city.id).toBe("test_city");
    expect(before.claimedRewardIds.length).toBeGreaterThan(0);
    const activeMilanDate = startDate(before, "milano_cafe_01", () => 0);
    expect(activeMilanDate.activeDate).not.toBeNull();
    expect(departToNextCity(activeMilanDate, activeMilanDate.revision)).toBe(activeMilanDate);
    const activeMilanBattle = startBattle(before, "milano_duomo_01");
    expect(activeMilanBattle.activeBattle).not.toBeNull();
    expect(departToNextCity(activeMilanBattle, activeMilanBattle.revision)).toBe(activeMilanBattle);
    const activeMilanTourism = openTourism(before, "duomo_milano");
    expect(activeMilanTourism.activeTourism).not.toBeNull();
    expect(departToNextCity(activeMilanTourism, activeMilanTourism.revision)).toBe(activeMilanTourism);
    const activeMilanEncounter = startEncounter(before, "supper_pantomime", () => 0);
    expect(activeMilanEncounter.activeEncounter).not.toBeNull();
    expect(departToNextCity(activeMilanEncounter, activeMilanEncounter.revision)).toBe(activeMilanEncounter);
    const activeMilanEpilogue = startCityEpilogue(before, "milano", before.revision);
    expect(activeMilanEpilogue.activeEpilogue).not.toBeNull();
    expect(departToNextCity(activeMilanEpilogue, activeMilanEpilogue.revision)).toBe(activeMilanEpilogue);

    const storage = new MemoryStorage();
    expect(saveGame(storage, before).ok).toBe(true);
    expect(loadGame(storage)).toEqual({ status: "loaded", state: before });
    const after = departToNextCity(before, before.revision);
    expect(after).not.toBe(before);
    expect(after.currentCityId).toBe("test_city");
    expect(after.travel).toMatchObject({ currentPlaceId: "test_hotel", hotelPlaceId: "test_hotel", day: 1, minute: 540, activeEvent: null });
    expect(after.inventory.blue_pick).toBe("left_behind");
    expect(after.completedEncounterIds).toContain("duomo_string");
    for (const field of ["playerName", "heroineName", "ap", "pendingApRewards", "travelBudget", "affection", "trust", "spark", "romanceStage", "confessionStatus", "memories", "claimedRewardIds", "completedEpisodeIds", "completedCityIds", "battleRecords", "playedDateIds"] as const)
      expect(after[field]).toEqual(before[field]);
    expect(departToNextCity(after, before.revision)).toBe(after);
    expect(getNextCity(after)).toBeUndefined();
    const concurrentStorage = new MemoryStorage();
    expect(saveGame(concurrentStorage, before).ok).toBe(true);
    const anotherTab = waitForTravel(before, 30, before.revision);
    expect(anotherTab).not.toBe(before);
    expect(saveGame(concurrentStorage, anotherTab, before).ok).toBe(true);
    expect(saveGame(concurrentStorage, after, before).ok).toBe(false);
    expect(loadGame(concurrentStorage)).toEqual({ status: "loaded", state: anotherTab });
    expect(saveGame(storage, after, before).ok).toBe(true);
    const loaded = loadGame(storage);
    expect(loaded).toEqual({ status: "loaded", state: after });

    expect(getEpisodeAvailability(after, "milano_duomo_episode").available).toBe(false);
    expect(getBattleAvailability(after, "milano_duomo_01").available).toBe(false);
    expect(getDateAvailability(after, "milano_cafe_01").available).toBe(false);
    expect(startEpisode(after, "milano_duomo_episode")).toBe(after);
    expect(startBattle(after, "milano_duomo_01")).toBe(after);
    expect(startDate(after, "milano_cafe_01", () => 0)).toBe(after);
    expect(getEpisodeAvailability(after, "test_finale").available).toBe(false);
    const date = beginTravelEvent(after, "test_date", "walk", after.revision, () => 0);
    expect(date.activeDate?.dateId).toBe("test_date");
    const totalAp = (state: GameState) => state.ap + state.pendingApRewards.reduce((sum, item) => sum + item.remainingAp, 0);
    expect(totalAp(date)).toBe(totalAp(after) - 2);
    const dateStorage = new MemoryStorage();
    expect(saveGame(dateStorage, date).ok).toBe(true);
    expect(loadGame(dateStorage)).toEqual({ status: "loaded", state: date });
    expect(departToNextCity(date, date.revision)).toBe(date);

    let cityState = beginTravelEvent(after, "test_episode", "walk", after.revision);
    expect(cityState.activeTourism?.landmarkId).toBe("test_landmark");
    expect(cityState.travel.currentPlaceId).toBe("test_place");
    expect(saveGame(storage, cityState, after).ok).toBe(true);
    expect(loadGame(storage)).toEqual({ status: "loaded", state: cityState });
    expect(departToNextCity(cityState, cityState.revision)).toBe(cityState);
    cityState = skipTourismGuide(cityState, cityState.revision);
    cityState = proceedFromTourism(cityState, cityState.revision, () => 0);
    expect(cityState.activeEncounter?.encounterId).toBe("test_encounter");
    expect(departToNextCity(cityState, cityState.revision)).toBe(cityState);
    const encounterStorage = new MemoryStorage();
    expect(saveGame(encounterStorage, cityState).ok).toBe(true);
    expect(loadGame(encounterStorage)).toEqual({ status: "loaded", state: cityState });
    for (let count = 0; cityState.activeEncounter; count++) {
      expect(count).toBeLessThan(60);
      const active = cityState.activeEncounter;
      if (active.frame.choices.length) cityState = chooseEncounter(cityState, active.frame.choices[0].index, cityState.revision);
      else if (encounterCanFinish(cityState)) cityState = finishEncounter(cityState, cityState.revision);
      else cityState = advanceEncounter(cityState, cityState.revision);
    }
    expect(cityState.completedEncounterIds).toContain("test_encounter");
    expect(cityState.inventory.test_item).toBe("held");
    expect(cityState.inventory.blue_pick).toBe("left_behind");
    expect(cityState.activeTourism?.landmarkId).toBe("test_landmark");
    expect(validateGameState(cityState)).toEqual(cityState);
    cityState = finishBattle(startTourismBattle(cityState, cityState.revision));
    expect(cityState.completedEpisodeIds).toContain("test_episode");
    expect(getEpisodeAvailability(cityState, "test_finale").available).toBe(false);
    // Both special battles (B and C, copied from Milan) open the finale, each at its own landmark.
    for (const [index, battleId] of ["test_special_b", "test_special_c"].entries()) {
      cityState = beginTravelEvent(cityState, battleId, "walk", cityState.revision);
      expect(cityState.activeTourism?.landmarkId).toBe(`${battleId}_landmark`);
      cityState = skipTourismGuide(cityState, cityState.revision);
      cityState = startTourismBattle(cityState, cityState.revision);
      expect(cityState.activeBattle?.battleId).toBe(battleId);
      cityState = finishBattle(cityState);
      expect(cityState.battleRecords.some((record) => record.battleId === battleId)).toBe(true);
      expect(getEpisodeAvailability(cityState, "test_finale").available).toBe(index === 1);
    }
    cityState = beginTravelEvent(cityState, "test_finale", "walk", cityState.revision);
    expect(cityState.activeBattle?.battleId).toBe("test_final_battle");
    cityState = finishBattle(cityState);
    expect(cityState.completedCityIds).toEqual(["milano", "test_city"]);
    expect(cityState.claimedRewardIds).toEqual(expect.arrayContaining(before.claimedRewardIds));
    expect(cityState.inventory.blue_pick).toBe("left_behind");
    expect(validateGameState(cityState)).toEqual(cityState);
  }, 120_000);
});
