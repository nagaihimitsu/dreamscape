import { describe, expect, it } from "vitest";
import { advanceDate, chooseDate, createGame, finishDate, validateGameState, type GameState } from "./game";
import { getEpisodeAvailability, startEpisode } from "./chapter";
import { skipTourismGuide, startTourismBattle } from "./tourism";
import { advanceBattle, answerBattle, getActiveBattleContent, leaveBattle, selectReasoningClue, startBattle, submitBattleEvidence } from "./battle";
import { beginTravelEvent, finishTravelEventIfComplete, getTravelEventAvailability, sleepAtHotel, waitForTravel } from "./travel-game";

const mainEpisodes = ["milano_duomo_episode", "milano_galleria_episode", "milano_last_supper_episode", "milano_castello_episode"];
const specials = ["milano_la_scala_b01", "milano_brera_c01"];

function permutations<T>(items: readonly T[]): T[][] {
  return items.length === 0 ? [[]] : items.flatMap((item, i) => permutations(items.filter((_, j) => i !== j)).map((tail) => [item, ...tail]));
}

/** Execute the real battle rules and case evidence, rather than faking its receipt. */
function completeBattle(initial: GameState): GameState {
  let state = initial;
  expect(state.activeBattle).not.toBeNull();
  for (let count = 0; state.activeBattle?.phase !== "result"; count++) {
    expect(count).toBeLessThan(220);
    const active = state.activeBattle!;
    const { battle, quiz } = getActiveBattleContent(active);
    if (active.phase === "reasoning") {
      for (const id of battle.reasoning!.correctClueIds) state = selectReasoningClue(state, id, state.revision);
      const next = submitBattleEvidence(state, state.revision);
      state = finishTravelEventIfComplete(state, next);
    } else if (active.phase === "question") {
      const next = answerBattle(state, quiz.questions[active.roundIndex].correctOptionId, state.revision);
      state = finishTravelEventIfComplete(state, next);
    } else {
      const next = advanceBattle(state, state.revision);
      state = finishTravelEventIfComplete(state, next);
    }
  }
  return validateGameState(JSON.parse(JSON.stringify(leaveBattle(state, state.revision))));
}

describe("Milan independent main destinations", () => {
  it.each(permutations(mainEpisodes).flatMap((main) => permutations(specials).map((special) => ({ main, special }))))(
    "completes $main then $special and the finale through the real game rules",
    ({ main, special }) => {
      let state = createGame();
      expect(getEpisodeAvailability(state, "milano_finale").available).toBe(false);
      for (const episodeId of main) {
        expect(getEpisodeAvailability(state, episodeId).available).toBe(true);
        state = startEpisode(state, episodeId);
        expect(state.activeTourism).not.toBeNull();
        state = skipTourismGuide(state, state.revision);
        state = completeBattle(startTourismBattle(state, state.revision));
        expect(state.completedEpisodeIds).toContain(episodeId);
      }
      expect(getEpisodeAvailability(state, "milano_finale").available).toBe(false);
      for (const id of special) {
        state = completeBattle(startBattle(state, id));
        expect(state.battleRecords.find((record) => record.battleId === id)?.attempts).toBe(1);
      }
      expect(getEpisodeAvailability(state, "milano_finale").available).toBe(true);
      state = completeBattle(startEpisode(state, "milano_finale"));
      expect(state.completedCityIds).toContain("milano");
    },
    30000,
  );

  it("permits both special battles interleaved with the main visits", () => {
    let state = createGame();
    const actions = [specials[1], mainEpisodes[3], specials[0], mainEpisodes[1], mainEpisodes[0], mainEpisodes[2]];
    for (const id of actions) {
      if (specials.includes(id)) {
        state = completeBattle(startBattle(state, id));
      } else {
        expect(getEpisodeAvailability(state, id).available).toBe(true);
        state = startEpisode(state, id);
        expect(state.activeTourism).not.toBeNull();
        state = skipTourismGuide(state, state.revision);
        state = completeBattle(startTourismBattle(state, state.revision));
      }
    }
    expect(getEpisodeAvailability(state, "milano_finale").available).toBe(true);
    state = completeBattle(startEpisode(state, "milano_finale"));
    expect(state.completedCityIds).toContain("milano");
  });
});

