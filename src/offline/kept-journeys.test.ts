import { describe, expect, it } from "vitest";
import { KEPT_JOURNEYS_KEY, parseJourneyList, readKeptJourneys, writeKeptJourneys } from "./kept-journeys";

// The mirror of the kept journeys that the title and index.html's preload script read before Cache Storage can be
// (user decision 2026-11-17, 「A」): a hint that is written, removed, and read back safely.
const memory = (entries: Record<string, string> = {}) => {
  const values = new Map(Object.entries(entries));
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
};
const refusing = {
  getItem: (): string | null => { throw new DOMException("The operation is insecure.", "SecurityError"); },
  setItem: () => { throw new DOMException("The quota has been exceeded.", "QuotaExceededError"); },
  removeItem: () => { throw new DOMException("The operation is insecure.", "SecurityError"); },
};

describe("the kept journeys' mirror", () => {
  it("is written in its own key, read back, and removed when nothing is kept", () => {
    const storage = memory({ "dreamscape.last-journey.v1": "milano" });
    writeKeptJourneys(storage, ["milano", "golden_triangle"]);
    expect(storage.getItem(KEPT_JOURNEYS_KEY)).toBe('["milano","golden_triangle"]');
    expect(readKeptJourneys(storage)).toEqual(["milano", "golden_triangle"]);
    writeKeptJourneys(storage, []);
    expect(Object.fromEntries(storage.values)).toEqual({ "dreamscape.last-journey.v1": "milano" });
    expect(readKeptJourneys(storage)).toBeNull();
  });

  it("counts a value of another form, or a storage that refuses, as not known", () => {
    for (const raw of ["milano", "{\"milano\":true}", "", "null", "3"]) expect(parseJourneyList(raw), raw).toBeNull();
    expect(parseJourneyList('["milano",1,{"id":"x"},"golden_triangle"]')).toEqual(["milano", "golden_triangle"]);
    expect(readKeptJourneys(refusing)).toBeNull();
    expect(() => writeKeptJourneys(refusing, ["milano"])).not.toThrow();
    expect(() => writeKeptJourneys(refusing, [])).not.toThrow();
  });
});
