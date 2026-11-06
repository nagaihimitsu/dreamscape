import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { citySchema } from "../../../src/content/schemas";
import { travelCatalogSchema, travelSettingsSchema } from "../../../src/content/travel-schemas";
import { getJourney } from "../../../src/content/journeys";
import { tourismSourceSchema } from "../../../src/content/tourism-schemas";
import { readResearchCsv } from "./india-research-csv";
import { buildIndiaDraft, indiaDraftDirectory, serializeIndiaDraft } from "./india-draft";

describe("Golden Triangle authoring draft", () => {
  it("is reproducible from the archived research and current journey policy", () => {
    const files = buildIndiaDraft();
    expect(Object.keys(files)).toHaveLength(10);
    for (const [file, value] of Object.entries(files)) {
      expect(readFileSync(path.join(indiaDraftDirectory, file), "utf8")).toBe(serializeIndiaDraft(value));
    }
  });

  it("uses the Milan schemas without exposing unverified walking as routes", () => {
    const draft = buildIndiaDraft();
    const journey = getJourney("golden_triangle")!;
    const counts = { main: 0, date: 0, walk: 0, taxi: 0 };
    for (const [index, id] of ["delhi", "agra", "jaipur"].entries()) {
      const city = citySchema.parse(draft[`cities/${id}.json`]);
      const travel = travelCatalogSchema.parse(draft[`travel/${id}.json`]);
      const settings = travelSettingsSchema.parse(draft[`travel/${id}-settings.json`]);
      expect(city.productionStatus).toBe("prototype");
      expect(city.firstClearReward).toEqual({ rewardSourceId: `${id}_legacy_episode_placeholder`, ap: 0 });
      expect(settings.initialBudget).toBe(index === 0 ? journey.initialBudget : 0);
      expect(settings.lodgingCost).toBe(journey.cityPlan!.lodgingCost);
      expect(travel.places).toHaveLength(11);
      expect(travel.events.filter((event) => event.category === "main")).toHaveLength(journey.cityPlan!.mainTourismCount);
      expect(travel.events.filter((event) => event.category === "date")).toHaveLength(journey.cityPlan!.dateCount);
      for (const event of travel.events) counts[event.category]++;
      for (const route of travel.routes) {
        if (route.mode === "walk") {
          counts.walk++;
          expect(route.fromPlaceId).toBe(route.toPlaceId);
          expect(route.minutes).toBe(0);
        }
        if (route.mode === "taxi") {
          counts.taxi++;
          expect(route.sources.every((source) => source.claimType === "hypothesis")).toBe(true);
        }
      }
      for (const place of travel.places.filter((place) => place.id !== settings.hotelPlaceId)) {
        expect(place.openingWindows?.every((window) => window.end <= 21 * 60)).toBe(true);
      }
    }
    expect(counts).toEqual({ main: 12, date: 18, walk: 33, taxi: 330 });
    expect(draft["manifest.json"]).toMatchObject({ status: "authoring_draft_only", cityOrder: ["delhi", "agra", "jaipur"] });
  });

  it("includes each follow-up citation once without substituting game values", () => {
    const draft = buildIndiaDraft();
    const places = ["delhi", "agra", "jaipur"].flatMap((cityId) =>
      travelCatalogSchema.parse(draft[`travel/${cityId}.json`]).places);
    const byId = new Map(places.map((place) => [place.id, place]));
    for (const name of ["venues", "access"]) {
      const file = path.resolve(`authoring/journeys/golden_triangle/research/golden-triangle-followup-20261103/${name}.json`);
      const followup = JSON.parse(readFileSync(file, "utf8")) as { records: { placeId: string; sources: unknown[] }[] };
      expect(followup.records.length).toBeGreaterThan(0);
      for (const record of followup.records) {
        const place = byId.get(record.placeId);
        expect(place, `Missing draft place ${record.placeId}`).toBeDefined();
        for (const item of record.sources) expect(place!.sources).toContainEqual(tourismSourceSchema.parse(item));
      }
    }
    for (const place of places) {
      const keys = place.sources.map((source) => JSON.stringify([source.publisher, source.title, source.url, source.checkedAt, source.claimType, source.claimJa]));
      expect(new Set(keys).size, `Duplicate citation in ${place.id}`).toBe(keys.length);
    }
    const canonical = path.resolve("authoring/journeys/golden_triangle/research/golden-triangle-all-research-20261103/source/canonical");
    const time = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
    for (const row of readResearchCsv(canonical, "08_OPENING_HOURS_30.csv")) {
      expect(byId.get(row.placeId)?.openingWindows).toEqual([{ start: time(row.gameWindowStart_NOT_REAL_WORLD_CLAIM), end: time(row.gameWindowEnd_NOT_REAL_WORLD_CLAIM) }]);
    }
  });
});
