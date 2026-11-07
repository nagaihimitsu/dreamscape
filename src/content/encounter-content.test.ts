import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildContent } from "../../scripts/content-pipeline";
import { changeCatalogEntry, prepareContentFixture, storySourceFile } from "./test-fixtures";

let fixture: string;
beforeEach(async () => {
  fixture = await mkdtemp(path.join(tmpdir(), "dreamscape-encounter-content-"));
  await prepareContentFixture(fixture);
});
afterEach(async () => { await rm(fixture, { recursive: true, force: true }); });

/** The Castello pick encounter's story (no published Ink asks about an item, so the tests add the query). */
const PICK_STORY = "encounters/sound_castello_pick";
/** The story with an Ink item query (`has_item_status`) on the item, before its last line. */
function withItemQuery(source: string, itemId: string): string {
  expect(source).not.toContain("has_item_status");
  const end = source.lastIndexOf("-> END");
  return `EXTERNAL has_item_status(id, status)\n${source.slice(0, end)}{has_item_status("${itemId}", "held"): ピックはまだ手元にある。}\n${source.slice(end)}`;
}

describe("encounter build integration", () => {
  it("rejects a missing item in the actual encounter catalog", async () => {
    await changeCatalogEntry(fixture, "encounters/catalog.json", "encounters", "castello_pick", (event) => {
      event.options[0].giftItemId = "missing_item";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow("Unknown encounter item");
  }, 120000);

  it("rejects an item icon that no public folder serves", async () => {
    await changeCatalogEntry(fixture, "encounters/catalog.json", "items", "blue_pick", (item) => {
      item.iconPath = "assets/items/missing.svg";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow("encounter item blue_pick: Missing public file: assets/items/missing.svg (searched public/ and content/journeys/milano/public/)");
  }, 120000);

  it("rejects an unknown item referenced in encounter Ink", async () => {
    const file = path.join(fixture, storySourceFile(PICK_STORY));
    await writeFile(file, withItemQuery(await readFile(file, "utf8"), "missing_item"));
    await expect(buildContent(fixture, false)).rejects.toThrow("has_item_status requires a known literal item and status");
  }, 120000);

  it("accepts a known item of the encounter's own city referenced in encounter Ink", async () => {
    const file = path.join(fixture, storySourceFile(PICK_STORY));
    await writeFile(file, withItemQuery(await readFile(file, "utf8"), "blue_pick"));
    await expect(buildContent(fixture, false)).resolves.toBeDefined();
  }, 120000);

  it("rejects item queries in existing stories which do not receive inventory", async () => {
    const file = path.join(fixture, storySourceFile("milano/sound_cafe_01"));
    const source = await readFile(file, "utf8");
    await writeFile(file, `${source}\n{has_item_status("blue_pick", "gifted"): 持っています}\n`);
    await expect(buildContent(fixture, false)).rejects.toThrow("Item references are only supported in encounters: milano/sound_cafe_01");
  }, 120000);

  it("rejects an Ink item query belonging to another city", async () => {
    // The foreign item sits next to the Milan items.
    await changeCatalogEntry(fixture, "encounters/catalog.json", "items", "blue_pick", (_item, catalog) => {
      catalog.items.push({ id: "foreign_item", cityId: "fixture_city", nameJa: "別の街の品", descriptionJa: "別の街で入手する品。" });
    });
    // Register an actual second city, so this exercises a cross-city item
    // reference rather than merely an unknown-city error. It is still being
    // made (prototype): a complete city would need its own episodes and finale.
    const cityFile = path.join(fixture, "content/journeys/milano/cities/milano.json");
    const city = JSON.parse(await readFile(cityFile, "utf8"));
    await writeFile(path.join(fixture, "content/journeys/milano/cities/fixture_city.json"), JSON.stringify({
      ...city, id: "fixture_city", nameJa: "試験都市", landmarkIdsPlanned: [], productionStatus: "prototype",
      firstClearReward: { rewardSourceId: "fixture_first_clear", ap: 1 },
    }));
    const journeyFile = path.join(fixture, "content/journeys/milano/manifest.json");
    const journeyManifest = JSON.parse(await readFile(journeyFile, "utf8"));
    journeyManifest.cities.push({ id: "fixture_city", nameJa: "試験都市" });
    await writeFile(journeyFile, JSON.stringify(journeyManifest));
    const travel = JSON.parse(await readFile(path.join(fixture, "content/journeys/milano/travel/milano.json"), "utf8"));
    const hotel = travel.places.find((place: { id: string }) => place.id === "p_hotel");
    const samePlaceRoute = travel.routes.find((route: { fromPlaceId: string; toPlaceId: string; mode: string }) =>
      route.fromPlaceId === "p_hotel" && route.toPlaceId === "p_hotel" && route.mode === "walk");
    await writeFile(path.join(fixture, "content/journeys/milano/travel/fixture_city.json"), JSON.stringify({
      cityId: "fixture_city", places: [{ ...hotel, id: "fixture_hotel", cityId: "fixture_city", landmarkIds: [], destinationIds: [] }],
      routes: [{ ...samePlaceRoute, fromPlaceId: "fixture_hotel", toPlaceId: "fixture_hotel" }], events: [],
    }));
    const settings = JSON.parse(await readFile(path.join(fixture, "content/journeys/milano/travel/milano-settings.json"), "utf8"));
    await writeFile(path.join(fixture, "content/journeys/milano/travel/fixture_city-settings.json"), JSON.stringify({ ...settings, hotelPlaceId: "fixture_hotel" }));
    const storyFile = path.join(fixture, storySourceFile(PICK_STORY));
    await writeFile(storyFile, withItemQuery(await readFile(storyFile, "utf8"), "foreign_item"));
    await expect(buildContent(fixture, false)).rejects.toThrow(`Encounter story item city mismatch: ${PICK_STORY}/foreign_item`);
  }, 120000);
});
