import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { getCityContent, scenes } from "../content";
import { encounters } from "../content/encounters";
import { getJourney } from "../content/journeys";
import type { SceneAt, SceneEntry, SceneThen } from "../content/scene-schemas";
import { createDebugState } from "../dev/debug-state";
import { cityStart, completedCity } from "../dev/scenario-builders";
import { advanceDate, chooseDate, finishDate, startDate } from "./game";
import { closeRomanceEnding } from "./occasion";
import { loadGame, saveGame, type StorageLike } from "../persistence";
import { encounterEntryRuleList } from "./encounter";
import { validateGameState, type GameState } from "./game";
import { atMatches, momentSchedule } from "./moments";
import { occasionSteps, openOccasion } from "./occasion";
import { applyPlayerAction, listPlayerActions, playerActionChange } from "./player-action";
import { resultExitLabel, screenFor } from "./screen";
import { beginTravelEvent, sleepAtHotel } from "./travel-game";

// The stage-4 moments (the unified event design 2.3, 4.2): a city's departure (its scenes before the items are left
// behind), an arrival (before its logo, after the logo, after the conversation; its # then:), the ticket counter and a
// trip narrowed by from/to. Small fictional scenes added in memory to the Golden Triangle's Delhi → Agra (the journey
// moves on after the epilogue), each a one-line talk that reuses a compiled knot of the sample journey as its story;
// removed after each test. Delhi's departure and Agra's arrival also have Golden Triangle's own scenes (GT-4: the
// station at -2 and -1, the reel at +1 when a date was played); the fictional ones run among them.

const STORY = { storyId: "places/smp_mihon_clock_tower", knot: "smp_mihon_hotel_bell_night" };
const restore = (state: GameState) => validateGameState(JSON.parse(JSON.stringify(state)));
const undo: (() => void)[] = [];
afterEach(() => { while (undo.length) undo.pop()!(); });

/** A fictional talk at a moment, as content:build would list it (scenes.json, the runtime's encounter and its rule). */
function addTalk(id: string, cityId: string, at: SceneAt[], priority: SceneEntry["priority"], order = 0, extra: Partial<SceneEntry> = {}) {
  const entry: SceneEntry = { id, kind: "talk", title: id, cityId, story: STORY, at, priority, order, repeat: "once", people: [], options: [], done: {},
    conds: [], knots: [STORY.knot], fingerprint: "test", origin: "place", ...extra };
  const list = scenes as SceneEntry[];
  list.push(entry);
  encounters.encounters.push({ id, cityId, titleJa: "テスト", descriptionJa: "テスト", storyId: `${STORY.storyId}.${STORY.knot}`, options: [], sources: [] });
  encounterEntryRuleList.push({ encounterId: id, priority });
  undo.push(() => {
    list.splice(list.indexOf(entry), 1);
    encounters.encounters.splice(encounters.encounters.findIndex((item) => item.id === id), 1);
    encounterEntryRuleList.splice(encounterEntryRuleList.findIndex((item) => item.encounterId === id), 1);
  });
}

/** Take the first action the screen offers (never the map's), saving and restoring each step, until `done`. */
function playUntil(initial: GameState, done: (state: GameState) => boolean, limit = 300): GameState {
  let state = initial;
  for (let step = 0; !done(state); step++) {
    expect(step, `stuck on ${screenFor(state)}`).toBeLessThan(limit);
    const action = listPlayerActions(state).find((item) => !["travel", "wait", "rest", "rent", "claim_ap", "depart", "read_epilogue"].includes(item.kind));
    if (!action) throw new Error(`no action on the screen ${screenFor(state)}`);
    state = restore(applyPlayerAction(state, playerActionChange(action, () => 0), () => 0));
  }
  return state;
}

beforeAll(() => {
  if (!getJourney("sample_trip")) throw new Error("見本の旅（sample_trip）が生成物にありません。npm run content:build -- --with-sample を実行してください。");
});

