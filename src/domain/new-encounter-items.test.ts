import { describe, expect, it } from "vitest";
import { createGame, validateGameState, type GameState } from "./game";
import previouslyAwarded from "../../qa/old-saves/fortune-awarded.json";
import { advanceEncounter, chooseEncounter, finishEncounter, getEncounterAvailability, startEncounter, validateEncounterState } from "./encounter";

function play(state: GameState, id: string, optionId: string): GameState {
  let next = startEncounter(state, id, () => 0);
  expect(next.activeEncounter?.encounterId).toBe(id);
  for (let step = 0; step < 100 && next.activeEncounter; step++) {
    // The running scene may be saved/reloaded at every line and choice.
    next = JSON.parse(JSON.stringify(next));
    validateEncounterState(next);
    const active = next.activeEncounter!;
    if (active.frame.choices.length) {
      const choice = active.frame.choices.find((item) => item.optionId === optionId);
      expect(choice).toBeDefined();
      next = chooseEncounter(next, choice!.index, next.revision);
    } else if (active.frame.ended) {
      const revision = next.revision;
      next = finishEncounter(next, revision);
      expect(finishEncounter(next, revision)).toBe(next);
    } else next = advanceEncounter(next, next.revision);
  }
  expect(next.activeEncounter).toBeNull();
  validateEncounterState(next);
  return next;
}

describe("the Milan pick and location encounters", () => {
  it("preserves an unclaimed encounter when leaving and permits the city-local pick to be given later", () => {
    const base = { ...createGame("たいち", "あゆみ"), completedEpisodeIds: ["milano_duomo_episode"] };
    let state = play(base, "duomo_string", "leave");
    expect(state.inventory.blue_pick).toBeUndefined();
    expect(state.completedEncounterIds).not.toContain("duomo_string");
    state = play(state, "duomo_string", "case");
    expect(state.inventory.blue_pick).toBe("held");
    expect(getEncounterAvailability(state, "castello_pick").available).toBe(false);
    state = { ...state, completedEpisodeIds: [...state.completedEpisodeIds, "milano_castello_episode"] };
    state = play(state, "castello_pick", "later");
    expect(state.inventory.blue_pick).toBe("held");
    state = play(state, "castello_pick", "give");
    expect(state.inventory.blue_pick).toBe("gifted");
    expect(getEncounterAvailability(state, "castello_pick").available).toBe(false);
  });

  it("does not require a ticket for the ordinary print visit and spends the stated cost exactly once", () => {
    const base = { ...createGame("たいち", "あゆみ"), completedEpisodeIds: ["milano_last_supper_episode"] };
    const paid = play(base, "galleria_print", "pay");
    expect(paid.travelBudget).toBe(base.travelBudget - 4);
    expect(paid.inventory.galleria_ticket).toBeUndefined();
    expect(getEncounterAvailability(paid, "galleria_ticket_press").available).toBe(false);
  });

  it("lets a preexisting ticket be used later even after paying for the ordinary print", () => {
    let state = validateGameState(previouslyAwarded);
    for (let step = 0; state.activeEncounter && step < 50; step++) {
      const active = state.activeEncounter;
      state = active.frame.ended && active.phase === "outcome"
        ? finishEncounter(state, state.revision)
        : advanceEncounter(state, state.revision);
      state = validateGameState(JSON.parse(JSON.stringify(state)));
    }
    expect(state.activeEncounter).toBeNull();
    expect(state.inventory.galleria_ticket).toBe("held");
    const before = state.travelBudget;
    state = play(state, "galleria_print", "pay");
    expect(state.travelBudget).toBe(before - 4);
    state = play(state, "galleria_ticket_press", "later");
    expect(state.inventory.galleria_ticket).toBe("held");
    state = play(state, "galleria_ticket_press", "press");
    expect(state.inventory.galleria_ticket).toBe("used");
    expect(state.travelBudget).toBe(before - 4);
  });
});
