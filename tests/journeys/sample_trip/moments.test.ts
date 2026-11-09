import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cityContents, dates, getCityContent, scenes } from "../../../src/content";
import { getJourney } from "../../../src/content/journeys";
import { encounterChoiceDisplay, encounterEntryRuleList } from "../../../src/domain/encounter";
import { isJourneyComplete } from "../../../src/domain/city-travel";
import { isAuthoredEpilogueCity } from "../../../src/domain/epilogue";
import { validateGameState, type GameState } from "../../../src/domain/game";
import { occasionSteps } from "../../../src/domain/occasion";
import type { Occasion } from "../../../src/domain/occasion-state";
import type { SceneAt, SceneThen } from "../../../src/content/scene-schemas";
import { applyPlayerAction, listPlayerActions, playerActionChange, type PlayerAction } from "../../../src/domain/player-action";
import { screenFor } from "../../../src/domain/screen";
import { DAY_END, DAY_START } from "../../../src/domain/travel";
import { beginTravelEvent, sleepAtHotel } from "../../../src/domain/travel-game";
import { occasionCandidates } from "../../../src/dev/occasion-candidates";
import { cityStart, playBattleToResult } from "../../../src/dev/scenario-builders";
import { rentTransport } from "../../../src/domain/transport";
import { loadGame, saveGame, type StorageLike } from "../../../src/persistence";

// Stage 4 of the unified event design (2.3, 3.4 H/I, 3.5, 3.6, 3.9 (c)(d), 4.2–4.8) on the sample journey (fictional):
// the moments other than a landmark's visit, each with its first script — the date's (the stall by place, the bench
// painter), the finale's (the sweets, the square after it), the epilogue's (the bookmark before leaving, Lili's
// farewell), a trip's (the first bicycle ride), the hotel's (before the night, after it, the last morning) — played with
// the game's own actions, saved and restored at every step. The data is changed in memory for a test and restored.

const TOWER = "mihon_clock_tower";
const EPISODE = "smp_mihon_main_clock_tower";
const DATE = "smp_mihon_date_tower_square";
const FINALE = "smp_mihon_finale";
const PAINTER = "smp_mihon_date_bench_painter";
const restore = (state: GameState) => validateGameState(JSON.parse(JSON.stringify(state)));
const undo: (() => void)[] = [];
afterEach(() => { while (undo.length) undo.pop()!(); });
function patch<T extends object>(target: T, fields: Partial<T>) {
  const before = Object.fromEntries(Object.keys(fields).map((key) => [key, (target as Record<string, unknown>)[key]]));
  Object.assign(target, fields);
  undo.push(() => { for (const [key, value] of Object.entries(before)) value === undefined ? delete (target as Record<string, unknown>)[key] : Object.assign(target, { [key]: value }); });
}
const rule = (id: string) => encounterEntryRuleList.find((item) => item.encounterId === id)!;
const scene = (id: string) => scenes.find((item) => item.id === id)!;

const MAP = ["travel", "wait", "rest", "rent", "claim_ap", "depart", "read_epilogue"];
/** Take an action the screen offers (a choice by its option ID when given, else the first that is not the map's), saving and restoring each step, until `done`. */
function playUntil(initial: GameState, done: (state: GameState) => boolean, prefer: readonly string[] = [], limit = 400): GameState {
  let state = initial;
  for (let step = 0; !done(state); step++) {
    expect(step, "the moment did not reach the expected step").toBeLessThan(limit);
    // A battle is played with its correct answers and evidence (the scenario builder's player).
    if (state.activeBattle && state.activeBattle.phase !== "result") { state = restore(playBattleToResult(state)); continue; }
    const actions = listPlayerActions(state).filter((item: PlayerAction) => !MAP.includes(item.kind));
    const frame = state.activeEncounter?.frame ?? state.activeDate?.frame ?? state.activeEpilogue?.frame;
    const chosen = actions.find((item) => "index" in item && prefer.includes(frame?.choices.find((choice) => choice.index === item.index)?.optionId ?? ""));
    const action = chosen ?? actions[0];
    if (!action) throw new Error(`no action on the screen ${screenFor(state)}`);
    const next = applyPlayerAction(state, playerActionChange(action, () => 0), () => 0);
    expect(next, action.kind).not.toBe(state);
    state = restore(next);
  }
  return state;
}
const free = (state: GameState) => !state.occasion && screenFor(state) === "free_time";
const depart = (state: GameState, eventId: string, mode = "walk") =>
  restore(applyPlayerAction(state, (current) => beginTravelEvent(current, eventId, mode, current.revision, () => 0), () => 0));
