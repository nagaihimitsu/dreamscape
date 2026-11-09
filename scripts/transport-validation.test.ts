import { describe, expect, it } from "vitest";
import type { TravelCatalog } from "../src/content/travel-schemas";
import { checkCityRentals, checkCityTransit, checkRouteModes, checkTransportModeCount, cityTransitWarnings, transportSummary, type JourneyTransport } from "./transport-validation";

const source = [{ publisher: "試験", title: "試験", url: "https://example.org/test", checkedAt: "2026-11-07", claimType: "hypothesis" as const, claimJa: "試験用。" }];
const place = (id: string) => ({ id, cityId: "test_city", nameJa: "地点", nameEn: "Place", latitude: 0, longitude: 0, backgroundId: "test_bg", sources: source });
const route = (from: string, to: string, mode: string, minutes = 10, cost = 0) => ({ fromPlaceId: from, toPlaceId: to, mode, minutes, cost, sources: source });
const travel = (routes: TravelCatalog["routes"]): TravelCatalog => ({ cityId: "test_city", places: [place("a"), place("b")], routes, events: [] });
const journey = (modes: JourneyTransport["journey"]["transportModes"], pendingJa?: string): JourneyTransport =>
  ({ journey: { id: "test_trip", transportModes: modes }, ...(pendingJa ? { pending: { pendingJa, inspectCommand: "npm run test:transit" } } : {}) });
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

  it("refuses a vehicle route from a place to the same place, naming the file, the place and the mode", () => {
    expect(() => checkRouteModes(travel([route("a", "a", "walk", 0), route("a", "a", "tram", 0, 2)]),
      "content/journeys/test_trip/travel/test_city.json", journey([tram]))).toThrow(
      '同じ地点への経路は徒歩だけです: content/journeys/test_trip/travel/test_city.json の a → a が "tram" です。' +
      "その地点の徒歩0分の経路だけを残してください（Same-place route of a vehicle: content/journeys/test_trip/travel/test_city.json a uses \"tram\"）。");
    // A journey waiting for its switch keeps its old modes, but not a vehicle to the same place either.
    expect(() => checkRouteModes(travel([route("a", "a", "tram", 0, 2)]), "x.json", journey([tram], "ツアー機能待ち")))
      .toThrow("同じ地点への経路は徒歩だけです: x.json の a → a");
  });

  it("applies to a journey that waits for its switch too (it declares its old modes)", () => {
    expect(() => checkRouteModes(travel([route("a", "b", "taxi", 5, 2)]), "x.json", journey([tram], "ツアー機能待ち")))
      .toThrow('乗り物 "taxi" は');
  });
});

describe("per-city transit ledgers in content:build", () => {
  const taxi = { id: "taxi", nameJa: "タクシー", movingJa: "タクシーで移動中", kind: "car" as const };
  const files = (transit: unknown) => ({ travel: travel([route("a", "a", "walk", 0), route("a", "b", "walk"), route("b", "b", "walk", 0), route("b", "a", "walk")]), transit, transitFile: "content/journeys/test_trip/travel/test_city-transit.json" });
  const ledger = { schemaVersion: 2, cityId: "test_city", sourceRefs: { fact: { ...source[0], claimType: "documented_fact" } }, decisions: [
    { fromPlaceId: "a", toPlaceId: "b", mode: "taxi", status: "not_suitable", checkedAt: "2026-11-07", reasonJa: "歩いてすぐです。", sourceRefs: ["fact"] },
    { fromPlaceId: "b", toPlaceId: "a", mode: "taxi", status: "not_suitable", checkedAt: "2026-11-07", reasonJa: "歩いてすぐです。", sourceRefs: ["fact"] },
  ] };

  it("checks a ledger against the routes and returns its review", () => {
    expect(checkCityTransit(files(ledger), journey([taxi]))).toMatchObject({ decisions: 2, ready: true });
  });

  it("requires a ledger once the journey declares a mode, and only then", () => {
    expect(() => checkCityTransit(files(undefined), journey([taxi])))
      .toThrow("交通判断台帳 content/journeys/test_trip/travel/test_city-transit.json がありません。乗り物を宣言した旅行編では、都市ごとに台帳が要ります（Missing transit ledger）。");
    expect(checkCityTransit(files(undefined), journey([]))).toBeUndefined();
    expect(() => checkCityTransit(files(ledger), journey([])))
      .toThrow("content/journeys/test_trip/travel/test_city-transit.json は要りません。test_trip は徒歩だけの旅行編です（Transit ledger in a walk-only journey）。");
  });

  it("lets a journey waiting for its switch keep no per-city ledger and need none", () => {
    expect(checkCityTransit(files(undefined), journey([taxi], "ツアー機能待ち"))).toBeUndefined();
    expect(() => checkCityTransit(files(ledger), journey([taxi], "ツアー機能待ち")))
      .toThrow("test_city-transit.json は置けません。test_trip は交通の切り替えを待っています（ツアー機能待ち）。");
  });

  it("reports the modes and the ledger counts per journey, or what a journey waits for", () => {
    const review = checkCityTransit(files(ledger), journey([taxi]))!;
    expect(transportSummary(journey([taxi]), [review]))
      .toBe("Transport test_trip: modes walk, taxi; transit ledgers 1: available 0, not_suitable 2, not_applicable 0, inconclusive 0");
    expect(transportSummary(journey([{ ...taxi, rental: true }]), [])).toBe("Transport test_trip: modes walk, taxi (rental)");
    expect(transportSummary(journey([taxi], "ツアー機能待ち"), []))
      .toBe("Transport test_trip: ツアー機能待ち（交通は旧方式のまま。都市ごとの交通判断台帳と新しい交通の確認はまだ使いません。" +
        "旧方式の判断台帳は npm run test:transit で確かめます）; modes walk, taxi");
  });
});