describe("matching a scene's # at: to a moment (moments.ts)", () => {
  it("reads place at a date and a finale, a bare hotel in the scene's city, and a trip narrowed by its mode, from and to", () => {
    expect(atMatches({ place: "p" }, { kind: "date", dateId: "d", placeId: "p" }, "c")).toBe(true);
    expect(atMatches({ place: "p" }, { kind: "finale", cityId: "c", placeId: "q" }, "c")).toBe(false);
    expect(atMatches({ hotel: "any" }, { kind: "hotel", cityId: "c", placeId: "h" }, "c")).toBe(true);
    expect(atMatches({ hotel: "any" }, { kind: "hotel", cityId: "other", placeId: "h" }, "c")).toBe(false);
    const trip = { kind: "trip" as const, cityId: "c", modeId: "walk", from: "a", to: "b" };
    expect(atMatches({ trip: "walk" }, trip, "c")).toBe(true);
    expect(atMatches({ trip: "walk", to: "b" }, trip, "c")).toBe(true);
    expect(atMatches({ trip: "walk", from: "b" }, trip, "c")).toBe(false);
    expect(atMatches({ trip: "tram" }, trip, "c")).toBe(false);
  });

  it("orders a moment's scenes: negative by priority then file then written order, after <part> by file, positive after", () => {
    addTalk("zz_test_b", "agra", [{ arrive: "agra" }], -1, 1);
    addTalk("zz_test_a", "agra", [{ arrive: "agra" }], -1, 0);
    addTalk("zz_test_first", "agra", [{ arrive: "agra" }], -3);
    addTalk("zz_test_logo", "agra", [{ arrive: "agra" }], "after logo");
    addTalk("zz_test_after", "agra", [{ arrive: "agra" }], 2);
    // (Agra's own +1, the reel of GT-4, comes before the fictional +2.)
    expect(momentSchedule({ kind: "arrive", cityId: "agra" })).toEqual({
      before: ["zz_test_first", "zz_test_a", "zz_test_b"], after: ["gt_agra_arrive_reel", "zz_test_after"], afterPart: { logo: ["zz_test_logo"] } });
  });
});

describe("a date's moment with the 「交際開始」 screen (3.9 (c))", () => {
  it("runs after date between the date and the screen, the positive scenes after the screen", () => {
    addTalk("zz_test_before", "milano", [{ date: "milano_confession_01" }], -1);
    addTalk("zz_test_after_date", "milano", [{ date: "milano_confession_01" }], "after date");
    addTalk("zz_test_after_screen", "milano", [{ date: "milano_confession_01" }], 1);
    const keys = occasionSteps({ kind: "date", eventId: "milano_confession_01", landmarkId: null, parts: ["date", "ending"], ran: [], at: null, started: [] })
      .map((step) => ("scene" in step ? step.scene : `main:${step.part}`));
    expect(keys).toEqual(["zz_test_before", "main:date", "zz_test_after_date", "main:ending", "zz_test_after_screen"]);
  });

  /** Milan after its first sightseeing and a date, with the values a confession needs: the confession, departed to from the map. */
  function confessionDate(then: SceneThen): GameState {
    // The confession date's head then: (as its knot would write it; here in memory, on the real knot of the Darsena's place file).
    const existing = (scenes as SceneEntry[]).find((scene) => scene.main && "date" in scene.main && scene.main.date === "milano_confession_01")!;
    const before = existing.then;
    existing.then = then;
    undo.push(() => { existing.then = before; });
    const debug = createDebugState({ scene: "tourism", id: "duomo_milano", progress: "completed", ap: 12, affection: 10, trust: 10, spark: 10, roll: "positive" });
    let state = restore({ ...debug, activeTourism: null });
    // The confession needs three dates done (romance/progression.json).
    for (const dateId of ["milano_cafe_01", "milano_brera_date_01", "milano_la_scala_date_01"]) {
      state = startDate(state, dateId, () => 0);
      for (let step = 0; state.activeDate && !state.activeDate.frame.ended; step++) {
        expect(step).toBeLessThan(200);
        state = state.activeDate.frame.choices.length ? chooseDate(state, state.activeDate.frame.choices[0].index, state.revision) : advanceDate(state, state.revision);
      }
      state = restore(finishDate(state, state.revision));
    }
    const trip = restore(applyPlayerAction(state, (current) => beginTravelEvent(current, "milano_confession_01", "walk", current.revision, () => 0), () => 0));
    expect(trip.occasion).toMatchObject({ kind: "date", parts: ["date", "ending"], then: then && "move" in then ? { move: then.move } : { epilogue: true } });
    return trip;
  }

  it("shows the screen before a then: of the accepted confession date; its 「自由時間へ」 then moves on, and a reload keeps the screen", () => {
    const trip = confessionDate({ move: "p_duomo" });
    const screen = playUntil(trip, (state) => state.occasion?.romanceEnding === true);
    expect(screen.confessionStatus).toBe("accepted");
    expect(screen.occasion).toMatchObject({ at: "main:ending", ran: ["date", "ending"], then: { move: "p_duomo" } });
    expect(screenFor(screen)).toBe("romance_ending");
    expect(resultExitLabel(screen)).toBeUndefined();
    const storage = new MemoryStorage();
    expect(saveGame(storage, screen).ok).toBe(true);
    expect(loadGame(storage)).toEqual({ status: "loaded", state: screen });
    const moved = restore(closeRomanceEnding(screen, screen.revision, () => 0));
    expect(moved.occasion?.romanceEnding).toBeUndefined();
    expect(moved.travel.currentPlaceId).toBe("p_duomo");
  });

  it("shows the screen before a then: epilogue of the accepted confession date; its 「自由時間へ」 then opens the epilogue", () => {
    const trip = confessionDate({ epilogue: true });
    const screen = playUntil(trip, (state) => state.occasion?.romanceEnding === true);
    expect(screen.occasion).toMatchObject({ at: "main:ending", then: { epilogue: true } });
    expect(restore(screen)).toEqual(screen);
    // Its exit names what comes next (2.7, 4.7), as a battle result's does.
    expect(resultExitLabel(screen)).toBe("エピローグへ進む");
    const epilogue = restore(closeRomanceEnding(screen, screen.revision, () => 0));
    expect(epilogue.activeEpilogue).not.toBeNull();
    expect(epilogue.endingReached).toBe(true);
  });
});

