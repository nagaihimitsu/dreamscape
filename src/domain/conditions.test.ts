import { describe, expect, it } from "vitest";
import { battles, episodes, landmarks } from "../content";
import { LEAF_KINDS, type Condition, type Leaf } from "../content/condition-schemas";
import { battlePlayed, meets } from "./conditions";
import { createGame, type GameState } from "./game";
import { sleepAtHotel } from "./travel-game";

const base = createGame();
const at = (minute: number): GameState => ({ ...base, travel: { ...base.travel, minute } });
const record = (battleId: string, attempts = 1): GameState["battleRecords"][number] =>
  ({ battleId, attempts, firstScore: 0, bestScore: 0, lastScore: 0 });
/** Each leaf: a state where it is true and one where it is false (both from a new game). */
const TRUTH: Record<(typeof LEAF_KINDS)[number], [Leaf, GameState, GameState]> = {
  episodeCompleted: [{ episodeCompleted: "e1" }, { ...base, completedEpisodeIds: ["e1"] }, { ...base, completedEpisodeIds: ["e2"] }],
  episodesCompleted: (() => {
    const city = episodes[0].cityId;
    const own = episodes.filter((episode) => episode.cityId === city).map((episode) => episode.id);
    return [{ episodesCompleted: { city, atLeast: 1 } }, { ...base, completedEpisodeIds: own.slice(0, 1) },
      { ...base, completedEpisodeIds: episodes.filter((episode) => episode.cityId !== city).map((episode) => episode.id) }];
  })(),
  cityCompleted: [{ cityCompleted: "c1" }, { ...base, completedCityIds: ["c1"] }, base],
  // A saved record always has an attempt; a record of another battle does not count.
  battlePlayed: [{ battlePlayed: "b1" }, { ...base, battleRecords: [record("b1")] }, { ...base, battleRecords: [record("b2")] }],
  landmarkVisited: [{ landmarkVisited: "l1" }, { ...base, visitedLandmarkIds: ["l1"] }, base],
  guideRead: [{ guideRead: "l1" }, { ...base, completedGuideIds: ["l1"] }, { ...base, visitedLandmarkIds: ["l1"] }],
  encounterCompleted: [{ encounterCompleted: "x1" }, { ...base, completedEncounterIds: ["x1"], seenEncounterIds: ["x1"] }, { ...base, seenEncounterIds: ["x1"] }],
  encounterSeen: [{ encounterSeen: "x1" }, { ...base, seenEncounterIds: ["x1"] }, { ...base, seenEncounterIds: ["x2"] }],
  datePlayed: [{ datePlayed: "d1" }, { ...base, playedDateIds: ["d1"] }, base],
  epilogueViewed: [{ epilogueViewed: "c1" }, { ...base, viewedEpilogueCityIds: ["c1"] }, { ...base, completedCityIds: ["c1"] }],
  item: [{ item: { id: "i1", is: "held" } }, { ...base, inventory: { i1: "held" } }, { ...base, inventory: { i1: "gifted" } }],
  time: [{ time: "night" }, at(18 * 60), at(17 * 60 + 59)],
  cityDay: [{ cityDay: { atLeast: 2, atMost: 3 } }, { ...base, travel: { ...base.travel, day: 3 } }, { ...base, travel: { ...base.travel, day: 4 } }],
  journeyDay: [{ journeyDay: { atLeast: 2 } },
    { ...base, travel: { ...base.travel, calendar: { journeyDay: 2, cityStartJourneyDay: 1, startWeekday: 0 } } },
    { ...base, travel: { ...base.travel, calendar: { journeyDay: 1, cityStartJourneyDay: 1, startWeekday: 0 } } }],
  weekday: [{ weekday: [5, 6] },
    { ...base, travel: { ...base.travel, calendar: { journeyDay: 6, cityStartJourneyDay: 1, startWeekday: 0 } } },
    { ...base, travel: { ...base.travel, calendar: { journeyDay: 1, cityStartJourneyDay: 1, startWeekday: 0 } } }],
  rides: [{ rides: { mode: "tram", atLeast: 2 } }, { ...base, travel: { ...base.travel, rideCounts: { tram: 2 } } },
    { ...base, travel: { ...base.travel, rideCounts: { tram: 1, taxi: 3 } } }],
  rented: [{ rented: "bicycle" }, { ...base, travel: { ...base.travel, rentedModeIds: ["bicycle"] } }, base],
  // Stage 2a: a city's battles played (won or lost, its finale not counted).
  battlesPlayed: (() => {
    const cityOf = (battle: (typeof battles)[number]) => landmarks.find((landmark) => landmark.id === battle.landmarkId)?.cityId;
    const city = cityOf(battles.find((battle) => battle.scope !== "city_finale")!)!;
    const own = battles.filter((battle) => battle.scope !== "city_finale" && cityOf(battle) === city).map((battle) => battle.id);
    const finale = battles.find((battle) => battle.scope === "city_finale" && battle.cityId === city)!;
    return [{ battlesPlayed: { city, atLeast: 2 } }, { ...base, battleRecords: [record(own[0]), record(own[1], 1)] },
      { ...base, battleRecords: [record(own[0]), record(finale.id), record(own[1], 0)] }];
  })(),
  relationship: [{ relationship: { axis: "trust", atMost: -1 } }, { ...base, trust: -1 }, { ...base, trust: 0, affection: -5 }],
  // The money that can be spent: the fare home kept back is not.
  money: [{ money: { atLeast: 300 } }, { ...base, travelBudget: 400, travel: { ...base.travel, returnReserve: 100 } },
    { ...base, travelBudget: 400, travel: { ...base.travel, returnReserve: 101 } }],
  romanceStage: [{ romanceStage: { atLeast: 2, atMost: 3 } }, { ...base, romanceStage: 3 }, { ...base, romanceStage: 4 }],
  couple: [{ couple: true }, { ...base, confessionStatus: "accepted" }, { ...base, confessionStatus: "deferred" }],
};

