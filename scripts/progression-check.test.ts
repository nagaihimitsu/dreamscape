import { describe, expect, it } from "vitest";
import type { Condition } from "../src/content/condition-schemas";
import { canStillClearCity, moneyShortNow, progressionErrors, progressionWarnings, startSnapshot, type ProgressionContent, type ProgressionSnapshot } from "./progression-check";

// The progression check (unified event design stage 2b, 3.3 check 9 and its warnings) on small
// fictional content: one city, "town", with three landmark battles (a, b, c), a finale and one date.

function town(finale: { when?: Condition; requiredEpisodeIds?: string[] } = {}, extra: Partial<ProgressionContent> = {}): ProgressionContent {
  return {
    journeys: [{ id: "trip", cities: [{ id: "town" }], initialBudget: 120 }],
    episodes: [
      { id: "ep_a", kind: "episode", cityId: "town", landmarkId: "lm_a", battleId: "bt_a", requiredEpisodeIds: [] },
      { id: "fin", kind: "city_finale", cityId: "town", landmarkId: null, battleId: "bt_fin", requiredEpisodeIds: finale.requiredEpisodeIds ?? [], when: finale.when },
    ],
    storyBattles: [{ battleId: "bt_b", requiredEpisodeIds: [] }, { battleId: "bt_c", requiredEpisodeIds: [] }],
    battles: [
      { id: "bt_a", landmarkId: "lm_a" }, { id: "bt_b", landmarkId: "lm_b" }, { id: "bt_c", landmarkId: "lm_c" },
      { id: "bt_fin", cityId: "town", landmarkId: null, scope: "city_finale" },
    ],
    landmarks: [
      { id: "lm_a", cityId: "town", guideStoryId: "tourism/a" }, { id: "lm_b", cityId: "town" }, { id: "lm_c", cityId: "town", observation: false },
    ],
    encounters: [{ id: "en_gift", cityId: "town", completionItemId: "key", options: [{ giftItemId: "key" }, {}] }],
    items: [{ id: "key", cityId: "town" }],
    dates: [{ id: "dt", chapterId: "town", kind: "normal", apCost: 2 }],
    travel: [{ cityId: "town", hotelPlaceId: "hotel", initialBudget: 120,
      events: [{ id: "ep_a", placeId: "pa", admissionCost: 10 }, { id: "bt_b", placeId: "pb" }, { id: "bt_c", placeId: "pc" },
        { id: "fin", placeId: "pf" }, { id: "dt", placeId: "pd" }],
      routes: [{ fromPlaceId: "hotel", toPlaceId: "pa", cost: 20 }, { fromPlaceId: "pa", toPlaceId: "hotel", cost: 20 },
        { fromPlaceId: "hotel", toPlaceId: "pd", cost: 30 }, { fromPlaceId: "pd", toPlaceId: "hotel", cost: 30 }] }],
    rewards: [{ episodeId: "ep_a", ap: 1, trigger: "battle_complete" }],
    romance: { stages: [{ stage: 1, minCompletedDates: 0 }, { stage: 2, minCompletedDates: 1 }, { stage: 3, minCompletedDates: 2 }, { stage: 4, minCompletedDates: 3 }],
      confession: { minCompletedDates: 3 } },
    ...extra,
  };
}
const kinds = (content: ProgressionContent) => progressionWarnings(content).map((warning) => warning.kind);

