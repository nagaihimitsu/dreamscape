import { describe, expect, it } from "vitest";
import fixtures from "../../tests/fixtures/phase6-saves.json";
import { validateGameState } from "../domain/game";
import { battleFingerprint } from "../domain/battle";
import { getNextEpisode } from "../domain/chapter";
import { encounters, progression } from "../content";
import { legacyRomanceValues } from "../domain/romance-migration";
import { loadGame, saveGame, SAVE_KEY, type StorageLike } from ".";
class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}
describe("published Phase 6 checkpoints migrate to the Milan city route", () => {
  it.each(Object.entries(fixtures))(
    "preserves the actual %s checkpoint and leaves source bytes unchanged",
    (_name, raw) => {
      const storage = new MemoryStorage();
      const bytes = JSON.stringify(raw);
      storage.setItem(SAVE_KEY, bytes);
      const loaded = loadGame(storage);
      expect(loaded.status).toBe("loaded");
      if (loaded.status !== "loaded")
        throw new Error("Old Phase 6 checkpoint was rejected");
      expect(loaded.state).toEqual({
        ...raw,
        schemaVersion: 10,
        travelBudget: encounters.initialBudget,
        inventory: {},
        completedEncounterIds: [],
        encounterRewards: {},
        activeEncounter: null,
        recoveryAfterRejection: false,
        completedRecoveryCount: 0,
        activeDate: raw.activeDate ? { ...raw.activeDate, resolutionMode: "legacy_fixed", randomPlan: [], resolvedChoices: [], responseSnapshot: null } : null,
        ...legacyRomanceValues(raw, progression),
        activeEpilogue: null,
        viewedEpilogueCityIds: [],
        legacyTrialAvailable: true,
      });
      expect(loaded.state.completedCityIds).toEqual([]);
      if (raw.activeBattle)
        expect(battleFingerprint(raw.activeBattle.battleId)).toBe(
          raw.activeBattle.contentHash,
        );
      expect(
        validateGameState(JSON.parse(JSON.stringify(loaded.state))),
      ).toEqual(loaded.state);
      expect(storage.getItem(SAVE_KEY)).toBe(bytes);
      expect(getNextEpisode(loaded.state)?.landmarkId).toBe("duomo_milano");
    },
  );
  it("protects invalid old city completion, unknown versions and new forged finale flags", () => {
    for (const raw of [
      { ...fixtures.result, completedCityIds: ["milano"] },
      { ...fixtures.empty, schemaVersion: 99 },
      { ...validateGameState(fixtures.result), completedCityIds: ["milano"] },
    ]) {
      const storage = new MemoryStorage();
      const bytes = JSON.stringify(raw);
      storage.setItem(SAVE_KEY, bytes);
      expect(loadGame(storage).status).toBe("invalid");
      expect(saveGame(storage, validateGameState(fixtures.result)).ok).toBe(
        false,
      );
      expect(storage.getItem(SAVE_KEY)).toBe(bytes);
    }
  });
});
