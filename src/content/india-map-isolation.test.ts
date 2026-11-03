import { describe, expect, it } from "vitest";
import { getCityContent } from ".";
import { travelCatalogSchema } from "./travel-schemas";

const cities = ["delhi", "agra", "jaipur"] as const;

describe("India city map isolation", () => {
  it.each(cities)("keeps %s destinations and all transport within that city's map", (cityId) => {
    const { travel, travelSettings } = getCityContent(cityId);
    const localPlaces = new Set(travel.places.map((place) => place.id));
    expect(travel.cityId).toBe(cityId);
    expect(localPlaces.has(travelSettings.hotelPlaceId)).toBe(true);
    expect(travel.places.every((place) => place.cityId === cityId)).toBe(true);
    expect(travel.events.every((event) => event.cityId === cityId && localPlaces.has(event.placeId))).toBe(true);
    expect(travel.routes.every((route) => localPlaces.has(route.fromPlaceId) && localPlaces.has(route.toPlaceId))).toBe(true);
    for (const other of cities.filter((id) => id !== cityId)) {
      const otherPlaces = getCityContent(other).travel.places;
      expect(otherPlaces.some((place) => localPlaces.has(place.id))).toBe(false);
    }
  });

  it("rejects a route to a location on a different city's map", () => {
    const delhi = structuredClone(getCityContent("delhi").travel);
    const agraPlace = getCityContent("agra").travel.places[0];
    delhi.routes.push({ ...delhi.routes.find((route) => route.fromPlaceId !== route.toPlaceId)!, toPlaceId: agraPlace.id });
    expect(() => travelCatalogSchema.parse(delhi)).toThrow(/Unknown route destination/);
  });
});
