// Read-skip (既読スキップ; 2026-11-11 user decision): fast-forward stops at the first line this device has not read,
// unless the reader chose to fast-forward through unread lines too. The record is per device and journey, apart from
// the save; failing or unreadable storage never stops reading and an unreadable record is never overwritten.
import { describe, expect, it } from "vitest";
import { READ_LINES_KEY } from "../persistence";
import { journeyStorage } from "../persistence/journey-storage";
import { addReadLine, markLineRead, openReadLines, parseReadLines, readLineId, serializeReadLines, stopsFastForward } from "./read-skip";

function memory(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const writes: string[] = [];
  return {
    data, writes,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { writes.push(key); data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  };
}

describe("a line's identity", () => {
  it("is a short hash of its story and its text: stable, and another for an edited line or another story", () => {
    const id = readLineId("places/smp_mihon_clock_tower", "時計の針は、三時のまま。");
    expect(id).toMatch(/^[0-9a-f]{8}$/u);
    expect(readLineId("places/smp_mihon_clock_tower", "時計の針は、三時のまま。")).toBe(id);
    expect(readLineId("places/smp_mihon_clock_tower", "時計の針は、三時のままだ。")).not.toBe(id);
    expect(readLineId("places/smp_mihon_market", "時計の針は、三時のまま。")).not.toBe(id);
    // The story and the text are kept apart: moving characters between them makes another line.
    expect(readLineId("ab", "c")).not.toBe(readLineId("a", "bc"));
  });
});

describe("where fast-forward stops", () => {
  it("stops on arriving at a line not read before, unless the reader fast-forwards through unread lines too", () => {
    expect(stopsFastForward({ fast: true, readBefore: false, skipUnread: false })).toBe(true);
    expect(stopsFastForward({ fast: true, readBefore: true, skipUnread: false })).toBe(false);
    expect(stopsFastForward({ fast: true, readBefore: false, skipUnread: true })).toBe(false);
    // Not running, or a line without an identity (no record, no text): nothing to stop.
    expect(stopsFastForward({ fast: false, readBefore: false, skipUnread: false })).toBe(false);
    expect(stopsFastForward({ fast: true, readBefore: null, skipUnread: false })).toBe(false);
  });
});

describe("the read record", () => {
  it("reads only its own format and keeps its lines oldest first", () => {
    expect(parseReadLines(null)).toEqual([]);
    expect(parseReadLines(serializeReadLines(["0000000a", "ffffffff"]))).toEqual(["0000000a", "ffffffff"]);
    for (const raw of ["{broken", "[]", "null", JSON.stringify({ schemaVersion: 2, ids: [] }), JSON.stringify({ schemaVersion: 1, ids: ["XYZ"] }),
      JSON.stringify({ schemaVersion: 1, ids: [] , extra: true }), JSON.stringify({ schemaVersion: 1 })])
      expect(parseReadLines(raw), raw).toBeNull();
  });

  it("drops the oldest lines beyond its cap", () => {
    expect(addReadLine(["00000001", "00000002"], "00000003", 3)).toEqual({ ids: ["00000001", "00000002", "00000003"], dropped: [] });
    expect(addReadLine(["00000001", "00000002", "00000003"], "00000004", 3)).toEqual({ ids: ["00000002", "00000003", "00000004"], dropped: ["00000001"] });
  });

  it("is written to the journey's own key once per new line, and forgets the oldest at its cap", () => {
    const base = memory();
    const storage = journeyStorage(base, "milano");
    const record = openReadLines(storage);
    const [a, b, c] = ["first", "second", "third"].map((text) => readLineId("dates/milano_cafe_01", text));
    markLineRead(storage, record, a, 2);
    markLineRead(storage, record, a, 2);
    markLineRead(storage, record, b, 2);
    expect(base.writes).toEqual(["dreamscape.journey.milano.read-lines.v1", "dreamscape.journey.milano.read-lines.v1"]);
    expect(parseReadLines(base.data.get("dreamscape.journey.milano.read-lines.v1")!)).toEqual([a, b]);
    markLineRead(storage, record, c, 2);
    expect(record.read.has(a)).toBe(false);
    expect(openReadLines(storage).ids).toEqual([b, c]);
    // Another journey has its own record.
    expect(openReadLines(journeyStorage(base, "golden_triangle")).ids).toEqual([]);
  });

  it("keeps reading in memory when storage fails, and never writes over a record it cannot read", () => {
    const unreadable = memory({ [READ_LINES_KEY]: "{written by another version" });
    const kept = openReadLines(unreadable);
    expect(kept).toMatchObject({ ids: [], writable: false });
    markLineRead(unreadable, kept, "0000000a");
    expect(kept.read.has("0000000a")).toBe(true);
    expect(unreadable.data.get(READ_LINES_KEY)).toBe("{written by another version");

    const blocked = { getItem: () => { throw new DOMException("blocked", "SecurityError"); }, setItem: () => { throw new Error("never"); } };
    const memoryOnly = openReadLines(blocked);
    expect(memoryOnly.writable).toBe(false);
    expect(() => markLineRead(blocked, memoryOnly, "0000000b")).not.toThrow();
    expect(memoryOnly.read.has("0000000b")).toBe(true);

    const full = { ...memory(), setItem: () => { throw new DOMException("full", "QuotaExceededError"); } };
    const record = openReadLines(full);
    expect(() => markLineRead(full, record, "0000000c")).not.toThrow();
    expect(record.read.has("0000000c")).toBe(true);
  });
});
