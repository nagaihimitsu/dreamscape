import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { landmarks, scenes } from "../../../src/content";
import { getJourney } from "../../../src/content/journeys";
import { encounters } from "../../../src/content/encounters";
import { encounterEntryRuleList } from "../../../src/domain/encounter";
import { advanceCompletedJourneyCity } from "../../../src/domain/city-travel";
import { canReadCityEpilogue, isAuthoredEpilogueCity } from "../../../src/domain/epilogue";
import { validateGameState, type GameState } from "../../../src/domain/game";
import { isSceneOpen } from "../../../src/domain/game-state-schema";
import { closeRomanceEnding, occasionSteps, openOccasion } from "../../../src/domain/occasion";
import type { Occasion } from "../../../src/domain/occasion-state";
import { applyPlayerAction, listPlayerActions, playerActionChange, type PlayerAction } from "../../../src/domain/player-action";
import { screenFor } from "../../../src/domain/screen";
import { beginTravelEvent, sleepAtHotel, waitForTravel } from "../../../src/domain/travel-game";
import { createDebugState } from "../../../src/dev/debug-state";
import { occasionCandidates } from "../../../src/dev/occasion-candidates";
import { cityStart } from "../../../src/dev/scenario-builders";

// The moment record (the unified event design, stage 3b; 4.8): the order of a visit's steps, the visit recorded as it
// opens in any order, # then: move / epilogue, the author-started epilogue, the 「交際開始」 screen as a step, the entries
// refusing while a scene is open, and Debug's candidate table and 「場面から始める」. On the sample journey (fictional),
// with its data changed in memory for a test and restored after it.

const TOWER = "mihon_clock_tower";
const EPISODE = "smp_mihon_main_clock_tower";
const STALL = "smp_mihon_bookmark_stall";
const DATE = "smp_mihon_date_tower_square";
const restore = (state: GameState) => validateGameState(JSON.parse(JSON.stringify(state)));
const tower = () => landmarks.find((item) => item.id === TOWER)!;
const scene = (id: string) => scenes.find((item) => item.id === id)!;
const undo: (() => void)[] = [];
afterEach(() => { while (undo.length) undo.pop()!(); });
function patch<T extends object>(target: T, fields: Partial<T>) {
  const before = Object.fromEntries(Object.keys(fields).map((key) => [key, (target as Record<string, unknown>)[key]]));
  Object.assign(target, fields);
  undo.push(() => { for (const [key, value] of Object.entries(before)) value === undefined ? delete (target as Record<string, unknown>)[key] : Object.assign(target, { [key]: value }); });
}

/** Take the first action the screen offers (never the map's), saving and restoring each step, until `done`. */
function playUntil(initial: GameState, done: (state: GameState) => boolean, limit = 400): GameState {
  let state = initial;
  for (let step = 0; !done(state); step++) {
    expect(step, "the occasion did not reach the expected step").toBeLessThan(limit);
    const action = listPlayerActions(state).find((item: PlayerAction) => !["travel", "wait", "rest", "rent", "claim_ap", "depart", "read_epilogue"].includes(item.kind));
    if (!action) throw new Error(`no action on the screen ${screenFor(state)}`);
    const next = applyPlayerAction(state, playerActionChange(action, () => 0), () => 0);
    expect(next, action.kind).not.toBe(state);
    state = restore(next);
  }
  return state;
}
const depart = (state: GameState, eventId: string) => restore(applyPlayerAction(state, (current) => beginTravelEvent(current, eventId, "walk", current.revision, () => 0), () => 0));

beforeAll(() => {
  if (!getJourney("sample_trip")) throw new Error("見本の旅（sample_trip）が生成物にありません。npm run content:build -- --with-sample を実行してください。");
});

