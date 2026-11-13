import { describe, expect, it } from "vitest";
import { createGame, validateGameState, type GameState } from "../../../src/domain/game";
import { createDebugState } from "../../../src/dev/debug-state";
import { finishEpisode } from "../../../src/dev/scenario-builders";
import { advanceEncounter, chooseEncounter, continueTourismEncounters, encounterCanFinish, finishEncounter, validateEncounterState } from "../../../src/domain/encounter";
import { meetEncounter } from "../../fixtures/encounter-moment";
import { closeTourism } from "../../../src/domain/tourism";

/**
 * Meet the encounter at its moment (in a new observation of its landmark, or after its landmark's battle) and play it with the
 * given choice; its moment goes on (back to the observation, or on to free time).
 */
function play(state: GameState, id: string, optionId: string): GameState {
  let next = meetEncounter(state, id);
  expect(next.activeEncounter?.encounterId).toBe(id);
  for (let step = 0; step < 100 && next.activeEncounter?.encounterId === id; step++) {
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
      const finished = finishEncounter(next, revision);
      expect(finishEncounter(finished, revision)).toBe(finished);
      // Back in the observation it stays there; after a battle its moment goes on to free time.
      next = finished.activeTourism ? finished : continueTourismEncounters(next, finished, () => 0);
    } else next = advanceEncounter(next, next.revision);
  }
  expect(next.activeEncounter).toBeNull();
  validateEncounterState(next);
  return next;
}

describe("the Milan pick and location encounters", () => {
  it("keeps Nora's pick for a later Duomo moment after 「また今度」, then Tino gets it after the castle's battle, or it is kept", () => {
    const base = finishEpisode(createGame("たいち", "あゆみ"), "milano_duomo_episode");
    let state = play(base, "duomo_string", "leave");
    expect(state.inventory.blue_pick).toBeUndefined();
    expect(state.seenEncounterIds).toContain("duomo_string");
    expect(state.completedEncounterIds).not.toContain("duomo_string");
    state = play(state, "duomo_string", "case");
    expect(state.inventory.blue_pick).toBe("held");
    // The castle has no later moment: keeping the pick completes Tino's scene too (no 「また今度」).
    const kept = play(state, "castello_pick", "keep");
    expect(kept.inventory.blue_pick).toBe("held");
    expect(kept.completedEncounterIds).toContain("castello_pick");
    state = play(state, "castello_pick", "give");
    expect(state.inventory.blue_pick).toBe("gifted");
    expect(state.itemUses).toEqual({ blue_pick: { encounterId: "castello_pick", optionId: "give" } });
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