describe("the departure and the arrival (2.3, 4.2)", () => {
  it("runs the departure's scenes before the items are left behind, then the arrival's before the logo, after it and after the conversation", () => {
    addTalk("zz_test_depart", "delhi", [{ depart: "delhi" }], -1);
    addTalk("zz_test_opening", "agra", [{ arrive: "agra" }], -1);
    addTalk("zz_test_logo", "agra", [{ arrive: "agra" }], "after logo");
    addTalk("zz_test_arrived", "agra", [{ arrive: "agra" }], 1);
    const cleared = completedCity("delhi");
    // The epilogue (the journey moves on after it), then the departure's moment, still in Delhi.
    const epilogue = restore(openOccasion(cleared, { kind: "epilogue" }, cleared.revision, () => 0));
    const leaving = playUntil(epilogue, (state) => state.activeEncounter?.encounterId === "zz_test_depart");
    expect(leaving.currentCityId).toBe("delhi");
    expect(leaving.occasion).toMatchObject({ kind: "depart", cityId: "delhi", parts: ["depart"] });
    // Then Agra: its scene before the logo (the opening of a city), the logo, the scene after it, the conversation, +1.
    const opening = playUntil(leaving, (state) => state.activeEncounter?.encounterId === "zz_test_opening");
    expect(opening.currentCityId).toBe("agra");
    expect(opening.occasion).toMatchObject({ kind: "arrive", cityId: "agra", parts: ["logo", "arrival"] });
    expect(opening.activeEpilogue).toBeNull();
    const logo = playUntil(opening, (state) => state.activeEpilogue?.kind === "arrival");
    expect(logo.activeEpilogue?.logoComplete).toBe(false);
    const afterLogo = playUntil(logo, (state) => !!state.activeEncounter);
    expect(afterLogo.activeEncounter?.encounterId).toBe("zz_test_logo");
    expect(afterLogo.occasion?.ran).toEqual(["logo"]);
    const talk = playUntil(afterLogo, (state) => state.activeEpilogue?.kind === "arrival");
    expect(talk.activeEpilogue?.logoComplete).toBe(true);
    const after = playUntil(talk, (state) => !!state.activeEncounter);
    expect(after.activeEncounter?.encounterId).toBe("zz_test_arrived");
    const free = playUntil(after, (state) => !state.occasion);
    expect(free.seenEncounterIds).toEqual(expect.arrayContaining(["zz_test_depart", "zz_test_opening", "zz_test_logo", "zz_test_arrived"]));
    expect(screenFor(free)).toBe("free_time");
  });

  it("an arrival's # then: (decision 36) moves on from it: the arrival's moment opens for it, the move follows the conversation", () => {
    const { arrivalStoryId } = getCityContent("agra").city;
    const place = getCityContent("agra").travel.places.find((item) => item.id !== getCityContent("agra").travelSettings.hotelPlaceId)!.id;
    // The arrival's own scene entry gets the then: (a place-file knot already has one; a one-scene file may not).
    const existing = (scenes as SceneEntry[]).find((scene) => scene.main && "arrival" in scene.main && scene.main.arrival === "agra");
    if (existing) {
      const before = existing.then;
      existing.then = { move: place };
      undo.push(() => { existing.then = before; });
    } else {
      const entry: SceneEntry = { id: "agra_arrival", kind: "arrival", title: "到着", cityId: "agra", story: { storyId: arrivalStoryId! }, main: { arrival: "agra" },
        at: [], order: 0, repeat: "once", people: [], options: [], done: {}, then: { move: place }, conds: [], knots: [], fingerprint: "test", origin: "file" };
      (scenes as SceneEntry[]).push(entry);
      undo.push(() => (scenes as SceneEntry[]).splice((scenes as SceneEntry[]).indexOf(entry), 1));
    }
    const arrived = playUntil(restore(openOccasion(completedCity("delhi"), { kind: "epilogue" }, completedCity("delhi").revision, () => 0)),
      (state) => state.currentCityId === "agra" && state.activeEpilogue?.kind === "arrival" && !!state.activeEpilogue.logoComplete);
    expect(arrived.occasion).toMatchObject({ kind: "arrive", then: { move: place } });
    const moved = playUntil(arrived, (state) => !state.activeEpilogue);
    expect(moved.travel.currentPlaceId).toBe(place);
  });
});