const rest = (state: GameState) => restore(applyPlayerAction(state, (current) => sleepAtHotel(current, "walk", current.revision, null, () => 0), () => 0));
/** The clock tower visited from the map and played to free time (its stall, guide, battle, gift, bell). */
const afterTower = (prefer: readonly string[] = []) => playUntil(depart(cityStart("mihon"), EPISODE), free, prefer);
/** The party moved to a place and time in memory (a late hour may not be a state the game saves; the action that follows is checked). */
const at = (state: GameState, placeId: string, minute: number): GameState => ({ ...state, travel: { ...state.travel, currentPlaceId: placeId, minute } });

beforeAll(() => {
  if (!getJourney("sample_trip")) throw new Error("見本の旅（sample_trip）が生成物にありません。npm run content:build -- --with-sample を実行してください。");
});

describe("the order of a stage-4 moment (4.3)", () => {
  it("places the scenes of the date, the finale, the hotel, the epilogue and a trip before, after and around their main part", () => {
    const keys = (occasion: Occasion) => occasionSteps(occasion).map((step) => ("scene" in step ? step.scene : `main:${step.part}`));
    const base = { ran: [], at: null, started: [] };
    // The date: the stall (place, -1, written first in its file), the painter (-1), the date. The finale: the sweets
    // (-1, places/smp_mihon_city_end sorts before places/smp_mihon_clock_tower), the stall (place), the battle, +1.
    expect(keys({ ...base, kind: "date", eventId: DATE, landmarkId: null, parts: ["date"] })).toEqual(["smp_mihon_bookmark_stall", PAINTER, "main:date"]);
    expect(keys({ ...base, kind: "battle", eventId: FINALE, landmarkId: null, parts: ["battle"] }))
      .toEqual(["smp_mihon_finale_sweets", "smp_mihon_bookmark_stall", "main:battle", "smp_mihon_after_finale"]);
    // The hotel: the trip home's scenes, the move, before the night, the night, after it (+1, then the last morning +2).
    const trip = { from: "mihon_hotel", to: TOWER, modeId: "rental_bicycle", arrivalMinute: 543 };
    expect(keys({ ...base, kind: "hotel", cityId: "mihon", eventId: null, landmarkId: null, parts: ["move", "sleep"], trip: { ...trip, from: TOWER, to: "mihon_hotel" } }))
      .toEqual(["main:move", "smp_mihon_hotel_bell_night", "main:sleep", "smp_mihon_hotel_morning", "smp_mihon_last_morning"]);
    expect(keys({ ...base, kind: "epilogue", cityId: "mihon", eventId: null, landmarkId: null, parts: ["epilogue"] }))
      .toEqual(["smp_mihon_bookmark_before_leaving", "smp_mihon_lili_seeoff", "main:epilogue"]);
    // A trip before a visit: its scenes at the place it leaves (`from mihon_hotel`), the move, then the visit's own.
    expect(keys({ ...base, kind: "visit", eventId: EPISODE, landmarkId: TOWER, parts: ["move", "guide", "observe", "battle"], trip }))
      .toEqual(["smp_mihon_first_bicycle", "main:move", "smp_mihon_bookmark_stall", "main:guide", "main:observe", "main:battle",
        "smp_mihon_bookmark_gift", "smp_mihon_clock_bell"]);
  });
});

