// The unreadable-save backup path (AGENTS.md 「安全に読み込めないデータを勝手に上書き・削除しない」,
// docs/07 acceptance 10): starting over an unreadable save keeps its exact bytes, either in place
// until the first explicit save (manual saving) or under a backup key (automatic saving).
import { describe, expect, it } from "vitest";
import { createGame, type GameState } from "../domain/game";
import { startCityArrival } from "../domain/epilogue";
import { loadGame, saveGame, SAVE_KEY } from "../persistence";
import { journeyStorage } from "../persistence/journey-storage";
import { titleSaveActions, writeExplicitSave, writeNewGame } from "./save-recovery";

const SLOT = "dreamscape.journey.milano.save.v1";
const staleTab = "別の画面でセーブが更新されています。再読み込みしてからやり直してください。";

/** One browser's localStorage, shared by every tab, seen through Milan's journey slot. */
function browser(entries: Record<string, string> = {}) {
  const data = new Map(Object.entries(entries));
  const base = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  };
  return { data, slot: journeyStorage(base, "milano") };
}

const backups = (data: Map<string, string>) =>
  [...data].filter(([key]) => key.startsWith(`${SLOT}.backup.`)).map(([, value]) => value);

/** The new game the title's start button creates. */
function newGame(): GameState {
  const initial = createGame("航", "澪", { journeyId: "milano" });
  return startCityArrival(initial, initial.revision);
}

const damaged = "{damaged-save";

describe("starting over an unreadable save", () => {
  it("with manual saving writes nothing, and the first セーブ backs up the exact bytes before saving", () => {
    const { data, slot } = browser({ [SLOT]: damaged, "dreamscape.journey.golden_triangle.save.v1": "other journey" });
    const loaded = loadGame(slot);
    expect(loaded).toMatchObject({ status: "invalid", kind: "corrupt", raw: damaged });
    const before = new Map(data);
    const next = newGame();

    const started = writeNewGame(slot, next, loaded, false);
    expect(started).toEqual({ ok: true, baseline: { savedGame: null, protectedOriginal: damaged } });
    expect(data).toEqual(before);

    const saved = writeExplicitSave(slot, next, started.ok ? started.baseline : never());
    expect(saved).toEqual({ ok: true, baseline: { savedGame: next, protectedOriginal: null } });
    expect(backups(data)).toEqual([damaged]);
    expect(loadGame(slot)).toEqual({ status: "loaded", state: next });
    expect(data.get("dreamscape.journey.golden_triangle.save.v1")).toBe("other journey");

    // Later saves are ordinary saves: the backup is made once.
    const later = { ...next, revision: next.revision + 1 };
    expect(writeExplicitSave(slot, later, saved.ok ? saved.baseline : never()).ok).toBe(true);
    expect(backups(data)).toEqual([damaged]);
    expect(loadGame(slot)).toEqual({ status: "loaded", state: later });
  });

  it("with automatic saving backs up the exact bytes first and saves the new game", () => {
    const { data, slot } = browser({ [SLOT]: damaged });
    const next = newGame();
    expect(writeNewGame(slot, next, loadGame(slot), true)).toEqual({ ok: true, baseline: { savedGame: next, protectedOriginal: null } });
    expect(backups(data)).toEqual([damaged]);
    expect(loadGame(slot)).toEqual({ status: "loaded", state: next });
  });

  it("treats a save from a newer version the same way: kept, then backed up", () => {
    const newer = JSON.stringify({ schemaVersion: 999, data: "unknown" });
    const { data, slot } = browser({ [SLOT]: newer });
    const loaded = loadGame(slot);
    expect(loaded).toMatchObject({ status: "invalid", kind: "newer" });
    expect(writeNewGame(slot, newGame(), loaded, false)).toMatchObject({ ok: true, baseline: { protectedOriginal: newer } });
    expect(data.get(SLOT)).toBe(newer);
    expect(writeNewGame(slot, newGame(), loaded, true).ok).toBe(true);
    expect(backups(data)).toEqual([newer]);
  });

  it("replaces nothing when another tab changed the slot after the page showed it", () => {
    const { data, slot } = browser({ [SLOT]: damaged });
    const loaded = loadGame(slot);
    data.set(SLOT, "new data in another tab");
    expect(writeNewGame(slot, newGame(), loaded, true)).toEqual({ ok: false, message: staleTab });
    expect(data.get(SLOT)).toBe("new data in another tab");
    expect(backups(data)).toEqual([]);

    // The same holds for the explicit save after an unsaved start.
    const { data: later, slot: laterSlot } = browser({ [SLOT]: damaged });
    const next = newGame();
    const started = writeNewGame(laterSlot, next, loadGame(laterSlot), false);
    later.set(SLOT, "new data in another tab");
    expect(writeExplicitSave(laterSlot, next, started.ok ? started.baseline : never())).toEqual({ ok: false, message: staleTab });
    expect(later.get(SLOT)).toBe("new data in another tab");
    expect(backups(later)).toEqual([]);
  });

  it("never starts over a save that belongs to another journey", () => {
    // A Milan save found in another journey's slot.
    const data = new Map<string, string>();
    const base = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: () => {} };
    const other = journeyStorage(base, "golden_triangle");
    const milan = JSON.stringify(createGame("ユウ", "ミオ", { journeyId: "milano" }));
    data.set(other.physicalKey(SAVE_KEY), milan);
    const loaded = loadGame(other);
    expect(loaded).toMatchObject({ status: "invalid", kind: "journey" });
    // The title offers neither a start nor deletion; its notice points to the other journey.
    expect(titleSaveActions(loaded)).toEqual({ start: "hidden", deletion: "hidden" });
    const before = new Map(data);
    for (const autoSave of [false, true]) expect(writeNewGame(other, newGame(), loaded, autoSave)).toEqual({ ok: false, message: null });
    expect(data).toEqual(before);
  });

  it("starts nothing, and touches nothing, when the storage area cannot be read", () => {
    const calls: string[] = [];
    const unreadable = {
      getItem: (key: string): string | null => { calls.push(`get ${key}`); throw new Error("blocked"); },
      setItem: (key: string) => { calls.push(`set ${key}`); throw new Error("blocked"); },
    };
    const loaded = loadGame(unreadable);
    expect(loaded).toMatchObject({ status: "invalid", kind: "storage", raw: null });
    // The title shows its start and deletion disabled beside the notice.
    expect(titleSaveActions(loaded)).toEqual({ start: "disabled", deletion: "disabled" });
    calls.length = 0;
    for (const autoSave of [false, true])
      expect(writeNewGame(unreadable, newGame(), loaded, autoSave)).toEqual({ ok: false, message: null });
    expect(calls).toEqual([]);
  });

  it("offers the start and deletion over an unreadable save whose bytes were read", () => {
    for (const raw of [damaged, JSON.stringify({ schemaVersion: 999 }), JSON.stringify({ schemaVersion: 1 })]) {
      const loaded = loadGame(browser({ [SLOT]: raw }).slot);
      expect(loaded).toMatchObject({ status: "invalid", raw });
      expect(titleSaveActions(loaded)).toEqual({ start: "shown", deletion: "shown" });
    }
    expect(titleSaveActions({ status: "empty" })).toMatchObject({ start: "shown" });
  });
});

