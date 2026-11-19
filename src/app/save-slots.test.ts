// The journey's save slots (2026-11-19 user decision): the slot played last is a per-device preference, and the list of
// saves shows each slot's names and where its journey is, never a relationship value.
import { describe, expect, it } from "vitest";
import { createGame } from "../domain";
import { saveGame } from "../persistence";
import { journeyStorage } from "../persistence/journey-storage";
import { lastSlotKey, readLastSlot, rememberSlot, slotSummaries } from "./save-slots";

function memory() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  };
}

describe("save slots", () => {
  it("remembers the slot played per journey, and falls back to slot 1", () => {
    const base = memory();
    expect(readLastSlot(base, "milano")).toBe(1);
    rememberSlot(base, "milano", 3);
    expect(readLastSlot(base, "milano")).toBe(3);
    expect(readLastSlot(base, "golden_triangle")).toBe(1);
    base.data.set(lastSlotKey("milano"), "9");
    expect(readLastSlot(base, "milano")).toBe(1);
    const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    expect(readLastSlot(broken, "milano")).toBe(1);
    expect(() => rememberSlot(broken, "milano", 2)).not.toThrow();
  });

  it("summarizes each slot: empty, a save with its names, city and day, or one it cannot read", () => {
    const base = memory();
    expect(saveGame(journeyStorage(base, "milano", 1), createGame("ユウ", "ミオ")).ok).toBe(true);
    base.data.set(journeyStorage(base, "milano", 3).physicalKey("dreamscape.save.v1"), "{broken");
    expect(slotSummaries(base, "milano")).toEqual([
      { slot: 1, status: "saved", playerName: "ユウ", heroineName: "ミオ", cityJa: "ミラノ", day: 1, finished: false, difficulty: { english: "B1", economy: "standard" } },
      { slot: 2, status: "empty" },
      { slot: 3, status: "unreadable" },
    ]);
  });
});
