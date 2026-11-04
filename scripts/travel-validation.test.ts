import { describe, expect, it } from "vitest";
import travelData from "../content/travel/milano.json";
import settingsData from "../content/travel/milano-settings.json";
import journeyData from "../content/progression/journey.json";
import dateData from "../content/romance/date_catalog.json";
import presentationData from "../content/romance/presentation.json";
import battleData from "../content/battles/catalog.json";
import tourismData from "../content/tourism/catalog.json";
import destinationData from "../content/romance/date_destinations.json";
import { travelCatalogSchema, travelSettingsSchema } from "../src/content/travel-schemas";
import { journeySchema } from "../src/content/journey-schemas";
import { battleCatalogSchema, dateCatalogSchema, presentationSchema } from "../src/content/schemas";
import { tourismCatalogSchema } from "../src/content/tourism-schemas";
import { dateDestinationsSchema } from "../src/content/date-destinations";
import { validateTravelContent } from "./travel-validation";
import { planTravelEvent } from "../src/domain/travel";

const travel = travelCatalogSchema.parse(travelData);
const settings = travelSettingsSchema.parse(settingsData);
const allJourney = journeySchema.parse(journeyData);
const episodes = allJourney.episodes.filter((episode) => episode.cityId === travel.cityId);
const localLandmarks = tourismCatalogSchema.parse(tourismData).landmarks.filter((landmark) => landmark.cityId === travel.cityId);
const storyBattles = allJourney.storyBattles.filter((entry) => {
  const battle = battleData.battles.find((battle) => battle.id === entry.battleId);
  return localLandmarks.some((landmark) => landmark.id === battle?.landmarkId);
});
const journey = { ...allJourney, episodes, storyBattles,
  rewards: allJourney.rewards.filter((rule) => rule.episodeId !== undefined
    ? episodes.some((episode) => episode.id === rule.episodeId)
    : storyBattles.some((battle) => battle.battleId === rule.battleId)) };
const dates = dateCatalogSchema.parse(dateData).dates.filter((date) => date.chapterId === travel.cityId);
const backgrounds = presentationSchema.parse(presentationData).backgrounds;
const battles = battleCatalogSchema.parse(battleData).battles;
const landmarkIds = tourismCatalogSchema.parse(tourismData).landmarks.map((landmark) => landmark.id);
const destinationIds = dateDestinationsSchema.parse(destinationData).destinations.map((destination) => destination.id);
const validate = (data = travel, hotel = settings.hotelPlaceId) =>
  validateTravelContent(data, { hotelPlaceId: hotel }, "milano", journey, dates, battles, landmarkIds, destinationIds, backgrounds);

