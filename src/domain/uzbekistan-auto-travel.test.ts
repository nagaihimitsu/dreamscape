import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getCityContent } from "../content";
import { getJourney } from "../content/journeys";
import { createDebugState } from "../dev/debug-state";
import { clearCity } from "../dev/scenario-builders";
import { loadGame, saveGame } from "../persistence";
import { journeyStorage } from "../persistence/journey-storage";
import { getEpisodeAvailability } from "./chapter";
import { advanceCompletedJourneyCity, departToNextCity, getNextCity } from "./city-travel";
import { advanceCityEpilogue } from "./epilogue";
import { advanceDate, chooseDate, createGame, finishDate, startDate, validateGameState, type GameState } from "./game";
import { installJourneyTestCities } from "../dev/test-cities";
import { waitForTravel } from "./travel-game";

const cityIds = ["tashkent", "samarkand", "bukhara", "khiva"] as const;
function memoryStorage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); } };
}

function completeDate(initial: GameState): GameState {
  let state = startDate(initial, `${initial.currentCityId}_date`, () => 0);
  expect(state.activeDate).not.toBeNull();
  for (let step = 0; state.activeDate; step++) {
    expect(step).toBeLessThan(100);
    const active = state.activeDate;
    state = active.frame.ended ? finishDate(state, state.revision)
      : active.frame.choices.length ? chooseDate(state, active.frame.choices[0].index, state.revision)
        : advanceDate(state, state.revision);
  }
  return validateGameState(state);
}

