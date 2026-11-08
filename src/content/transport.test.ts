import { describe, expect, it } from "vitest";
import { journeyCatalogSchema } from "./journey-catalog";
import { journeys } from "./journeys";
import { getTransportMode, getTransportModes, transportLabel, transportModeSchema, WALK_MODE } from "./transport";

const manifestEntry = (transportModes: unknown) => ({ schemaVersion: 1, journeys: [{
  id: "test_trip", nameJa: "試験の旅", status: "preparing", cities: [{ id: "test_city", nameJa: "試験市" }],
  currency: { code: "EUR", symbol: "€", unitJa: "ユーロ", unit: "whole" }, intercityModes: [], transportModes,
}] });
const tram = { id: "tram", nameJa: "路面電車", movingJa: "路面電車で移動中", kind: "tram" };

describe("transport mode declarations", () => {
  it("accepts a declared mode with Japanese labels, a built-in kind and an optional rental mark", () => {
    expect(transportModeSchema.parse(tram)).toEqual(tram);
    expect(transportModeSchema.parse({ id: "rental_bicycle", nameJa: "貸し自転車", movingJa: "貸し自転車で移動中", kind: "bicycle", rental: true }).rental).toBe(true);
  });

  it("refuses walk (built in), an unknown kind, an English label and extra keys", () => {
    expect(transportModeSchema.safeParse({ ...tram, id: "walk" }).success).toBe(false);
    expect(transportModeSchema.safeParse({ ...tram, kind: "boat" }).success).toBe(false);
    expect(transportModeSchema.safeParse({ ...tram, nameJa: "Tram" }).success).toBe(false);
    expect(transportModeSchema.safeParse({ ...tram, movingJa: "riding" }).success).toBe(false);
    expect(transportModeSchema.safeParse({ ...tram, rental: false }).success).toBe(false);
    expect(transportModeSchema.safeParse({ ...tram, color: "red" }).success).toBe(false);
  });

  it("requires the manifest key and refuses a mode declared twice", () => {
    expect(journeyCatalogSchema.safeParse(manifestEntry([tram])).success).toBe(true);
    expect(journeyCatalogSchema.safeParse(manifestEntry([])).success).toBe(true);
    const missing = manifestEntry([]);
    delete (missing.journeys[0] as Record<string, unknown>).transportModes;
    expect(journeyCatalogSchema.safeParse(missing).success).toBe(false);
    const twice = journeyCatalogSchema.safeParse(manifestEntry([tram, { ...tram, nameJa: "トラム" }]));
    expect(twice.success).toBe(false);
    expect(twice.error?.issues.map((issue) => [issue.message, issue.path])).toEqual([["Duplicate transport mode", ["journeys", 0, "transportModes", 1, "id"]]]);
  });

  it("lists walking first, then the city's journey's modes, and labels a route by its mode", () => {
    for (const journey of journeys) for (const city of journey.cities) {
      expect(getTransportModes(city.id)).toEqual([WALK_MODE, ...journey.transportModes]);
      for (const mode of journey.transportModes) {
        expect(getTransportMode(city.id, mode.id)).toBe(mode);
        expect(transportLabel(city.id, mode.id)).toBe(mode.nameJa);
      }
      expect(transportLabel(city.id, "walk")).toBe("徒歩");
    }
    expect(getTransportMode(journeys[0].cities[0].id, "no_such_mode")).toBeUndefined();
  });
});
