import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Tour } from "../src/content/tour-schemas";
import type { TravelCatalog } from "../src/content/travel-schemas";
import { validateTours, type TourCheckContent } from "./tour-validation";

// The tour checks of content:build (tour stage 2a; scripts/tour-validation.ts) on a small fictional city:
// a hotel, a square with a normal episode, and a fort reached only on a tour (with its episode). Each
// error stops the build (one line each); each warning is returned (kind "tour-note").

const root = path.join(path.sep, "virtual", "dreamscape");
const fact = { publisher: "Example Cabs", title: "Fort trip", url: "https://example.org/fort", checkedAt: "2026-11-10", claimType: "documented_fact", claimJa: "車で約1時間。" } as const;
const guess = { ...fact, claimType: "hypothesis", claimJa: "ゲーム用の推定。" } as const;
const leg = (id: string, toPlaceId: string, minutes = 60): Tour["steps"][number] => ({ id, kind: "leg", labelJa: "車で移動", toPlaceId, minutes,
  vehicle: { kind: "car", movingJa: "ツアーの車で移動中" }, estimation: "game_model", sources: [fact, guess] });
const visit: Tour["steps"][number] = { id: "visit", kind: "event", eventId: "tst_fort_episode" };
const tour = (patch: Partial<Tour> = {}): Tour => ({
  schemaVersion: 1, id: "tst_tour_fort", cityId: "tst_city", titleJa: "砦の日帰りツアー", summaryJa: "車で砦へ行きます。",
  steps: [leg("out", "tst_fort"), visit, leg("back", "tst_hotel")],
  offers: [{ id: "desk", channel: "desk", sellerJa: "宿のフロント", placeIds: ["tst_hotel"], price: 3200, sources: [fact, guess] },
    { id: "web", channel: "web", sellerJa: "予約サイト", price: 3500, sources: [fact, guess] }],
  ...patch,
});
const place = (id: string, extra: Partial<TravelCatalog["places"][number]> = {}): TravelCatalog["places"][number] => ({
  id, cityId: "tst_city", nameJa: "地点", nameEn: "Place", latitude: 0, longitude: 0, backgroundId: "tst_bg", sources: [guess], ...extra });
const travel = (extra: Partial<TravelCatalog> = {}): TravelCatalog => ({
  cityId: "tst_city",
  places: [place("tst_hotel"), place("tst_square"), place("tst_fort", { access: "tour", openingWindows: [{ start: 540, end: 1020 }] })],
  routes: [{ fromPlaceId: "tst_square", toPlaceId: "tst_hotel", mode: "walk", minutes: 20, cost: 0, sources: [guess] }],
  events: [
    { id: "tst_fort_episode", cityId: "tst_city", placeId: "tst_fort", category: "main", titleJa: "砦を巡る", activityMinutes: 180, apCost: 0, admissionCost: 100 },
    { id: "tst_square_episode", cityId: "tst_city", placeId: "tst_square", category: "main", titleJa: "広場", activityMinutes: 60, apCost: 0 },
    { id: "tst_finale", cityId: "tst_city", placeId: "tst_square", category: "main", titleJa: "フィナーレ", activityMinutes: 60, apCost: 0 },
  ],
  ...extra,
});
const content = (tours: Tour[] = [tour()], patch: Partial<TourCheckContent> = {}): TourCheckContent => ({
  root,
  tours: tours.map((item) => ({ file: path.join(root, `content/journeys/trip/tours/${item.id}.json`), layer: "trip", tour: item })),
  cities: [{ id: "tst_city", journeyId: "trip", travel: travel(), hotelPlaceId: "tst_hotel" }],
  episodes: [
    { id: "tst_fort_episode", kind: "episode", cityId: "tst_city", landmarkId: "tst_fort_lm", battleId: "tst_fort_battle" },
    { id: "tst_square_episode", kind: "episode", cityId: "tst_city", landmarkId: "tst_square_lm", battleId: "tst_square_battle" },
    { id: "tst_finale", kind: "city_finale", cityId: "tst_city", landmarkId: null, battleId: "tst_final_battle" },
  ],
  storyBattleIds: [], battles: [], publishedJourneyIds: new Set(["trip"]), scenes: [],
  ...patch,
});
const notes = (input: TourCheckContent) => validateTours(input).map((warning) => warning.message);
const shown = "content/journeys/trip/tours/tst_tour_fort.json";

