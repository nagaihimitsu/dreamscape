import { describe, expect, it } from "vitest";
import type { TravelCatalog } from "../src/content/travel-schemas";
import { checkRouteModes, type JourneyTransport } from "./transport-validation";

const source = [{ publisher: "試験", title: "試験", url: "https://example.org/test", checkedAt: "2026-11-07", claimType: "hypothesis" as const, claimJa: "試験用。" }];
const place = (id: string) => ({ id, cityId: "test_city", nameJa: "地点", nameEn: "Place", latitude: 0, longitude: 0, backgroundId: "test_bg", sources: source });
const route = (from: string, to: string, mode: string, minutes = 10, cost = 0) => ({ fromPlaceId: from, toPlaceId: to, mode, minutes, cost, sources: source });
const travel = (routes: TravelCatalog["routes"]): TravelCatalog => ({ cityId: "test_city", places: [place("a"), place("b")], routes, events: [] });
const journey = (modes: JourneyTransport["journey"]["transportModes"], pendingJa?: string): JourneyTransport =>
  ({ journey: { id: "test_trip", transportModes: modes }, ...(pendingJa ? { pendingJa } : {}) });
const tram = { id: "tram", nameJa: "路面電車", movingJa: "路面電車で移動中", kind: "tram" as const };

describe("route modes", () => {
  it("accepts walking and the declared modes", () => {
    expect(() => checkRouteModes(travel([route("a", "a", "walk", 0), route("a", "b", "walk"), route("a", "b", "tram", 5, 2)]),
      "content/journeys/test_trip/travel/test_city.json", journey([tram]))).not.toThrow();
  });

  it("refuses a route whose mode the journey does not declare, naming the file, the pair and the manifest", () => {
    expect(() => checkRouteModes(travel([route("a", "b", "walk"), route("a", "b", "bus", 5, 2)]),
      "content/journeys/test_trip/travel/test_city.json", journey([tram]))).toThrow(
      '乗り物 "bus" は content/journeys/test_trip/manifest.json の transportModes に宣言されていません: content/journeys/test_trip/travel/test_city.json の a → b。' +
      "manifest.json に宣言するか、経路の mode を直してください（Undeclared transport mode: content/journeys/test_trip/travel/test_city.json a → b uses \"bus\"; " +
      "declare it in content/journeys/test_trip/manifest.json transportModes）。");
  });

  it("applies to a journey that waits for its switch too (it declares its old modes)", () => {
    expect(() => checkRouteModes(travel([route("a", "b", "taxi", 5, 2)]), "x.json", journey([tram], "ツアー機能待ち")))
      .toThrow('乗り物 "taxi" は');
  });
});
