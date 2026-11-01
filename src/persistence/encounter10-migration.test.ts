import { describe, expect, it } from "vitest";
import phase6 from "../../tests/fixtures/phase6-saves.json";
import { seedLegacyChapter } from "../../tests/fixtures/legacy-game";
import { encounters } from "../content";
import { startEncounter } from "../domain/encounter";
import { grantRewardOnce, setNames, startDate, validateGameState, type GameState } from "../domain/game";
import { getBattleAvailability } from "../domain/battle";
import { getTourismAvailability } from "../domain/tourism";
import { claimPendingRewards } from "../domain/rewards";
import { loadGame, saveGame, SAVE_KEY, type StorageLike } from ".";

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

/** Represent a previously valid v9 save, without its v10-only properties. */
function asVersion9(state: GameState) {
  const { travelBudget: _budget, inventory: _inventory, completedEncounterIds: _completed,
    encounterRewards: _rewards, activeEncounter: _active, ...previous } = state;
  return { ...previous, schemaVersion: 9 };
}

describe("v10 encounter save migration", () => {
  it.each(["B_selected", "C_selected", "activeDate", "exploring", "freeTime"] as const)(
    "preserves the complete v9 %s snapshot and its original bytes", (name) => {
      const old = asVersion9(validateGameState(phase6[name]));
      const storage = new MemoryStorage();
      const raw = JSON.stringify(old);
      storage.setItem(SAVE_KEY, raw);
      const loaded = loadGame(storage);
      expect(loaded.status).toBe("loaded");
      if (loaded.status !== "loaded") return;
      expect(loaded.state).toEqual({ ...old, schemaVersion: 10,
        travelBudget: encounters.initialBudget, inventory: {}, completedEncounterIds: [],
        encounterRewards: {}, activeEncounter: null });
      expect(storage.getItem(SAVE_KEY)).toBe(raw);
      expect(validateGameState(JSON.parse(JSON.stringify(loaded.state)))).toEqual(loaded.state);
    },
  );

  it("keeps an unknown or damaged v9 payload instead of replacing it", () => {
    const old = asVersion9(validateGameState(phase6.B_selected));
    for (const invalid of [{ ...old, schemaVersion: 999 }, { ...old, ap: -1 }]) {
      const storage = new MemoryStorage();
      const raw = JSON.stringify(invalid);
      storage.setItem(SAVE_KEY, raw);
      expect(loadGame(storage).status).toBe("invalid");
      expect(storage.getItem(SAVE_KEY)).toBe(raw);
    }
  });

  it("retains the random plan and Ink position of a v9 date already in progress", () => {
    const current = startDate(seedLegacyChapter(), "milano_cafe_01", () => 1234);
    expect(current.activeDate?.resolutionMode).toBe("random_v1");
    const restored = validateGameState(asVersion9(current));
    expect(restored.activeDate).toEqual(current.activeDate);
    expect(restored.ap).toBe(current.ap);
  });

  it("persists the preselected random tickets and rejects a stale tab", () => {
    const storage = new MemoryStorage();
    const initial = validateGameState(phase6.freeTime);
    expect(saveGame(storage, initial).ok).toBe(true);
    const first = startEncounter(initial, "galleria_cafe", () => 1234);
    const other = startEncounter(initial, "galleria_cafe", () => 5678);
    expect(first.activeEncounter).not.toBeNull();
    expect(saveGame(storage, first, initial).ok).toBe(true);
    expect(saveGame(storage, other, initial).ok).toBe(false);
    const loaded = loadGame(storage);
    expect(loaded.status).toBe("loaded");
    if (loaded.status === "loaded") expect(loaded.state.activeEncounter).toEqual(first.activeEncounter);
  });

  it("prevents another activity and reward mutation during an encounter", () => {
    const initial = validateGameState(phase6.freeTime);
    const state = startEncounter(initial, "galleria_cafe", () => 1234);
    expect(state.activeEncounter).not.toBeNull();
    expect(getBattleAvailability(state, phase6.B_selected.activeBattle.battleId).available).toBe(false);
    expect(getTourismAvailability(state, phase6.exploring.activeTourism.landmarkId).available).toBe(false);
    expect(startDate(state, "milano_cafe_01")).toBe(state);
    expect(setNames(state, "name", "name")).toBe(state);
    expect(grantRewardOnce(state, "new_reward", 1)).toBe(state);
    expect(claimPendingRewards(state, state.revision)).toBe(state);
    const withBattle = { ...state, activeBattle: validateGameState(phase6.B_selected).activeBattle };
    expect(() => validateGameState(withBattle)).toThrow();
  });
});