describe("the moment record of a visit", () => {
  it("orders the steps: negative, each main part with its after scenes, the observation's after observe apart, then positive; order rearranges the parts", () => {
    const occasion = (parts: Occasion["parts"]): Occasion => ({ kind: "visit", eventId: EPISODE, landmarkId: TOWER, parts, ran: [], at: null, started: [] });
    const keys = (parts: Occasion["parts"]) => occasionSteps(occasion(parts)).map((step) => ("scene" in step ? step.scene : `main:${step.part}`));
    expect(keys(["guide", "observe", "battle"])).toEqual([STALL, "main:guide", "main:observe", "main:battle", "smp_mihon_bookmark_gift", "smp_mihon_clock_bell"]);
    // A talk after the guide and one after the battle (in memory): right after their part, whatever the order.
    for (const [id, priority] of [["smp_test_after_guide", "after guide"], ["smp_test_after_battle", "after battle"]] as const) {
      const bell = encounters.encounters.find((item) => item.id === "smp_mihon_clock_bell")!;
      encounters.encounters.push({ ...bell, id });
      encounterEntryRuleList.push({ encounterId: id, priority });
      undo.push(() => { encounters.encounters.splice(encounters.encounters.findIndex((item) => item.id === id), 1);
        encounterEntryRuleList.splice(encounterEntryRuleList.findIndex((item) => item.encounterId === id), 1); });
    }
    expect(keys(["guide", "observe", "battle"])).toEqual([STALL, "main:guide", "smp_test_after_guide", "main:observe", "main:battle", "smp_test_after_battle",
      "smp_mihon_bookmark_gift", "smp_mihon_clock_bell"]);
    expect(keys(["battle", "observe", "guide"])).toEqual([STALL, "main:battle", "smp_test_after_battle", "main:observe", "main:guide", "smp_test_after_guide",
      "smp_mihon_bookmark_gift", "smp_mihon_clock_bell"]);
  });

  it("records the visit as it opens in any order, and runs the battle first when the landmark's order says so", () => {
    patch(tower(), { order: ["battle", "observe", "guide"] });
    const trip = depart(cityStart("mihon"), EPISODE);
    expect(trip.activeEncounter?.encounterId).toBe(STALL);
    expect(trip.visitedLandmarkIds).toContain(TOWER);
    expect(trip.occasion).toMatchObject({ parts: ["battle", "observe", "guide"], at: STALL });
    const battle = playUntil(trip, (state) => !!state.activeBattle);
    expect(battle.occasion?.ran).toEqual(["battle"]);
    expect(battle.activeTourism).toBeNull();
    // After the battle's result the observation comes (it returns there), then the guide (a first visit).
    const observing = playUntil(battle, (state) => state.activeTourism?.phase === "exploring");
    expect(observing.occasion?.ran).toEqual(["battle", "observe"]);
    const guide = playUntil(observing, (state) => state.activeTourism?.phase === "guide");
    expect(guide.occasion?.ran).toEqual(["battle", "observe", "guide"]);
  });
});

describe("# then:", () => {
  it("moves right after the scene that carries it: the visit's other steps do not run, the move's visit opens, the time settles once", () => {
    patch(scene(STALL), { then: { move: "mihon_market" } });
    const trip = depart(cityStart("mihon"), EPISODE);
    const end = trip.travel.activeEvent!.endMinute;
    expect(trip.occasion?.then).toMatchObject({ move: "mihon_market", eventId: "smp_mihon_special_b_market" });
    const moved = playUntil(trip, (state) => !state.activeEncounter);
    // The tower's guide never ran; the market's visit (its special battle shows on the map) opened from the move.
    expect(moved.completedGuideIds).not.toContain(TOWER);
    expect(moved.travel.currentPlaceId).toBe("mihon_market");
    expect(moved.occasion).toMatchObject({ eventId: "smp_mihon_special_b_market", landmarkId: "mihon_market", moved: "walk" });
    expect(moved.travel.minute).toBe(end + 4);
    expect(moved.activeTourism?.phase).toBe("guide");
    // A reload resumes at the same step and the move is not paid or made again.
    expect(restore(moved)).toEqual(moved);
  });

  it("starts the epilogue of a city that writes then: epilogue, even before it is cleared; the game never starts it nor offers the button", () => {
    patch(scene(STALL), { then: { epilogue: true } });
    expect(isAuthoredEpilogueCity("mihon")).toBe(true);
    const start = cityStart("mihon");
    expect(canReadCityEpilogue(start)).toBe(false);
    expect(listPlayerActions(start).some((action) => action.kind === "read_epilogue")).toBe(false);
    const trip = depart(start, EPISODE);
    const epilogue = playUntil(trip, (state) => !!state.activeEpilogue);
    expect(epilogue.completedCityIds).not.toContain("mihon");
    // The epilogue's moment (stage 4): Lili's farewell (the stall done) ran before it.
    expect(epilogue.occasion).toMatchObject({ kind: "epilogue", cityId: "mihon", started: ["smp_mihon_lili_seeoff"], at: "main:epilogue" });
    const read = playUntil(epilogue, (state) => !state.activeEpilogue);
    expect(read.viewedEpilogueCityIds).toEqual(["mihon"]);
    // The save check reads an epilogue read before the city is cleared (4.5).
    expect(restore(read)).toEqual(read);
    // Read already: a then: epilogue does nothing and the visit goes on.
    const again = depart(read, EPISODE);
    expect(again.occasion?.then).toBeUndefined();
  });
});

