import { describe, expect, it } from "vitest";
import data from "./generated/content/journeys/catalog.json";
import { journeyCatalogSchema } from "./journey-catalog";
import { defaultJourneyId, getJourney, getJourneyForCity, journeys } from "./journeys";

describe("journey catalog", () => {
  it("keeps the playable Indian cities ordered and separate from Milan", () => {
    const india = getJourney("golden_triangle")!;
    expect(india.status).toBe("available");
    expect(india.cities.map((city) => city.id)).toEqual(["delhi", "agra", "jaipur"]);
    expect(india.currency.code).toBe("INR");
    // Generous until the final balance pass sets the real amount (user decision 2026-11-09).
    expect(india.initialBudget).toBe(3_000_000);
    expect(india.cityPlan).toEqual({ cityClearAp: 4, lodgingCost: 0, mainTourismCount: 4, dateCount: 6 });
    expect(india.initialState).toMatchObject({ ap: 0, pendingAp: 0, affection: 0, trust: 0, spark: 0, romanceStage: 1, confessionStatus: "none" });
    expect(getJourneyForCity("milano")?.currency.code).toBe("EUR");
    expect(getJourneyForCity("agra")?.id).toBe("golden_triangle");
    expect(getJourneyForCity("unknown")).toBeUndefined();
  });

  it("starts with the first available journey in manifest order", () => {
    expect(defaultJourneyId).toBe(journeys.find((journey) => journey.status === "available")!.id);
    expect(defaultJourneyId).toBe("milano");
  });

  it("rejects duplicate journeys and cities owned by multiple journeys", () => {
    const copy = structuredClone(data);
    copy.journeys[1].id = copy.journeys[0].id;
    expect(journeyCatalogSchema.safeParse(copy).success).toBe(false);
    const duplicateCity = structuredClone(data);
    duplicateCity.journeys[1].cities[0].id = "milano";
    expect(journeyCatalogSchema.safeParse(duplicateCity).success).toBe(false);
    const invalidInitial = structuredClone(data);
    invalidInitial.journeys[1].initialState!.confessionStatus = "accepted";
    expect(journeyCatalogSchema.safeParse(invalidInitial).success).toBe(false);
  });

  it("accepts optional title art: a served image, its caption and an optional focal point", () => {
    const withArt = (titleArt: unknown) => {
      const copy = structuredClone(data) as { journeys: Record<string, unknown>[] };
      copy.journeys[0].titleArt = titleArt;
      return journeyCatalogSchema.safeParse(copy);
    };
    // Only India has art (its Taj Mahal photo, #54); the other journeys' title shows the shared default background.
    expect(journeys.filter((journey) => journey.titleArt).map((journey) => [journey.id, journey.titleArt])).toEqual([
      ["golden_triangle", { imagePath: "assets/tourism/india/agra_taj_mahal.webp", captionJa: "アーグラ ／ タージ・マハル" }],
    ]);
    expect(withArt({ imagePath: "assets/title/milano.webp", captionJa: "ミラノ ／ 運河の午後" }).success).toBe(true);
    expect(withArt({ imagePath: "assets/title/milano.jpg", captionJa: "ミラノ", imagePosition: { x: 70, y: 40 } }).success).toBe(true);
    for (const invalid of [
      { imagePath: "assets/title/milano.webp" },
      { imagePath: "assets/title/milano.webp", captionJa: " " },
      { imagePath: "title/milano.webp", captionJa: "ミラノ" },
      { imagePath: "assets/../milano.webp", captionJa: "ミラノ" },
      { imagePath: "assets/title/milano.gif", captionJa: "ミラノ" },
      { imagePath: "assets/title/milano.webp", captionJa: "ミラノ", imagePosition: { x: 120, y: 40 } },
      { imagePath: "assets/title/milano.webp", captionJa: "ミラノ", backgroundId: "milano_cafe" },
    ]) expect(withArt(invalid).success, JSON.stringify(invalid)).toBe(false);
  });
});
