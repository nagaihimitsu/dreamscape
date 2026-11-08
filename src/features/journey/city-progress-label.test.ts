import { describe, expect, it } from "vitest";
import { cityProgressParts, formatCityProgress } from "./city-progress-label";

describe("city progress pill", () => {
  const counts = { completedStops: 1, stops: 3, completedSpecialBattles: 0, specialBattles: 2, cityCompleted: false };

  it("counts tourism stops and the city's special battles", () => {
    expect(formatCityProgress(counts)).toBe("観光 1 / 3 · 対決 0 / 2");
    expect(cityProgressParts(counts)).toEqual([
      { kind: "tourism", text: "観光 1 / 3" },
      { kind: "battles", text: "対決 0 / 2" },
    ]);
  });

  it("leaves the battle count out in a city without special battles", () => {
    expect(formatCityProgress({ ...counts, specialBattles: 0 })).toBe("観光 1 / 3");
    expect(cityProgressParts({ ...counts, specialBattles: 0 })).toEqual([{ kind: "tourism", text: "観光 1 / 3" }]);
  });

  it("shows only the clear once the city is completed", () => {
    expect(formatCityProgress({ ...counts, cityCompleted: true })).toBe("都市クリア");
    expect(cityProgressParts({ ...counts, cityCompleted: true })).toEqual([{ kind: "cleared", text: "都市クリア" }]);
  });
});
