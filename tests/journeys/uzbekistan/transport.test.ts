// Uzbekistan's in-city transport (user decisions U1, U2, U6; research p4/transport-uzbekistan-luang-prabang.md):
// metro (Tashkent) + taxi; the city buses are not used; taxi fares follow the ride-hailing "Start" tariff formula
// (one car for two, rounded up to 1,000 UZS), the game minutes are kept.
import { describe, expect, it } from "vitest";
import { getCityContent } from "../../../src/content";
import { getJourney } from "../../../src/content/journeys";

const cities = ["tashkent", "samarkand", "bukhara", "khiva"] as const;
const minimumFare: Record<string, number> = { tashkent: 4600, samarkand: 4100, bukhara: 3700 };

describe("Uzbekistan transport", () => {
  it("declares metro and taxi (「タクシー」) besides walking", () => {
    expect(getJourney("uzbekistan")!.transportModes).toEqual([
      { id: "metro", nameJa: "地下鉄", movingJa: "地下鉄で移動中", kind: "rail" },
      { id: "taxi", nameJa: "タクシー", movingJa: "タクシーで移動中", kind: "car" },
    ]);
  });

  it("keeps the metro routes in Tashkent, the taxi routes of three cities, and no bus", () => {
    const count = (cityId: string, mode: string) => getCityContent(cityId).travel.routes.filter((route) => route.mode === mode).length;
    expect(cities.map((cityId) => [count(cityId, "metro"), count(cityId, "taxi"), count(cityId, "bus")]))
      .toEqual([[82, 110, 0], [0, 110, 0], [0, 66, 0], [0, 0, 0]]);
  });

  it.each(cities.filter((cityId) => cityId !== "khiva"))("prices %s taxis from the city's tariff page, rounded up to 1,000 UZS", (cityId) => {
    for (const route of getCityContent(cityId).travel.routes.filter((item) => item.mode === "taxi")) {
      expect(route.cost % 1000, `${route.fromPlaceId} → ${route.toPlaceId}`).toBe(0);
      expect(route.cost).toBeGreaterThanOrEqual(minimumFare[cityId]);
      const tariff = route.sources.find((source) => source.url === `https://taxi.yandex.uz/ru_uz/${cityId}/tariff/start/`);
      expect(tariff).toMatchObject({ claimType: "documented_fact", checkedAt: "2026-11-07" });
      expect(route.sources.some((source) => source.claimType === "hypothesis" && source.title === "タクシー料金の計算（配車アプリの料金表の式）")).toBe(true);
      // The old fixed per-minute fares are gone from every source.
      expect(route.sources.some((source) => /1分1000スム|走行分数×1000スム/u.test(source.claimJa))).toBe(false);
    }
  });
});
