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
    const file = path.join(fixture, "content/stories/encounters/galleria_outing.ink");
    const source = await readFile(file, "utf8");
    expect(source).toContain('has_item_status("galleria_souvenir", "gifted")');
    await writeFile(file, source.replace('has_item_status("galleria_souvenir", "gifted")', 'has_item_status("missing_item", "gifted")'));
    await expect(buildContent(fixture, false)).rejects.toThrow("has_item_status requires a known literal item and status");
  }, 120000);

  it("rejects item queries in existing stories which do not receive inventory", async () => {
    const file = path.join(fixture, "content/stories/milano/cafe_01.ink");
    const source = await readFile(file, "utf8");
    await writeFile(file, `${source}\n{has_item_status("galleria_souvenir", "gifted"): 持っています}\n`);
    await expect(buildContent(fixture, false)).rejects.toThrow("Item references are only supported in encounters: milano/cafe_01");
  }, 120000);

  it("rejects an Ink item query belonging to another city", async () => {
    const catalogFile = path.join(fixture, "content/encounters/catalog.json");
    const catalog = JSON.parse(await readFile(catalogFile, "utf8"));
    catalog.items.push({ id: "foreign_item", cityId: "fixture_city", nameJa: "別の街の品", descriptionJa: "別の街で入手する品。" });
    await writeFile(catalogFile, JSON.stringify(catalog));
    const journeyFile = path.join(fixture, "content/progression/journey.json");
    const journey = JSON.parse(await readFile(journeyFile, "utf8"));
    journey.episodes.push({ ...journey.episodes[0], id: "fixture_episode", cityId: "fixture_city" });
    await writeFile(journeyFile, JSON.stringify(journey));
    const storyFile = path.join(fixture, "content/stories/encounters/galleria_outing.ink");
    const source = await readFile(storyFile, "utf8");
    expect(source).toContain('has_item_status("galleria_souvenir", "gifted")');
    await writeFile(storyFile, source.replace('has_item_status("galleria_souvenir", "gifted")', 'has_item_status("foreign_item", "gifted")'));
    await expect(buildContent(fixture, false)).rejects.toThrow("Encounter story item city mismatch: encounters/galleria_outing/foreign_item");
  }, 120000);
});
