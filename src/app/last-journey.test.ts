import { describe, expect, it } from "vitest";
import { LAST_JOURNEY_KEY, openingJourneyId, readLastJourney, rememberJourney } from "./last-journey";

// UI stage 0, item L: the title opens the journey last opened on this device, a
// per-device preference kept apart from saves, with a safe fallback.
const journeys = [
  { id: "milano", status: "available" },
  { id: "golden_triangle", status: "available" },
  { id: "uzbekistan", status: "preparing" },
];
const memory = (entries: Record<string, string> = {}) => {
  const values = new Map(Object.entries(entries));
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
};
const refusing = {
  getItem: (): string | null => { throw new DOMException("The operation is insecure.", "SecurityError"); },
  setItem: () => { throw new DOMException("The quota has been exceeded.", "QuotaExceededError"); },
};

describe("openingJourneyId", () => {
  it("opens the remembered journey while it can be played", () => {
    expect(openingJourneyId("golden_triangle", journeys, "milano")).toBe("golden_triangle");
  });

  it("falls back to the default journey when nothing is remembered", () => {
    expect(openingJourneyId(null, journeys, "milano")).toBe("milano");
  });

  it("falls back when the remembered journey is not in this version (removed, renamed or a stray value)", () => {
    expect(openingJourneyId("luang_prabang", journeys, "milano")).toBe("milano");
    expect(openingJourneyId("", journeys, "milano")).toBe("milano");
    expect(openingJourneyId("{\"id\":\"golden_triangle\"}", journeys, "milano")).toBe("milano");
  });

  it("falls back when the remembered journey is preparing in this version", () => {
    expect(openingJourneyId("uzbekistan", journeys, "milano")).toBe("milano");
  });
});

describe("readLastJourney", () => {
  it("reads the remembered journey from its own key", () => {
    expect(readLastJourney(memory({ [LAST_JOURNEY_KEY]: "golden_triangle" }))).toBe("golden_triangle");
    expect(readLastJourney(memory())).toBeNull();
  });

  it("counts a storage that cannot be read as nothing remembered", () => {
    expect(readLastJourney(refusing)).toBeNull();
  });
});

describe("rememberJourney", () => {
  it("writes only its own key, for a journey that can be played", () => {
    const storage = memory({ "dreamscape.journey.milano.save.v1": "{}" });
    rememberJourney(storage, journeys[1]);
    expect(Object.fromEntries(storage.values)).toEqual({ "dreamscape.journey.milano.save.v1": "{}", [LAST_JOURNEY_KEY]: "golden_triangle" });
  });

  it("keeps the last playable journey when a preparing journey or none is opened", () => {
    const storage = memory({ [LAST_JOURNEY_KEY]: "golden_triangle" });
    rememberJourney(storage, journeys[2]);
    rememberJourney(storage, undefined);
    expect(storage.getItem(LAST_JOURNEY_KEY)).toBe("golden_triangle");
  });

  it("ignores a storage that refuses the write", () => {
    expect(() => rememberJourney(refusing, journeys[0])).not.toThrow();
  });

  it("is read back as the journey to open", () => {
    const storage = memory();
    rememberJourney(storage, journeys[1]);
    expect(openingJourneyId(readLastJourney(storage), journeys, "milano")).toBe("golden_triangle");
  });
});
