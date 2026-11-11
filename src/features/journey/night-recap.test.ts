// The night's recap (2026-11-11 user decision; NightScreen, NightRest): today's route on a small map, its stops in words,
// and the heroine's line of the night from the city's optional nightLinesJa (the sample journey writes three).
import { describe, expect, it } from "vitest";
import { getCityContent } from "../../content";
import { cityStart } from "../../dev/scenario-builders";
import type { GameState } from "../../domain/game";
import { hasNightRecap, nightRecap, routeMarks, routeSentenceJa } from "./night-recap";

const SAMPLE = "mihon";
const at = (state: GameState, day: number, todayPlaceIds: string[]): GameState =>
  ({ ...state, travel: { ...state.travel, day, todayPlaceIds } });

describe("what the night shows under its line", () => {
  it("names today's stops as the screens do (the hotel is 「滞在先のホテル」) and the night line of the day", () => {
    const start = cityStart(SAMPLE, ["航", "澪"]);
    const { travel } = getCityContent(SAMPLE);
    const lines = travel.nightLinesJa!;
    expect(lines.length).toBeGreaterThan(1);
    const recap = nightRecap(at(start, 1, ["mihon_clock_tower", "mihon_market"]));
    expect(recap.route.map((stop) => [stop.place.id, stop.nameJa])).toEqual([
      ["mihon_hotel", "滞在先のホテル"], ["mihon_clock_tower", "見本の時計塔"], ["mihon_market", "見本の朝市"],
    ]);
    expect(recap).toMatchObject({ line: lines[0], heroineName: "澪", cityId: SAMPLE });
    expect(nightRecap(at(start, 2, [])).line).toBe(lines[1]);
    expect(nightRecap(at(start, lines.length + 1, [])).line).toBe(lines[0]);
    expect(routeSentenceJa(recap.route)).toBe("今日の道のり：滞在先のホテル、見本の時計塔、見本の朝市。");
  });

  it("shows no map when the party stayed at the hotel, and no line in a city without night lines", () => {
    const stayed = nightRecap(cityStart(SAMPLE));
    expect(stayed.route).toEqual([]);
    expect(stayed.line).not.toBeNull();
    expect(hasNightRecap(stayed)).toBe(true);
    const milan = nightRecap(cityStart("milano"));
    expect(getCityContent("milano").travel.nightLinesJa).toBeUndefined();
    expect(milan).toMatchObject({ route: [], line: null });
    expect(hasNightRecap(milan)).toBe(false);
    expect(hasNightRecap(undefined)).toBe(false);
    expect(routeSentenceJa([])).toBe("");
  });

  it("fills the names set into a night line", () => {
    const { travel } = getCityContent(SAMPLE);
    const written = travel.nightLinesJa;
    travel.nightLinesJa = ["{player_name}、おやすみ。{heroine_name}は先に眠るね"];
    try {
      expect(nightRecap(cityStart(SAMPLE, ["航", "澪"])).line).toBe("航、おやすみ。澪は先に眠るね");
    } finally {
      travel.nightLinesJa = written;
    }
  });

  it("marks each place once on the map, with its stops' numbers, and rings the day's last place", () => {
    const recap = nightRecap(at(cityStart(SAMPLE), 1, ["mihon_clock_tower", "mihon_hotel", "mihon_library"]));
    expect(routeMarks(recap.route).map(({ place, label, last }) => [place.id, label, last])).toEqual([
      ["mihon_hotel", "1・3", false], ["mihon_clock_tower", "2", false], ["mihon_library", "4", true],
    ]);
  });
});