describe("starting and saving over a readable slot", () => {
  it("an empty slot stays empty with manual saving until セーブ, and is saved at once with automatic saving", () => {
    const manual = browser();
    const next = newGame();
    const started = writeNewGame(manual.slot, next, loadGame(manual.slot), false);
    expect(started).toEqual({ ok: true, baseline: { savedGame: null, protectedOriginal: null } });
    expect(manual.data.size).toBe(0);
    expect(writeExplicitSave(manual.slot, next, started.ok ? started.baseline : never()).ok).toBe(true);
    expect(loadGame(manual.slot)).toEqual({ status: "loaded", state: next });

    const automatic = browser();
    expect(writeNewGame(automatic.slot, next, loadGame(automatic.slot), true)).toEqual({ ok: true, baseline: { savedGame: next, protectedOriginal: null } });
    expect(loadGame(automatic.slot)).toEqual({ status: "loaded", state: next });
    expect(backups(automatic.data)).toEqual([]);
  });

  it("an explicit save does not overwrite a save another tab made since this tab's last save", () => {
    const { slot } = browser();
    const mine = newGame();
    expect(saveGame(slot, mine).ok).toBe(true);
    const theirs = { ...mine, revision: mine.revision + 1, playerName: "別のタブ" };
    expect(saveGame(slot, theirs, mine).ok).toBe(true);
    // This tab played further (a higher revision) but last saw `mine`.
    const further = { ...mine, revision: mine.revision + 2 };
    const result = writeExplicitSave(slot, further, { savedGame: mine, protectedOriginal: null });
    expect(result).toEqual({ ok: false, message: "別の画面でセーブが更新されています。上書きせずに保護しました。ロードして最新の場面から再開してください。" });
    expect(loadGame(slot)).toEqual({ status: "loaded", state: theirs });
  });

  it("reports the message when the new game cannot be written", () => {
    const full = { getItem: () => null, setItem: () => { throw new Error("quota"); } };
    expect(writeNewGame(full, newGame(), { status: "empty" }, true)).toEqual({ ok: false,
      message: "保存できませんでした。空き容量やブラウザの保存設定を確認して、もう一度お試しください。" });
  });
});

function never(): never {
  throw new Error("expected a successful write");
}
