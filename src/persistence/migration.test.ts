import { describe, expect, it } from "vitest";
import fixtures from "../../tests/fixtures/phase1-saves.json";
import {
  advanceDate,
  chooseDate,
  finishDate,
  setNames,
  type GameState,
} from "../domain";
import {
  loadGame,
  parseGameState,
  SAVE_KEY,
  saveGame,
  type StorageLike,
} from "./index";

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function finishMigratedDate(initial: GameState) {
  let state = initial;
  for (let step = 0; step < 80 && state.activeDate; step += 1) {
    const before = state;
    state = parseGameState(JSON.stringify(state));
    expect(state).toEqual(before);
    const active = state.activeDate!;
    if (active.frame.ended) state = finishDate(state, state.revision);
    else if (active.frame.choices.length) {
      // Same path as the captured completed fixture: joke, then warm.
      state = chooseDate(
        state,
        active.choiceCount === 0 ? 0 : 1,
        state.revision,
      );
    } else state = advanceDate(state, state.revision);
  }
  expect(state.activeDate).toBeNull();
  return state;
}

describe("Phase 1 save compatibility", () => {
  it.each(Object.entries(fixtures))(
    "migrates the real %s snapshot without changing earned progress",
    (_name, fixture) => {
      const raw = JSON.stringify(fixture);
      const storage = new MemoryStorage();
      storage.setItem(SAVE_KEY, raw);
      const loaded = loadGame(storage);
      expect(loaded.status).toBe("loaded");
      if (loaded.status !== "loaded")
        throw new Error("Legacy fixture did not load");
      const migrated = loaded.state;
      expect(migrated).toMatchObject({
        schemaVersion: 5,
        revision: fixture.revision,
        playerName: fixture.playerName,
        heroineName: fixture.heroineName,
        ap: fixture.ap,
        affection: fixture.affection,
        completedChapters: fixture.completedChapters,
        claimedRewardIds: fixture.claimedRewardIds,
        playedDateIds: fixture.playedDateIds,
        memories: fixture.memories,
        endingReached: false,
        confessionStatus: "none",
      });
      expect(migrated.romanceStage).toBe(
        fixture.playedDateIds.some((id) => id === "milano_cafe_01") ? 2 : 1,
      );
      if (fixture.activeDate) {
        expect(migrated.activeDate).toMatchObject(fixture.activeDate);
        expect(migrated.activeDate!.storyState).toBe(
          fixture.activeDate.storyState,
        );
        expect(migrated.activeDate!.frame).toEqual(fixture.activeDate.frame);
      } else expect(migrated.activeDate).toBeNull();
      expect(storage.getItem(SAVE_KEY)).toBe(raw);
      expect(parseGameState(JSON.stringify(migrated))).toEqual(migrated);
    },
  );

  it.each(["started", "beforeChoice", "afterChoice"] as const)(
    "resumes %s without repeating AP charges or selected effects",
    (name) => {
      const migrated = parseGameState(JSON.stringify(fixtures[name]));
      const result = finishMigratedDate(migrated);
      expect(result.ap).toBe(fixtures.completed.ap);
      expect(result.affection).toBe(fixtures.completed.affection);
      expect(result.memories).toEqual(fixtures.completed.memories);
      expect(result.playedDateIds).toEqual(fixtures.completed.playedDateIds);
      expect(result.claimedRewardIds).toEqual(
        fixtures.completed.claimedRewardIds,
      );
      expect(result.romanceStage).toBe(2);
      expect(finishDate(result, result.revision)).toBe(result);
    },
  );

  it("continues a Phase 1 replay at zero AP without adding rewards", () => {
    const migrated = parseGameState(JSON.stringify(fixtures.replay));
    const result = finishMigratedDate(migrated);
    expect(result.ap).toBe(0);
    expect(result.affection).toBe(fixtures.replay.affection);
    expect(result.memories).toEqual(fixtures.replay.memories);
    expect(result.playedDateIds).toEqual(fixtures.replay.playedDateIds);
  });

  it("saves the next action as version 5 while retaining optimistic conflict checks", () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, JSON.stringify(fixtures.completed));
    const original = parseGameState(storage.getItem(SAVE_KEY)!);
    const next = setNames(original, "凪", "澪");
    expect(saveGame(storage, next, original)).toEqual({ ok: true });
    expect(JSON.parse(storage.getItem(SAVE_KEY)!)).toMatchObject({
      schemaVersion: 5,
      playerName: "凪",
      heroineName: "澪",
    });
    expect(parseGameState(storage.getItem(SAVE_KEY)!)).toEqual(next);
    expect(saveGame(storage, original).ok).toBe(false);
    expect(parseGameState(storage.getItem(SAVE_KEY)!)).toEqual(next);
  });

  it.each([
    "{broken",
    JSON.stringify({ ...fixtures.completed, schemaVersion: 99 }),
    JSON.stringify({
      ...fixtures.afterChoice,
      activeDate: {
        ...fixtures.afterChoice.activeDate,
        storyHash: "unrecognized-story-version",
      },
    }),
    JSON.stringify({
      ...fixtures.beforeChoice,
      activeDate: { ...fixtures.beforeChoice.activeDate, storyState: "{}" },
    }),
  ])(
    "protects incompatible legacy data without deleting unrelated data",
    (raw) => {
      const storage = new MemoryStorage();
      storage.setItem(SAVE_KEY, raw);
      storage.setItem("another-game", "keep");
      expect(loadGame(storage)).toMatchObject({ status: "invalid", raw });
      expect(
        saveGame(storage, parseGameState(JSON.stringify(fixtures.empty))).ok,
      ).toBe(false);
      expect(storage.getItem(SAVE_KEY)).toBe(raw);
      expect(storage.getItem("another-game")).toBe("keep");
    },
  );
});