describe("tour checks of content:build (tour stage 2a)", () => {
  it("passes a tour from the hotel to the fort and back, with no warning", () => {
    expect(validateTours(content())).toEqual([]);
  });

  it.each<[string, Tour | ((input: TourCheckContent) => TourCheckContent), string]>([
    ["an unknown city", tour({ cityId: "nowhere" }), "Unknown tour city"],
    ["a city of another journey", (input) => ({ ...input, cities: input.cities.map((item) => ({ ...item, journeyId: "other_trip" })) }), "Tour city of another journey"],
    ["two steps with one ID", tour({ steps: [leg("out", "tst_fort"), { ...visit, id: "out" }, leg("back", "tst_hotel")] }), "Duplicate tour step ID"],
    ["two offers with one ID", tour({ offers: [tour().offers[0], { ...tour().offers[1], id: "desk" }] }), "Duplicate tour offer ID"],
    ["no event step", tour({ steps: [leg("out", "tst_square"), leg("back", "tst_hotel")] }), "Tour without an event step"],
    ["a placeholder in a published journey", tour({ summaryJa: "<要調査>" }), "Placeholder in a published tour"],
    ["a leg to an unknown place", tour({ steps: [leg("out", "tst_nowhere"), visit, leg("back", "tst_hotel")] }), "Unknown leg place"],
    ["a leg to where the party is", tour({ steps: [leg("stay", "tst_hotel"), leg("out", "tst_fort"), visit, leg("back", "tst_hotel")] }), "Leg to the place it starts from"],
    ["an unknown event", tour({ steps: [leg("out", "tst_fort"), { ...visit, eventId: "tst_none" }, leg("back", "tst_hotel")] }), "Unknown tour event"],
    ["an event away from the tour's place", tour({ steps: [visit, leg("back", "tst_square")] }), "Event step away from the tour's place"],
    ["an event at a normal place", tour({ steps: [leg("out", "tst_square"), { ...visit, eventId: "tst_square_episode" }, leg("back", "tst_hotel")] }), "Tour event at a normal place"],
    ["a finale", tour({ steps: [leg("out", "tst_fort"), { ...visit, eventId: "tst_finale" }, leg("back", "tst_hotel")] }), "Invalid tour event kind"],
    ["an event ending after 22:00", tour({ steps: [leg("out", "tst_fort", 700), visit, leg("back", "tst_hotel")] }), "Tour event ends after 22:00"],
    ["an end after the next morning", tour({ steps: [leg("out", "tst_fort"), visit, leg("back", "tst_hotel", 1300)] }), "Tour ends too late"],
    ["an end at an event step", tour({ steps: [leg("out", "tst_fort"), visit] }), "Tour does not end with a leg"],
    ["an end at a tour-only place", tour({ steps: [leg("out", "tst_fort"), visit, leg("back", "tst_hotel"), leg("again", "tst_fort")] }), "Tour ends at a tour-only place"],
    ["an end with no walk home", (input) => ({ ...input, cities: input.cities.map((item) => ({ ...item, travel: travel({ routes: [] }) })),
      tours: [{ ...input.tours[0], tour: tour({ steps: [leg("out", "tst_fort"), visit, leg("back", "tst_square")] }) }] }), "Tour ends with no walk home"],
    ["an offer at an unknown place", tour({ offers: [{ ...tour().offers[0], placeIds: ["tst_nowhere"] }] }), "Unknown offer place"],
  ])("stops %s", (_label, change, message) => {
    const input = typeof change === "function" ? change(content()) : content([change]);
    expect(() => validateTours(input)).toThrow(message);
    expect(() => validateTours(input)).toThrow(shown);
  });

  it("lets a prototype city's tour name an event still to be written, and stops it in a playable city", () => {
    const pending = (prototype: boolean) => content([tour()], { cities: [{ id: "tst_city", journeyId: "trip", hotelPlaceId: "tst_hotel", prototype,
      travel: travel({ events: travel().events.map((event) => (event.id === "tst_fort_episode" ? { ...event, contentStatus: "pending_content" as const } : event)) }) }] });
    expect(validateTours(pending(true))).toEqual([]);
    expect(() => validateTours(pending(false))).toThrow("Invalid tour event kind");
  });

  it("lets a preparing journey keep a placeholder, and reports every error at once", () => {
    expect(validateTours(content([tour({ summaryJa: "<要調査>" })], { publishedJourneyIds: new Set() }))).toEqual([]);
    expect(() => validateTours(content([tour({ cityId: "nowhere" }), tour({ id: "tst_tour_other", steps: [leg("out", "tst_fort"), visit] })])))
      .toThrow(/Unknown tour city[^\n]*\n[^\n]*Tour does not end with a leg/u);
  });

  it.each<[string, Tour[] | ((input: TourCheckContent) => TourCheckContent), string]>([
    ["a leg without a documented fact", [tour({ steps: [{ ...leg("out", "tst_fort"), sources: [guess] } as Tour["steps"][number], visit, leg("back", "tst_hotel")] })], "Tour leg sources"],
    ["an arrival after the place closes", [tour({ steps: [leg("out", "tst_fort", 500), visit, leg("back", "tst_hotel")] })], "Tour schedule outside the windows"],
    ["a return to the hotel after 21:00", [tour({ steps: [leg("out", "tst_fort"), visit, leg("back", "tst_hotel", 500)] })], "Tour returns late"],
    ["a walk home that ends after 21:00", [tour({ steps: [leg("out", "tst_fort"), visit, leg("back", "tst_square", 470)] })], "Tour returns late"],
    ["a desk at a tour-only place", [tour({ offers: [{ ...tour().offers[0], placeIds: ["tst_fort"] }] })], "Tour offer place out of reach"],
    ["an introduced offer without its introduction", [tour({ offers: [{ id: "friend", channel: "introduced", sellerJa: "知人", price: 0, sources: [fact, guess] }] })],
      "Introduced tour offer without its introduction"],
    ["an offer without a documented fact", [tour({ offers: [{ ...tour().offers[1], sources: [guess] }] })], "Tour offer sources"],
    ["a tour-only place no tour opens", (input) => ({ ...input, cities: input.cities.map((item) => ({ ...item,
      travel: travel({ places: [...travel().places, place("tst_well", { access: "tour" })] }) })) }), "Tour-only place without a tour: tst_city/tst_well"],
    ["a tour-only event in two tours", [tour(), tour({ id: "tst_tour_fort_again" })], "Tour-only event in more than one tour: tst_city/tst_fort_episode"],
    ["a tour-only place and event in no tour", [], "Tour-only event in no tour: tst_city/tst_fort_episode"],
    ["a then: in a hotel scene after the night", (input) => ({ ...input, scenes: [{ id: "tst_morning", cityId: "tst_city", at: [{ hotel: "any" }], priority: 1,
      then: { move: "tst_square" }, options: [] }] }), "Then: on a booked tour's morning: the hotel scene tst_morning"],
    ["a then: at the visit of a tour's event step", (input) => ({ ...input, scenes: [{ id: "tst_fort_talk", cityId: "tst_city", at: [{ visit: "tst_fort_lm" }], priority: -1,
      options: [{ id: "go", knot: "tst_fort_talk", then: { epilogue: true } }] }] }), "Then: during a tour: the scene tst_fort_talk"],
    ["a then: on the head of a tour event's battle", (input) => ({ ...input, scenes: [{ id: "tst_fort_battle", cityId: "tst_city", at: [], main: { battle: "tst_fort_battle" },
      then: { epilogue: true }, options: [] }] }), "Then: during a tour: the scene tst_fort_battle"],
  ])("warns about %s", (_label, change, message) => {
    const input = typeof change === "function" ? change(content()) : content(change);
    expect(notes(input).some((note) => note.includes(message)), notes(input).join("\n")).toBe(true);
    expect(validateTours(input).every((warning) => warning.kind === "tour-note")).toBe(true);
  });

  it("does not warn about a hotel scene before the night or a then: of a city without a tour", () => {
    const scenes = [{ id: "tst_evening", cityId: "tst_city", at: [{ hotel: "any" }], priority: -1, then: { move: "tst_square" }, options: [] },
      { id: "tst_other", cityId: "other_city", at: [{ hotel: "any" }], priority: 1, then: { epilogue: true as const }, options: [] }];
    expect(notes(content([tour()], { scenes }))).toEqual([]);
  });
});
