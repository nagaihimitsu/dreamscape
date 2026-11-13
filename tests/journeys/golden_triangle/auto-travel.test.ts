import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { effects, getCityContent, scenes } from "../../../src/content";
import { loadGame, saveGame, type StorageLike } from "../../../src/persistence";
import { journeyStorage } from "../../../src/persistence/journey-storage";
import { clearCity, wrongAnswer } from "../../../src/dev/scenario-builders";
import { advanceCompletedJourneyCity } from "../../../src/domain/city-travel";
import { advanceCityEpilogue as advanceLine, chooseCityEpilogue } from "../../../src/domain/epilogue";
import type { GameState as EpilogueState } from "../../../src/domain/game";

/** One step of the epilogue: its first choice when it shows choices (the sample's epilogue has one; stage 3a), else its next line. */
function advanceCityEpilogue(state: EpilogueState, revision: number): EpilogueState {
  const choice = state.activeEpilogue?.frame.choices[0];
  return choice ? chooseCityEpilogue(state, choice.index, revision) : advanceLine(state, revision);
}
import { createGame, validateGameState, type GameState } from "../../../src/domain/game";
import { applyPlayerAction } from "../../../src/domain/player-action";
import { installTestGoldenTriangle } from "./test-journey";

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

function fixtureStart(cityId: "test_delhi" | "test_jaipur"): GameState {
  const base = createGame();
  const hotel = getCityContent(cityId).travelSettings.hotelPlaceId;
  return validateGameState({ ...base, currentCityId: cityId, travelBudget: 123,
    travel: { ...base.travel, currentPlaceId: hotel, hotelPlaceId: hotel } });
}