describe("Milan travel data references", () => {
  it("covers the existing events, backgrounds and all directed walking pairs", () => {
    expect(() => validate()).not.toThrow();
  });

  it("offers every event a feasible time starting at the hotel with enough AP", () => {
    for (const event of travel.events) {
      const place = travel.places.find((candidate) => candidate.id === event.placeId)!;
      const outbound = travel.routes.find((route) => route.fromPlaceId === settings.hotelPlaceId && route.toPlaceId === event.placeId && route.mode === "walk")!;
      const home = travel.routes.find((route) => route.fromPlaceId === event.placeId && route.toPlaceId === settings.hotelPlaceId && route.mode === "walk")!;
      const possible = Array.from({ length: 21 * 60 - 9 * 60 }, (_, offset) => 9 * 60 + offset).some((minute) =>
        planTravelEvent({ day: 1, minute, currentPlaceId: settings.hotelPlaceId, hotelPlaceId: settings.hotelPlaceId, ap: 12, travelBudget: 0 }, event, outbound, home, place).ok);
      expect(possible, event.id).toBe(true);
    }
  });

  it("accepts a paid return in place of a missing walk and reserves its fare", () => {
    const original = travel.routes.find((route) => route.fromPlaceId === "p_duomo" && route.toPlaceId === "p_hotel" && route.mode === "walk")!;
    const taxi = { ...original, mode: "taxi" as const, cost: 10 };
    const routes = travel.routes.filter((route) => route !== original).concat(taxi);
    expect(() => validate({ ...travel, routes })).not.toThrow();
    const event = travel.events.find((candidate) => candidate.placeId === "p_duomo")!;
    const place = travel.places.find((candidate) => candidate.id === event.placeId)!;
    const outbound = routes.find((route) => route.fromPlaceId === "p_hotel" && route.toPlaceId === "p_duomo" && route.mode === "walk")!;
    const state = { day: 1, minute: 9 * 60, currentPlaceId: "p_hotel", hotelPlaceId: "p_hotel", ap: 12, travelBudget: 9 };
    expect(planTravelEvent(state, event, outbound, taxi, place)).toEqual({ ok: false, reason: "budget" });
    expect(planTravelEvent({ ...state, travelBudget: 10 }, event, outbound, taxi, place).ok).toBe(true);
  });

  it("requires a usable route in each direction without inventing a reverse route", () => {
    const routes = travel.routes.filter((route) => !(route.fromPlaceId === "p_duomo" && route.toPlaceId === "p_hotel" && route.mode === "walk"));
    expect(() => validate({ ...travel, routes })).toThrow(/Missing usable directed route: p_duomo\/p_hotel/);
    const walk = travel.routes.find((route) => route.fromPlaceId === "p_duomo" && route.toPlaceId === "p_hotel" && route.mode === "walk")!;
    expect(() => validate({ ...travel, routes: [...routes, { ...walk, mode: "taxi", cost: 10, minutes: 12 * 60 }] }))
      .toThrow(/Missing usable directed route: p_duomo\/p_hotel/);
  });

  it("requires the free zero-time route for events at the current place", () => {
    const routes = travel.routes.filter((route) => !(route.fromPlaceId === "p_hotel" && route.toPlaceId === "p_hotel"));
    expect(() => validate({ ...travel, routes })).toThrow(/Missing same-place route: p_hotel/);
  });

  it("allows explicitly pending city content only in an unpublished prototype", () => {
    const original = travel.events.find((event) => event.category === "main")!;
    const pending = { ...original, id: "prototype_pending_main", contentStatus: "pending_content" as const };
    const candidate = { ...travel, events: [...travel.events, pending] };
    expect(() => validate(candidate)).toThrow(/Pending travel event in playable city/);
    const runPrototype = (placeIds: string[]) => validateTravelContent(candidate, settings, "milano", journey, dates, battles,
      landmarkIds, destinationIds, backgrounds, { allowPendingContent: true, plannedLandmarkIds: placeIds });
    expect(() => runPrototype([original.placeId])).not.toThrow();
    expect(() => runPrototype(["wrong_place"])).toThrow(/Invalid pending main/);
    expect(() => validate({ ...candidate, events: [...travel.events, { ...pending, contentStatus: undefined }] }))
      .toThrow(/Unknown or invalid main travel event/);
  });

  it("rejects a missing date, wrong AP, background or hotel", () => {
    expect(() => validate({ ...travel, events: travel.events.filter((event) => event.id !== dates[0].id) })).toThrow(/Missing travel event/);
    const events = travel.events.map((event) => event.id === dates[0].id ? { ...event, apCost: event.apCost + 1 } : event);
    expect(() => validate({ ...travel, events })).toThrow(/AP mismatch/);
    const places = travel.places.map((place, index) => index === 0 ? { ...place, backgroundAssetId: "missing" } : place);
    expect(() => validate({ ...travel, places })).toThrow(/Unknown travel background/);
    expect(() => validate(travel, "missing")).toThrow(/Unknown travel hotel/);
  });

  it("rejects a date or main event at a different catalogued landmark", () => {
    const dateEvents = travel.events.map((event) => event.id === "milano_brera_date_01" ? { ...event, placeId: "p_scala" } : event);
    expect(() => validate({ ...travel, events: dateEvents })).toThrow(/Travel date place mismatch/);
    const mainEvents = travel.events.map((event) => event.id === "milano_brera_c01" ? { ...event, placeId: "p_scala" } : event);
    expect(() => validate({ ...travel, events: mainEvents })).toThrow(/Travel landmark place mismatch/);
  });
});
