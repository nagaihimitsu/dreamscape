import { describe, expect, it } from "vitest";
import milanoData from "../src/content/generated/content/cities/milano.json";
import delhiData from "../src/content/generated/content/cities/delhi.json";
import agraData from "../src/content/generated/content/cities/agra.json";
import jaipurData from "../src/content/generated/content/cities/jaipur.json";
import journeyData from "../src/content/generated/content/journeys/catalog.json";
import { citySchema } from "../src/content/schemas";
import { journeyCatalogSchema } from "../src/content/journey-catalog";
import { validateCityLinks } from "./city-links";

describe("registered city links", () => {
  it("accepts a completed first city followed by an unpublished prototype", () => {
    const cities = [milanoData, delhiData, agraData, jaipurData].map((data) => citySchema.parse(data));
    cities.find((city) => city.id === "delhi")!.productionStatus = "complete";
    const catalog = journeyCatalogSchema.parse(journeyData);
    catalog.journeys.find((journey) => journey.id === "golden_triangle")!.status = "available";
    expect(() => validateCityLinks(cities, catalog)).not.toThrow();
    cities.find((city) => city.id === "delhi")!.nextCityId = "jaipur";
    expect(() => validateCityLinks(cities, catalog)).toThrow(/Unknown or incomplete next city|outside the journey order/);
  });
});