describe("the date's moment (3.5, 4.2)", () => {
  it("runs the bench painter before the date by day: the date's AP is kept back, spent once when it starts; a reload in between spends nothing", () => {
    const ready = afterTower();
    const ap = ready.ap;
    const trip = depart(ready, DATE);
    expect(trip.activeEncounter?.encounterId).toBe(PAINTER);
    expect(trip.ap).toBe(ap);
    expect(restore(trip)).toEqual(trip);
    const storage = new MemoryStorage();
    expect(saveGame(storage, trip).ok).toBe(true);
    const loaded = loadGame(storage);
    expect(loaded).toEqual({ status: "loaded", state: trip });
    const dated = playUntil(trip, (state) => !!state.activeDate, ["help"]);
    expect(dated.ap).toBe(ap - 2);
    expect(dated.travelBudget).toBe(trip.travelBudget + 20);
    // Not by night: the painter does not come, the date starts at once.
    const night = depart(at(ready, "mihon_hotel", 18 * 60), DATE);
    expect(night.activeEncounter).toBeNull();
    expect(night.activeDate?.dateId).toBe(DATE);
  });

  it("starts the date it decided although the scene before it made the date's map condition false (decision 21)", () => {
    const ready = afterTower();
    // In memory, the date shows on the map only before the painter was seen.
    patch(dates.find((item) => item.id === DATE)!, { when: { not: { encounterSeen: PAINTER } } });
    const dated = playUntil(depart(ready, DATE), (state) => !!state.activeDate);
    expect(dated.seenEncounterIds).toContain(PAINTER);
    expect(dated.activeDate?.dateId).toBe(DATE);
  });

  it("a then: move of the scene before the date leaves the date unstarted and its AP unspent; departing again spends it once", () => {
    const ready = afterTower();
    const painter = scene(PAINTER);
    patch(painter, { options: painter.options.map((option) => option.id === "dry" ? { ...option, then: { move: "mihon_market" } } : option) });
    const moved = playUntil(depart(ready, DATE), (state) => !state.activeEncounter, ["dry"]);
    expect(moved.activeDate).toBeNull();
    expect(moved.playedDateIds).not.toContain(DATE);
    expect(moved.ap).toBe(ready.ap);
    expect(moved.travel.currentPlaceId).toBe("mihon_market");
    const home = playUntil(moved, free);
    const total = (state: GameState) => state.ap + state.pendingApRewards.reduce((sum, item) => sum + item.remainingAp, 0);
    const again = playUntil(depart(at(home, "mihon_hotel", home.travel.minute), DATE), (state) => !!state.activeDate);
    expect(total(again)).toBe(total(home) - 2);
  });
});

