import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { effects, getCityContent } from "../content";
import { loadGame, saveGame, type StorageLike } from "../persistence";
import { journeyStorage } from "../persistence/journey-storage";
import { advanceBattle, answerBattle, getActiveBattleContent, leaveBattle, selectReasoningClue, startBattle, submitBattleEvidence } from "./battle";
import { advanceCompletedIndiaCity } from "./city-travel";
import { getNextEpisode, getNextStoryBattle, startEpisode } from "./chapter";
import { advanceCityEpilogue } from "./epilogue";
import { createGame, validateGameState, type GameState } from "./game";
import { installIndiaTestCities } from "./multi-city-test-fixture";
import { skipTourismGuide, startTourismBattle } from "./tourism";

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

/** Actual game rules with in-memory test city content, never production India stories. */
function completeCity(initial: GameState): GameState {
  let state = initial;
  const cityId = state.currentCityId;
  for (let count = 0; !state.completedCityIds.includes(cityId); count++) {
    expect(count).toBeLessThan(20);
    const special = getNextStoryBattle(state);
    const episode = getNextEpisode(state);
    if (!special && !episode) throw new Error("No next fixture event");
    state = special ? startBattle(state, special.battleId) : startEpisode(state, episode!.id);
    if (state.activeTourism?.phase === "guide") state = skipTourismGuide(state, state.revision);
    if (state.activeTourism) state = startTourismBattle(state, state.revision);
    for (let step = 0; state.activeBattle?.phase !== "result"; step++) {
      expect(step).toBeLessThan(250);
      const active = state.activeBattle;
      if (!active) throw new Error("Expected fixture battle");
      const { battle, quiz } = getActiveBattleContent(active);
      if (active.phase === "reasoning") {
        for (const id of battle.reasoning!.correctClueIds) state = selectReasoningClue(state, id, state.revision);
        state = submitBattleEvidence(state, state.revision);
      } else if (active.phase === "question") state = answerBattle(state, quiz.questions[active.roundIndex].correctOptionId, state.revision);
      else state = advanceBattle(state, state.revision);
    }
    state = leaveBattle(state, state.revision);
  }
  return validateGameState(state);
}

function fixtureStart(cityId: "delhi" | "jaipur"): GameState {
  const base = createGame();
  const hotel = getCityContent(cityId).travelSettings.hotelPlaceId;
  return validateGameState({ ...base, currentCityId: cityId, travelBudget: 123,
    travel: { ...base.travel, currentPlaceId: hotel, hotelPlaceId: hotel } });
}

