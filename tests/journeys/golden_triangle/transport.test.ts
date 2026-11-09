// Golden Triangle moves inside a city on foot, by auto-rickshaw and by metro
// (user decision of 2026-11-09, 「早めに切り替えましょう」; save version 15): per-city
// transit ledgers like every other journey with vehicles, rides counted by the new
// mode IDs, and a save counting a removed mode refused.
import { describe, expect, it } from "vitest";
import { loadContentSources, selectJourneys } from "../../../scripts/content-sources";
import { validateContent } from "../../../scripts/content-validation";
import { cityTransitPath, inspectJourneyTransit } from "../../../scripts/journey-transit";
import { getCityContent } from "../../../src/content";
import { getJourney } from "../../../src/content/journeys";
import { completedCity } from "../../../src/dev/scenario-builders";
import { departToNextCity } from "../../../src/domain/city-travel";
import { createGame, validateGameState } from "../../../src/domain/game";
import { beginTravelEvent, getTravelEventAvailability } from "../../../src/domain/travel-game";
import { loadGame, saveGame, type StorageLike } from "../../../src/persistence";

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const statuses = (available: number, notSuitable: number, notApplicable = 0) =>
  ({ available, not_suitable: notSuitable, not_applicable: notApplicable, inconclusive: 0 });

describe("Golden Triangle in-city transport: walk, auto-rickshaw, metro", () => {
  it("declares the auto-rickshaw and the metro with their labels and art", () => {
    expect(getJourney("golden_triangle")!.transportModes).toEqual([
      { id: "auto_rickshaw", nameJa: "オートリキシャ", movingJa: "オートリキシャで移動中", kind: "three_wheeler" },
      { id: "metro", nameJa: "地下鉄", movingJa: "地下鉄で移動中", kind: "rail" },
    ]);
  });

  it("is reported in the content:build summary with its three ledgers", () => {
    const summary = validateContent(selectJourneys(loadContentSources(process.cwd()), ["golden_triangle"])).transport;
    expect(summary).toContain("Transport golden_triangle: modes walk, auto_rickshaw, metro; transit ledgers 3: available 354, not_suitable 134, not_applicable 172, inconclusive 0");
  }, 120_000);

  it("keeps one ready ledger per city with a decision for every direction and mode (journey:transit)", () => {
    const sources = loadContentSources(process.cwd());
    const report = inspectJourneyTransit(process.cwd(), "golden_triangle", sources);
    expect(report).toMatchObject({ journeyId: "golden_triangle", modes: ["auto_rickshaw", "metro"] });
    const byCity = Object.fromEntries(report.cities.map((city) => [city.cityId, city]));
    expect(Object.keys(byCity)).toEqual(["delhi", "agra", "jaipur"]);
    for (const cityId of ["delhi", "agra", "jaipur"]) {
      expect(byCity[cityId]).toMatchObject({ directions: 110, decisions: 220, ready: true, file: `content/journeys/golden_triangle/travel/${cityId}-transit.json` });
      expect(cityTransitPath(sources, cityId)).toBe(`content/journeys/golden_triangle/travel/${cityId}-transit.json`);
    }
    expect(byCity.delhi.counts).toEqual({ auto_rickshaw: statuses(108, 2), metro: statuses(44, 66) });
    expect(byCity.agra.counts).toEqual({ auto_rickshaw: statuses(106, 4), metro: statuses(4, 2, 104) });
    expect(byCity.jaipur.counts).toEqual({ auto_rickshaw: statuses(92, 18), metro: statuses(0, 42, 68) });
    // Warnings, not errors: directions without a walking route, and the provisional Fatehpur Sikri autos.
    expect([byCity.delhi.missingWalks.length, byCity.agra.missingWalks.length, byCity.jaipur.missingWalks.length]).toEqual([68, 92, 68]);
    expect(byCity.delhi.unsupportedRoutes).toEqual([]);
    expect(byCity.jaipur.unsupportedRoutes).toEqual([]);
    expect(byCity.agra.unsupportedRoutes).toHaveLength(20);
    expect(byCity.agra.unsupportedRoutes.every((route) => route.includes("agra_fatehpur_sikri") && route.endsWith("（auto_rickshaw）"))).toBe(true);
  });

  it("counts a ride by auto-rickshaw from the Delhi hotel, keeps it through save and load, and starts Agra with no ride counted", () => {
    const start = createGame("旅人", "相手", { journeyId: "golden_triangle" });
    // The first map event of Delhi that the party can reach by auto-rickshaw from the hotel right away.
    const event = getCityContent("delhi").travel.events.find((item) => getTravelEventAvailability(start, item.id, "auto_rickshaw").available)!;
    expect(event, "a Delhi event reached by auto-rickshaw").toBeDefined();
    const rode = beginTravelEvent(start, event.id, "auto_rickshaw", start.revision);
    expect(rode.travel).toMatchObject({ currentPlaceId: event.placeId, rideCounts: { auto_rickshaw: 1 } });
    const storage = new MemoryStorage();
    expect(saveGame(storage, rode)).toEqual({ ok: true });
    expect(loadGame(storage)).toEqual({ status: "loaded", state: rode });
    // A count of a mode Golden Triangle no longer declares is refused.
    const cleared = completedCity("delhi");
    for (const rideCounts of [{ taxi: 1 }, { rail: 1 }, { bus: 1 }])
      expect(() => validateGameState({ ...cleared, travel: { ...cleared.travel, rideCounts } }), JSON.stringify(rideCounts))
        .toThrow("乗り物に乗った回数の記録が一致しません。");
    const counted = validateGameState({ ...cleared, travel: { ...cleared.travel, rideCounts: { auto_rickshaw: 2, metro: 1 } } });
    const agra = departToNextCity(counted, counted.revision);
    expect(agra.currentCityId).toBe("agra");
    expect(agra.travel.rideCounts).toEqual({});
    expect(validateGameState(JSON.parse(JSON.stringify(agra)))).toEqual(agra);
  });
});
