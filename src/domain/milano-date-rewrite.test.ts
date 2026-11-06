import { describe, expect, it } from "vitest";
import { createDebugState } from "../dev/debug-state";
import { dates } from "../content";
import {
  advanceDate, chooseDate, finishDate, getDateAvailability,
  isEventVisible, startDate, validateGameState, type GameState,
} from "./game";

const newId = "milano_novecento_date_01";
const restore = (state: GameState) => validateGameState(JSON.parse(JSON.stringify(state)));

/** Generate a valid history via the current game rules. */
function currentFreeTime(): GameState {
  const state = createDebugState({ scene: "tourism", id: "duomo_milano", progress: "completed", ap: 12, affection: 0, trust: 0, spark: 0, roll: "positive" });
  return validateGameState({ ...state, activeTourism: null });
}

const seed = () => currentFreeTime();

describe("Milan date availability", () => {
  it("starts the Novecento date independently of other dates", () => {
    const state = seed();
    expect(state.playedDateIds).toEqual([]);
    const definition = dates.find((entry) => entry.id === newId)!;
    expect(definition.requiredPlayedDateIds).toEqual([]);
    expect(isEventVisible(state, newId)).toBe(true);
    expect(getDateAvailability(state, newId).available).toBe(true);
    const started = startDate(state, newId, () => 0);
    expect(started.activeDate?.dateId).toBe(newId);
    expect(started.ap).toBe(state.ap - definition.apCost);
    expect(restore(started)).toEqual(started);
    let completed = started;
    for (let i = 0; i < 100 && completed.activeDate; i++) {
      const active = completed.activeDate;
      if (active.frame.ended) completed = finishDate(completed, completed.revision);
      else if (active.frame.choices.length) completed = chooseDate(completed, 0, completed.revision);
      else completed = advanceDate(completed, completed.revision);
    }
    expect(completed.activeDate).toBeNull();
    expect(completed.playedDateIds).toContain(newId);
    expect(completed.memories.filter((memory) => memory === "sound_memory_novecento_date_01")).toHaveLength(1);
    expect(restore(completed)).toEqual(completed);
  });

  it("does not offer an ordinary date again after its first completion", () => {
    let state = startDate(seed(), "milano_cafe_01", () => 4321);
    for (let i = 0; i < 100 && state.activeDate; i++) {
      const frame = state.activeDate.frame;
      state = frame.ended ? finishDate(state, state.revision)
        : frame.choices.length ? chooseDate(state, 0, state.revision)
        : advanceDate(state, state.revision);
    }
    expect(state.playedDateIds).toContain("milano_cafe_01");
    expect(isEventVisible(state, "milano_cafe_01")).toBe(false);
    expect(getDateAvailability(state, "milano_cafe_01").available).toBe(false);
    expect(startDate(state, "milano_cafe_01")).toBe(state);
  });
});
