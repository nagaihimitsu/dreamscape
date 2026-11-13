import { describe, expect, it } from "vitest";
import { createGame, validateGameState, type GameState } from "../../../src/domain/game";
import { createDebugState } from "../../../src/dev/debug-state";
import { advanceEncounter, chooseEncounter, encounterCanFinish, finishEncounter, validateEncounterState } from "../../../src/domain/encounter";
import { encounterOffered, meetEncounter } from "../../fixtures/encounter-moment";
import { closeTourism } from "../../../src/domain/tourism";

/** Meet the encounter in a new observation of its landmark and play it with the given choice. */
function play(state: GameState, id: string, optionId: string): GameState {
  let next = meetEncounter(state, id);
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
    } else if (encounterCanFinish(next)) {
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
    expect(encounterOffered(state, "castello_pick").available).toBe(false);
    state = { ...state, completedEpisodeIds: [...state.completedEpisodeIds, "milano_castello_episode"] };
    state = play(state, "castello_pick", "later");
    expect(state.inventory.blue_pick).toBe("held");
    state = play(state, "castello_pick", "give");
    expect(state.inventory.blue_pick).toBe("gifted");
    expect(encounterOffered(state, "castello_pick").available).toBe(false);
  });

  it("hands the wish's ticket on to Rina's crest room after the battle, where a print uses it once", () => {
    let state = createDebugState({
      scene: "encounter", id: "galleria_fortune", progress: "completed",
      ap: 9, affection: 0, trust: 0, spark: 0, roll: "positive",
    });
    for (let step = 0; state.activeEncounter && step < 100; step++) {
      const active = state.activeEncounter;
      state = active.frame.choices.length
        ? chooseEncounter(state, 0, state.revision)
        : encounterCanFinish(state)
          ? finishEncounter(state, state.revision)
          : advanceEncounter(state, state.revision);
      state = validateGameState(JSON.parse(JSON.stringify(state)));
    }
    expect(state.activeEncounter).toBeNull();
    expect(state.completedEncounterIds).toContain("galleria_fortune");
    // The ticket is the talk's that follows the wish (no lottery since 2026-11-13).
    state = play(state, "milano_galleria_ticket_gift", "");
    expect(state.inventory.galleria_ticket).toBe("held");
    expect(state.activeTourism?.landmarkId).toBe("galleria_vittorio_emanuele_ii");
    state = closeTourism(state, state.revision);
    const before = state.travelBudget;
    // With the ticket, the stall offers its prints (the paid print and the sample are hidden); 「また今度」 keeps it.
    state = play(state, "galleria_print", "leave");
    expect(state.inventory.galleria_ticket).toBe("held");
    state = play(state, "galleria_print", "roof");
    expect(state.inventory.galleria_ticket).toBe("used");
    expect(state.itemUses).toEqual({ galleria_ticket: { encounterId: "galleria_print", optionId: "roof" } });
    expect(state.completedEncounterIds).toContain("galleria_print");
    expect(state.travelBudget).toBe(before);
  });
});
