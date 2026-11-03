import { describe, expect, it } from "vitest";
import data from "../../content/journeys/catalog.json";
import { journeyCatalogSchema } from "./journey-catalog";
import { getJourney, getJourneyForCity } from "./journeys";

describe("journey catalog", () => {
  it("keeps the planned Indian cities ordered and separate from Milan", () => {
    const india = getJourney("golden_triangle")!;
    expect(india.status).toBe("preparing");
    expect(india.cities.map((city) => city.id)).toEqual(["delhi", "agra", "jaipur"]);
    expect(india.currency.code).toBe("INR");
    expect(india.initialBudget).toBe(30_000);
    expect(india.cityPlan).toEqual({ cityClearAp: 4, lodgingCost: 0, mainTourismCount: 4, dateCount: 6 });
    expect(india.initialState).toMatchObject({ ap: 0, pendingAp: 0, affection: 0, trust: 0, spark: 0, romanceStage: 1, confessionStatus: "none" });
    expect(getJourneyForCity("milano")?.currency.code).toBe("EUR");
    expect(getJourneyForCity("agra")?.id).toBe("golden_triangle");
    expect(getJourneyForCity("unknown")).toBeUndefined();
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
});
