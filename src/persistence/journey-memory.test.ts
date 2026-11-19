import { describe, expect, it } from "vitest";
import { createGame, type GameState } from "../domain";
import { defaultJourneyId } from "../content/journeys";
import {
  deleteSaveData, keepJourneyMemory, LEARNING_KEY, loadGame, loadJourneyMemory, MEMORY_KEY, replaceWithNewJourney, SAVE_KEY, saveGame,
  type StorageLike,
} from "./index";
import { journeyPhysicalKey, parseJourneyPhysicalKey } from "./journey-storage";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const game = (revision: number, playerName = "ハル"): GameState => ({ ...createGame(playerName, "ミナ", { journeyId: defaultJourneyId }), revision });

describe("旅の思い出 (2026-11-19)", () => {
  it("keeps a finished journey apart from the save, and reads it back", () => {
    const storage = new MemoryStorage();
    expect(loadJourneyMemory(storage)).toEqual({ status: "empty" });
    const finished = game(40);
    expect(keepJourneyMemory(storage, finished, null)).toEqual({ ok: true });
    const loaded = loadJourneyMemory(storage);
    expect(loaded.status).toBe("loaded");
    expect(loaded.status === "loaded" && loaded.state.revision).toBe(40);
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });

  it("replaces only the memory the confirmation showed", () => {
    const storage = new MemoryStorage();
    keepJourneyMemory(storage, game(10), null);
    const shown = storage.getItem(MEMORY_KEY);
    // Another tab kept another memory meanwhile: refused, nothing changed.
    expect(keepJourneyMemory(storage, game(20), null).ok).toBe(false);
    expect(keepJourneyMemory(storage, game(20), shown)).toEqual({ ok: true });
    const loaded = loadJourneyMemory(storage);
    expect(loaded.status === "loaded" && loaded.state.revision).toBe(20);
  });

  it("tells an unreadable memory apart, and replaces it only when it was shown", () => {
    const storage = new MemoryStorage();
    storage.setItem(MEMORY_KEY, "{broken");
    expect(loadJourneyMemory(storage)).toEqual({ status: "invalid", raw: "{broken" });
    expect(keepJourneyMemory(storage, game(5), null).ok).toBe(false);
    expect(keepJourneyMemory(storage, game(5), "{broken")).toEqual({ ok: true });
  });

  it("starts the journey again over the finished save this tab observed, its revision from the start", () => {
    const storage = new MemoryStorage();
    const finished = game(40);
    saveGame(storage, finished);
    const fresh = game(1);
    expect(replaceWithNewJourney(storage, fresh, game(39)).ok).toBe(false);
    expect(replaceWithNewJourney(storage, fresh, finished)).toEqual({ ok: true });
    const loaded = loadGame(storage);
    expect(loaded.status === "loaded" && loaded.state.revision).toBe(1);
  });

  it("never replaces a save it cannot read", () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, "{broken");
    expect(replaceWithNewJourney(storage, game(1), null).ok).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBe("{broken");
  });

  it("is removed by 保存データの消去 with the rest of the play", () => {
    const storage = new MemoryStorage();
    saveGame(storage, game(3));
    keepJourneyMemory(storage, game(2), null);
    expect(deleteSaveData(storage, { game: storage.getItem(SAVE_KEY), learning: storage.getItem(LEARNING_KEY) })).toEqual({ ok: true });
    expect(storage.getItem(MEMORY_KEY)).toBeNull();
  });

  it("has a key of its own in each journey's slot", () => {
    const physical = journeyPhysicalKey("milano", MEMORY_KEY);
    expect(physical).toBe("dreamscape.journey.milano.memory.v1");
    expect(parseJourneyPhysicalKey(physical)).toEqual({ journeyId: "milano", key: MEMORY_KEY, slot: 1 });
  });
});

describe("旅の思い出 of each save slot", () => {
  it("has a key of its own in each slot, read back with its slot", () => {
    const physical = journeyPhysicalKey("milano", MEMORY_KEY, 2);
    expect(physical).toBe("dreamscape.journey.milano.slot2.memory.v1");
    expect(parseJourneyPhysicalKey(physical)).toEqual({ journeyId: "milano", key: MEMORY_KEY, slot: 2 });
  });
});
