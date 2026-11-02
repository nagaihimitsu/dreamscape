import { describe, expect, it } from "vitest";
import { travelCatalogSchema } from "./travel-schemas";

const source = {
  publisher: "Example publisher",
  title: "Example source",
  url: "https://example.org/example",
  checkedAt: "2026-11-02",
  claimType: "documented_fact" as const,
  claimJa: "経路の資料。",
};

function catalog() {
  return {
    cityId: "sample_city",
    places: [
      { id: "hotel", cityId: "sample_city", nameJa: "ホテル", nameEn: "Hotel", latitude: 45, longitude: 9, backgroundAssetId: "hotel", sources: [source] },
      { id: "museum", cityId: "sample_city", nameJa: "美術館", nameEn: "Museum", latitude: 45.1, longitude: 9.1, backgroundAssetId: "museum", sources: [source] },
    ],
    routes: [{ fromPlaceId: "hotel", toPlaceId: "museum", mode: "walk", minutes: 12, cost: 0, sources: [source] }],
    events: [
      { id: "main_visit", cityId: "sample_city", placeId: "museum", category: "main", titleJa: "見学", activityMinutes: 60, apCost: 0 },
      { id: "date_visit", cityId: "sample_city", placeId: "museum", category: "date", titleJa: "デート", activityMinutes: 90, apCost: 2 },
    ],
  };
}

describe("future travel data contract", () => {
  it("preserves a one-way route without inventing its reverse", () => {
    const parsed = travelCatalogSchema.parse(catalog());
    expect(parsed.routes).toHaveLength(1);
    expect(parsed.routes.find((route) => route.fromPlaceId === "museum" && route.toPlaceId === "hotel")).toBeUndefined();
  });

  it("allows separate events at a shared place and directed routes", () => {
    const data = catalog();
    data.routes.push({ fromPlaceId: "museum", toPlaceId: "hotel", mode: "walk", minutes: 17, cost: 0, sources: [source] });
    expect(travelCatalogSchema.safeParse(data).success).toBe(true);
  });

  it("accepts a separately authored tram route", () => {
    const data = catalog();
    expect(travelCatalogSchema.safeParse({ ...data, routes: [{ ...data.routes[0], mode: "tram", cost: 5 }] }).success).toBe(true);
  });

  it("rejects unknown or duplicate places, events and directed routes", () => {
    const unknownPlace = catalog();
    unknownPlace.events[0].placeId = "missing";
    expect(travelCatalogSchema.safeParse(unknownPlace).success).toBe(false);
    const duplicateEvent = catalog();
    duplicateEvent.events.push({ ...duplicateEvent.events[1] });
    expect(travelCatalogSchema.safeParse(duplicateEvent).success).toBe(false);
    const duplicateRoute = catalog();
    duplicateRoute.routes.push({ ...duplicateRoute.routes[0] });
    expect(travelCatalogSchema.safeParse(duplicateRoute).success).toBe(false);
    const duplicatePlace = catalog();
    duplicatePlace.places.push({ ...duplicatePlace.places[0] });
    expect(travelCatalogSchema.safeParse(duplicatePlace).success).toBe(false);
  });

  it("requires source information, valid coordinates, city and windows", () => {
    const invalidCoordinates = catalog();
    invalidCoordinates.places[0].latitude = 91;
    expect(travelCatalogSchema.safeParse(invalidCoordinates).success).toBe(false);
    const missingSource = catalog();
    missingSource.places[0].sources = [];
    expect(travelCatalogSchema.safeParse(missingSource).success).toBe(false);
    const missingRouteSource = catalog();
    missingRouteSource.routes[0].sources = [];
    expect(travelCatalogSchema.safeParse(missingRouteSource).success).toBe(false);
    const unknownRoute = catalog();
    unknownRoute.routes[0].toPlaceId = "unknown";
    expect(travelCatalogSchema.safeParse(unknownRoute).success).toBe(false);
    const wrongCity = catalog();
    wrongCity.events[0].cityId = "other_city";
    expect(travelCatalogSchema.safeParse(wrongCity).success).toBe(false);
    expect(travelCatalogSchema.safeParse({ ...catalog(), events: [{ ...catalog().events[0], startWindows: [{ start: 900, end: 800 }] }] }).success).toBe(false);
  });

  it("rejects charged walks and incorrect same-place routes", () => {
    const data = catalog();
    data.routes[0].cost = 1;
    expect(travelCatalogSchema.safeParse(data).success).toBe(false);
    const samePlace = catalog();
    samePlace.routes[0].toPlaceId = "hotel";
    expect(travelCatalogSchema.safeParse(samePlace).success).toBe(false);
  });
});