describe("automatic India city transition with development-only content", () => {
  let cleanup: () => void;
  beforeEach(() => { cleanup = installIndiaTestCities(); });
  afterEach(() => cleanup());

  it("reads the epilogue before changing maps, preserving the journey and saving only once", () => {
    let delhi = completeCity(fixtureStart("delhi"));
    const memory = effects.find((effect) => effect.memoryId)?.memoryId;
    if (!memory) throw new Error("Expected a memory fixture");
    delhi = validateGameState({ ...delhi, playerName: "主人公", heroineName: "ヒロイン", affection: 3, trust: 2, spark: 1,
      memories: [memory], completedEncounterIds: [...delhi.completedEncounterIds, "delhi_encounter"], inventory: { delhi_item: "held" },
      travel: { ...delhi.travel, day: 4, calendar: { journeyDay: 4, cityStartJourneyDay: 1, startWeekday: 0 } } });
    const started = advanceCompletedIndiaCity(delhi, delhi.revision);
    expect(started.currentCityId).toBe("delhi");
    expect(started.activeEpilogue).not.toBeNull();
    expect(advanceCompletedIndiaCity(started, started.revision)).toBe(started);
    const storage = journeyStorage(new MemoryStorage(), "golden_triangle");
    expect(saveGame(storage, started).ok).toBe(true);
    expect(loadGame(storage)).toEqual({ status: "loaded", state: started });

    let epilogue = started;
    for (let count = 0; !epilogue.activeEpilogue?.frame.ended; count++) {
      expect(count).toBeLessThan(100);
      epilogue = advanceCityEpilogue(epilogue, epilogue.revision);
    }
    // Match the app's single save operation: the last story step and automatic
    // departure form one resulting snapshot.
    const lastStep = advanceCityEpilogue(epilogue, epilogue.revision);
    const agra = advanceCompletedIndiaCity(lastStep, lastStep.revision);
    expect(agra.currentCityId).toBe("agra");
    expect(agra.viewedEpilogueCityIds).toContain("delhi");
    expect(agra.travel).toMatchObject({ hotelPlaceId: "agra_hotel", currentPlaceId: "agra_hotel", day: 1, minute: 540 });
    expect(agra.travel.calendar).toEqual({ journeyDay: 4, cityStartJourneyDay: 4, startWeekday: 0 });
    expect(agra.inventory.delhi_item).toBe("left_behind");
    for (const field of ["playerName", "heroineName", "ap", "pendingApRewards", "travelBudget", "affection", "trust", "spark", "romanceStage", "confessionStatus", "memories", "claimedRewardIds", "completedEpisodeIds", "completedCityIds", "battleRecords", "playedDateIds", "completedEncounterIds"] as const)
      expect(agra[field]).toEqual(delhi[field]);
    expect(validateGameState(agra)).toEqual(agra);
    expect(advanceCompletedIndiaCity(agra, lastStep.revision)).toBe(agra);
    expect(advanceCompletedIndiaCity(agra, agra.revision)).toBe(agra);
    expect(saveGame(storage, agra, started).ok).toBe(true);
    expect(loadGame(storage)).toEqual({ status: "loaded", state: agra });

    const agraComplete = completeCity(agra);
    let agraEpilogue = advanceCompletedIndiaCity(agraComplete, agraComplete.revision);
    expect(agraEpilogue.activeEpilogue).not.toBeNull();
    for (let count = 0; !agraEpilogue.activeEpilogue?.frame.ended; count++) {
      expect(count).toBeLessThan(100);
      agraEpilogue = advanceCityEpilogue(agraEpilogue, agraEpilogue.revision);
    }
    const agraLastStep = advanceCityEpilogue(agraEpilogue, agraEpilogue.revision);
    const jaipur = advanceCompletedIndiaCity(agraLastStep, agraLastStep.revision);
    expect(jaipur.currentCityId).toBe("jaipur");
    expect(jaipur.completedCityIds).toEqual(["delhi", "agra"]);
    expect(jaipur.viewedEpilogueCityIds).toEqual(["delhi", "agra"]);
    expect(jaipur.travel).toMatchObject({ hotelPlaceId: "jaipur_hotel", currentPlaceId: "jaipur_hotel", day: 1, minute: 540 });
    expect(jaipur.travelBudget).toBe(agra.travelBudget);
    expect(jaipur.inventory.delhi_item).toBe("left_behind");
    expect(saveGame(storage, jaipur, agra).ok).toBe(true);
    expect(loadGame(storage)).toEqual({ status: "loaded", state: jaipur });
  }, 120_000);

  it("does not switch to an unfinished next city or leave the final city", () => {
    const delhi = completeCity(fixtureStart("delhi"));
    getCityContent("agra").city.productionStatus = "prototype";
    expect(advanceCompletedIndiaCity(delhi, delhi.revision)).toBe(delhi);
    const jaipur = completeCity(fixtureStart("jaipur"));
    expect(advanceCompletedIndiaCity(jaipur, jaipur.revision)).toBe(jaipur);
  }, 120_000);

  it("does not change Milan's completed-city behavior", () => {
    const milan = completeCity(createGame());
    expect(milan.currentCityId).toBe("milano");
    expect(advanceCompletedIndiaCity(milan, milan.revision)).toBe(milan);
  }, 120_000);
});
