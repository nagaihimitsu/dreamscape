import { describe, expect, it } from "vitest";
import { createGame } from "../domain";
import { deleteSaveData, LEARNING_KEY, loadGame, SAVE_KEY, saveGame } from "../persistence";
import { journeyStorage } from "../persistence/journey-storage";
import { checkDeleteRequest } from "./save-deletion";

const staleTab = "別の画面でセーブが更新されています。再読み込みしてからやり直してください。";
const unconfirmed = "保存データを確認できません。再読み込みしてからやり直してください。";

/** One browser's localStorage, shared by every tab, seen through Milan's journey slot. */
function browser() {
  const data = new Map<string, string>();
  const base = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  };
  return { data, slot: journeyStorage(base, "milano") };
}

describe("deleting the save from settings", () => {
  it("asks for confirmation with a snapshot, keeps everything until confirmed, then removes only this journey's slots", () => {
    const { data, slot } = browser();
    const state = createGame("ユウ", "ミオ");
    expect(saveGame(slot, state).ok).toBe(true);
    slot.setItem(LEARNING_KEY, "notes");
    data.set("dreamscape.journey.golden_triangle.save.v1", "other journey");
    const before = new Map(data);

    const request = checkDeleteRequest(slot, { hasGame: true, savedGame: state, protectedOriginal: null, loaded: { status: "loaded", state } });
    expect(request).toEqual({ closeSettings: true, snapshot: { game: slot.getItem(SAVE_KEY), learning: "notes" } });
    // Preparing the confirmation (or cancelling it) writes nothing.
    expect(data).toEqual(before);

    expect(deleteSaveData(slot, request.snapshot!)).toEqual({ ok: true });
    expect(slot.getItem(SAVE_KEY)).toBeNull();
    expect(slot.getItem(LEARNING_KEY)).toBeNull();
    expect(data.get("dreamscape.journey.golden_triangle.save.v1")).toBe("other journey");
  });

  it("does not let an older tab delete progress another tab saved or removed", () => {
    const { data, slot } = browser();
    const older = createGame("ユウ", "ミオ");
    expect(saveGame(slot, older).ok).toBe(true);
    const session = { hasGame: true, savedGame: older, protectedOriginal: null, loaded: { status: "loaded" as const, state: older } };

    const newer = { ...older, revision: older.revision + 1 };
    expect(saveGame(slot, newer, older).ok).toBe(true);
    const saved = new Map(data);
    expect(checkDeleteRequest(slot, session)).toEqual({ closeSettings: true, notice: staleTab });
    expect(data).toEqual(saved);

    slot.removeItem(SAVE_KEY);
    expect(checkDeleteRequest(slot, session)).toEqual({ closeSettings: true, notice: staleTab });
  });

  it("rejects the confirmed snapshot when another tab saves while the dialog is open", () => {
    const { slot } = browser();
    const state = createGame("ユウ", "ミオ");
    expect(saveGame(slot, state).ok).toBe(true);
    const request = checkDeleteRequest(slot, { hasGame: true, savedGame: state, protectedOriginal: null, loaded: { status: "loaded", state } });
    const newer = { ...state, revision: state.revision + 1 };
    expect(saveGame(slot, newer, state).ok).toBe(true);
    const raw = slot.getItem(SAVE_KEY);

    expect(deleteSaveData(slot, request.snapshot!).ok).toBe(false);
    expect(slot.getItem(SAVE_KEY)).toBe(raw);
  });

  it("checks an unsaved game against the empty slot or the protected unreadable original", () => {
    const { slot } = browser();
    const game = createGame("ユウ", "ミオ");
    const unsaved = { hasGame: true, savedGame: null, protectedOriginal: null, loaded: { status: "empty" as const } };
    expect(checkDeleteRequest(slot, unsaved)).toEqual({ closeSettings: true, snapshot: { game: null, learning: null } });
    expect(saveGame(slot, game).ok).toBe(true);
    expect(checkDeleteRequest(slot, unsaved)).toEqual({ closeSettings: true, notice: staleTab });

    const broken = browser().slot;
    broken.setItem(SAVE_KEY, "{broken");
    const loaded = loadGame(broken);
    const protectedStart = { hasGame: true, savedGame: null, protectedOriginal: "{broken", loaded };
    expect(checkDeleteRequest(broken, protectedStart)).toEqual({ closeSettings: true, snapshot: { game: "{broken", learning: null } });
    broken.setItem(SAVE_KEY, "{changed");
    expect(checkDeleteRequest(broken, protectedStart)).toEqual({ closeSettings: true, notice: staleTab });
  });

  it("allows deleting an unreadable save from the start screen only while it is unchanged", () => {
    const { slot } = browser();
    slot.setItem(SAVE_KEY, "{broken");
    const loaded = loadGame(slot);
    expect(loaded.status).toBe("invalid");
    const startScreen = { hasGame: false, savedGame: null, protectedOriginal: null, loaded };
    expect(checkDeleteRequest(slot, startScreen)).toEqual({ closeSettings: true, snapshot: { game: "{broken", learning: null } });

    slot.setItem(SAVE_KEY, "{changed");
    expect(checkDeleteRequest(slot, startScreen)).toEqual({ closeSettings: false, notice: unconfirmed });
    expect(checkDeleteRequest(slot, { ...startScreen, loaded: { status: "empty" } })).toEqual({ closeSettings: false, notice: unconfirmed });
  });

  it("reports unreadable browser storage without offering deletion", () => {
    const { slot } = browser();
    const state = createGame("ユウ", "ミオ");
    expect(saveGame(slot, state).ok).toBe(true);
    const blocked = { ...slot, getItem: (key: string) => {
      if (key === LEARNING_KEY) throw new Error("blocked");
      return slot.getItem(key);
    } };
    expect(checkDeleteRequest(blocked, { hasGame: true, savedGame: state, protectedOriginal: null, loaded: { status: "loaded", state } }))
      .toEqual({ closeSettings: false, notice: "保存データを読み取れませんでした。ブラウザの保存設定を確認してください。" });
  });
});