describe("automatic India city transition with development-only content", () => {
  let cleanup: () => void;
  beforeEach(() => { cleanup = installTestGoldenTriangle(); });
  afterEach(() => cleanup());

  it("reads the epilogue before changing maps, preserving the journey and saving only once", () => {
    let test_delhi = clearCity(fixtureStart("test_delhi"));
    const memory = effects.find((effect) => effect.memoryId)?.memoryId ?? scenes.flatMap((scene) => scene.options.flatMap((option) => option.memory ?? []))[0];
    if (!memory) throw new Error("Expected a memory fixture");
    test_delhi = validateGameState({ ...test_delhi, playerName: "主人公", heroineName: "ヒロイン", affection: 3, trust: 2, spark: 1,
      memories: [memory], completedEncounterIds: [...test_delhi.completedEncounterIds, "test_delhi_encounter"],
      seenEncounterIds: [...test_delhi.seenEncounterIds, "test_delhi_encounter"], inventory: { test_delhi_item: "held" },
      travel: { ...test_delhi.travel, day: 4, calendar: { journeyDay: 4, cityStartJourneyDay: 1, startWeekday: 0 } } });
    const started = advanceCompletedJourneyCity(test_delhi, test_delhi.revision);
    expect(started.currentCityId).toBe("test_delhi");
    expect(started.activeEpilogue).not.toBeNull();
    expect(advanceCompletedJourneyCity(started, started.revision)).toBe(started);
    const storage = journeyStorage(new MemoryStorage(), "test_golden_triangle");
    expect(saveGame(storage, started).ok).toBe(true);
    expect(loadGame(storage)).toEqual({ status: "loaded", state: started });

    let epilogue = started;
    for (let count = 0; !epilogue.activeEpilogue?.frame.ended; count++) {
      expect(count).toBeLessThan(100);
      epilogue = advanceCityEpilogue(epilogue, epilogue.revision);
    }
    // The app's single save operation (applyPlayerAction, as GameApp's commit): the last story
    // step and the automatic departure form one resulting snapshot.
    const lastStep = advanceCityEpilogue(epilogue, epilogue.revision);
    const test_agra = applyPlayerAction(epilogue, (state) => advanceCityEpilogue(state, state.revision));
    expect(test_agra.currentCityId).toBe("test_agra");
    expect(test_agra.viewedEpilogueCityIds).toContain("test_delhi");
    expect(test_agra.travel).toMatchObject({ hotelPlaceId: "test_agra_hotel", currentPlaceId: "test_agra_hotel", day: 1, minute: 540 });
    // The next city starts the next morning (2026-11-13 user decision): Delhi's journey day 4, then Agra's day 1 on day 5.
    expect(test_agra.travel.calendar).toEqual({ journeyDay: 5, cityStartJourneyDay: 5, startWeekday: 0 });
    expect(test_agra.inventory.test_delhi_item).toBe("left_behind");
    // The departure keeps the journey as the epilogue left it: the epilogue's own choice may change it (the sample's
    // first choice, which advanceCityEpilogue takes, gives affection +1).
    for (const field of ["playerName", "heroineName", "ap", "pendingApRewards", "travelBudget", "affection", "trust", "spark", "romanceStage", "confessionStatus", "memories", "claimedRewardIds", "completedEpisodeIds", "completedCityIds", "battleRecords", "playedDateIds", "completedEncounterIds", "seenEncounterIds", "itemUses"] as const)
      expect(test_agra[field], field).toEqual(epilogue[field]);
    expect(validateGameState(test_agra)).toEqual(test_agra);
    expect(advanceCompletedJourneyCity(test_agra, lastStep.revision)).toBe(test_agra);
    expect(advanceCompletedJourneyCity(test_agra, test_agra.revision)).toBe(test_agra);
    expect(saveGame(storage, test_agra, started).ok).toBe(true);
    expect(loadGame(storage)).toEqual({ status: "loaded", state: test_agra });

    const test_agraComplete = clearCity(test_agra);
    let test_agraEpilogue = advanceCompletedJourneyCity(test_agraComplete, test_agraComplete.revision);
    expect(test_agraEpilogue.activeEpilogue).not.toBeNull();
    for (let count = 0; !test_agraEpilogue.activeEpilogue?.frame.ended; count++) {
      expect(count).toBeLessThan(100);
      test_agraEpilogue = advanceCityEpilogue(test_agraEpilogue, test_agraEpilogue.revision);
    }
    const test_agraLastStep = advanceCityEpilogue(test_agraEpilogue, test_agraEpilogue.revision);
    const test_jaipur = advanceCompletedJourneyCity(test_agraLastStep, test_agraLastStep.revision);
    expect(test_jaipur.currentCityId).toBe("test_jaipur");
    expect(test_jaipur.completedCityIds).toEqual(["test_delhi", "test_agra"]);
    expect(test_jaipur.viewedEpilogueCityIds).toEqual(["test_delhi", "test_agra"]);
    expect(test_jaipur.travel).toMatchObject({ hotelPlaceId: "test_jaipur_hotel", currentPlaceId: "test_jaipur_hotel", day: 1, minute: 540 });
    expect(test_jaipur.travelBudget).toBe(test_agra.travelBudget);
    expect(test_jaipur.inventory.test_delhi_item).toBe("left_behind");
    expect(saveGame(storage, test_jaipur, test_agra).ok).toBe(true);
    expect(loadGame(storage)).toEqual({ status: "loaded", state: test_jaipur });
  }, 120_000);

  it("reads the ending without switching to an unfinished next city or leaving the final city", () => {
    const test_delhi = clearCity(fixtureStart("test_delhi"));
    getCityContent("test_agra").city.productionStatus = "prototype";
    expect(advanceCompletedJourneyCity(test_delhi, test_delhi.revision).activeEpilogue).not.toBeNull();
    const test_jaipur = clearCity(fixtureStart("test_jaipur"));
    expect(advanceCompletedJourneyCity(test_jaipur, test_jaipur.revision - 1)).toBe(test_jaipur);
    for (const completed of [test_delhi, test_jaipur]) {
      let state = advanceCompletedJourneyCity(completed, completed.revision);
      expect(state.activeEpilogue).not.toBeNull();
      expect(state.currentCityId).toBe(completed.currentCityId);
      expect(advanceCompletedJourneyCity(state, state.revision)).toBe(state);
      const storage = journeyStorage(new MemoryStorage(), "test_golden_triangle");
      expect(saveGame(storage, state).ok).toBe(true);
      expect(loadGame(storage)).toEqual({ status: "loaded", state });
      for (let count = 0; state.activeEpilogue; count++) {
        expect(count).toBeLessThan(100);
        state = advanceCityEpilogue(state, state.revision);
      }
      expect(state.viewedEpilogueCityIds).toContain(completed.currentCityId);
      expect(advanceCompletedJourneyCity(state, state.revision)).toBe(state);
      expect(state.currentCityId).toBe(completed.currentCityId);
      expect(validateGameState(state)).toEqual(state);
    }
  }, 120_000);

  it("does not change Milan's completed-city behavior", () => {
    const milan = clearCity(createGame());
    expect(milan.currentCityId).toBe("milano");
    expect(advanceCompletedJourneyCity(milan, milan.revision)).toBe(milan);
  }, 120_000);

  it("still opens the city ending after a zero-score finale", () => {
    const completed = clearCity(fixtureStart("test_jaipur"), { answer: wrongAnswer });
    expect(completed.battleRecords.find((record) => record.battleId === "test_jaipur_final_battle")?.bestScore).toBe(0);
    const ending = advanceCompletedJourneyCity(completed, completed.revision);
    expect(ending.activeEpilogue).not.toBeNull();
    expect(ending.completedCityIds).toContain("test_jaipur");
    expect(ending.claimedRewardIds).toEqual(completed.claimedRewardIds);
  }, 120_000);
});