describe("check 9: a way to clear every city", () => {
  it("passes the current rule (no when) and an equivalent when", () => {
    expect(progressionErrors(town({ requiredEpisodeIds: ["ep_a"] }))).toEqual([]);
    expect(progressionErrors(town({ when: { all: [{ battlePlayed: "bt_a" }, { battlePlayed: "bt_b" }, { battlePlayed: "bt_c" }] } }))).toEqual([]);
    expect(kinds(town({ requiredEpisodeIds: ["ep_a"] }))).toEqual([]);
  });

  it("stops a finale that can never show on the map, naming the city", () => {
    expect(progressionErrors(town({ when: { battlesPlayed: { city: "town", atLeast: 4 } } }))[0]).toMatch(/^No way to clear city town: .*fin/);
    // The budget is 120 and no scene pays: money >= 3000 is never met (3.9 (a)).
    expect(progressionErrors(town({ when: { money: { atLeast: 3000 } } }))).toHaveLength(1);
    const paying = town({ when: { money: { atLeast: 3000 } } }, { encounters: [{ id: "en_pay", cityId: "town", repeatable: true, completionMoney: 10, options: [{}] }] });
    expect(progressionErrors(paying)).toEqual([]);
    // A special battle that waits for the finale, read by the finale: never.
    const cycle = town({ when: { battlePlayed: "bt_b" } });
    expect(progressionErrors({ ...cycle, storyBattles: [{ battleId: "bt_b", requiredEpisodeIds: [], when: { cityCompleted: "town" } }] })).toHaveLength(1);
    // An item no scene gives is never held; one a scene gives is.
    expect(progressionErrors(town({ when: { item: { id: "key", is: "held" } } }))).toEqual([]);
    expect(progressionErrors(town({ when: { item: { id: "key", is: "held" } } }, { encounters: [] }))).toHaveLength(1);
  });

  it("reads the romance parts without not as some day true and with not as true at the start", () => {
    expect(progressionErrors(town({ when: { couple: true } }))).toEqual([]);
    expect(progressionErrors(town({ when: { romanceStage: { atLeast: 4 } } }))).toEqual([]);
    expect(progressionErrors(town({ when: { not: { couple: true } } }))).toEqual([]);
  });
});

describe("check 9's warnings", () => {
  it("warns of a city cleared only through the romance, not when a battle way is left", () => {
    expect(kinds(town({ when: { couple: true } }))).toContain("romance-only-city");
    expect(kinds(town({ when: { any: [{ battlesPlayed: { city: "town", atLeast: 3 } }, { couple: true }] } }))).not.toContain("romance-only-city");
  });

  it("warns of a condition that may never be met again, not when another way is left", () => {
    for (const when of [{ money: { atLeast: 50 } }, { item: { id: "key", is: "held" } }, { not: { couple: true } }, { not: { battlePlayed: "bt_a" } }] as Condition[])
      expect(kinds(town({ when })), JSON.stringify(when)).toContain("never-met-again");
    expect(kinds(town({ when: { any: [{ money: { atLeast: 50 } }, { battlesPlayed: { city: "town", atLeast: 2 } }] } }))).not.toContain("never-met-again");
  });

  it("warns of clues at a landmark without an observation, naming what uses them", () => {
    const warnings = progressionWarnings(town(), [{ clueId: "clue_c", usedBy: "question q1" }], [{ landmarkId: "lm_c", clueIds: ["clue_c"] }]);
    expect(warnings.find((warning) => warning.kind === "unfindable-clue")?.message).toMatch(/lm_c .*clue_c, used by question q1/);
    expect(progressionWarnings(town(), [], [{ landmarkId: "lm_b", clueIds: ["clue_b"] }])).toEqual([]);
  });

  it("warns of a battle left after the epilogue in a journey that moves on after it", () => {
    const content = town({ when: { battlesPlayed: { city: "town", atLeast: 2 } } });
    expect(kinds(content)).not.toContain("battle-after-epilogue");
    const moving = { ...content, journeys: [{ ...content.journeys[0], cityTransition: "after_epilogue" as const }] };
    expect(kinds(moving).filter((kind) => kind === "battle-after-epilogue")).toHaveLength(3);
    expect(kinds({ ...moving, episodes: town({ requiredEpisodeIds: ["ep_a"] }).episodes })).not.toContain("battle-after-epilogue");
  });

  it("warns of a date that never opens", () => {
    const content = town({}, { dates: [{ id: "dt", chapterId: "town", kind: "normal", apCost: 2, when: { battlesPlayed: { city: "town", atLeast: 9 } } }] });
    expect(kinds(content)).toContain("never-offered");
  });

  it("warns when the budget may not cover the required main parts after the other events, and when the AP may not cover the needed dates", () => {
    // The finale needs ep_a (20 + 10 + 20); the date costs 60 at its cheapest: 120 - 60 >= 50, 90 - 60 < 50.
    const content = town({ requiredEpisodeIds: ["ep_a"] });
    expect(kinds(content)).toEqual([]);
    const poor = { ...content, journeys: [{ ...content.journeys[0], initialBudget: 90 }] };
    expect(progressionWarnings(poor).find((warning) => warning.kind === "money-shortfall")?.message).toMatch(/city town: .*leaves 30.*cost at least 50: 20 short/);
    // A finale that needs the date: 2 AP, the city gives 1.
    expect(kinds(town({ when: { datePlayed: "dt" } }))).toContain("ap-shortfall");
  });
});

