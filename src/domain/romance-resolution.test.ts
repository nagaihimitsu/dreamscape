import { describe, expect, it } from "vitest";
import phase2 from "../../tests/fixtures/phase2-saves.json";
import { seedLegacyChapter } from "../../tests/fixtures/legacy-game";
import { loadGame, saveGame, SAVE_KEY, type StorageLike } from "../persistence";
import { effects, responseProfiles } from "../content";
import { advanceDate, chooseDate, createGame, finishDate, startDate, validateGameState, type GameState } from "./game";

class Storage implements StorageLike {
  value: string | null = null;
  getItem(key: string) { return key === SAVE_KEY ? this.value : null; }
  setItem(key: string, value: string) { if (key === SAVE_KEY) this.value = value; }
}
function choice(state: GameState): GameState {
  for (let n = 0; n < 100 && state.activeDate && !state.activeDate.frame.choices.length && !state.activeDate.frame.ended; n++)
    state = advanceDate(state, state.revision);
  return state;
}
function finish(state: GameState): GameState {
  for (let n = 0; n < 100 && state.activeDate; n++) {
    const active = state.activeDate;
    if (active.frame.ended) state = finishDate(state, state.revision);
    else if (active.frame.choices.length) state = chooseDate(state, 0, state.revision);
    else state = advanceDate(state, state.revision);
  }
  expect(state.activeDate).toBeNull();
  return state;
}

describe("persisted romance choice resolutions", () => {
  it("draws exactly at successful start and never redraws on save, reload, or duplicate selection", () => {
    let calls = 0;
    const roll = () => { calls++; return 0; };
    const unavailable = createGame();
    expect(startDate(unavailable, "milano_cafe_01", roll)).toBe(unavailable);
    expect(calls).toBe(0);
    const initial = seedLegacyChapter();
    const begun = startDate(initial, "milano_cafe_01", roll);
    expect(calls).toBe(8);
    expect(begun.ap).toBe(initial.ap - 2);
    expect(begun.activeDate?.resolutionMode).toBe("random_v1");
    const ready = choice(begun);
    const storage = new Storage();
    expect(saveGame(storage, ready).ok).toBe(true);
    const restored = loadGame(storage);
    expect(restored.status).toBe("loaded");
    if (restored.status !== "loaded") throw new Error("load failed");
    const first = chooseDate(ready, 0, ready.revision);
    const again = chooseDate(restored.state, 0, restored.state.revision);
    expect(again).toEqual(first);
    expect(chooseDate(first, 0, ready.revision)).toBe(first);
    expect(calls).toBe(8);
    expect(first.activeDate?.resolvedChoices).toHaveLength(1);
    expect(first.activeDate?.resolvedChoices[0].result).toBe("positive");
    expect(first.memories.length).toBe(1);
    expect(validateGameState(JSON.parse(JSON.stringify(first)))).toEqual(first);
  });

  it("uses pre-saved rolls for a different reaction and prevents a stale tab from overwriting it", () => {
    const begun = startDate(seedLegacyChapter(), "milano_cafe_01", () => 9999);
    const ready = choice(begun);
    const negative = chooseDate(ready, 0, ready.revision);
    expect(negative.activeDate?.resolvedChoices[0].result).toBe("negative");
    expect(negative.activeDate?.frame.text).not.toBe("");
    const storage = new Storage();
    expect(saveGame(storage, ready).ok).toBe(true);
    expect(saveGame(storage, negative, ready).ok).toBe(true);
    const altered = structuredClone(ready);
    altered.activeDate!.randomPlan[0].reaction = 0;
    const stale = chooseDate(altered, 0, altered.revision);
    expect(stale.activeDate?.resolvedChoices[0].result).toBe("positive");
    expect(saveGame(storage, stale, ready).ok).toBe(false);
    expect(loadGame(storage)).toMatchObject({ status: "loaded", state: negative });
  });

  it("keeps saved profiles and effect mappings when current content is rebalanced", () => {
    const ready = choice(startDate(seedLegacyChapter(), "milano_cafe_01", () => 6000));
    const saved = JSON.parse(JSON.stringify(ready));
    const baseline = chooseDate(ready, 0, ready.revision);
    const effect = effects.find((item) => item.id === baseline.activeDate!.resolvedChoices[0].effectId)!;
    const originalId = effect.responseProfileId!;
    const originalProfile = responseProfiles.find((item) => item.id === originalId)!;
    const originalChance = originalProfile.baseChance;
    const alternative = responseProfiles.find((item) => item.id !== originalId)!;
    try {
      effect.responseProfileId = alternative.id;
      originalProfile.baseChance = originalProfile.minChance;
      const restored = validateGameState(saved);
      expect(chooseDate(restored, 0, restored.revision)).toEqual(baseline);
      expect(validateGameState(JSON.parse(JSON.stringify(baseline)))).toEqual(baseline);
    } finally {
      effect.responseProfileId = originalId;
      originalProfile.baseChance = originalChance;
    }
  });

  it("uses the first response's new relationship values for the second chance", () => {
    const source = (first: number) => {
      const numbers = [first, 0, 0, 0, 5000, 0, 0, 0];
      let n = 0;
      return () => numbers[n++];
    };
    const positive = choice(startDate(seedLegacyChapter(), "milano_cafe_01", source(0)));
    const negative = choice(startDate(seedLegacyChapter(), "milano_cafe_01", source(9999)));
    const p1 = chooseDate(positive, 0, positive.revision);
    const n1 = chooseDate(negative, 0, negative.revision);
    expect(p1.activeDate!.frame.text).not.toBe(n1.activeDate!.frame.text);
    const p2 = choice(p1), n2 = choice(n1);
    const afterPositive = chooseDate(p2, 0, p2.revision);
    const afterNegative = chooseDate(n2, 0, n2.revision);
    expect(afterPositive.activeDate!.resolvedChoices[1].chance)
      .toBeGreaterThan(afterNegative.activeDate!.resolvedChoices[1].chance);
  });

  it("migrates an idle v8 save without fabricating a roll plan", () => {
    const current = createGame();
    const { recoveryAfterRejection: _flag, completedRecoveryCount: _count,
      travelBudget: _budget, inventory: _inventory, completedEncounterIds: _encounters,
      encounterRewards: _encounterRewards, activeEncounter: _activeEncounter, ...old } = current;
    const migrated = validateGameState({ ...old, schemaVersion: 8 });
    expect(migrated.schemaVersion).toBe(10);
    expect(migrated.activeDate).toBeNull();
    expect(migrated.ap).toBe(current.ap);
    expect(migrated.memories).toEqual(current.memories);
  });

  it("migrates an old in-progress date to fixed resolution and preserves the old Ink", () => {
    const migrated = validateGameState(phase2.activeDate);
    expect(migrated.schemaVersion).toBe(10);
    expect(migrated.activeDate).toMatchObject({
      resolutionMode: "legacy_fixed", randomPlan: [], resolvedChoices: [], responseSnapshot: null,
      storyHash: phase2.activeDate.activeDate!.storyHash,
      storyState: phase2.activeDate.activeDate!.storyState,
    });
    const completed = finish(migrated);
    expect(completed.playedDateIds).toContain(migrated.activeDate!.dateId);
  });

  it("does not draw for confession even when a caller supplies a source", () => {
    const eligible = validateGameState({ ...phase2.confessionPending, activeDate: null, confessionStatus: "none" });
    let calls = 0;
    // If conditions are not met the rule still must not request random data.
    startDate(eligible, "milano_confession_01", () => { calls++; return 0; });
    expect(calls).toBe(0);
  });
});
