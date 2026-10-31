import { seedLegacyChapter } from "../../tests/fixtures/legacy-game";
import { describe, expect, it, vi } from "vitest";
import { advanceDate, chooseDate, createGame, startDate } from "../domain";
import {
  backupAndCreate,
  deleteSaveData,
  LEARNING_KEY,
  loadGame,
  parseGameState,
  sameGameState,
  SAVE_KEY,
  saveGame,
  type StorageLike,
} from "./index";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

describe("local save persistence", () => {
  it("distinguishes an empty slot from an unreadable save and preserves names", () => {
    const storage = new MemoryStorage();
    expect(loadGame(storage)).toEqual({ status: "empty" });
    const state = createGame("旅人", "小春");
    expect(saveGame(storage, state)).toEqual({ ok: true });
    expect(loadGame(storage)).toEqual({ status: "loaded", state });
    expect(parseGameState(storage.getItem(SAVE_KEY)!)).toEqual(state);
  });

  it.each([
    "{broken",
    "",
    "null",
    '{"schemaVersion":999}',
    JSON.stringify({ ...createGame(), ap: -1 }),
    JSON.stringify({ ...createGame(), ap: 999 }),
  ])("does not silently replace invalid data: %s", (raw) => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, raw);
    storage.setItem("unrelated.application", "keep me");
    expect(loadGame(storage)).toMatchObject({ status: "invalid", raw });
    expect(saveGame(storage, createGame()).ok).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBe(raw);
    expect(storage.getItem("unrelated.application")).toBe("keep me");
  });

  it("backs up the exact raw save before explicit recovery, without touching unrelated data", () => {
    const storage = new MemoryStorage();
    const raw = '{"schemaVersion":2,"precious":"original data"}';
    storage.setItem(SAVE_KEY, raw);
    storage.setItem("another-game", "untouched");
    const replacement = createGame();
    expect(backupAndCreate(storage, replacement)).toEqual({ ok: true });
    expect(loadGame(storage)).toEqual({ status: "loaded", state: replacement });
    const backups = [...storage.values.entries()].filter(([key]) =>
      key.startsWith(`${SAVE_KEY}.backup.`),
    );
    expect(backups).toHaveLength(1);
    expect(backups[0]?.[1]).toBe(raw);
    expect(storage.getItem("another-game")).toBe("untouched");
  });

  it("keeps both backups if recoveries share the same timestamp", () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(123);
    try {
      const storage = new MemoryStorage();
      storage.setItem(SAVE_KEY, "first original");
      expect(backupAndCreate(storage, createGame()).ok).toBe(true);
      storage.setItem(SAVE_KEY, "second original");
      expect(backupAndCreate(storage, createGame()).ok).toBe(true);
      expect(storage.getItem(`${SAVE_KEY}.backup.123`)).toBe("first original");
      expect(storage.getItem(`${SAVE_KEY}.backup.123.1`)).toBe(
        "second original",
      );
    } finally {
      now.mockRestore();
    }
  });

  it("does not replace the active slot if the backup cannot be written", () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, "original");
    const blocked: StorageLike = {
      getItem: (key) => storage.getItem(key),
      setItem: () => {
        throw new Error("quota exceeded");
      },
    };
    expect(backupAndCreate(blocked, createGame()).ok).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBe("original");
  });

  it("reports read permission errors without throwing or writing", () => {
    const setItem = vi.fn();
    const storage: StorageLike = {
      getItem: () => {
        throw new Error("access denied");
      },
      setItem,
    };
    expect(loadGame(storage)).toMatchObject({ status: "invalid", raw: null });
    expect(saveGame(storage, createGame()).ok).toBe(false);
    expect(backupAndCreate(storage, createGame()).ok).toBe(false);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("reports a failed save and leaves the previous snapshot intact", () => {
    const storage = new MemoryStorage();
    const previous = createGame();
    saveGame(storage, previous);
    const blocked: StorageLike = {
      getItem: (key) => storage.getItem(key),
      setItem: () => {
        throw new Error("quota exceeded");
      },
    };
    expect(
      saveGame(blocked, seedLegacyChapter(previous), previous),
    ).toMatchObject({
      ok: false,
      message: expect.stringContaining("空き容量"),
    });
    expect(loadGame(storage)).toEqual({ status: "loaded", state: previous });
  });
});

