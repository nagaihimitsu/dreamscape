import { describe, expect, it } from "vitest";
import type { TravelCatalog } from "../src/content/travel-schemas";
import { checkCityTransit, checkRouteModes, transportSummary, type JourneyTransport } from "./transport-validation";

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

describe("per-city transit ledgers in content:build", () => {
  const taxi = { id: "taxi", nameJa: "タクシー", movingJa: "タクシーで移動中", kind: "car" as const };
  const files = (transit: unknown) => ({ travel: travel([route("a", "a", "walk", 0), route("a", "b", "walk")]), transit, transitFile: "content/journeys/test_trip/travel/test_city-transit.json" });
  const ledger = { schemaVersion: 2, cityId: "test_city", sourceRefs: { fact: { ...source[0], claimType: "documented_fact" } }, decisions: [
    { fromPlaceId: "a", toPlaceId: "b", mode: "taxi", status: "not_suitable", checkedAt: "2026-11-07", reasonJa: "歩いてすぐです。", sourceRefs: ["fact"] },
    { fromPlaceId: "b", toPlaceId: "a", mode: "taxi", status: "not_suitable", checkedAt: "2026-11-07", reasonJa: "歩いてすぐです。", sourceRefs: ["fact"] },
  ] };

  it("checks a ledger against the routes and returns its review", () => {
    expect(checkCityTransit(files(ledger), journey([taxi]), { requireLedger: true })).toMatchObject({ decisions: 2, ready: true });
  });

  it("requires a ledger once the journey declares a mode, and only then", () => {
    expect(() => checkCityTransit(files(undefined), journey([taxi]), { requireLedger: true }))
      .toThrow("交通判断台帳 content/journeys/test_trip/travel/test_city-transit.json がありません。乗り物を宣言した旅行編では、都市ごとに台帳が要ります（Missing transit ledger）。");
    expect(checkCityTransit(files(undefined), journey([taxi]), { requireLedger: false })).toBeUndefined();
    expect(checkCityTransit(files(undefined), journey([]), { requireLedger: true })).toBeUndefined();
    expect(() => checkCityTransit(files(ledger), journey([]), { requireLedger: true }))
      .toThrow("content/journeys/test_trip/travel/test_city-transit.json は要りません。test_trip は徒歩だけの旅行編です（Transit ledger in a walk-only journey）。");
  });

  it("lets a journey waiting for its switch keep no per-city ledger and need none", () => {
    expect(checkCityTransit(files(undefined), journey([taxi], "ツアー機能待ち"), { requireLedger: true })).toBeUndefined();
    expect(() => checkCityTransit(files(ledger), journey([taxi], "ツアー機能待ち"), { requireLedger: true }))
      .toThrow("test_city-transit.json は置けません。test_trip は交通の切り替えを待っています（ツアー機能待ち）。");
  });

  it("reports the modes and the ledger counts per journey, or what a journey waits for", () => {
    const review = checkCityTransit(files(ledger), journey([taxi]), { requireLedger: true })!;
    expect(transportSummary(journey([taxi]), [review]))
      .toBe("Transport test_trip: modes walk, taxi; transit ledgers 1: available 0, not_suitable 2, not_applicable 0, inconclusive 0");
    expect(transportSummary(journey([{ ...taxi, rental: true }]), [])).toBe("Transport test_trip: modes walk, taxi (rental)");
    expect(transportSummary(journey([taxi], "ツアー機能待ち"), []))
      .toBe("Transport test_trip: ツアー機能待ち（交通は旧方式のまま。都市ごとの交通判断台帳と新しい交通の確認はまだ使いません）; modes walk, taxi");
  });
});