describe("the 「交際開始」 screen and the entries", () => {
  it("is a saved step of the date's occasion; its 「自由時間へ」 is an action; nothing else starts while it shows", () => {
    // The screen as the step of a date's occasion (its trip still running; the confession records are left out here).
    const start = cityStart("mihon");
    const shown: GameState = { ...start,
      travel: { ...start.travel, currentPlaceId: TOWER, activeEvent: { eventId: DATE, placeId: TOWER, endMinute: start.travel.minute + 60 } },
      occasion: { kind: "date", eventId: DATE, landmarkId: null, parts: ["date", "ending"], ran: ["date", "ending"], at: "main:ending", started: [], romanceEnding: true } };
    expect(restore(shown)).toEqual(shown);
    expect(screenFor(shown)).toBe("romance_ending");
    expect(listPlayerActions(shown)).toEqual([{ kind: "romance_close" }]);
    expect(isSceneOpen(shown)).toBe(true);
    // Every entry refuses while a scene (here the screen's occasion) is open.
    expect(beginTravelEvent(shown, EPISODE, "walk", shown.revision)).toBe(shown);
    expect(openOccasion(shown, { kind: "epilogue" }, shown.revision)).toBe(shown);
    expect(openOccasion(shown, { kind: "depart" }, shown.revision)).toBe(shown);
    expect(sleepAtHotel(shown, "walk", shown.revision)).toBe(shown);
    expect(waitForTravel(shown, 30, shown.revision)).toBe(shown);
    expect(advanceCompletedJourneyCity(shown, shown.revision)).toBe(shown);
    const closed = closeRomanceEnding(shown, shown.revision);
    expect(closed.occasion).toBeNull();
    expect(closed.travel.activeEvent).toBeNull();
    expect(closeRomanceEnding(closed, shown.revision)).toBe(closed);
  });
});

describe("Debug: the candidate table and 「場面から始める」", () => {
  it("lists the visit's steps with their state and reasons", () => {
    const trip = depart(cityStart("mihon"), EPISODE);
    const table = occasionCandidates(trip);
    expect(table.title).toContain("見本の時計塔");
    expect(table.rows.find((row) => row.name.includes("しおり") || row.position === "-1")).toMatchObject({ status: "実行中" });
    expect(table.rows.find((row) => row.position === "+1")?.reason).toBeTruthy();
  });

  it("opens a visit and plays it with the real functions up to the scene named by from", () => {
    const state = createDebugState({ cityId: "mihon", scene: "occasion", id: TOWER, progress: "initial", ap: 0, affection: 0, trust: 0, spark: 0,
      roll: "positive", from: "smp_mihon_clock_gears" });
    expect(state.activeEncounter?.encounterId).toBe("smp_mihon_clock_gears");
    expect(state.seenEncounterIds).toContain(STALL);
    expect(() => createDebugState({ cityId: "mihon", scene: "occasion", id: TOWER, progress: "initial", ap: 0, affection: 0, trust: 0, spark: 0,
      roll: "positive", from: "duomo_string" })).toThrow("場面 duomo_string はこの時点で始まりませんでした。");
  });

  // The item design §2.7: Debug starts a city without the earlier cities' items, and prep= plays only the city's own scenes.
  const debugAt = (change: { from?: string; prep?: string[] }) => createDebugState({ cityId: "mihon", scene: "occasion", id: TOWER, progress: "initial",
    ap: 0, affection: 0, trust: 0, spark: 0, roll: "positive", ...change });
  it("stops prep= on another city's scene, naming both cities", () => {
    const milan = encounters.encounters.find((item) => item.cityId === "milano")!;
    expect(() => debugAt({ from: "smp_mihon_clock_gears", prep: [milan.id] }))
      .toThrow(`prep= の ${milan.id} はミラノの場面です。prep= は同じ都市（見本の街）の場面だけを流します。`);
  });

  it("names an item of another city that keeps the scene from, which no prep= of this city can give", () => {
    // A stand-in for a later city's scene that needs an earlier city's item: here the gears talk needs Milan's pick.
    const rule = encounterEntryRuleList.find((item) => item.encounterId === "smp_mihon_clock_gears")! as { when?: unknown };
    const before = rule.when;
    rule.when = { item: { id: "blue_pick", is: "held" } };
    try {
      expect(() => debugAt({ from: "smp_mihon_clock_gears" })).toThrow(
        "ミラノの品物 blue_pick が要ります（Debug は前の都市の品物を持たずに始まり、prep= は同じ都市の場面だけを流します）。");
    } finally {
      if (before === undefined) delete rule.when; else rule.when = before;
    }
  });
});