describe("rentals in content:build", () => {
  const bike = { id: "rental_bicycle", nameJa: "貸し自転車", movingJa: "貸し自転車で移動中", kind: "bicycle" as const, rental: true as const };
  const withBike = travel([route("a", "a", "walk", 0), route("a", "b", "walk"), route("a", "b", "rental_bicycle", 5)]);
  const offer = (changes: Partial<{ modeId: string; placeIds: string[] }> = {}) => ({ modeId: "rental_bicycle", placeIds: ["a"], cost: 6, sources: source, ...changes });
  const FILE = "content/journeys/test_trip/travel/test_city-settings.json";

  it("accepts an offer of a declared rental mode with routes here, at places of the city", () => {
    expect(() => checkCityRentals(withBike, [offer()], FILE, journey([bike]))).not.toThrow();
    // A rental mode without routes in this city needs no offer.
    expect(() => checkCityRentals(travel([route("a", "b", "walk")]), undefined, FILE, journey([bike]))).not.toThrow();
  });

  it("requires an offer for a rental mode with routes, and refuses offers that cannot be used", () => {
    expect(() => checkCityRentals(withBike, undefined, FILE, journey([bike])))
      .toThrow(`借りる乗り物 "rental_bicycle" の経路がありますが、${FILE} の rentals に貸し出しがありません（Rental mode without an offer）。`);
    expect(() => checkCityRentals(withBike, [offer({ modeId: "tram" })], FILE, journey([bike, tram])))
      .toThrow(`${FILE} の貸し出し "tram" は、借りる乗り物（manifest.json の transportModes で "rental": true）ではありません`);
    expect(() => checkCityRentals(travel([route("a", "b", "walk")]), [offer()], FILE, journey([bike])))
      .toThrow(`${FILE} の貸し出し "rental_bicycle" には、この都市の経路がありません（Rental offer for a mode without routes in the city）。`);
    expect(() => checkCityRentals(withBike, [offer({ placeIds: ["a", "elsewhere"] })], FILE, journey([bike])))
      .toThrow(`${FILE} の貸し出し "rental_bicycle" の場所 "elsewhere" は、この都市の地点ではありません（Unknown rental place）。`);
  });

  it("keeps rentals out of a journey waiting for its switch", () => {
    expect(() => checkCityRentals(withBike, [offer()], FILE, journey([bike], "ツアー機能待ち")))
      .toThrow("test_trip は交通の切り替えを待っているので（ツアー機能待ち）、借りる乗り物と貸し出しはまだ使えません");
    expect(() => checkCityRentals(travel([route("a", "b", "walk")]), [], FILE, journey([tram], "ツアー機能待ち"))).not.toThrow();
  });
});

