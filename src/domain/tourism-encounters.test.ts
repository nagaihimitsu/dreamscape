import { describe, expect, it } from "vitest";
import { encounters } from "../content/encounters";
import { createGame, type GameState } from "./game";
import { openTourism } from "./tourism";
import { advanceEncounter, answerEncounterQuiz, chooseEncounter, continueTourismEncounters, encounterCanFinish, finishEncounter, getTourismEncounterAvailability, proceedFromTourism, startTourismEncounter } from "./encounter";

const battleRecord = (battleId: string) => ({ battleId, attempts: 1, firstScore: 0, bestScore: 0, lastScore: 0 });

function visit(landmarkId: string): GameState {
  const state = { ...createGame(), visitedLandmarkIds: [landmarkId],
    completedEpisodeIds: ["milano_duomo_episode", "milano_galleria_episode", "milano_last_supper_episode", "milano_castello_episode"],
    battleRecords: ["milano_galleria_01", "milano_la_scala_b01", "milano_brera_c01"].map(battleRecord),
    inventory: { blue_pick: "held" as const, galleria_ticket: "held" as const },
  };
  const result = openTourism(state, landmarkId);
  expect(result.activeTourism?.phase).toBe("exploring");
  return result;
}

describe("automatic place encounters", () => {
  // Milan's encounters, met in a Milan game (other journeys' encounters belong to their own cities).
  it.each(encounters.encounters.filter((event) => event.cityId === "milano").map((event) => [event.id, event.landmarkId]))
    ("introduces %s when its location and existing conditions are met", (id, landmarkId) => {
      const state = visit(landmarkId);
      expect(getTourismEncounterAvailability(state, id).available).toBe(true);
      const next = startTourismEncounter(state, id, state.revision, () => 0);
      expect(next.activeEncounter?.encounterId).toBe(id);
      expect(next.activeEncounter?.returnTourism?.encounterIds).toContain(id);
    });

  it("runs newly unlocked encounters in sequence without repeating deferred choices", () => {
    let state = visit("galleria_vittorio_emanuele_ii");
    const inventory = { ...state.inventory };
    delete inventory.galleria_ticket;
    state = { ...state, inventory };
    state = proceedFromTourism(state, state.revision, () => 0);
    const seen: string[] = [];
    for (let i = 0; state.activeEncounter && i < 240; i++) {
      const active = state.activeEncounter;
      if (seen.at(-1) !== active.encounterId) seen.push(active.encounterId);
      const before = state;
      const choiceId = active.encounterId === "galleria_fortune" ? "believe" : active.encounterId === "galleria_print" ? "sample" : "later";
      let next: GameState;
      if (active.phase === "quiz") next = answerEncounterQuiz(state, "B", state.revision);
      else if (active.frame.choices.length) next = chooseEncounter(state, active.frame.choices.find((choice) => choice.optionId === choiceId)!.index, state.revision);
      else if (encounterCanFinish(state)) next = finishEncounter(state, state.revision);
      else next = advanceEncounter(state, state.revision);
      state = continueTourismEncounters(before, next, () => 0);
    }
    expect(seen).toEqual(["galleria_fortune", "galleria_print", "galleria_ticket_press"]);
    expect(state.activeEncounter).toBeNull();
    expect(state.activeTourism?.encounterIds).toEqual(seen);
    expect(state.inventory.galleria_ticket).toBe("held");
    expect(getTourismEncounterAvailability(state, "galleria_ticket_press").available).toBe(false);
  });
});
