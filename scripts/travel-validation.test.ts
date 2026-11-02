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
const journey = journeySchema.parse(journeyData);
const dates = dateCatalogSchema.parse(dateData).dates;
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
      const possible = Array.from({ length: 22 * 60 - 9 * 60 }, (_, offset) => 9 * 60 + offset).some((minute) =>
        planTravelEvent({ day: 1, minute, currentPlaceId: settings.hotelPlaceId, hotelPlaceId: settings.hotelPlaceId, ap: 12, travelBudget: 0 }, event, outbound, home, place).ok);
      expect(possible, event.id).toBe(true);
    }
  });

  it("does not infer a missing reverse walking route", () => {
    const routes = travel.routes.filter((route) => !(route.fromPlaceId === "p_duomo" && route.toPlaceId === "p_hotel" && route.mode === "walk"));
    expect(() => validate({ ...travel, routes })).toThrow(/Missing directed walking route/);
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
