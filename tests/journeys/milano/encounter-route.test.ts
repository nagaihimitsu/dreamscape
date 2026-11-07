// Integration route through Milan's place encounters with the game's real Ink and domain functions
// (formerly qa/encounter-route.ts and qa/place-entry.ts). Completed sightseeing is a fixture.
// Location gating, browser storage and previous publication snapshots have separate tests.
import { describe, expect, it } from "vitest";
import { createGame, type GameState } from "../../../src/domain/game";
import {
  advanceEncounter,
  answerEncounterQuiz,
  chooseEncounter,
  encounterCanFinish,
  finishEncounter,
  getEncounterAvailability,
  startEncounter,
  validateEncounterState,
} from "../../../src/domain/encounter";

function play(state: GameState, id: string, optionId: string, roll = 0, answer = "B"): GameState {
  const initialRevision = state.revision;
  let next = startEncounter(state, id, () => roll);
  expect(next.revision, id).not.toBe(initialRevision);
  for (let turn = 0; turn < 100; turn++) {
    validateEncounterState(next);
    // Reconstruct the complete active snapshot between every action.
    next = JSON.parse(JSON.stringify(next)) as GameState;
    const active = next.activeEncounter!;
    if (active.phase === "quiz") {
      next = answerEncounterQuiz(next, answer, next.revision);
    } else if (active.frame.choices.length) {
      const choice = active.frame.choices.find((item) => item.optionId === optionId);
      expect(choice, `${id}/${optionId}`).toBeDefined();
      next = chooseEncounter(next, choice!.index, next.revision);
    } else if (encounterCanFinish(next)) {
      const done = finishEncounter(next, next.revision);
      expect(done.activeEncounter).toBeNull();
      expect(finishEncounter(done, next.revision)).toEqual(done);
      validateEncounterState(done);
      return done;
    } else {
      next = advanceEncounter(next, next.revision);
    }
  }
  throw new Error(`Unfinished: ${id}`);
}

describe("Milan encounter route", () => {
  it("defers and gives the pick, pays before the ticket, keeps draws and redeems the ticket later", () => {
    const fresh = createGame("ユウ", "ミオ");
    const initial: GameState = {
      ...fresh,
      completedEpisodeIds: ["milano_duomo_episode", "milano_galleria_episode", "milano_last_supper_episode", "milano_castello_episode", "milano_finale"],
      completedCityIds: ["milano"],
      completedChapters: ["milano"],
      battleRecords: [{ battleId: "milano_galleria_01", firstScore: 0, lastScore: 0, bestScore: 0, attempts: 1 }],
    };
    const budget = initial.travelBudget;
    expect(getEncounterAvailability(initial, "castello_pick").available).toBe(false);
    let game = play(initial, "duomo_string", "leave");
    expect(game.inventory.blue_pick).toBeUndefined();
    expect(game.completedEncounterIds).not.toContain("duomo_string");
    game = play(game, "duomo_string", "case");
    expect(game.inventory.blue_pick).toBe("held");
    game = play(game, "castello_pick", "later");
    expect(game.inventory.blue_pick).toBe("held");
    game = play(game, "castello_pick", "give");
    expect(game.inventory.blue_pick).toBe("gifted");
    expect(getEncounterAvailability(game, "castello_pick").available).toBe(false);
    game = play(game, "galleria_print", "pay");
    expect(game.travelBudget).toBe(budget - 4);
    expect(getEncounterAvailability(game, "galleria_ticket_press").available).toBe(false);
    game = play(game, "galleria_fortune", "believe", 1, "A");
    expect(game.encounterRewards.galleria_fortune).toBeUndefined();
    const beforeDraw = game;
    game = play(game, "galleria_fortune", "doubt", 2499);
    expect(game.inventory.galleria_ticket).toBe("held");
    expect(game.encounterRewards.galleria_fortune.won).toBe(true);
    game = play(game, "galleria_ticket_press", "later");
    expect(game.inventory.galleria_ticket).toBe("held");
    game = play(game, "galleria_ticket_press", "press");
    expect(game.inventory.galleria_ticket).toBe("used");
    game = play(game, "galleria_fortune", "believe", 9999);
    expect(game.inventory.galleria_ticket).toBe("used");
    expect(game.encounterRewards.galleria_fortune.roll).toBe(2499);
    expect(game.claimedRewardIds.filter((id) => id === "victory_galleria_first")).toHaveLength(1);
    expect(game.travelBudget).toBe(budget - 4);

    let lost = play(beforeDraw, "galleria_fortune", "doubt", 2500);
    expect(lost.encounterRewards.galleria_fortune.won).toBe(false);
    lost = play(lost, "galleria_fortune", "believe", 0);
    expect(lost.encounterRewards.galleria_fortune.roll).toBe(2500);
    expect(lost.inventory.galleria_ticket).toBeUndefined();

    // The bookmark from the dormant Galleria cafe can still be offered at Brera once its case is complete.
    const withBookmark: GameState = {
      ...initial,
      completedEncounterIds: ["galleria_cafe", "galleria_outing"],
      inventory: { galleria_souvenir: "held" },
      battleRecords: [...initial.battleRecords, { battleId: "milano_brera_c01", attempts: 1, firstScore: 2, bestScore: 2, lastScore: 2 }],
    };
    expect(play(withBookmark, "brera_bookmark", "offer").inventory.galleria_souvenir).toBe("gifted");
  });
});

describe("Milan place entry", () => {
  it("gates encounters by visited place and case, keeps dormant ones closed and allows a free exit", () => {
    const fresh = createGame("ユウ", "ミオ");
    const first: GameState = { ...fresh, completedEpisodeIds: ["milano_duomo_episode"], completedChapters: ["milano"] };
    // A completed episode in a real save always carries its completed battle.
    const second: GameState = {
      ...first,
      completedEpisodeIds: [...first.completedEpisodeIds, "milano_galleria_episode"],
      battleRecords: [{ battleId: "milano_galleria_01", firstScore: 0, lastScore: 0, bestScore: 0, attempts: 1 }],
    };
    expect(getEncounterAvailability(first, "duomo_string").available).toBe(true);
    expect(getEncounterAvailability(first, "galleria_fortune").available).toBe(false);
    expect(getEncounterAvailability(second, "galleria_print").available).toBe(false);
    expect(getEncounterAvailability(second, "galleria_cafe").available).toBe(false);
    expect(getEncounterAvailability(second, "scala_mint").available).toBe(false);

    let state = startEncounter(second, "galleria_fortune", () => 100);
    for (let i = 0; !state.activeEncounter!.frame.choices.length; i++) {
      expect(i).toBeLessThan(30);
      state = advanceEncounter(state, state.revision);
    }
    const leave = state.activeEncounter!.frame.choices.find((choice) => choice.optionId === "leave")!;
    state = chooseEncounter(state, leave.index, state.revision);
    while (state.activeEncounter) {
      expect(state.activeEncounter.phase).toBe("story");
      validateEncounterState(state);
      state = advanceEncounter(state, state.revision);
    }
    expect(state.ap).toBe(0);
    expect(state.inventory).toEqual({});
    expect(state.encounterRewards).toEqual({});
    expect(state.completedEncounterIds).toEqual([]);
    expect(getEncounterAvailability(state, "galleria_fortune").available).toBe(true);
    const afterScala: GameState = {
      ...second,
      battleRecords: [{ battleId: "milano_la_scala_b01", firstScore: 0, lastScore: 0, bestScore: 0, attempts: 1 }],
    };
    expect(getEncounterAvailability(afterScala, "scala_mint").available).toBe(true);
  });
});
