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
import { createGame, validateGameState, type GameState } from "../../../src/domain/game";
import { applyPlayerAction, listPlayerActions, playerActionChange } from "../../../src/domain/player-action";
import { beginTravelEvent, getTravelEventAvailability } from "../../../src/domain/travel-game";
import { loadGame, saveGame, type StorageLike } from "../../../src/persistence";

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

/** Delhi's departure has its own scenes (GT-4): play them with the first action the screen offers until the party is in the next city. */
function playToNextCity(departing: GameState): GameState {
  let state = departing;
  for (let step = 0; state.currentCityId === departing.currentCityId; step++) {
    expect(step).toBeLessThan(200);
    state = applyPlayerAction(state, playerActionChange(listPlayerActions(state)[0], () => 0), () => 0);
  }
  return state;
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
    expect(summary).toContain("Transport golden_triangle: modes walk, auto_rickshaw, metro; transit ledgers 3: available 332, not_suitable 136, not_applicable 152, inconclusive 0");
  }, 120_000);

  it("keeps one ready ledger per city with a decision for every direction and mode (journey:transit)", () => {
    const sources = loadContentSources(process.cwd());
    const report = inspectJourneyTransit(process.cwd(), "golden_triangle", sources);
    expect(report).toMatchObject({ journeyId: "golden_triangle", modes: ["auto_rickshaw", "metro"] });
    const byCity = Object.fromEntries(report.cities.map((city) => [city.cityId, city]));
    expect(Object.keys(byCity)).toEqual(["delhi", "agra", "jaipur"]);
    // Agra's ledger leaves out Fatehpur Sikri, which only its tour reaches (tour stage 2a): 10 places, 90 directions.
    for (const cityId of ["delhi", "agra", "jaipur"]) {
      const [directions, decisions] = cityId === "agra" ? [90, 180] : [110, 220];
      expect(byCity[cityId]).toMatchObject({ directions, decisions, ready: true, file: `content/journeys/golden_triangle/travel/${cityId}-transit.json` });
      expect(cityTransitPath(sources, cityId)).toBe(`content/journeys/golden_triangle/travel/${cityId}-transit.json`);
    }
    expect(byCity.delhi.counts).toEqual({ auto_rickshaw: statuses(108, 2), metro: statuses(44, 66) });
    expect(byCity.agra.counts).toEqual({ auto_rickshaw: statuses(86, 4), metro: statuses(4, 2, 84) });
    expect(byCity.jaipur.counts).toEqual({ auto_rickshaw: statuses(90, 20), metro: statuses(0, 42, 68) });
    // Warnings, not errors: directions without a walking route. Every vehicle route has its sources.
    expect([byCity.delhi.missingWalks.length, byCity.agra.missingWalks.length, byCity.jaipur.missingWalks.length]).toEqual([68, 72, 66]);
    expect(byCity.delhi.unsupportedRoutes).toEqual([]);
    expect(byCity.jaipur.unsupportedRoutes).toEqual([]);
    expect(byCity.agra.unsupportedRoutes).toEqual([]);
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
    const departing = departToNextCity(counted, counted.revision);
    expect(departing.occasion).toMatchObject({ kind: "depart", cityId: "delhi" });
    const agra = playToNextCity(departing);
    expect(agra.currentCityId).toBe("agra");
    expect(agra.travel.rideCounts).toEqual({});
    expect(validateGameState(JSON.parse(JSON.stringify(agra)))).toEqual(agra);
  });
});