describe("the hotel's moment and the night (3.6, decision 44)", () => {
  it("reads the arrival time before the night and the time 「休む」 was pressed on the way; resting by day is not night", () => {
    // In memory: the scene before the night needs the night, and the trip home's scene too (walking).
    patch(rule("smp_mihon_hotel_bell_night"), { when: { time: "night" } });
    patch(scene("smp_mihon_first_bicycle"), { at: [{ trip: "walk" }] });
    patch(rule("smp_mihon_first_bicycle"), { when: { time: "night" } });
    const start = cityStart("mihon");
    // 21:00 (the day's end): night, the scene before the night runs at the hotel.
    const late = rest(at(start, "mihon_hotel", DAY_END));
    expect(late.activeEncounter?.encounterId).toBe("smp_mihon_hotel_bell_night");
    expect(late.travel).toMatchObject({ day: 1, minute: DAY_END, currentPlaceId: "mihon_hotel" });
    // 15:00: not night; the night comes at once, then the morning's scene (+1: the tower not visited yet).
    const day = rest(at(start, "mihon_hotel", 15 * 60));
    expect(day.activeEncounter?.encounterId).toBe("smp_mihon_hotel_morning");
    expect(day.travel).toMatchObject({ day: 2, minute: DAY_START });
    // 17:55 at the library, 7 minutes home: the trip home is still day (not shown), the hotel at 18:02 is night.
    const dusk = rest(at(start, "mihon_library", 17 * 60 + 55));
    expect(dusk.occasion?.started).toEqual(["smp_mihon_hotel_bell_night"]);
    expect(dusk.travel).toMatchObject({ currentPlaceId: "mihon_hotel", minute: 18 * 60 + 2, day: 1 });
    // 18:30 at the library: the trip home's scene (night) runs before the move, at the time 「休む」 was pressed.
    const evening = rest(at(start, "mihon_library", 18 * 60 + 30));
    expect(evening.activeEncounter?.encounterId).toBe("smp_mihon_first_bicycle");
    expect(evening.travel).toMatchObject({ currentPlaceId: "mihon_library", minute: 18 * 60 + 30 });
  });

  it("saves and resumes inside the scene before the night after a late return past 21:00; the night makes the next day's 9:00", () => {
    patch(rule("smp_mihon_hotel_bell_night"), { when: { time: "night" } });
    const start = cityStart("mihon");
    // 20:58 at the library: the walk home ends at 21:05 (a late return).
    const late = rest(at(start, "mihon_library", 20 * 60 + 58));
    expect(late.activeEncounter?.encounterId).toBe("smp_mihon_hotel_bell_night");
    expect(late.travel.minute).toBe(21 * 60 + 5);
    const storage = new MemoryStorage();
    expect(saveGame(storage, late).ok).toBe(true);
    expect(loadGame(storage)).toEqual({ status: "loaded", state: late });
    const morning = playUntil(late, (state) => state.travel.day === 2);
    expect(morning.travel).toMatchObject({ day: 2, minute: DAY_START, currentPlaceId: "mihon_hotel" });
    // Once only: the next night has no scene before it.
    const next = playUntil(morning, free);
    expect(rest(at(next, "mihon_hotel", DAY_END)).occasion?.started ?? []).not.toContain("smp_mihon_hotel_bell_night");
  });
});

