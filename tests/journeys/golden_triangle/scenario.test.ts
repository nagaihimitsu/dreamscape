import { describe, expect, it } from "vitest";
import { dates, episodes } from "../../../src/content";
import { getJourney } from "../../../src/content/journeys";
import { loadGame, saveGame, type StorageLike } from "../../../src/persistence";
import { journeyStorage } from "../../../src/persistence/journey-storage";
import { advanceBattle, answerBattle, getActiveBattleContent } from "../../../src/domain/battle";
import { leaveBattleResult, startEpisode } from "../../../src/domain/chapter";
import { advanceCompletedJourneyCity, getNextCity } from "../../../src/domain/city-travel";
import { isDateUnlockedForTravel } from "../../../src/domain/date-rules";
import { advanceCityEpilogue, completeArrivalLogo, startCityArrival } from "../../../src/domain/epilogue";
import { advanceDate, chooseDate, createGame, finishDate, startDate, validateGameState, type GameState } from "../../../src/domain/game";
import { advanceTourismGuide, startTourismBattle } from "../../../src/domain/tourism";
import { correctAnswer, playBattleToResult, wrongAnswer } from "../../../src/dev/scenario-builders";

/** Exercise the actual published scripts, questions and definitions, not Debug fixtures. */
describe("authored Golden Triangle journey", () => {
  it("plays all three cities and 18 dates, resumes scenes, and advances even after zero-score bosses", () => {
    const data = new Map<string, string>();
    const storage: StorageLike & { removeItem: (key: string) => void } = {
      getItem: (key) => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }, removeItem: (key) => { data.delete(key); },
    };
    const milanSlot = journeyStorage(storage, "milano");
    const indiaSlot = journeyStorage(storage, "golden_triangle");
    const milan = createGame("ミラノの旅人", "ミラノの同行者");
    expect(saveGame(milanSlot, milan).ok).toBe(true);
    const journey = getJourney("golden_triangle")!;
    expect(journey.status).toBe("available");
    expect(journey.cities.map((city) => city.id)).toEqual(["delhi", "agra", "jaipur"]);
    let state = createGame("インドの旅人", "インドの同行者", { journeyId: journey.id });
    expect(state).toMatchObject({ currentCityId: "delhi", travelBudget: 30_000, ap: 0, affection: 0, trust: 0, spark: 0,
      confessionStatus: "none", completedCityIds: [], memories: [], playedDateIds: [], claimedRewardIds: [] });
    let saved: GameState | null = null;
    const checkpoint = (next: GameState) => {
      expect(saveGame(indiaSlot, next, saved).ok).toBe(true);
      const loaded = loadGame(indiaSlot);
      expect(loaded).toEqual({ status: "loaded", state: next });
      if (loaded.status !== "loaded") throw new Error("Expected an India save");
      saved = loaded.state;
      return loaded.state;
    };
    state = checkpoint(startCityArrival(state, state.revision));
    // Every step of the battle is saved and loaded again on the way to its result.
    const playBattle = (initial: GameState, correct: boolean) => {
      const result = playBattleToResult(checkpoint(initial), { answer: correct ? correctAnswer : wrongAnswer, after: (next) => checkpoint(next) });
      return checkpoint(leaveBattleResult(result, result.revision));
    };
    for (const [cityIndex, { id: cityId }] of journey.cities.entries()) {
      expect(state.currentCityId).toBe(cityId);
      expect(state.activeEpilogue?.kind).toBe("arrival");
      const arrival = state;
      state = checkpoint(completeArrivalLogo(state, state.revision));
      for (let steps = 0; state.activeEpilogue?.kind === "arrival"; steps++) {
        expect(steps).toBeLessThan(15);
        state = checkpoint(advanceCityEpilogue(state, state.revision));
      }
      const { revision: arrivalRevision, activeEpilogue: arrivalScene, ...beforeWelcome } = arrival;
      const { revision: welcomedRevision, activeEpilogue: welcomedScene, ...afterWelcome } = state;
      void arrivalRevision; void arrivalScene; void welcomedRevision;
      expect(welcomedScene).toBeNull();
      expect(afterWelcome).toEqual(beforeWelcome);
      const main = episodes.filter((episode) => episode.cityId === cityId && episode.kind === "episode").reverse();
      const ownDates = dates.filter((date) => date.chapterId === cityId);
      expect(main).toHaveLength(4);
      expect(ownDates).toHaveLength(6);
      expect(ownDates.every((date) => !isDateUnlockedForTravel(state, date.id))).toBe(true);
      // Reverse the catalog order: sightseeing remains freely ordered.
      for (const [index, episode] of main.entries()) {
        state = startEpisode(state, episode.id);
        expect(state.activeTourism?.landmarkId).toBe(episode.landmarkId);
        for (let steps = 0; state.activeTourism?.phase === "guide"; steps++) {
          expect(steps).toBeLessThan(50);
          state = checkpoint(advanceTourismGuide(state, state.revision));
        }
        state = playBattle(startTourismBattle(state, state.revision), true);
        expect(state.completedCityIds).not.toContain(cityId);
        if (index === 0) {
          // completedChapters means any local main episode, not city completion.
          expect(state.completedChapters).toContain(cityId);
          expect(ownDates.every((date) => isDateUnlockedForTravel(state, date.id))).toBe(true);
          expect(dates.filter((date) => date.chapterId !== cityId).every((date) => !isDateUnlockedForTravel(state, date.id))).toBe(true);
        }
      }
      for (const date of ownDates) {
        state = startDate(state, date.id, () => 4500);
        expect(state.activeDate?.dateId).toBe(date.id);
        for (let steps = 0; state.activeDate; steps++) {
          expect(steps).toBeLessThan(100);
          state = checkpoint(state);
          const active = state.activeDate!;
          state = active.frame.ended ? finishDate(state, state.revision)
            : active.frame.choices.length ? chooseDate(state, active.choiceCount % 3, state.revision) : advanceDate(state, state.revision);
        }
        state = checkpoint(state);
        expect(state.playedDateIds).toContain(date.id);
        expect(startDate(state, date.id)).toBe(state);
      }
      const finale = episodes.find((episode) => episode.cityId === cityId && episode.kind === "city_finale")!;
      // A spent budget must not be reset to the initial grant at the next city.
      state = validateGameState({ ...state, travelBudget: state.travelBudget - 111 });
      state = playBattle(startEpisode(state, finale.id), false);
      expect(state.completedCityIds).toContain(cityId);
      expect(state.battleRecords.find((record) => record.battleId === finale.battleId)?.bestScore).toBe(0);
      const completed = state;
      state = advanceCompletedJourneyCity(state, state.revision);
      expect(state.currentCityId).toBe(cityId);
      expect(state.activeEpilogue).not.toBeNull();
      expect(advanceCompletedJourneyCity(state, state.revision)).toBe(state);
      for (let steps = 0; state.activeEpilogue; steps++) {
        expect(steps).toBeLessThan(60);
        state = checkpoint(state);
        state = advanceCityEpilogue(state, state.revision);
      }
      state = checkpoint(advanceCompletedJourneyCity(state, state.revision));
      expect(state.viewedEpilogueCityIds).toContain(cityId);
      expect(state.currentCityId).toBe(journey.cities[cityIndex + 1]?.id ?? cityId);
      for (const field of ["playerName", "heroineName", "ap", "pendingApRewards", "travelBudget", "affection", "trust", "spark", "romanceStage", "confessionStatus", "memories", "claimedRewardIds", "completedEpisodeIds", "completedCityIds", "battleRecords", "playedDateIds"] as const)
        expect(state[field]).toEqual(completed[field]);
      expect(advanceCompletedJourneyCity(state, state.revision)).toBe(state);
      expect(loadGame(milanSlot)).toEqual({ status: "loaded", state: milan });
    }
    expect(state.completedCityIds).toEqual(["delhi", "agra", "jaipur"]);
    expect(state.viewedEpilogueCityIds).toEqual(["delhi", "agra", "jaipur"]);
    expect(state.playedDateIds).toHaveLength(18);
    expect(state.memories).toHaveLength(18);
    expect(new Set(state.claimedRewardIds).size).toBe(state.claimedRewardIds.length);
    expect(getNextCity(state)).toBeUndefined();
  }, 120_000);
});