describe("from the current state (the exploration walk)", () => {
  const now = (change: Partial<ProgressionSnapshot>): ProgressionSnapshot => ({ ...startSnapshot(), exact: true, ...change });

  it("tells when a finale can no longer show on the map", () => {
    const content = town({ when: { not: { battlePlayed: "bt_a" } } });
    expect(canStillClearCity(content, "town", now({}))).toBe(true);
    expect(canStillClearCity(content, "town", now({ battles: new Set(["bt_a"]) }))).toBe(false);
    const couple = town({ when: { not: { couple: true } } });
    expect(canStillClearCity(couple, "town", now({ couple: true }))).toBe(false);
    // A cleared city stays cleared.
    expect(canStillClearCity(content, "town", now({ battles: new Set(["bt_a"]), cities: new Set(["town"]) }))).toBe(true);
  });

  it("tells how much money the remaining required main parts lack", () => {
    const content = town({ requiredEpisodeIds: ["ep_a"] });
    expect(moneyShortNow(content, "town", now({ money: 60 }))).toBeUndefined();
    expect(moneyShortNow(content, "town", now({ money: 40 }))).toBe(10);
    expect(moneyShortNow(content, "town", now({ money: 0, battles: new Set(["bt_a"]) }))).toBeUndefined();
  });
});

describe("check 9: the author-started epilogue (then: epilogue; 3.9 (d))", () => {
  // "town" is the journey's last city: its epilogue must be able to start.
  it("stops a city whose then: epilogue scenes can never come, and passes one that can", () => {
    expect(progressionErrors(town({}, { epilogueStarters: [{ sceneId: "fin_head", cityId: "town", battleId: "bt_fin" }] }))).toEqual([]);
    expect(progressionErrors(town({}, { epilogueStarters: [{ sceneId: "talk_a", cityId: "town", landmarkIds: ["lm_a"] }] }))).toEqual([]);
    // Its condition can never be met (a battle of no city), or its visit is never reached.
    expect(progressionErrors(town({}, { epilogueStarters: [{ sceneId: "talk_a", cityId: "town", landmarkIds: ["lm_a"], when: { battlePlayed: "bt_none" } }] }))[0])
      .toMatch(/^No way to start the epilogue of city town: .*talk_a/);
    expect(progressionErrors(town({}, { epilogueStarters: [{ sceneId: "talk_x", cityId: "town", landmarkIds: ["lm_nowhere"] }] }))).toHaveLength(1);
  });

  it("warns, without stopping, for a city the player may leave without it, and where some plays lose it", () => {
    const twoCities = (starter: NonNullable<ProgressionContent["epilogueStarters"]>[number]) => town({}, {
      journeys: [{ id: "trip", cities: [{ id: "town" }, { id: "later" }], initialBudget: 120, cityTransition: "manual" }], epilogueStarters: [starter] });
    const never = twoCities({ sceneId: "talk_x", cityId: "town", landmarkIds: ["lm_nowhere"] });
    expect(progressionErrors(never)).toEqual([]);
    expect(kinds(never)).toContain("epilogue-unreachable");
    // Reached only while an item is still held (it can be given away for good).
    const fragile = town({}, { epilogueStarters: [{ sceneId: "talk_a", cityId: "town", landmarkIds: ["lm_a"], when: { item: { id: "key", is: "held" } } }] });
    expect(progressionErrors(fragile)).toEqual([]);
    expect(kinds(fragile)).toContain("epilogue-unreachable");
    expect(kinds(town({}, { epilogueStarters: [{ sceneId: "fin_head", cityId: "town", battleId: "bt_fin" }] }))).not.toContain("epilogue-unreachable");
  });
});