describe("Milan real travel itineraries", () => {
  it.each([
    ["milano_la_scala_b01", "la_scala_case", "scala_mint"],
    ["milano_brera_c01", "brera_case", "brera_sitter"],
  ])("does not revisit completed %s even when %s has a pending %s encounter", (id) => {
    const initial = createGame();
    const first = beginTravelEvent(initial, id, "walk", initial.revision);
    expect(first.activeBattle?.battleId).toBe(id);
    const completed = completeBattle(first);
    const revisit = beginTravelEvent(completed, id, "walk", completed.revision);
    expect(revisit).toBe(completed);
  });

  it.each(permutations(mainEpisodes).flatMap((main) => permutations(specials).map((special) => ({ main, special }))))(
    "can walk through $main and $special, sleep and reach the finale",
    ({ main, special }) => {
      let state = createGame();
      const play = (id: string) => {
        // Wait for a venue or a new day using the same actions available to the player.
        for (let attempt = 0; !getTravelEventAvailability(state, id, "walk").available; attempt++) {
          expect(attempt).toBeLessThan(120);
          const waited = waitForTravel(state, 30, state.revision);
          if (waited !== state) state = waited;
          else {
            const slept = sleepAtHotel(state, "walk", state.revision);
            expect(slept).not.toBe(state);
            state = slept;
          }
        }
        const started = beginTravelEvent(state, id, "walk", state.revision);
        expect(started).not.toBe(state);
        state = started;
        if (state.activeTourism) {
          if (state.activeTourism.phase === "guide") state = skipTourismGuide(state, state.revision);
          state = startTourismBattle(state, state.revision);
        }
        state = completeBattle(state);
        expect(state.travel.activeEvent).toBeNull();
      };
      for (const id of main) play(id);
      const beforeSleep = state;
      state = sleepAtHotel(state, "walk", state.revision);
      expect(state).not.toBe(beforeSleep);
      expect(state.travel.day).toBe(beforeSleep.travel.day + 1);
      expect(state.travel.minute).toBe(9 * 60);
      expect(state.ap).toBe(beforeSleep.ap);
      for (const id of special) play(id);
      play("milano_finale");
      expect(state.completedCityIds).toContain("milano");
    },
    30000,
  );

  it("continues a real itinerary through a date, a night at the hotel, and the finale", () => {
    let state = createGame();
    const depart = (id: string) => {
      for (let attempt = 0; !getTravelEventAvailability(state, id, "walk").available; attempt++) {
        expect(attempt).toBeLessThan(120);
        const waited = waitForTravel(state, 30, state.revision);
        if (waited !== state) state = waited;
        else {
          const slept = sleepAtHotel(state, "walk", state.revision);
          expect(slept).not.toBe(state);
          state = slept;
        }
      }
      const started = beginTravelEvent(state, id, "walk", state.revision, () => 1);
      expect(started).not.toBe(state);
      state = started;
    };
    const playBattle = (id: string) => {
      depart(id);
      if (state.activeTourism) {
        if (state.activeTourism.phase === "guide") state = skipTourismGuide(state, state.revision);
        state = startTourismBattle(state, state.revision);
      }
      state = completeBattle(state);
      expect(state.travel.activeEvent).toBeNull();
    };

    playBattle("milano_duomo_episode");
    const beforeDate = state;
    depart("milano_san_satiro_date_01");
    expect(state.ap).toBe(beforeDate.ap - 2);
    const endMinute = state.travel.activeEvent!.endMinute;
    for (let step = 0; state.activeDate; step++) {
      expect(step).toBeLessThan(100);
      const frame = state.activeDate.frame;
      const next = frame.ended ? finishDate(state, state.revision)
        : frame.choices.length ? chooseDate(state, frame.choices[0].index, state.revision)
        : advanceDate(state, state.revision);
      state = finishTravelEventIfComplete(state, next);
    }
    expect(state.travel.minute).toBe(endMinute);
    expect(state.playedDateIds).toContain("milano_san_satiro_date_01");
    expect(state.memories.length).toBeGreaterThan(0);
    const beforeSleep = state;
    state = sleepAtHotel(state, "walk", state.revision);
    expect(state).not.toBe(beforeSleep);
    expect(state.ap).toBe(beforeSleep.ap);
    for (const id of ["milano_galleria_episode", "milano_last_supper_episode", "milano_castello_episode", ...specials, "milano_finale"]) playBattle(id);
    expect(state.completedCityIds).toContain("milano");
    expect(state.playedDateIds).toContain("milano_san_satiro_date_01");
  }, 30000);
});
