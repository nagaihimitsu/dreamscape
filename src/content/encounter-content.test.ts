import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildContent } from "../../scripts/content-pipeline";
import { prepareContentFixture } from "./test-fixtures";

let fixture: string;
beforeEach(async () => {
  fixture = await mkdtemp(path.join(tmpdir(), "dreamscape-encounter-content-"));
  await prepareContentFixture(fixture);
});
afterEach(async () => { await rm(fixture, { recursive: true, force: true }); });

describe("encounter build integration", () => {
  it("rejects a missing item in the actual encounter catalog", async () => {
    const file = path.join(fixture, "content/encounters/catalog.json");
    const data = JSON.parse(await readFile(file, "utf8"));
    data.encounters.find((event: { id: string }) => event.id === "galleria_gift").options[0].giftItemId = "missing_item";
    await writeFile(file, JSON.stringify(data));
    await expect(buildContent(fixture, false)).rejects.toThrow("Unknown encounter item");
  }, 120000);

  it("rejects an unknown item referenced in encounter Ink", async () => {
    const file = path.join(fixture, "content/stories/encounters/galleria_outing_rewrite.ink");
    const source = await readFile(file, "utf8");
    expect(source).toContain('has_item_status("galleria_souvenir", "gifted")');
    await writeFile(file, source.replace('has_item_status("galleria_souvenir", "gifted")', 'has_item_status("missing_item", "gifted")'));
    await expect(buildContent(fixture, false)).rejects.toThrow("has_item_status requires a known literal item and status");
  }, 120000);

  it("rejects item queries in existing stories which do not receive inventory", async () => {
    const file = path.join(fixture, "content/stories/milano/sound_cafe_01.ink");
    const source = await readFile(file, "utf8");
    await writeFile(file, `${source}\n{has_item_status("galleria_souvenir", "gifted"): 持っています}\n`);
    await expect(buildContent(fixture, false)).rejects.toThrow("Item references are only supported in encounters: milano/sound_cafe_01");
  }, 120000);

  it("rejects an Ink item query belonging to another city", async () => {
    const catalogFile = path.join(fixture, "content/encounters/catalog.json");
    const catalog = JSON.parse(await readFile(catalogFile, "utf8"));
    catalog.items.push({ id: "foreign_item", cityId: "fixture_city", nameJa: "別の街の品", descriptionJa: "別の街で入手する品。" });
    await writeFile(catalogFile, JSON.stringify(catalog));
    // Register an actual second city, so this exercises a cross-city item
    // reference rather than merely an unknown-city error.
    const cityFile = path.join(fixture, "content/cities/milano.json");
    const city = JSON.parse(await readFile(cityFile, "utf8"));
    await writeFile(path.join(fixture, "content/cities/fixture_city.json"), JSON.stringify({
      ...city, id: "fixture_city", nameJa: "試験都市", landmarkIdsPlanned: [],
      firstClearReward: { rewardSourceId: "fixture_first_clear", ap: 1 },
    }));
    const journeyFile = path.join(fixture, "content/journeys/catalog.json");
    const journeyCatalog = JSON.parse(await readFile(journeyFile, "utf8"));
    journeyCatalog.journeys.find((entry: { id: string }) => entry.id === "milano").cities.push({ id: "fixture_city", nameJa: "試験都市" });
    await writeFile(journeyFile, JSON.stringify(journeyCatalog));
    const travel = JSON.parse(await readFile(path.join(fixture, "content/travel/milano.json"), "utf8"));
    const hotel = travel.places.find((place: { id: string }) => place.id === "p_hotel");
    const samePlaceRoute = travel.routes.find((route: { fromPlaceId: string; toPlaceId: string; mode: string }) =>
      route.fromPlaceId === "p_hotel" && route.toPlaceId === "p_hotel" && route.mode === "walk");
    await writeFile(path.join(fixture, "content/travel/fixture_city.json"), JSON.stringify({
      cityId: "fixture_city", places: [{ ...hotel, id: "fixture_hotel", cityId: "fixture_city", landmarkIds: [], destinationIds: [] }],
      routes: [{ ...samePlaceRoute, fromPlaceId: "fixture_hotel", toPlaceId: "fixture_hotel" }], events: [],
    }));
    const settings = JSON.parse(await readFile(path.join(fixture, "content/travel/milano-settings.json"), "utf8"));
    await writeFile(path.join(fixture, "content/travel/fixture_city-settings.json"), JSON.stringify({ ...settings, hotelPlaceId: "fixture_hotel" }));
    const storyFile = path.join(fixture, "content/stories/encounters/galleria_outing_rewrite.ink");
    const source = await readFile(storyFile, "utf8");
    expect(source).toContain('has_item_status("galleria_souvenir", "gifted")');
    await writeFile(storyFile, source.replace('has_item_status("galleria_souvenir", "gifted")', 'has_item_status("foreign_item", "gifted")'));
    await expect(buildContent(fixture, false)).rejects.toThrow("Encounter story item city mismatch: encounters/galleria_outing_rewrite/foreign_item");
  }, 120000);
});
