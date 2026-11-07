import { describe, expect, it } from "vitest";
import { cityContents, episodes, getCityContent } from "../content";
import { journeys } from "../content/journeys";
import { installJourneyTestCities, installPreparingJourneyTestCities } from "./test-cities";
import { loadGame, saveGame } from "../persistence";
import { prototypePreviewState } from "./prototype-preview-state";

describe("prototype city debug preview", () => {
  const prototypeCityIds = ["tashkent", "samarkand", "bukhara", "khiva"];
  it.each(prototypeCityIds)("uses %s's authored hotel and isolated journey budget", (cityId) => {
    const { city, travelSettings } = getCityContent(cityId);
    expect(city.productionStatus).toBe("prototype");
    const state = prototypePreviewState(cityId);
    expect(state).toMatchObject({ currentCityId: cityId, travelBudget: 4_000_000, ap: 0,
      completedCityIds: [], memories: [], inventory: {},
      travel: { currentPlaceId: travelSettings.hotelPlaceId, hotelPlaceId: travelSettings.hotelPlaceId, day: 1, minute: 540 } });
    const data = new Map<string, string>();
    const storage = { getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => { data.set(key, value); } };
    expect(saveGame(storage, state)).toEqual({ ok: true });
    expect(loadGame(storage)).toEqual({ status: "loaded", state });
  });

  it("restores every registered city after a temporary fictional scene session", () => {
    const actual = prototypeCityIds.map((id) => cityContents[id]);
    const cleanup = installJourneyTestCities("uzbekistan");
    try {
      for (const [index, id] of prototypeCityIds.entries()) {
        expect(cityContents[id]).not.toBe(actual[index]);
        expect(cityContents[id].city.nameJa).toContain("仮データ");
      }
    } finally { cleanup(); }
    for (const [index, id] of prototypeCityIds.entries()) expect(cityContents[id]).toBe(actual[index]);
  });

  it("Debug's fictional scenes skip a preparing journey that already has an authored episode", () => {
    const preparing = journeys.filter((journey) => journey.status === "preparing");
    expect(preparing.map((journey) => journey.id)).toEqual(expect.arrayContaining(["uzbekistan", "luang_prabang"]));
    const actual = { tashkent: cityContents.tashkent, luang_prabang: cityContents.luang_prabang };
    // Pretend Uzbekistan's first city got its first real episode while the journey is still preparing.
    episodes.push({ ...structuredClone(episodes[0]), id: "tashkent_authored_episode", cityId: "tashkent" });
    try {
      const cleanup = installPreparingJourneyTestCities();
      try {
        expect(cityContents.tashkent).toBe(actual.tashkent);
        expect(cityContents.luang_prabang).not.toBe(actual.luang_prabang);
        expect(cityContents.luang_prabang.city.nameJa).toContain("仮データ");
      } finally { cleanup(); }
    } finally { episodes.pop(); }
    expect(cityContents.luang_prabang).toBe(actual.luang_prabang);
    // Without the episode, both preparing journeys get their fictional cities again.
    const cleanup = installPreparingJourneyTestCities();
    try {
      expect(cityContents.tashkent.city.nameJa).toContain("仮データ");
    } finally { cleanup(); }
    expect(cityContents.tashkent).toBe(actual.tashkent);
  });

  it("does not replace authored India with fictional scenes", () => {
    const original = cityContents.delhi;
    expect(() => installJourneyTestCities("golden_triangle")).toThrow("制作中の旅行編ではありません: golden_triangle");
    expect(() => prototypePreviewState("delhi")).toThrow(/制作中の都市ではありません/);
    expect(cityContents.delhi).toBe(original);
  });
});