describe("the city's end (3.4 H and I, 3.9 (d))", () => {
  /** The city played from the map to the finale's result screen (the tower, the market's and the library's battles). */
  function toFinaleResult(prefer: readonly string[] = []): GameState {
    let state = afterTower(prefer);
    for (const battle of ["smp_mihon_special_b_market", "smp_mihon_special_c_library"]) state = playUntil(depart(at(state, "mihon_hotel", DAY_START), battle), free, prefer);
    const sweetsBudget = state.travelBudget;
    const trip = depart(at(state, "mihon_hotel", DAY_START), FINALE);
    // The sweets (-1): their # on_done: money -20 is kept back while they run and paid once as they end.
    expect(trip.activeEncounter?.encounterId).toBe("smp_mihon_finale_sweets");
    expect(trip.travelBudget).toBe(sweetsBudget);
    const result = playUntil(trip, (current) => current.activeBattle?.phase === "result");
    expect(result.travelBudget).toBe(sweetsBudget - 20);
    expect(restore(result).travelBudget).toBe(sweetsBudget - 20);
    expect(listPlayerActions(result).some((action) => action.kind === "battle_epilogue")).toBe(isAuthoredEpilogueCity("mihon") ? false : true);
    return result;
  }

  it("the finale result's 「エピローグへ」 of a city that does not write then: epilogue runs the rest of the finale's moment first, then the epilogue", () => {
    // In memory, the city's then: epilogue is taken out: the game offers 「エピローグへ」 on the finale's result (as in Milan and the Golden Triangle).
    const square = scene("smp_mihon_after_finale");
    patch(square, { options: square.options.map(({ then: _then, ...option }) => option) });
    patch(scene("smp_mihon_last_morning"), { then: undefined });
    expect(isAuthoredEpilogueCity("mihon")).toBe(false);
    const result = toFinaleResult();
    const after = restore(applyPlayerAction(result, playerActionChange({ kind: "battle_epilogue" }, () => 0), () => 0));
    expect(after.activeEncounter?.encounterId).toBe("smp_mihon_after_finale");
    expect(after.occasion).toMatchObject({ kind: "battle", onClose: "epilogue" });
    const epilogue = playUntil(after, (state) => !!state.activeEpilogue, ["stay"]);
    expect(epilogue.occasion).toMatchObject({ kind: "epilogue" });
    expect(epilogue.travel.activeEvent).toBeNull();
  });

  it("H: 「もう少し、歩こう」 back to free time without an epilogue button; after the night the last morning starts the epilogue", () => {
    const result = toFinaleResult();
    const square = playUntil(result, (state) => state.activeEncounter?.encounterId === "smp_mihon_after_finale");
    const walking = playUntil(square, free, ["stay"]);
    expect(walking.completedCityIds).toEqual(["mihon"]);
    expect(walking.viewedEpilogueCityIds).toEqual([]);
    expect(listPlayerActions(walking).some((action) => action.kind === "read_epilogue")).toBe(false);
    const morning = rest(at(walking, "mihon_hotel", DAY_END));
    const epilogue = playUntil(morning, (state) => !!state.activeEpilogue);
    expect(epilogue.travel.day).toBe(2);
    expect(epilogue.seenEncounterIds).toContain("smp_mihon_last_morning");
    expect(epilogue.occasion).toMatchObject({ kind: "epilogue", started: ["smp_mihon_lili_seeoff"] });
    const end = playUntil(epilogue, (state) => !state.activeEpilogue && !state.occasion);
    expect(end.viewedEpilogueCityIds).toEqual(["mihon"]);
    expect(isJourneyComplete(end)).toBe(true);
  });

  it("I: 「今日は、ここまでにしよう」 starts the epilogue right after the scene; the next morning's scene does not show", () => {
    const result = toFinaleResult();
    const square = playUntil(result, (state) => state.activeEncounter?.encounterId === "smp_mihon_after_finale");
    const epilogue = playUntil(square, (state) => !!state.activeEpilogue, ["to_epilogue"]);
    expect(epilogue.occasion?.kind).toBe("epilogue");
    expect(epilogue.travel.day).toBe(1);
    const read = playUntil(epilogue, (state) => !state.activeEpilogue && !state.occasion);
    expect(read.viewedEpilogueCityIds).toEqual(["mihon"]);
    expect(isJourneyComplete(read)).toBe(true);
    const morning = rest(at(read, "mihon_hotel", DAY_END));
    expect(morning.occasion?.started ?? []).not.toContain("smp_mihon_last_morning");
    expect(morning.seenEncounterIds).not.toContain("smp_mihon_last_morning");
  });

  it("gives the kept bookmark before leaving (-2), before Lili's farewell (-1), in the epilogue's moment", () => {
    // The gift put off and the date's 「もう少し持っていたい」: the flag and the held bookmark the -2 reads.
    let state = afterTower(["ask", "later"]);
    state = playUntil(depart(at(state, "mihon_hotel", DAY_START), DATE), free, ["keep_bookmark"]);
    expect(state.storyProgress.flags).toContain("smp_mihon_bookmark_kept");
    for (const battle of ["smp_mihon_special_b_market", "smp_mihon_special_c_library"]) state = playUntil(depart(at(state, "mihon_hotel", DAY_START), battle), free);
    const square = playUntil(depart(at(state, "mihon_hotel", DAY_START), FINALE), (current) => current.activeEncounter?.encounterId === "smp_mihon_after_finale");
    const leaving = playUntil(square, (current) => current.activeEncounter?.encounterId === "smp_mihon_bookmark_before_leaving", ["to_epilogue"]);
    const affection = leaving.spark;
    const given = playUntil(leaving, (current) => current.activeEncounter?.encounterId === "smp_mihon_lili_seeoff", ["give_before_leaving"]);
    expect(given.inventory.smp_mihon_three_bookmark).toBe("gifted");
    expect(given.spark).toBe(affection + 1);
    expect(given.occasion?.started).toEqual(["smp_mihon_bookmark_before_leaving", "smp_mihon_lili_seeoff"]);
  });
});

