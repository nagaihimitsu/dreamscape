import { describe, expect, it } from "vitest";
import { LAST_JOURNEY_KEY, openingJourneyId, readLastJourney, readRecentJourneys, RECENT_JOURNEYS_KEY, rememberJourney, titleJourneyId } from "./last-journey";

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
  it("writes only its own keys, for a journey that can be played: the remembered one, and the recent list with it first", () => {
    const storage = memory({ "dreamscape.journey.milano.save.v1": "{}" });
    rememberJourney(storage, journeys[1]);
    expect(Object.fromEntries(storage.values)).toEqual({
      "dreamscape.journey.milano.save.v1": "{}", [LAST_JOURNEY_KEY]: "golden_triangle", [RECENT_JOURNEYS_KEY]: '["golden_triangle"]',
    });
    rememberJourney(storage, journeys[0]);
    rememberJourney(storage, journeys[1]);
    expect(readRecentJourneys(storage)).toEqual(["golden_triangle", "milano"]);
  });

  it("reads a recent list of another form as none, and keeps only its strings", () => {
    expect(readRecentJourneys(memory({ [RECENT_JOURNEYS_KEY]: "golden_triangle" }))).toEqual([]);
    expect(readRecentJourneys(memory({ [RECENT_JOURNEYS_KEY]: '{"0":"milano"}' }))).toEqual([]);
    expect(readRecentJourneys(memory({ [RECENT_JOURNEYS_KEY]: '["milano",3,null,"golden_triangle"]' }))).toEqual(["milano", "golden_triangle"]);
    expect(readRecentJourneys(refusing)).toEqual([]);
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

// User decision 2026-11-17 (「A」): without a network, the title opens a journey the device keeps for 「オフラインで遊ぶ」.
describe("titleJourneyId", () => {
  const catalog = [...journeys, { id: "jaipur", status: "available" }];
  const pick = (facts: Partial<Parameters<typeof titleJourneyId>[0]>) =>
    titleJourneyId({ remembered: null, recent: [], kept: null, online: false, ...facts }, catalog, "milano");

  it("changes nothing with a network", () => {
    expect(pick({ online: true, remembered: "golden_triangle", kept: ["milano"] })).toBe("golden_triangle");
    expect(pick({ online: true, remembered: null, kept: ["jaipur"] })).toBe("milano");
  });

  it("changes nothing when what is kept is not known or nothing playable is kept", () => {
    expect(pick({ remembered: "golden_triangle", kept: null })).toBe("golden_triangle");
    expect(pick({ remembered: "golden_triangle", kept: [] })).toBe("golden_triangle");
    expect(pick({ remembered: "golden_triangle", kept: ["uzbekistan", "luang_prabang"] })).toBe("golden_triangle");
  });

  it("keeps the remembered journey when it is kept", () => {
    expect(pick({ remembered: "golden_triangle", recent: ["milano"], kept: ["milano", "golden_triangle"] })).toBe("golden_triangle");
  });

  it("else opens the kept journey opened most recently, else the first kept one in the catalog's order", () => {
    expect(pick({ remembered: "golden_triangle", recent: ["golden_triangle", "jaipur", "milano"], kept: ["milano", "jaipur"] })).toBe("jaipur");
    expect(pick({ remembered: "golden_triangle", recent: ["golden_triangle"], kept: ["jaipur", "milano"] })).toBe("milano");
    // Nothing remembered: the default journey when kept, else as above.
    expect(pick({ kept: ["jaipur", "milano"] })).toBe("milano");
    expect(pick({ kept: ["jaipur"] })).toBe("jaipur");
    // A remembered journey this version cannot play counts as none.
    expect(pick({ remembered: "uzbekistan", recent: ["uzbekistan", "golden_triangle"], kept: ["golden_triangle"] })).toBe("golden_triangle");
  });

  it("does not change the remembered journey", () => {
    const storage = memory({ [LAST_JOURNEY_KEY]: "golden_triangle" });
    expect(titleJourneyId({ remembered: readLastJourney(storage), recent: readRecentJourneys(storage), kept: ["milano"], online: false }, catalog, "milano")).toBe("milano");
    expect(storage.getItem(LAST_JOURNEY_KEY)).toBe("golden_triangle");
  });
});
