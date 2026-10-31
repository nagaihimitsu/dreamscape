import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { buildContent } from "../../scripts/content-pipeline";
import { prepareContentFixture } from "./test-fixtures";

type Destination = {
  id: string; cityId: string; backgroundAssetId: string;
  facts: { publisher: string; title: string; url: string; checkedAt: string; claimType: string; claimJa: string }[];
};
type DateEntry = { id: string; destinationId?: string; chapterId: string; backgroundAssetId: string; requiredCompletedEpisodeIds?: string[] };
let fixture: string;
beforeEach(async () => {
  fixture = await mkdtemp(path.join(tmpdir(), "dreamscape-date-destination-"));
  await prepareContentFixture(fixture);
});
afterEach(async () => { await rm(fixture, { recursive: true, force: true }); });

async function editDestinations(change: (items: Destination[]) => void) {
  const file = path.join(fixture, "content/romance/date_destinations.json");
  const catalog = JSON.parse(await readFile(file, "utf8")) as { destinations: Destination[] };
  change(catalog.destinations);
  await writeFile(file, JSON.stringify(catalog));
}
async function editDates(change: (items: DateEntry[]) => void) {
  const file = path.join(fixture, "content/romance/date_catalog.json");
  const catalog = JSON.parse(await readFile(file, "utf8")) as { dates: DateEntry[] };
  change(catalog.dates);
  await writeFile(file, JSON.stringify(catalog));
}
const scala = (dates: DateEntry[]) => dates.find((date) => date.id === "milano_la_scala_date_01")!;

describe("date destination content references", () => {
  it("accepts the three places without making them tourism/battle landmarks", async () => {
    const result = await buildContent(fixture, false);
    for (const id of ["milano_la_scala", "milano_brera", "milano_navigli"])
      expect(result.tourism.landmarks.some((landmark) => landmark.id === id)).toBe(false);
  });

  it("rejects duplicate destination IDs", async () => {
    await editDestinations((items) => { items.push({ ...items[0] }); });
    await expect(buildContent(fixture, false)).rejects.toThrow("Duplicate date destination ID");
  });

  it("rejects an unknown destination and a city mismatch", async () => {
    await editDates((items) => { scala(items).destinationId = "missing_destination"; });
    await expect(buildContent(fixture, false)).rejects.toThrow("Unknown date destination");
    await editDates((items) => { scala(items).destinationId = "milano_la_scala"; scala(items).chapterId = "unknown_city"; });
    await expect(buildContent(fixture, false)).rejects.toThrow("Date destination city mismatch");
  });

  it("rejects an unregistered background and a date/destination background mismatch", async () => {
    await editDestinations((items) => { items[0].backgroundAssetId = "missing_background"; });
    await expect(buildContent(fixture, false)).rejects.toThrow("Unknown date destination background");
    await editDestinations((items) => { items[0].backgroundAssetId = "milano_la_scala_date"; });
    await editDates((items) => { scala(items).backgroundAssetId = "milano_cafe"; });
    await expect(buildContent(fixture, false)).rejects.toThrow("Date destination background mismatch");
  });

  it("rejects malformed source URL, date and claim classification", async () => {
    await editDestinations((items) => { items[0].facts[0].url = "not-a-url"; });
    await expect(buildContent(fixture, false)).rejects.toThrow();
    await editDestinations((items) => { items[0].facts[0].url = "https://example.org"; items[0].facts[0].checkedAt = "not-a-date"; });
    await expect(buildContent(fixture, false)).rejects.toThrow();
    await editDestinations((items) => { items[0].facts[0].checkedAt = "2026-11-01"; items[0].facts[0].claimType = "unknown"; });
    await expect(buildContent(fixture, false)).rejects.toThrow();
  });

  it("rejects a reference to an unknown episode prerequisite", async () => {
    await editDates((items) => { scala(items).requiredCompletedEpisodeIds = ["missing_episode"]; });
    await expect(buildContent(fixture, false)).rejects.toThrow("Unknown date prerequisite episode");
  });
});