describe("four-city Uzbekistan handoff with test-only scenarios", () => {
  let cleanup: () => void;
  beforeEach(() => {
    cleanup = installJourneyTestCities("uzbekistan");
    getJourney("uzbekistan")!.status = "available";
  });
  afterEach(() => {
    getJourney("uzbekistan")!.status = "preparing";
    cleanup();
  });

  it("starts independently and preserves histories, money and pending AP across all three departures", () => {
    const journey = getJourney("uzbekistan")!;
    let state = createGame("旅人", "相手", { journeyId: journey.id, initialState: { ...journey.initialState!, ap: 12 } });
    expect(state.currentCityId).toBe("tashkent");
    expect(state.travelBudget).toBe(4_000_000);
    expect(state.completedCityIds).toEqual([]);
    expect(state.memories).toEqual([]);
    expect(getNextCity(state)).toBeUndefined();
    const baseStorage = memoryStorage();
    const slot = journeyStorage(baseStorage, "uzbekistan");
    const milan = journeyStorage(baseStorage, "milano");
    expect(saveGame(milan, createGame()).ok).toBe(true);
    const milanRaw = milan.getItem("dreamscape.save.v1");
    expect(saveGame(slot, state).ok).toBe(true);
    let saved = state;
    for (const [index, cityId] of cityIds.entries()) {
      expect(state.currentCityId).toBe(cityId);
      // Earlier cities' regular and special victories do not unlock this finale.
      expect(getEpisodeAvailability(state, `${cityId}_finale`).available).toBe(false);
      state = clearCity(state);
      if (index === 0) state = completeDate(state);
      state = validateGameState({ ...state, completedEncounterIds: [...state.completedEncounterIds, `${cityId}_encounter`],
        inventory: { ...state.inventory, [`${cityId}_item`]: "held" },
        travel: { ...state.travel, day: 3, calendar: { journeyDay: 3 + index * 2, cityStartJourneyDay: 1 + index * 2, startWeekday: 0 } } });
      expect(state.claimedRewardIds.some((id) => id.startsWith("milano"))).toBe(false);
      expect(state.pendingApRewards.length).toBeGreaterThan(0);
      expect(state.completedCityIds).toEqual(cityIds.slice(0, index + 1));
      if (index === cityIds.length - 1) {
        expect(getNextCity(state)).toBeUndefined();
        state = advanceCompletedJourneyCity(state, state.revision);
        expect(state.activeEpilogue).not.toBeNull();
        for (let step = 0; state.activeEpilogue; step++) {
          expect(step).toBeLessThan(100);
          state = advanceCityEpilogue(state, state.revision);
        }
        expect(state.viewedEpilogueCityIds).toContain(cityId);
        expect(advanceCompletedJourneyCity(state, state.revision)).toBe(state);
        expect(departToNextCity(state, state.revision)).toBe(state);
        expect(saveGame(slot, state, saved).ok).toBe(true);
        expect(loadGame(slot)).toEqual({ status: "loaded", state });
        break;
      }
      const before = state;
      state = advanceCompletedJourneyCity(state, state.revision);
      expect(state.currentCityId).toBe(cityId);
      expect(state.activeEpilogue).not.toBeNull();
      expect(departToNextCity(state, state.revision)).toBe(state);
      expect(saveGame(slot, state, saved).ok).toBe(true);
      saved = state;
      expect(loadGame(slot)).toEqual({ status: "loaded", state });
      for (let step = 0; state.activeEpilogue; step++) {
        expect(step).toBeLessThan(100);
        state = advanceCityEpilogue(state, state.revision);
      }
      const lastStep = state;
      state = advanceCompletedJourneyCity(lastStep, lastStep.revision);
      expect(state.currentCityId).toBe(cityIds[index + 1]);
      expect(state.travel).toMatchObject({ currentPlaceId: `${cityIds[index + 1]}_hotel`,
        hotelPlaceId: `${cityIds[index + 1]}_hotel`, day: 1, minute: 540 });
      expect(state.travel.calendar?.cityStartJourneyDay).toBe(before.travel.calendar?.journeyDay);
      expect(state.inventory[`${cityId}_item`]).toBe("left_behind");
      for (const field of ["playerName", "heroineName", "ap", "pendingApRewards", "travelBudget", "affection", "trust", "spark",
        "romanceStage", "confessionStatus", "memories", "claimedRewardIds", "completedEpisodeIds", "completedCityIds",
        "battleRecords", "playedDateIds", "completedEncounterIds"] as const) expect(state[field], field).toEqual(before[field]);
      expect(advanceCompletedJourneyCity(state, lastStep.revision)).toBe(state);
      expect(advanceCompletedJourneyCity(state, state.revision)).toBe(state);
      // A competing tab's newer snapshot blocks this departure's save.
      const competingSlot = journeyStorage(memoryStorage(), "uzbekistan");
      expect(saveGame(competingSlot, lastStep).ok).toBe(true);
      const competing = waitForTravel(lastStep, 30, lastStep.revision);
      expect(competing).not.toBe(lastStep);
      expect(saveGame(competingSlot, competing, lastStep).ok).toBe(true);
      expect(saveGame(competingSlot, state, lastStep).ok).toBe(false);
      expect(loadGame(competingSlot)).toEqual({ status: "loaded", state: competing });
      expect(saveGame(slot, state, saved).ok).toBe(true);
      expect(loadGame(slot)).toEqual({ status: "loaded", state });
      saved = state;
      expect(milan.getItem("dreamscape.save.v1")).toBe(milanRaw);
    }
    expect(state.currentCityId).toBe("khiva");
    expect(state.inventory.tashkent_item).toBe("left_behind");
    expect(state.inventory.samarkand_item).toBe("left_behind");
    expect(state.inventory.bukhara_item).toBe("left_behind");
    expect(state.inventory.khiva_item).toBe("held");
    expect(state.playedDateIds).toContain("tashkent_date");
    expect(state.memories.length).toBeGreaterThan(0);
    expect(validateGameState(state)).toEqual(state);
  }, 120_000);

  it("reads the ending and stays in the completed city while its successor is unfinished", () => {
    let state = clearCity(createGame("旅人", "相手", { journeyId: "uzbekistan" }));
    getCityContent("samarkand").city.productionStatus = "prototype";
    expect(getNextCity(state)).toBeUndefined();
    state = advanceCompletedJourneyCity(state, state.revision);
    expect(state.activeEpilogue).not.toBeNull();
    for (let step = 0; state.activeEpilogue; step++) {
      expect(step).toBeLessThan(100);
      state = advanceCityEpilogue(state, state.revision);
    }
    expect(advanceCompletedJourneyCity(state, state.revision)).toBe(state);
    expect(state.currentCityId).toBe("tashkent");
  }, 120_000);

  it.each(cityIds)("opens each test scene in %s Debug with its own currency balance", (cityId) => {
    for (const [scene, id] of [["tourism", `${cityId}_landmark`], ["battle", `${cityId}_battle`],
      ["encounter", `${cityId}_encounter`], ["date", `${cityId}_date`]] as const) {
      const state = createDebugState({ cityId, scene, id, progress: "completed", ap: 12,
        affection: 0, trust: 0, spark: 0, roll: "positive" });
      expect(state.currentCityId).toBe(cityId);
      expect(state.travelBudget).toBe(4_000_000);
      expect(state.activeTourism || state.activeBattle || state.activeEncounter || state.activeDate).toBeTruthy();
      expect(validateGameState(state)).toEqual(state);
    }
  });
});