describe("meets", () => {
  it.each(Object.entries(TRUTH))("reads the record of %s", (_, [leaf, truthy, falsy]) => {
    expect(meets(truthy, leaf)).toBe(true);
    expect(meets(falsy, leaf)).toBe(false);
  });

  it("covers every leaf kind", () => {
    expect(Object.keys(TRUTH).sort()).toEqual([...LEAF_KINDS].sort());
  });

  it("combines leaves with all, any, not and atLeast; no condition is true", () => {
    const yes: Condition = { cityCompleted: "c1" };
    const no: Condition = { cityCompleted: "c2" };
    const state = { ...base, completedCityIds: ["c1"] };
    expect(meets(state, undefined)).toBe(true);
    expect(meets(state, { all: [yes, yes] })).toBe(true);
    expect(meets(state, { all: [yes, no] })).toBe(false);
    expect(meets(state, { any: [no, yes] })).toBe(true);
    expect(meets(state, { any: [no, no] })).toBe(false);
    expect(meets(state, { not: no })).toBe(true);
    expect(meets(state, { atLeast: { count: 2, of: [yes, no, yes] } })).toBe(true);
    expect(meets(state, { atLeast: { count: 2, of: [yes, no, no] } })).toBe(false);
  });

  it("counts a city's episodes as the old chapter rule did, for every city", () => {
    const chapterDone = (state: GameState, cityId: string) =>
      state.completedEpisodeIds.some((id) => episodes.some((episode) => episode.id === id && episode.cityId === cityId));
    for (const cityId of new Set(episodes.map((episode) => episode.cityId)))
      for (const episode of episodes) {
        const state = { ...base, completedEpisodeIds: [episode.id] };
        expect(meets(state, { episodesCompleted: { city: cityId, atLeast: 1 } })).toBe(chapterDone(state, cityId));
      }
    const city = episodes[0].cityId;
    const own = episodes.filter((episode) => episode.cityId === city).map((episode) => episode.id);
    expect(meets({ ...base, completedEpisodeIds: own }, { episodesCompleted: { city, atLeast: own.length } })).toBe(true);
    expect(meets({ ...base, completedEpisodeIds: own.slice(1) }, { episodesCompleted: { city, atLeast: own.length } })).toBe(false);
  });

  it("counts a lost battle as played and an item ever obtained whatever its status", () => {
    expect(battlePlayed({ ...base, battleRecords: [record("b1", 2)] }, "b1")).toBe(true);
    expect(battlePlayed({ ...base, battleRecords: [record("b1", 2)] }, "b2")).toBe(false);
    expect(battlePlayed({ ...base, battleRecords: [record("b1", 0)] }, "b1")).toBe(false);
    for (const status of ["held", "gifted", "used", "left_behind"] as const)
      expect(meets({ ...base, inventory: { i1: status } }, { item: { id: "i1", is: "obtained" } })).toBe(true);
    expect(meets(base, { item: { id: "i1", is: "obtained" } })).toBe(false);
  });

  it("calls it night from 18:00 until the party sleeps, a rest at 21:00 or later included", () => {
    for (const minute of [18 * 60, 20 * 60 + 59, 21 * 60, 21 * 60 + 30]) {
      expect(meets(at(minute), { time: "night" })).toBe(true);
      expect(meets(at(minute), { time: "day" })).toBe(false);
    }
    for (const minute of [9 * 60, 12 * 60, 17 * 60 + 59]) {
      expect(meets(at(minute), { time: "day" })).toBe(true);
      expect(meets(at(minute), { time: "night" })).toBe(false);
    }
    const late = at(21 * 60);
    const slept = sleepAtHotel(late, "walk", late.revision);
    expect(slept.travel.minute).toBe(9 * 60);
    expect(meets(slept, { time: "night" })).toBe(false);
    expect(meets(slept, { time: "day" })).toBe(true);
  });

  it("never meets a journey day or weekday without a calendar", () => {
    const plain = { ...base, travel: { ...base.travel, calendar: undefined } };
    expect(meets(plain, { journeyDay: { atLeast: 1 } })).toBe(false);
    expect(meets(plain, { weekday: [0, 1, 2, 3, 4, 5, 6] })).toBe(false);
    expect(meets(plain, { not: { weekday: [0] } })).toBe(true);
  });

  it("reads a frozen state without writing to it", () => {
    const deepFreeze = <T>(value: T): T => {
      if (value && typeof value === "object") {
        Object.values(value).forEach(deepFreeze);
        Object.freeze(value);
      }
      return value;
    };
    for (const [leaf, truthy, falsy] of Object.values(TRUTH)) {
      const frozenTrue = deepFreeze(structuredClone(truthy));
      const frozenFalse = deepFreeze(structuredClone(falsy));
      expect(meets(frozenTrue, { all: [leaf, { not: { not: leaf } }] })).toBe(true);
      expect(meets(frozenFalse, { any: [leaf] })).toBe(false);
      expect(frozenTrue).toEqual(truthy);
    }
  });
});
