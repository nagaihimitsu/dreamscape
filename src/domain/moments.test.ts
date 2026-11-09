import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { getCityContent, scenes } from "../content";
import { encounters } from "../content/encounters";
import { getJourney } from "../content/journeys";
import type { SceneAt, SceneEntry } from "../content/scene-schemas";
import { cityStart, completedCity } from "../dev/scenario-builders";
import { encounterEntryRuleList } from "./encounter";
import { validateGameState, type GameState } from "./game";
import { atMatches, momentSchedule } from "./moments";
import { occasionSteps, openOccasion } from "./occasion";
import { applyPlayerAction, listPlayerActions, playerActionChange } from "./player-action";
import { screenFor } from "./screen";
import { beginTravelEvent } from "./travel-game";

// The stage-4 moments no journey has a script for yet (the unified event design 2.3, 4.2): a city's departure (its
// scenes before the items are left behind), an arrival (before its logo, after the logo, after the conversation; its
// # then:), the ticket counter and a trip narrowed by from/to. Small fictional scenes added in memory to the Golden
// Triangle's Delhi → Agra (the journey moves on after the epilogue), each a one-line talk that reuses a compiled knot of
// the sample journey as its story; removed after each test.

const STORY = { storyId: "places/smp_mihon_clock_tower", knot: "smp_mihon_hotel_bell_night" };
const restore = (state: GameState) => validateGameState(JSON.parse(JSON.stringify(state)));
const undo: (() => void)[] = [];
afterEach(() => { while (undo.length) undo.pop()!(); });

/** A fictional talk at a moment, as content:build would list it (scenes.json, the runtime's encounter and its rule). */
function addTalk(id: string, cityId: string, at: SceneAt[], priority: SceneEntry["priority"], order = 0) {
  const entry: SceneEntry = { id, kind: "talk", title: id, cityId, story: STORY, at, priority, order, repeat: "once", people: [], options: [], done: {},
    conds: [], knots: [STORY.knot], fingerprint: "test", origin: "place" };
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
    expect(momentSchedule({ kind: "arrive", cityId: "agra" })).toEqual({
      before: ["zz_test_first", "zz_test_a", "zz_test_b"], after: ["zz_test_after"], afterPart: { logo: ["zz_test_logo"] } });
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
    const entry: SceneEntry = { id: "agra_arrival", kind: "arrival", title: "到着", cityId: "agra", story: { storyId: arrivalStoryId! }, main: { arrival: "agra" },
      at: [], order: 0, repeat: "once", people: [], options: [], done: {}, then: { move: place }, conds: [], knots: [], fingerprint: "test", origin: "file" };
    (scenes as SceneEntry[]).push(entry);
    undo.push(() => (scenes as SceneEntry[]).splice((scenes as SceneEntry[]).indexOf(entry), 1));
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