describe("multiple tabs sharing a save slot", () => {
  it("rejects an older manual save without restoring spent AP", () => {
    const storage = new MemoryStorage();
    const menu = seedLegacyChapter(createGame());
    saveGame(storage, menu);
    const started = startDate(menu, "milano_cafe_01");
    expect(saveGame(storage, started, menu)).toEqual({ ok: true });
    expect(saveGame(storage, menu)).toMatchObject({
      ok: false,
      message: expect.stringContaining("ロード"),
    });
    expect(loadGame(storage)).toEqual({ status: "loaded", state: started });
    expect(started.ap).toBe(2);
  });

  it("rejects conflicting choices at the same revision and retains the first branch", () => {
    const storage = new MemoryStorage();
    let choice = startDate(seedLegacyChapter(createGame()), "milano_cafe_01");
    while (!choice.activeDate!.frame.choices.length)
      choice = advanceDate(choice, choice.revision);
    saveGame(storage, choice);
    const first = chooseDate(choice, 0, choice.revision);
    const second = chooseDate(choice, 1, choice.revision);
    expect(first.revision).toBe(second.revision);
    expect(saveGame(storage, first, choice)).toEqual({ ok: true });
    expect(saveGame(storage, second, choice).ok).toBe(false);
    expect(saveGame(storage, second).ok).toBe(false);
    expect(loadGame(storage)).toEqual({ status: "loaded", state: first });
  });

  it("rejects a higher-revision branch whose expected prior snapshot is stale", () => {
    const storage = new MemoryStorage();
    const menu = seedLegacyChapter(createGame());
    saveGame(storage, menu);
    const first = startDate(menu, "milano_cafe_01");
    const staleNext = advanceDate(first, first.revision);
    saveGame(storage, first, menu);
    expect(saveGame(storage, staleNext, menu).ok).toBe(false);
    expect(loadGame(storage)).toEqual({ status: "loaded", state: first });
  });

  it("allows unchanged manual saves and repeated identical commits", () => {
    const storage = new MemoryStorage();
    const initial = createGame();
    saveGame(storage, initial);
    const completed = seedLegacyChapter(initial);
    expect(saveGame(storage, completed, initial)).toEqual({ ok: true });
    expect(saveGame(storage, completed)).toEqual({ ok: true });
    expect(saveGame(storage, completed, initial)).toEqual({ ok: true });
    expect(loadGame(storage)).toEqual({ status: "loaded", state: completed });
  });

  it("does not silently recreate a slot removed since the previous snapshot", () => {
    const storage = new MemoryStorage();
    const initial = createGame();
    expect(saveGame(storage, seedLegacyChapter(initial), initial).ok).toBe(
      false,
    );
    expect(loadGame(storage)).toEqual({ status: "empty" });
  });
});

describe("explicit save deletion", () => {
  it("compares the actual game contents independently of property order", () => {
    const state = createGame("旅人", "小春");
    const reordered = Object.fromEntries(Object.entries(state).reverse()) as typeof state;
    expect(JSON.stringify(state)).not.toBe(JSON.stringify(reordered));
    expect(sameGameState(state, reordered)).toBe(true);
    expect(sameGameState(state, { ...reordered, revision: state.revision + 1 })).toBe(false);
    expect(sameGameState(state, { ...reordered, trust: state.trust - 1 })).toBe(false);
  });

  it("removes only the confirmed game and learning slots", () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, "game");
    storage.setItem(LEARNING_KEY, "notes");
    storage.setItem(`${SAVE_KEY}.backup.123`, "backup");
    storage.setItem("unrelated", "keep");
    expect(
      deleteSaveData(storage, { game: "game", learning: "notes" }),
    ).toEqual({ ok: true });
    expect(storage.getItem(SAVE_KEY)).toBeNull();
    expect(storage.getItem(LEARNING_KEY)).toBeNull();
    expect(storage.getItem(`${SAVE_KEY}.backup.123`)).toBe("backup");
    expect(storage.getItem("unrelated")).toBe("keep");
  });
  it.each([SAVE_KEY, LEARNING_KEY])("refuses a changed snapshot: %s", (key) => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, "game");
    storage.setItem(LEARNING_KEY, "notes");
    storage.setItem(key, "changed");
    expect(
      deleteSaveData(storage, { game: "game", learning: "notes" }).ok,
    ).toBe(false);
    expect(storage.getItem(key)).toBe("changed");
    expect(
      storage.getItem(key === SAVE_KEY ? LEARNING_KEY : SAVE_KEY),
    ).not.toBeNull();
  });
  it("restores learning data if deleting the game slot fails", () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, "game");
    storage.setItem(LEARNING_KEY, "notes");
    const blocked = {
      getItem: (key: string) => storage.getItem(key),
      setItem: (key: string, value: string) => storage.setItem(key, value),
      removeItem: (key: string) => {
        if (key === SAVE_KEY) throw new Error("blocked");
        storage.removeItem(key);
      },
    };
    expect(
      deleteSaveData(blocked, { game: "game", learning: "notes" }).ok,
    ).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBe("game");
    expect(storage.getItem(LEARNING_KEY)).toBe("notes");
  });
});