describe("the transport limits", () => {
  const mode = (id: string) => ({ id, nameJa: "乗り物", movingJa: "乗り物で移動中", kind: "car" as const });

  it("allows walking plus two modes, and keeps a journey waiting for its switch at its old modes", () => {
    expect(() => checkTransportModeCount(journey([]))).not.toThrow();
    expect(() => checkTransportModeCount(journey([mode("a"), mode("b")]))).not.toThrow();
    expect(() => checkTransportModeCount(journey([mode("a"), mode("b"), mode("c")])))
      .toThrow("乗り物は徒歩のほかに2つまでです: content/journeys/test_trip/manifest.json の transportModes に3つあります（At most 2 transport modes besides walking: content/journeys/test_trip/manifest.json）。");
    expect(() => checkTransportModeCount(journey([mode("a"), mode("b"), mode("c")], "ツアー機能待ち"))).not.toThrow();
  });

  it("returns, without refusing, the routes of a declared mode without a game estimate backed by a documented fact", () => {
    const fact = { ...source[0], claimType: "documented_fact" as const };
    const taxi = mode("taxi");
    const ledger = (status: string) => ({ schemaVersion: 2, cityId: "test_city", sourceRefs: { fact }, decisions: [
      { fromPlaceId: "a", toPlaceId: "b", mode: "taxi", status, checkedAt: "2026-11-07", reasonJa: "試験の判断です。", sourceRefs: ["fact"] },
      { fromPlaceId: "b", toPlaceId: "a", mode: "taxi", status: "not_suitable", checkedAt: "2026-11-07", reasonJa: "試験の判断です。", sourceRefs: ["fact"] },
    ] });
    const supported = { ...route("a", "b", "taxi", 5, 3), estimation: "game_model" as const, sources: [...source, fact] };
    const files = (taxiRoute: TravelCatalog["routes"][number]) => ({ travel: travel([route("a", "a", "walk", 0), route("a", "b", "walk"), route("b", "b", "walk", 0), route("b", "a", "walk"), taxiRoute]),
      transit: ledger("available"), transitFile: "x-transit.json", travelFile: "content/journeys/test_trip/travel/test_city.json" });
    expect(checkCityTransit(files(supported), journey([taxi]))).toMatchObject({ ready: true, unsupportedRoutes: [] });
    expect(cityTransitWarnings(checkCityTransit(files(supported), journey([taxi]))!, files(supported))).toEqual([]);
    for (const weak of [{ ...supported, sources: source }, { ...supported, estimation: undefined }]) {
      const check = checkCityTransit(files(weak), journey([taxi]))!;
      expect(check).toMatchObject({ ready: true, unsupportedRoutes: [weak] });
      expect(cityTransitWarnings(check, files(weak))).toEqual([{ kind: "transit-route-unsourced", message:
        'Vehicle routes without a game-model estimate or a documented fact: content/journeys/test_trip/travel/test_city.json has 1 "taxi" route(s) ' +
        'without "estimation": "game_model" or a documented_fact source, first a → b (say in the ledger reason that the value is provisional and has no source; authoring/CONTENT_GUIDE.md)' }]);
    }
  });

  it("warns once per city about the directions without a walking route", () => {
    const taxi = mode("taxi");
    const fact = { ...source[0], claimType: "documented_fact" as const };
    const taxiRoute = (from: string, to: string) => ({ ...route(from, to, "taxi", 5, 3), estimation: "game_model" as const, sources: [...source, fact] });
    const decision = (from: string, to: string) => ({ fromPlaceId: from, toPlaceId: to, mode: "taxi", status: "available", checkedAt: "2026-11-07", reasonJa: "試験の判断です。", sourceRefs: ["fact"] });
    const city = { travel: travel([route("a", "a", "walk", 0), route("b", "b", "walk", 0), taxiRoute("a", "b"), taxiRoute("b", "a")]),
      transit: { schemaVersion: 2, cityId: "test_city", sourceRefs: { fact }, decisions: [decision("a", "b"), decision("b", "a")] },
      transitFile: "content/journeys/test_trip/travel/test_city-transit.json", travelFile: "content/journeys/test_trip/travel/test_city.json" };
    const check = checkCityTransit(city, journey([taxi]))!;
    expect(check.missingWalks).toEqual(["a → b", "b → a"]);
    expect(cityTransitWarnings(check, city)).toEqual([{ kind: "transit-walk-missing", message:
      "Directions without a walking route: content/journeys/test_trip/travel/test_city.json has no walk route for 2 direction(s), first a → b " +
      "(the city has a transit ledger, content/journeys/test_trip/travel/test_city-transit.json: a ledger reason that weighs a vehicle against walking needs that walk; " +
      "every place must still be reachable by some route)" }]);
  });
});
