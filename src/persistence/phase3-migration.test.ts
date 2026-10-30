import { describe, expect, it } from "vitest";
import fixtures from "../../tests/fixtures/phase2-saves.json";
import { battles } from "../content";
import {
  advanceDate,
  chooseDate,
  finishDate,
  setNames,
  type GameState,
} from "../domain/game";
import { getBattleAvailability, startBattle } from "../domain/battle";
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

function resumeDate(initial: GameState) {
  let state = initial;
  for (let step = 0; step < 80 && state.activeDate; step += 1) {
    const checkpoint = parseGameState(JSON.stringify(state));
    expect(checkpoint).toEqual(state);
    state = checkpoint;
    const active = state.activeDate!;
    if (active.frame.ended) state = finishDate(state, state.revision);
    else if (active.frame.choices.length) {
      // The same walk path chosen when the Phase 2 end-state fixture was created.
      state = chooseDate(
        state,
        active.choiceCount === 0 ? 1 : 2,
        state.revision,
      );
    } else state = advanceDate(state, state.revision);
  }
  expect(state.activeDate).toBeNull();
  return state;
}

/** These snapshots were captured by the published Phase 2 implementation, not constructed as v3. */
describe("Phase 2 saves migrate to the independent battle version", () => {
  it.each(Object.entries(fixtures))(
    "preserves every existing field in the %s snapshot",
    (_name, fixture) => {
      const raw = JSON.stringify(fixture);
      const storage = new MemoryStorage();
      storage.setItem(SAVE_KEY, raw);
      const loaded = loadGame(storage);
      expect(loaded.status).toBe("loaded");
      if (loaded.status !== "loaded")
        throw new Error("Real Phase 2 fixture did not load");
      const { schemaVersion: _oldVersion, ...oldFields } = fixture;
      expect(loaded.state).toEqual({
        ...oldFields,
        schemaVersion: 6,
        activeBattle: null,
        battleRecords: [],
        activeTourism: null,
        discoveredClueIds: [],
        visitedLandmarkIds: [],
        completedEpisodeIds: [],
        completedCityIds: [],
        completedGuideIds: [],
        pendingApRewards: [],
        battleRewardReceipt: null,
      });
      expect(storage.getItem(SAVE_KEY)).toBe(raw);
      expect(parseGameState(JSON.stringify(loaded.state))).toEqual(
        loaded.state,
      );
    },
  );

  it("continues a paid romance date without charging AP again or repeating choices", () => {
    const migrated = parseGameState(JSON.stringify(fixtures.activeDate));
    const finished = resumeDate(migrated);
    expect(finished.ap).toBe(fixtures.activeDate.ap);
    expect(finished.affection).toBe(fixtures.activeDate.affection + 3);
    expect(finished.memories).toEqual([
      ...fixtures.activeDate.memories,
      "milano_walk_first_listen",
      "milano_walk_second_honest",
    ]);
    expect(finished.playedDateIds).toEqual([
      ...fixtures.activeDate.playedDateIds,
      "milano_walk_01",
    ]);
    expect(finished.claimedRewardIds).toEqual(
      fixtures.activeDate.claimedRewardIds,
    );
    expect(finished.romanceStage).toBe(3);
    expect(finished.activeBattle).toBeNull();
    expect(finished.battleRecords).toEqual([]);
    expect(finishDate(finished, finished.revision)).toBe(finished);
  });

  it("finishes an already-accepted confession exactly once and keeps the existing ending", () => {
    const pending = parseGameState(JSON.stringify(fixtures.confessionPending));
    expect(pending.endingReached).toBe(false);
    const finished = finishDate(pending, pending.revision);
    const migratedEnding = parseGameState(JSON.stringify(fixtures.ending));
    expect(finished).toEqual(migratedEnding);
    expect(
      finished.memories.filter((id) => id === "milano_confession_promise"),
    ).toHaveLength(1);
    expect(finishDate(finished, finished.revision)).toBe(finished);
    expect(parseGameState(JSON.stringify(finished))).toEqual(finished);
  });

  it("lets an ending save enter battle without changing the romance route", () => {
    const ending = parseGameState(JSON.stringify(fixtures.ending));
    const battleId = battles[0].id;
    expect(getBattleAvailability(ending, battleId).available).toBe(true);
    const fighting = startBattle(ending, battleId);
    expect(fighting.activeBattle).not.toBeNull();
    const {
      activeBattle: _activeBattle,
      revision: _revision,
      ...duringFields
    } = fighting;
    const {
      activeBattle: _noBattle,
      revision: _beforeRevision,
      ...beforeFields
    } = ending;
    expect(duringFields).toEqual(beforeFields);
    expect(parseGameState(JSON.stringify(fighting))).toEqual(fighting);
  });

  it.each(["activeDate", "confessionPending"] as const)(
    "protects an ongoing %s from battle start",
    (fixtureName) => {
      const romantic = parseGameState(JSON.stringify(fixtures[fixtureName]));
      const battleId = battles[0].id;
      expect(getBattleAvailability(romantic, battleId).available).toBe(false);
      expect(startBattle(romantic, battleId)).toBe(romantic);
      expect(romantic.activeDate).toEqual(fixtures[fixtureName].activeDate);
    },
  );

  it("writes schema 6 on the next action and rejects a stale older tab", () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, JSON.stringify(fixtures.idle));
    const migrated = parseGameState(storage.getItem(SAVE_KEY)!);
    const renamed = setNames(migrated, "空", "紬");
    expect(saveGame(storage, renamed, migrated)).toEqual({ ok: true });
    expect(JSON.parse(storage.getItem(SAVE_KEY)!)).toMatchObject({
      schemaVersion: 6,
      playerName: "空",
      heroineName: "紬",
      activeBattle: null,
      battleRecords: [],
    });
    expect(saveGame(storage, migrated).ok).toBe(false);
    expect(parseGameState(storage.getItem(SAVE_KEY)!)).toEqual(renamed);
  });

  it.each([
    "{broken-phase2",
    JSON.stringify({ ...fixtures.ending, schemaVersion: 99 }),
    JSON.stringify({
      ...fixtures.activeDate,
      activeDate: {
        ...fixtures.activeDate.activeDate,
        storyHash: "incompatible-story",
      },
    }),
    JSON.stringify({
      ...fixtures.activeDate,
      activeDate: { ...fixtures.activeDate.activeDate, storyState: "{}" },
    }),
    JSON.stringify({ ...fixtures.ending, endingReached: false }),
  ])(
    "preserves incompatible Phase 2 data and unrelated local storage",
    (raw) => {
      const storage = new MemoryStorage();
      storage.setItem(SAVE_KEY, raw);
      storage.setItem("another-app", "keep-this");
      expect(loadGame(storage)).toMatchObject({ status: "invalid", raw });
      const safe = parseGameState(JSON.stringify(fixtures.idle));
      expect(saveGame(storage, safe).ok).toBe(false);
      expect(storage.getItem(SAVE_KEY)).toBe(raw);
      expect(storage.getItem("another-app")).toBe("keep-this");
    },
  );
});
