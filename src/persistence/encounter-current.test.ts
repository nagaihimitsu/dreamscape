import { describe, expect, it } from "vitest";
import { createDebugState, type DebugSettings } from "../dev/debug-state";
import { advanceEncounter, chooseEncounter } from "../domain/encounter";
import { setNames, startDate, validateGameState } from "../domain/game";
import { getBattleAvailability } from "../domain/battle";
import { getTourismAvailability } from "../domain/tourism";
import { claimPendingRewards } from "../domain/rewards";
import { loadGame, saveGame, type StorageLike } from ".";

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}
const initial: DebugSettings = {
  scene: "encounter", id: "duomo_string", progress: "completed", ap: 9,
  affection: 0, trust: 0, spark: 0, roll: "positive",
};

describe("current encounter save protection", () => {
  it("persists the preselected tickets and rejects a stale competing choice", () => {
    let state = createDebugState(initial);
    for (let count = 0; !state.activeEncounter!.frame.choices.length && count < 100; count++)
      state = advanceEncounter(state, state.revision);
    expect(state.activeEncounter!.frame.choices.length).toBeGreaterThan(1);
    const storage = new MemoryStorage();
    expect(saveGame(storage, state).ok).toBe(true);
    const first = chooseEncounter(state, 0, state.revision);
    const other = chooseEncounter(state, 1, state.revision);
    expect(first.activeEncounter?.romanceRoll).toEqual(state.activeEncounter?.romanceRoll);
    expect(first.activeEncounter?.rewardRoll).toEqual(state.activeEncounter?.rewardRoll);
    expect(saveGame(storage, first, state).ok).toBe(true);
    expect(saveGame(storage, other, state).ok).toBe(false);
    const loaded = loadGame(storage);
    expect(loaded.status).toBe("loaded");
    if (loaded.status === "loaded") expect(loaded.state.activeEncounter).toEqual(first.activeEncounter);
  });

  it("blocks other activity and reward mutation while an encounter is active", () => {
    const state = createDebugState(initial);
    expect(getBattleAvailability(state, "milano_duomo_01").available).toBe(false);
    expect(getTourismAvailability(state, "duomo_milano").available).toBe(false);
    expect(startDate(state, "milano_cafe_01")).toBe(state);
    expect(setNames(state, "name", "name")).toBe(state);
    expect(claimPendingRewards(state, state.revision)).toBe(state);
    const battle = createDebugState({ ...initial, scene: "battle", id: "milano_duomo_01" });
    expect(() => validateGameState({ ...state, activeBattle: battle.activeBattle })).toThrow();
  });
});
