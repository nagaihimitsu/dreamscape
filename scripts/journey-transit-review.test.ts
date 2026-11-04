import { describe, expect, it } from "vitest";
import { travelCatalogSchema } from "../src/content/travel-schemas";
import { cityTransitFile, exportTransitDecisions, inspectCityTransit, replaceTransitDecisions,
  reviewedModes, type TransitLedger } from "./journey-transit-review";

function fixture() {
  const source = { publisher: "Dreamscape test", title: "Test fixture", url: "https://example.org/transit",
    checkedAt: "2026-11-04", claimType: "hypothesis" as const, claimJa: "検証専用の推定値です。" };
  const places = ["test_a", "test_b"].map((id) => ({ id, cityId: "test_city", nameJa: "試験地点", nameEn: "Test place",
    latitude: 41, longitude: 69, backgroundAssetId: "test_bg", sources: [source] }));
  const travel = travelCatalogSchema.parse({ cityId: "test_city", places, events: [], routes: places.flatMap((from) => places.flatMap((to) => [
    { fromPlaceId: from.id, toPlaceId: to.id, mode: "walk", minutes: from.id === to.id ? 0 : 10,
      cost: 0, estimation: "game_model", sources: [source] },
    ...(from.id === to.id ? [] : [{ fromPlaceId: from.id, toPlaceId: to.id, mode: "taxi", minutes: 5,
      cost: 100, estimation: "game_model", sources: [source] }]),
  ])) });
  const ledger: TransitLedger = { schemaVersion: 1, cityId: "test_city", sourceRefs: { test_source: source },
    decisions: places.flatMap((from) => places.filter((to) => to.id !== from.id).flatMap((to) => reviewedModes.map((mode) => ({
      fromPlaceId: from.id, toPlaceId: to.id, mode,
      status: mode === "taxi" ? "available" : mode === "bus" ? "not_suitable" : "not_applicable",
      reasonJa: "試験用の判断です。", sourceRefs: ["test_source"],
    })))) };
  return { travel, ledger };
}

describe("directional transit review", () => {
  it("checks each mode in each direction and distinguishes unknown from unsuitable", () => {
    const { travel, ledger } = fixture();
    expect(inspectCityTransit(travel, ledger)).toEqual({ cityId: "test_city", directions: 2, decisions: 8,
      counts: { available: 2, not_applicable: 4, not_suitable: 2, unconfirmed: 0 }, ready: true });
    ledger.decisions.find((entry) => entry.mode === "bus")!.status = "unconfirmed";
    const result = inspectCityTransit(travel, ledger);
    expect(result.ready).toBe(false);
    expect(result.counts).toEqual({ available: 2, not_applicable: 4, not_suitable: 1, unconfirmed: 1 });
  });

  it("rejects malformed IDs, foreign places and another city's ledger", () => {
    const { travel, ledger } = fixture();
    expect(() => cityTransitFile(process.cwd(), "../milano")).toThrow();
    expect(() => inspectCityTransit(travel, { ...ledger, cityId: "foreign_city" })).toThrow(/city mismatch/);
    const invalid = structuredClone(ledger);
    invalid.decisions[0].toPlaceId = "../test_b";
    expect(() => inspectCityTransit(travel, invalid)).toThrow();
    invalid.decisions[0].toPlaceId = "foreign_place";
    expect(() => inspectCityTransit(travel, invalid)).toThrow(/Invalid or duplicate transit direction/);
    invalid.decisions[0].toPlaceId = invalid.decisions[0].fromPlaceId;
    expect(() => inspectCityTransit(travel, invalid)).toThrow(/Invalid or duplicate transit direction/);
  });

  it("rejects missing reverse directions, duplicates and missing walking access", () => {
    const { travel, ledger } = fixture();
    const missing = structuredClone(ledger);
    missing.decisions.pop();
    expect(() => inspectCityTransit(travel, missing)).toThrow(/Unreviewed transit direction/);
    const duplicate = structuredClone(ledger);
    duplicate.decisions.push(duplicate.decisions[0]);
    expect(() => inspectCityTransit(travel, duplicate)).toThrow(/duplicate transit direction/);
    travel.routes = travel.routes.filter((route) => !(route.mode === "walk" && route.fromPlaceId === "test_b" && route.toPlaceId === "test_a"));
    expect(() => inspectCityTransit(travel, ledger)).toThrow(/Walking game model missing/);
  });

  it("rejects missing or malformed sources rather than silently considering a direction reviewed", () => {
    const { travel, ledger } = fixture();
    const missing = structuredClone(ledger);
    missing.decisions[0].sourceRefs = ["missing"];
    expect(() => inspectCityTransit(travel, missing)).toThrow(/Unresolved transit source/);
    expect(() => exportTransitDecisions(missing)).toThrow(/Missing transit source/);
    missing.decisions[0].sourceRefs = [];
    expect(() => inspectCityTransit(travel, missing)).toThrow();
    const invalid = structuredClone(ledger);
    invalid.sourceRefs.test_source.url = "javascript:alert(1)";
    expect(() => inspectCityTransit(travel, invalid)).toThrow();
    invalid.sourceRefs.test_source.url = "https://example.org/transit";
    invalid.sourceRefs.test_source.checkedAt = "not-a-date";
    expect(() => inspectCityTransit(travel, invalid)).toThrow();
  });

  it("requires available decisions to match the exact directed playable route", () => {
    const { travel, ledger } = fixture();
    const bus = ledger.decisions.find((entry) => entry.mode === "bus")!;
    bus.status = "available";
    expect(() => inspectCityTransit(travel, ledger)).toThrow(/decision and route disagree/);
    const taxi = travel.routes.find((route) => route.mode === "taxi" && route.fromPlaceId === bus.fromPlaceId)!;
    travel.routes.push({ ...taxi, mode: "bus" });
    expect(inspectCityTransit(travel, ledger).counts.available).toBe(3);
    const reverse = { ...taxi, mode: "bus" as const, fromPlaceId: taxi.toPlaceId, toPlaceId: taxi.fromPlaceId };
    travel.routes.push(reverse);
    expect(() => inspectCityTransit(travel, ledger)).toThrow(/decision and route disagree/);
  });

  it("preserves an unchanged source dictionary and deduplicates edited sources without losing claims", () => {
    const { travel, ledger } = fixture();
    const exported = exportTransitDecisions(ledger);
    expect(replaceTransitDecisions(ledger, exported)).toBe(ledger);
    exported[0].reasonJa = "判断の説明を更新。";
    exported[0].sources = [{ ...exported[0].sources[0], claimJa: "別の主張を追加します。" }, exported[0].sources[0]];
    const replaced = replaceTransitDecisions(ledger, exported);
    expect(Object.keys(replaced.sourceRefs)).toHaveLength(2);
    expect(exportTransitDecisions(replaced)).toEqual(exported);
    expect(inspectCityTransit(travel, replaced).ready).toBe(true);
    exported[0].cityId = "foreign_city";
    expect(() => replaceTransitDecisions(ledger, exported)).toThrow(/another city/);
  });
});
