// Integration route through Milan's place encounters with the game's real Ink and domain functions
// (formerly qa/encounter-route.ts and qa/place-entry.ts). Completed sightseeing is a fixture; every encounter
// is met in a new observation of its landmark, the only moment encounters start at.
// Location gating, browser storage and previous publication snapshots have separate tests.
import { describe, expect, it } from "vitest";
import { createGame, type GameState } from "../../../src/domain/game";
import {
  advanceEncounter,
  chooseEncounter,
  encounterCanFinish,
  finishEncounter,
  validateEncounterState,
} from "../../../src/domain/encounter";
import { encounterOffered, meetEncounter } from "../../fixtures/encounter-moment";

function play(state: GameState, id: string, optionId: string, roll = 0): GameState {
  const initialRevision = state.revision;
  let next = meetEncounter(state, id, () => roll);
  expect(next.revision, id).not.toBe(initialRevision);
  for (let turn = 0; turn < 100; turn++) {
    validateEncounterState(next);
    // Reconstruct the complete active snapshot between every action.
    next = JSON.parse(JSON.stringify(next)) as GameState;
    const active = next.activeEncounter!;
    if (active.frame.choices.length) {
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
  it("defers and gives the pick, pays before the ticket, and redeems the ticket the wish's talk gives", () => {
    const fresh = createGame("ユウ", "ミオ");
    const initial: GameState = {
      ...fresh,
      completedEpisodeIds: ["milano_duomo_episode", "milano_galleria_episode", "milano_last_supper_episode", "milano_castello_episode", "milano_finale"],
      completedCityIds: ["milano"],
      battleRecords: [{ battleId: "milano_galleria_01", firstScore: 0, lastScore: 0, bestScore: 0, attempts: 1 }],
    };
    const budget = initial.travelBudget;
    expect(encounterOffered(initial, "castello_pick").available).toBe(false);
    let game = play(initial, "duomo_string", "leave");
    expect(game.inventory.blue_pick).toBeUndefined();
    expect(game.completedEncounterIds).not.toContain("duomo_string");
    game = play(game, "duomo_string", "case");
    expect(game.inventory.blue_pick).toBe("held");
    game = play(game, "castello_pick", "later");
    expect(game.inventory.blue_pick).toBe("held");
    game = play(game, "castello_pick", "give");
    expect(game.inventory.blue_pick).toBe("gifted");
    expect(encounterOffered(game, "castello_pick").available).toBe(false);
    game = play(game, "galleria_print", "pay");
    expect(game.travelBudget).toBe(budget - 4);
    expect(encounterOffered(game, "galleria_ticket_press").available).toBe(false);
    // The wish completes with any choice and earns the battle's two-correct reward once; its ticket talk gives the ticket.
    game = play(game, "galleria_fortune", "believe");
    expect(game.claimedRewardIds.filter((id) => id === "victory_galleria_first")).toHaveLength(1);
    expect(game.inventory.galleria_ticket).toBeUndefined();
    game = play(game, "milano_galleria_ticket_gift", "");
    expect(game.inventory.galleria_ticket).toBe("held");
    game = play(game, "galleria_ticket_press", "later");
    expect(game.inventory.galleria_ticket).toBe("held");
    game = play(game, "galleria_ticket_press", "press");
    expect(game.inventory.galleria_ticket).toBe("used");
    game = play(game, "galleria_fortune", "doubt");
    expect(game.inventory.galleria_ticket).toBe("used");
    expect(game.encounterRewards).toEqual({});
    expect(game.claimedRewardIds.filter((id) => id === "victory_galleria_first")).toHaveLength(1);
    expect(game.travelBudget).toBe(budget - 4);
  });
});

describe("Milan place entry", () => {
  it("gates encounters by visited place and case and allows a free exit", () => {
    const fresh = createGame("ユウ", "ミオ");
    const first: GameState = { ...fresh, completedEpisodeIds: ["milano_duomo_episode"] };
    // A completed episode in a real save always carries its completed battle.
    const second: GameState = {
      ...first,
      completedEpisodeIds: [...first.completedEpisodeIds, "milano_galleria_episode"],
      battleRecords: [{ battleId: "milano_galleria_01", firstScore: 0, lastScore: 0, bestScore: 0, attempts: 1 }],
    };
    expect(encounterOffered(first, "duomo_string").available).toBe(true);
    // The wish is met in the Galleria's first observation; every choice completes it, with the shared AP.
    expect(encounterOffered(first, "galleria_fortune").available).toBe(true);
    expect(encounterOffered(second, "galleria_print").available).toBe(false);
    expect(encounterOffered(second, "scala_mint").available).toBe(false);

    let state = meetEncounter(second, "galleria_fortune", () => 100);
    for (let i = 0; !state.activeEncounter!.frame.choices.length; i++) {
      expect(i).toBeLessThan(30);
      state = advanceEncounter(state, state.revision);
    }
    const leave = state.activeEncounter!.frame.choices.find((choice) => choice.optionId === "leave")!;
    state = chooseEncounter(state, leave.index, state.revision);
    while (state.activeEncounter) {
      expect(state.activeEncounter.phase).toBe("story");
      validateEncounterState(state);
      state = encounterCanFinish(state) ? finishEncounter(state, state.revision) : advanceEncounter(state, state.revision);
    }
    expect(state.ap).toBe(second.ap + 1);
    expect(state.inventory).toEqual({});
    expect(state.encounterRewards).toEqual({});
    expect(state.completedEncounterIds).toEqual(["galleria_fortune"]);
    expect(encounterOffered(state, "galleria_fortune").available).toBe(true);
    const afterScala: GameState = {
      ...second,
      battleRecords: [{ battleId: "milano_la_scala_b01", firstScore: 0, lastScore: 0, bestScore: 0, attempts: 1 }],
    };
    expect(encounterOffered(afterScala, "scala_mint").available).toBe(true);
  });
});
