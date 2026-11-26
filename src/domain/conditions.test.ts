import { describe, expect, it } from "vitest";
import { battles, dates, episodes, landmarks, progression } from "../content";
import { LEAF_KINDS, type Condition, type Leaf } from "../content/condition-schemas";
import { battlePlayed, canConfessSuccessfully, completedDateCount, meets } from "./conditions";
import { createGame, getDateAvailability, type GameState } from "./game";
import { sleepAtHotel } from "./travel-game";

const base = createGame();
const at = (minute: number): GameState => ({ ...base, travel: { ...base.travel, minute } });
const record = (battleId: string, attempts = 1): GameState["battleRecords"][number] =>
  ({ battleId, attempts, firstScore: 0, bestScore: 0, lastScore: 0 });
/** The new game's city: its ordinary dates, and a state where its episodes are done and AP is plenty (an ordinary date opens). */
const ordinaryHere = dates.filter((date) => date.kind === "normal" && date.chapterId === base.currentCityId).map((date) => date.id);
const datesOpen: GameState = { ...base, ap: 12,
  completedEpisodeIds: episodes.filter((episode) => episode.cityId === base.currentCityId).map((episode) => episode.id) };
/** The confession's thresholds met (romance/progression.json): the relationship values and the ordinary dates it counts. */
const ready: GameState = { ...base, affection: progression.confession.minAffection, trust: progression.confession.minTrust,
  spark: progression.confession.minSpark, playedDateIds: ordinaryHere.slice(0, progression.confession.minCompletedDates) };
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
  // The city's epilogue on screen counts (only what the leaf reads of it is set); an arrival of the same city does not.
  epilogueStarted: (() => {
    const episode = episodes[0];
    const on = (kind?: "arrival") => ({ episodeId: episode.id, ...(kind ? { kind } : {}) }) as unknown as GameState["activeEpilogue"];
    return [{ epilogueStarted: episode.cityId }, { ...base, activeEpilogue: on() }, { ...base, activeEpilogue: on("arrival") }];
  })(),
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
  // 2026-11-15: no rejection waits (none at all here); a rejection with no date since it.
  dateSinceRejection: [{ dateSinceRejection: true }, base, { ...base, confessionStatus: "rejected", lastRejectedDateCount: 0 }],
  // 2026-11-15: the completed dates (an ordinary date counts, a confession does not), a confession that would succeed, an
  // ordinary date of the city that can be started (none once they are all played).
  datesCompleted: [{ datesCompleted: { atLeast: 1 } }, { ...base, playedDateIds: ordinaryHere.slice(0, 1) },
    { ...base, playedDateIds: [dates.find((date) => date.kind === "confession")!.id] }],
  confessionReady: [{ confessionReady: true }, ready, { ...ready, spark: ready.spark - 1 }],
  normalDateAvailable: [{ normalDateAvailable: true }, datesOpen, { ...datesOpen, playedDateIds: ordinaryHere }],
  // Stage 3a: the AP that can be spent, a flag, a person met (a seen scene naming them), a named condition.
  ap: [{ ap: { atLeast: 2 } }, { ...base, ap: 2 }, { ...base, ap: 1 }],
  flag: [{ flag: "smp_mihon_lili_told_why" }, { ...base, storyProgress: { lines: {}, flags: ["smp_mihon_lili_told_why"] } }, base],
  met: [{ met: "smp_mihon_lili" }, { ...base, seenEncounterIds: ["smp_mihon_bookmark_stall"] }, { ...base, seenEncounterIds: ["smp_mihon_bookmark_gift"] }],
  condition: [{ condition: "smp_mihon_lili_heard" },
    { ...base, seenEncounterIds: ["smp_mihon_bookmark_stall"], storyProgress: { lines: {}, flags: ["smp_mihon_lili_told_why"] } },
    { ...base, seenEncounterIds: ["smp_mihon_bookmark_stall"] }],
  // 2026-11-18: a clue in 手がかり帳, however it was recorded (an observation, a scene's # clue: or # on_done: clue).
  clue: [{ clue: "k1" }, { ...base, discoveredClueIds: ["k1"] }, { ...base, discoveredClueIds: ["k2"] }],
  // 2026-11-26: the tour booked (or running) through that offer; another offer of it is not.
  tourOffer: [{ tourOffer: { tour: "t1", offer: "desk" } },
    { ...base, tour: { status: "booked", tourId: "t1", offerId: "desk", pricePaid: 100, bookedDay: 1 } },
    { ...base, tour: { status: "booked", tourId: "t1", offerId: "web", pricePaid: 100, bookedDay: 1 } }],
  outfit: [{ outfit: "o1" }, { ...base, outfits: ["o1"] }, base],
  snsComment: [{ snsComment: "p1.c1" }, { ...base, sns: { posts: [], comments: [{ id: "p1.c1", cityId: "c", day: 1, minute: 1260 }], liked: [] } }, base],
  snsLiked: [{ snsLiked: "p1" }, { ...base, sns: { posts: [], comments: [], liked: ["p1"] } }, base],
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

  it("reads the wait after a rejection from the saved progress: a new ordinary date or a recovery since it ends it", () => {
    const wait: Condition = { dateSinceRejection: true };
    const ordinary = dates.find((date) => date.kind === "normal")!.id;
    const recovery = dates.find((date) => date.recovery)!.id;
    const confession = dates.find((date) => date.kind === "confession")!.id;
    // No rejection at all, or the last answer was not one (a deferral or a yes after a rejection reset the record).
    expect(meets(base, wait)).toBe(true);
    for (const confessionStatus of ["deferred", "accepted"] as const)
      expect(meets({ ...base, confessionStatus, playedDateIds: [confession] }, wait)).toBe(true);
    // Right after a rejection: the count of dates when she said no is the count now.
    const rejected: GameState = { ...base, playedDateIds: [ordinary, confession], confessionStatus: "rejected", lastRejectedDateCount: 1 };
    expect(completedDateCount(rejected)).toBe(1);
    expect(meets(rejected, wait)).toBe(false);
    expect(meets(rejected, { not: wait })).toBe(true);
    // A new ordinary date since then (another played confession is not one).
    const other = dates.find((date) => date.kind === "normal" && date.id !== ordinary)!.id;
    expect(meets({ ...rejected, playedDateIds: [...rejected.playedDateIds, other] }, wait)).toBe(true);
    expect(meets({ ...rejected, playedDateIds: [...rejected.playedDateIds, dates.find((date) => date.kind === "reassurance")!.id] }, wait)).toBe(false);
    // A recovery completed since then, also once the three counted recoveries are used up (its own record).
    expect(meets({ ...rejected, playedDateIds: [...rejected.playedDateIds, recovery], completedRecoveryCount: 1, recoveryAfterRejection: true }, wait)).toBe(true);
    expect(meets({ ...rejected, playedDateIds: [...rejected.playedDateIds, recovery], completedRecoveryCount: 3, lastRejectedDateCount: 4,
      recoveryAfterRejection: true }, wait)).toBe(true);
    // It reads no relationship value.
    expect(meets({ ...rejected, affection: 99, trust: 99, spark: 99, romanceStage: 4 }, wait)).toBe(false);
  });

  it("counts the completed dates as the romance stages do: ordinary dates and up to three recoveries", () => {
    const recovery = dates.find((date) => date.recovery)!.id;
    const twoDates = { ...base, playedDateIds: ordinaryHere.slice(0, 2) };
    expect(meets(twoDates, { datesCompleted: { atLeast: 2 } })).toBe(true);
    expect(meets(twoDates, { datesCompleted: { atLeast: 3 } })).toBe(false);
    expect(meets(twoDates, { datesCompleted: { atMost: 2 } })).toBe(true);
    expect(meets(base, { datesCompleted: { atMost: 0 } })).toBe(true);
    // A recovery counts as often as it was finished, up to three times (its record), like completedDateCount.
    const repaired = { ...twoDates, playedDateIds: [...twoDates.playedDateIds, recovery], completedRecoveryCount: 3 };
    expect(completedDateCount(repaired)).toBe(5);
    expect(meets(repaired, { datesCompleted: { atLeast: 5, atMost: 5 } })).toBe(true);
    // Other kinds of dates (a special date, a confession) are not counted.
    const special = dates.find((date) => date.kind === "special" && !date.recovery)!.id;
    expect(meets({ ...base, playedDateIds: [special] }, { datesCompleted: { atLeast: 1 } })).toBe(false);
  });

  it("reads a confession that would succeed from the hidden relationship values and the completed dates", () => {
    expect(meets(ready, { confessionReady: true })).toBe(canConfessSuccessfully(ready));
    expect(meets(ready, { confessionReady: true })).toBe(true);
    // Each threshold of romance/progression.json counts; nothing is random.
    for (const short of [{ affection: ready.affection - 1 }, { trust: ready.trust - 1 }, { spark: ready.spark - 1 },
      { playedDateIds: ready.playedDateIds.slice(1) }])
      expect(meets({ ...ready, ...short }, { confessionReady: true })).toBe(false);
    expect(meets({ ...ready, affection: 99, trust: 99, spark: 99 }, { confessionReady: true })).toBe(true);
  });

  it("reads an ordinary date that can be started now: open, not played, AP enough, no other scene running", () => {
    const part: Condition = { normalDateAvailable: true };
    const available = (state: GameState) => dates.some((date) => date.kind === "normal" && getDateAvailability(state, date.id).available);
    expect(meets(datesOpen, part)).toBe(true);
    expect(meets(base, part)).toBe(available(base));
    // Without AP no ordinary date starts; one costing no more than the AP left does.
    const cheapest = Math.min(...dates.filter((date) => ordinaryHere.includes(date.id)).map((date) => date.apCost));
    expect(meets({ ...datesOpen, ap: cheapest - 1 }, part)).toBe(false);
    expect(meets({ ...datesOpen, ap: cheapest }, part)).toBe(true);
    // All played, or a scene running (the availability's own rule): none can be started.
    expect(meets({ ...datesOpen, playedDateIds: ordinaryHere }, part)).toBe(false);
    expect(meets({ ...datesOpen, activeEncounter: {} as GameState["activeEncounter"] }, part)).toBe(false);
    expect(meets({ ...datesOpen, ap: 0 }, { not: part })).toBe(true);
    for (const state of [base, datesOpen, { ...datesOpen, ap: 1 }, { ...datesOpen, playedDateIds: ordinaryHere.slice(1) }])
      expect(meets(state, part)).toBe(available(state));
  });

  it("counts a read epilogue as started, and another city's epilogue as not", () => {
    expect(meets({ ...base, viewedEpilogueCityIds: ["c1"] }, { epilogueStarted: "c1" })).toBe(true);
    const other = episodes.find((episode) => episode.cityId !== episodes[0].cityId);
    if (other) expect(meets({ ...base, activeEpilogue: { episodeId: other.id } as unknown as GameState["activeEpilogue"] }, { epilogueStarted: episodes[0].cityId })).toBe(false);
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