describe("a then: at a trip's moment (2.3, 3.6, 4.1)", () => {
  const BIKE = "rental_bicycle";
  const MARKET = "mihon_market";
  /** The bicycle rented at the hotel (one action, saved). */
  const rented = (state: GameState) => restore(applyPlayerAction(state, (current) => rentTransport(current, BIKE, current.revision), () => 0));
  /** In memory: the market's ways out are bicycle rides that cost 10 (no walking), so the fare home is 10 from the market and 0 from the tower. */
  function dearMarket() {
    const content = getCityContent("mihon");
    const routes = content.travel.routes.filter((route) => !(route.fromPlaceId === MARKET && route.toPlaceId !== MARKET && route.mode === "walk"))
      .map((route) => (route.fromPlaceId === MARKET && route.mode === BIKE ? { ...route, cost: 10 } : route));
    cityContents.mihon = { ...content, travel: { ...content.travel, routes } };
    undo.push(() => { cityContents.mihon = content; });
  }
  /** The first ride's scene placed at the trip and its 「このままで行こう」 given a then:, in memory. */
  function firstRide(at: SceneAt[], then?: SceneThen) {
    const ride = scene("smp_mihon_first_bicycle");
    patch(ride, { at, options: ride.options.map((option) => option.id === "as_is" ? { ...option, then } : option) });
    patch(rule("smp_mihon_first_bicycle"), { when: undefined });
  }
  const storage = () => new MemoryStorage();

  it("then: epilogue drops the move and keeps back the fare home from the place the party is at (a map departure)", () => {
    dearMarket();
    firstRide([{ trip: BIKE, from: MARKET }], { epilogue: true });
    const bike = rented(cityStart("mihon"));
    // At the market (10 home), departing by bicycle to the tower (0 home): the trip's scene runs at the market.
    const trip = depart(at({ ...bike, travel: { ...bike.travel, returnReserve: 10 } }, MARKET, DAY_START), EPISODE, BIKE);
    expect(trip.activeEncounter?.encounterId).toBe("smp_mihon_first_bicycle");
    expect(trip.travel).toMatchObject({ currentPlaceId: MARKET, returnReserve: 0 });
    const epilogue = playUntil(trip, (state) => !!state.activeEpilogue, ["as_is"]);
    expect(epilogue.occasion).toMatchObject({ kind: "epilogue" });
    expect(epilogue.travel).toMatchObject({ currentPlaceId: MARKET, returnReserve: 10, rideCounts: {} });
    expect(restore(epilogue)).toEqual(epilogue);
    expect(saveGame(storage(), epilogue).ok).toBe(true);
  });

  it("then: epilogue on the way home of 「休む」 drops the night and keeps back the fare home again", () => {
    dearMarket();
    firstRide([{ trip: BIKE, from: MARKET }], { epilogue: true });
    const bike = rented(cityStart("mihon"));
    const trip = restore(applyPlayerAction(at({ ...bike, travel: { ...bike.travel, returnReserve: 10 } }, MARKET, 15 * 60),
      (current) => sleepAtHotel(current, BIKE, current.revision, undefined, () => 0), () => 0));
    expect(trip.activeEncounter?.encounterId).toBe("smp_mihon_first_bicycle");
    expect(trip.travel.returnReserve).toBe(0);
    const epilogue = playUntil(trip, (state) => !!state.activeEpilogue, ["as_is"]);
    expect(epilogue.travel).toMatchObject({ currentPlaceId: MARKET, returnReserve: 10, day: 1 });
    expect(restore(epilogue)).toEqual(epilogue);
    expect(saveGame(storage(), epilogue).ok).toBe(true);
  });

  it("greys the then: epilogue choice when the budget cannot keep back the fare home from where the party is", () => {
    dearMarket();
    firstRide([{ trip: BIKE, from: MARKET }], { epilogue: true });
    const bike = rented(cityStart("mihon"));
    // 15 left: the ride costs 10, leaving 5, less than the fare home from the market.
    const trip = depart(at({ ...bike, travelBudget: 15, travel: { ...bike.travel, returnReserve: 10 } }, MARKET, DAY_START), EPISODE, BIKE);
    const shown = playUntil(trip, (state) => !!state.activeEncounter?.frame.choices.length);
    const choice = shown.activeEncounter!.frame.choices.find((item) => item.optionId === "as_is")!;
    expect(encounterChoiceDisplay(shown, choice.index)).toMatchObject({ show: "grey", reason: "エピローグでの支払いや帰りのための予算が足りません。" });
  });

  it("a scene placed at a trip and at the visit runs the move once when it runs at the visit (one ride)", () => {
    patch(scene("smp_mihon_first_bicycle"), { at: [{ trip: BIKE, from: "mihon_hotel" }, { visit: TOWER }] });
    patch(rule("smp_mihon_first_bicycle"), { when: { landmarkVisited: TOWER } });
    const trip = depart(rented(cityStart("mihon")), EPISODE, BIKE);
    // Not yet visited at the trip: the stall first (same file, written first), then the ride's scene at the visit's -1.
    expect(trip.activeEncounter?.encounterId).toBe("smp_mihon_bookmark_stall");
    const ride = playUntil(trip, (state) => state.activeEncounter?.encounterId === "smp_mihon_first_bicycle");
    expect(ride.occasion?.ran).toEqual(["move"]);
    const guide = playUntil(ride, (state) => !!state.activeTourism, ["as_is"]);
    expect(guide.occasion?.ran).toEqual(["move", "guide"]);
    expect(guide.travel.rideCounts).toEqual({ [BIKE]: 1 });
    expect(guide.travel.currentPlaceId).toBe(TOWER);
  });

  it("a then: move to a place with no landmark runs the trip's scenes first, then the move and its ride, then free time there", () => {
    firstRide([{ trip: BIKE, from: TOWER }]);
    const stall = scene("smp_mihon_bookmark_stall");
    patch(stall, { options: stall.options.map((option) => option.id === "drawn" ? { ...option, then: { move: "mihon_hotel", by: BIKE } } : option) });
    const trip = depart(rented(cityStart("mihon")), EPISODE);
    const ride = playUntil(trip, (state) => state.activeEncounter?.encounterId === "smp_mihon_first_bicycle", ["drawn"]);
    expect(ride.occasion).toMatchObject({ kind: "visit", cityId: "mihon", eventId: null, landmarkId: null, parts: ["move"], ran: [] });
    expect(ride.travel).toMatchObject({ currentPlaceId: TOWER, rideCounts: {} });
    expect(restore(ride)).toEqual(ride);
    const home = playUntil(ride, free, ["as_is"]);
    expect(home.travel).toMatchObject({ currentPlaceId: "mihon_hotel", rideCounts: { [BIKE]: 1 } });
    expect(home.seenEncounterIds).toContain("smp_mihon_first_bicycle");
  });
});

describe("Debug's candidate table of a stage-4 moment (4.8)", () => {
  it("names the moment and lists its steps with their state", () => {
    const trip = depart(afterTower(), DATE);
    const table = occasionCandidates(trip);
    expect(table.title).toBe(`デート：${DATE}`);
    expect(table.rows.map((row) => [row.name, row.status])).toContainEqual(["ベンチを塗る人", "実行中"]);
    expect(table.rows.map((row) => row.name)).toContain("デート");
  });
});

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}