it("finishes the three-city story without any date or optional memory, in alternating sightseeing orders", () => {
  let state = createGame("航", "澪", { journeyId: "golden_triangle" });
  const journey = getJourney("golden_triangle")!;
  const roundtrip = (current: GameState) => {
    const values = new Map<string, string>();
    const storage: StorageLike = { getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value); } };
    expect(saveGame(storage, current).ok).toBe(true);
    const restored = loadGame(storage);
    expect(restored).toEqual({ status: "loaded", state: current });
    if (restored.status !== "loaded") throw new Error("Expected a current-version save");
    return restored.state;
  };
  for (const [cityIndex, city] of journey.cities.entries()) {
    expect(state.currentCityId).toBe(city.id);
    state = startCityArrival(state, state.revision);
    state = completeArrivalLogo(state, state.revision);
    for (let step = 0; state.activeEpilogue; step++) {
      expect(step).toBeLessThan(40);
      state = advanceCityEpilogue(state, state.revision);
    }
    const main = episodes.filter((episode) => episode.cityId === city.id && episode.kind === "episode");
    const order = [[1, 3, 0, 2], [2, 0, 3, 1], [3, 1, 2, 0]][cityIndex];
    const finale = episodes.find((episode) => episode.cityId === city.id && episode.kind === "city_finale")!;
    for (const [position, episode] of [...order.map((index) => main[index]), finale].entries()) {
      state = startEpisode(state, episode.id);
      if (episode.kind === "episode") {
        for (let step = 0; state.activeTourism?.phase === "guide"; step++) {
          expect(step).toBeLessThan(100);
          state = advanceTourismGuide(state, state.revision);
        }
        state = startTourismBattle(state, state.revision);
      }
      let score = 0;
      for (let step = 0; state.activeBattle?.phase !== "result"; step++) {
        expect(step).toBeLessThan(300);
        const active = state.activeBattle!;
        expect(active).toBeTruthy();
        if (active.phase === "question") {
          const question = getActiveBattleContent(active).quiz.questions[active.roundIndex];
          // Include completely wrong, mixed and perfect ordinary battles.
          const correct = position === 2 || (position > 0 && active.roundIndex % 2 === 0);
          const option = correct ? question.correctOptionId : question.options.find((answer) => answer.id !== question.correctOptionId)!.id;
          const beforeAnswer = state;
          state = answerBattle(state, option, beforeAnswer.revision);
          expect(answerBattle(state, option, beforeAnswer.revision)).toBe(state);
          state = roundtrip(state);
          if (correct) score++;
        } else state = advanceBattle(state, state.revision);
      }
      expect(state.activeBattle?.score).toBe(score);
      const rewarded = state;
      state = leaveBattleResult(state, state.revision);
      expect(leaveBattleResult(state, rewarded.revision)).toBe(state);
      state = roundtrip(state);
      expect(state.playedDateIds).toEqual([]);
      expect(state.memories).toEqual([]);
      expect(state.endingReached).toBe(false);
    }
    state = advanceCompletedJourneyCity(state, state.revision);
    for (let step = 0; state.activeEpilogue; step++) {
      expect(step).toBeLessThan(120);
      expect(state.activeEpilogue.frame.speaker).not.toBe("player");
      state = roundtrip(advanceCityEpilogue(state, state.revision));
    }
    state = advanceCompletedJourneyCity(state, state.revision);
    expect(state.currentCityId).toBe(journey.cities[cityIndex + 1]?.id ?? city.id);
  }
  expect(state.viewedEpilogueCityIds).toEqual(["delhi", "agra", "jaipur"]);
  expect(state.playedDateIds).toEqual([]);
  expect(state.memories).toEqual([]);
  expect(new Set(state.claimedRewardIds).size).toBe(state.claimedRewardIds.length);
}, 120_000);
