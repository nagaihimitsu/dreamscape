import { describe, expect, it } from "vitest";
import { cityContents, getCityContent } from "../content";
import { installIndiaTestCities } from "../domain/multi-city-test-fixture";
import { loadGame, saveGame } from "../persistence";
import { prototypePreviewState } from "./prototype-preview-state";

describe("prototype city debug preview", () => {
  it.each(["delhi", "agra", "jaipur"])("uses %s's authored hotel and isolated India budget", (cityId) => {
    const { city, travelSettings } = getCityContent(cityId);
    expect(city.productionStatus).toBe("prototype");
    const state = prototypePreviewState(cityId);
    expect(state).toMatchObject({ currentCityId: cityId, travelBudget: 30_000, ap: 0,
      completedCityIds: [], memories: [], inventory: {},
      travel: { currentPlaceId: travelSettings.hotelPlaceId, hotelPlaceId: travelSettings.hotelPlaceId, day: 1, minute: 540 } });
    const data = new Map<string, string>();
    const storage = { getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => { data.set(key, value); } };
    expect(saveGame(storage, state)).toEqual({ ok: true });
    expect(loadGame(storage)).toEqual({ status: "loaded", state });
  });

  it("restores every registered city after a temporary fictional scene session", () => {
    const actual = ["delhi", "agra", "jaipur"].map((id) => cityContents[id]);
    const cleanup = installIndiaTestCities();
    try {
      for (const [index, id] of ["delhi", "agra", "jaipur"].entries()) {
        expect(cityContents[id]).not.toBe(actual[index]);
        expect(cityContents[id].city.nameJa).toContain("仮データ");
      }
    } finally { cleanup(); }
    for (const [index, id] of ["delhi", "agra", "jaipur"].entries()) expect(cityContents[id]).toBe(actual[index]);
  });
});