describe("the ticket counter and a trip narrowed by its places (2.3)", () => {
  it("runs the trip's scene at the place it leaves, the move, the ticket counter's scene after the admission is paid, then the visit", () => {
    const start = cityStart("delhi");
    const event = getCityContent("delhi").travel.events.find((item) => item.id === "gt_delhi_main_red_fort")!;
    addTalk("zz_test_trip", "delhi", [{ trip: "walk", to: event.placeId }], -1);
    addTalk("zz_test_ticket", "delhi", [{ ticket: event.placeId }], -1);
    const trip = restore(applyPlayerAction(start, (state) => beginTravelEvent(state, event.id, "walk", state.revision, () => 0), () => 0));
    expect(trip.activeEncounter?.encounterId).toBe("zz_test_trip");
    expect(trip.travel.currentPlaceId).toBe(start.travel.currentPlaceId);
    expect(trip.occasion?.parts.slice(0, 2)).toEqual(["move", "ticket"]);
    // Fare and admission were paid on departing (the counter's scene comes after the entry is paid).
    expect(trip.travelBudget).toBeLessThanOrEqual(start.travelBudget - event.admissionCost!);
    const counter = playUntil(trip, (state) => state.activeEncounter?.encounterId === "zz_test_ticket");
    expect(counter.travel.currentPlaceId).toBe(event.placeId);
    expect(counter.occasion?.ran).toEqual(["move"]);
    const visit = playUntil(counter, (state) => !state.activeEncounter);
    expect(visit.occasion?.ran).toContain("ticket");
    expect(visit.visitedLandmarkIds.length).toBeGreaterThan(start.visitedLandmarkIds.length);
  });
});

