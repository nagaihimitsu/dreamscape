import { describe, expect, it } from "vitest";
import { seedLegacyChapter } from "../../tests/fixtures/legacy-game";
import { dates } from "../content";
import {
  activeDateStoryId, advanceDate, chooseDate, finishDate, startDate,
  type GameState,
} from "../domain/game";
import { beginStory, storyFingerprint } from "../story/runtime";
import { loadGame, saveGame, SAVE_KEY, type StorageLike } from ".";

class MemoryStorage implements StorageLike {
  private value: string | null = null;
  getItem(key: string) { return key === SAVE_KEY ? this.value : null; }
  setItem(key: string, value: string) { if (key === SAVE_KEY) this.value = value; }
}

const dateId = "milano_cafe_01";
const randomStoryId = "milano/cafe_tourism_01_random";
const fixedStoryId = "milano/cafe_tourism_01";

/** Recreate a snapshot at the start of the actually published Ink. The
 * response plan remains the one saved at date start, just as in a v9 save. */
function oldDate(mode: "random_v1" | "legacy_fixed", roll: number): GameState {
  const base = seedLegacyChapter();
  const started = startDate(base, dateId, () => roll);
  const oldStoryId = mode === "random_v1" ? randomStoryId : fixedStoryId;
  const step = beginStory(oldStoryId, base.playerName, base.heroineName, {
    player_address: `${base.playerName}さん`, romance_stage: base.romanceStage,
    memory_callback: "", has_cafe_memory: false, ending_reached: false, confession_ready: false,
  });
  expect(step.effects).toEqual([]);
  return {
    ...started,
    activeDate: {
      ...started.activeDate!,
      storyState: step.storyState,
      storyHash: storyFingerprint(oldStoryId),
      frame: step.frame,
      ...(mode === "legacy_fixed" ? {
        resolutionMode: "legacy_fixed" as const,
        randomPlan: [], resolvedChoices: [], responseSnapshot: null,
      } : {}),
    },
  };
}

function untilChoice(state: GameState): GameState {
  for (let n = 0; n < 100 && state.activeDate && !state.activeDate.frame.choices.length && !state.activeDate.frame.ended; n++)
    state = advanceDate(state, state.revision);
  expect(state.activeDate?.frame.choices).toHaveLength(3);
  return state;
}

function reload(storage: MemoryStorage, state: GameState, previous?: GameState): GameState {
  expect(saveGame(storage, state, previous)).toEqual({ ok: true });
  const result = loadGame(storage);
  expect(result.status).toBe("loaded");
  if (result.status !== "loaded") throw new Error("Could not load in-progress date");
  return result.state;
}

describe("pre-tone in-progress dates", () => {
  it.each([[0, "positive"], [9999, "negative"]] as const)(
    "keeps the v9 saved random plan and old Ink for roll %i across both choices and reloads",
    (roll, outcome) => {
      const date = dates.find((entry) => entry.id === dateId)!;
      expect(date.storyId).not.toBe(randomStoryId);
      expect(date.legacyStoryIds).toContain(randomStoryId);
      const storage = new MemoryStorage();
      const old = untilChoice(oldDate("random_v1", roll));
      const plan = structuredClone(old.activeDate!.randomPlan);
      const ap = old.ap;
      let state = reload(storage, old);
      expect(activeDateStoryId(date, state.activeDate!)).toBe(randomStoryId);
      const beforeChoice = state;
      state = chooseDate(state, 0, state.revision);
      expect(state.activeDate!.resolvedChoices[0].result).toBe(outcome);
      expect(state.activeDate!.randomPlan).toEqual(plan);
      expect(chooseDate(state, 0, beforeChoice.revision)).toBe(state);
      state = reload(storage, state, beforeChoice);
      expect(state.activeDate!.resolvedChoices).toHaveLength(1);
      for (let n = 0; n < 120 && state.activeDate; n++) {
        const previous = state;
        const active = state.activeDate;
        if (active.frame.ended) state = finishDate(state, state.revision);
        else if (active.frame.choices.length) state = chooseDate(state, 0, state.revision);
        else state = advanceDate(state, state.revision);
        state = reload(storage, state, previous);
      }
      expect(state.activeDate).toBeNull();
      expect(state.playedDateIds).toContain(dateId);
      expect(state.ap).toBe(ap);
      expect(new Set(state.memories).size).toBe(state.memories.length);
    },
  );

  it("resumes a fixed-effect date with its original unmodified Ink and applies effects only once", () => {
    const date = dates.find((entry) => entry.id === dateId)!;
    expect(date.legacyStoryIds).toContain(fixedStoryId);
    const storage = new MemoryStorage();
    const old = untilChoice(oldDate("legacy_fixed", 0));
    const ap = old.ap;
    let state = reload(storage, old);
    expect(activeDateStoryId(date, state.activeDate!)).toBe(fixedStoryId);
    const previous = state;
    state = chooseDate(state, 0, state.revision);
    expect(state.activeDate!.resolutionMode).toBe("legacy_fixed");
    expect(state.activeDate!.resolvedChoices).toEqual([]);
    expect(state.activeDate!.appliedEffectIds).toHaveLength(1);
    expect(chooseDate(state, 0, previous.revision)).toBe(state);
    state = reload(storage, state, previous);
    for (let n = 0; n < 120 && state.activeDate; n++) {
      const before = state;
      const active = state.activeDate;
      if (active.frame.ended) state = finishDate(state, state.revision);
      else if (active.frame.choices.length) state = chooseDate(state, 0, state.revision);
      else state = advanceDate(state, state.revision);
      state = reload(storage, state, before);
    }
    expect(state.activeDate).toBeNull();
    expect(state.playedDateIds).toContain(dateId);
    expect(state.ap).toBe(ap);
    expect(new Set(state.memories).size).toBe(state.memories.length);
  });
});