describe("a then: move to a main part that cannot open now (4.2, 2.3; the Golden Triangle's opening hours)", () => {
  it("opens the main part when it fits the day and the place's hours, and the visit without it once the place has closed", () => {
    // A talk before the Red Fort's main part moves on to the Jama Masjid (16 minutes on foot; open 9:00–17:00, admission 800).
    addTalk("zz_test_onward", "delhi", [{ visit: "delhi_red_fort" }], -1, 0, { then: { move: "delhi_jama_masjid" } });
    const play = (minute: number) => {
      const start = cityStart("delhi");
      const trip = restore(applyPlayerAction({ ...start, travel: { ...start.travel, minute } },
        (state) => beginTravelEvent(state, "gt_delhi_main_red_fort", "walk", state.revision, () => 0), () => 0));
      expect(trip.activeEncounter?.encounterId).toBe("zz_test_onward");
      return { trip, moved: playUntil(trip, (state) => state.travel.currentPlaceId === "delhi_jama_masjid" && !state.activeEncounter) };
    };
    // Leaving at 9:00: the Red Fort's time settles at 11:58, the Jama Masjid at 12:14 is open: its main part opens, its admission paid.
    const early = play(9 * 60);
    expect(early.trip.occasion?.then).toMatchObject({ eventId: "gt_delhi_main_jama_masjid" });
    expect(early.moved.occasion).toMatchObject({ eventId: "gt_delhi_main_jama_masjid", landmarkId: "delhi_jama_masjid" });
    expect(early.moved.travel.activeEvent?.eventId).toBe("gt_delhi_main_jama_masjid");
    // Leaving at 14:00: the Jama Masjid at 17:14 has closed: the then: still moves, the visit opens without its main part, no admission.
    const late = play(14 * 60);
    expect(late.trip.occasion?.then).toMatchObject({ move: "delhi_jama_masjid", eventId: null });
    expect(late.moved.travel).toMatchObject({ activeEvent: null, minute: 17 * 60 + 14 });
    expect(late.moved.travelBudget).toBe(late.trip.travelBudget);
    expect(saveGame(new MemoryStorage(), late.moved).ok).toBe(true);
  });

  it("does not record a visit without its main part: the landmark's first real visit keeps its guide (3.9 (b))", () => {
    addTalk("zz_test_onward", "delhi", [{ visit: "delhi_red_fort" }], -1, 0, { then: { move: "delhi_jama_masjid" } });
    addTalk("zz_test_at_jama", "delhi", [{ visit: "delhi_jama_masjid" }], -1);
    const start = cityStart("delhi");
    const trip = restore(applyPlayerAction({ ...start, travel: { ...start.travel, minute: 14 * 60 } },
      (state) => beginTravelEvent(state, "gt_delhi_main_red_fort", "walk", state.revision, () => 0), () => 0));
    // The empty visit at the Jama Masjid (closed at 17:14): its scene runs, the landmark not recorded; every step saves.
    const empty = playUntil(trip, (state) => state.activeEncounter?.encounterId === "zz_test_at_jama");
    expect(empty.occasion).toMatchObject({ kind: "visit", eventId: null, landmarkId: "delhi_jama_masjid", parts: [] });
    expect(empty.visitedLandmarkIds).not.toContain("delhi_jama_masjid");
    expect(saveGame(new MemoryStorage(), empty).ok).toBe(true);
    const free = playUntil(empty, (state) => !state.occasion && !state.activeEncounter);
    expect(free.visitedLandmarkIds).not.toContain("delhi_jama_masjid");
    // The night, then the map's departure there next morning: the first real visit opens with its guide.
    const morning = playUntil(restore(applyPlayerAction(free, (state) => sleepAtHotel(state, "walk", state.revision, undefined, () => 0), () => 0)),
      (state) => state.travel.day === 2 && !state.occasion);
    const visit = restore(applyPlayerAction(morning, (state) => beginTravelEvent(state, "gt_delhi_main_jama_masjid", "walk", state.revision, () => 0), () => 0));
    // The Golden Triangle's visits have no observation (2026-11-11, the user's decision).
    expect(visit.occasion?.parts).toEqual(["guide", "battle"]);
    expect(visit.activeTourism?.phase).toBe("guide");
  });
});

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}
