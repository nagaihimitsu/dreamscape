import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { buildContent } from "../../scripts/content-pipeline";
import { changeCatalogEntry, prepareContentFixture } from "./test-fixtures";
import { dateDestinationSchema } from "./date-destinations";
import destinationData from "./generated/content/romance/date_destinations.json";

type Destination = {
  id: string; cityId: string; backgroundId: string;
  facts: { publisher: string; title: string; url: string; checkedAt: string; claimType: string; claimJa: string }[];
};
type DateEntry = {
  id: string; destinationId?: string;
  chapterId: string; backgroundId: string; when?: unknown;
};
let fixture: string;
beforeEach(async () => {
  fixture = await mkdtemp(path.join(tmpdir(), "dreamscape-date-destination-"));
  await prepareContentFixture(fixture);
});
afterEach(async () => { await rm(fixture, { recursive: true, force: true }); });

// Each change starts again from the repository's copy of the layer file that
// holds the entry, so every edit below makes exactly one defect.
const editScalaDestination = (change: (destination: Destination, catalog: { destinations: Destination[] }) => void) =>
  changeCatalogEntry<Destination>(fixture, "romance/date_destinations.json", "destinations", "milano_la_scala", change);
const editScalaDate = (change: (date: DateEntry) => void) =>
  changeCatalogEntry<DateEntry>(fixture, "romance/date_catalog.json", "dates", "milano_la_scala_date_01", change);

describe("date destination content references", () => {
  it("validates optional, clearly labelled HTTPS references for destination photos", () => {
    const novecento = destinationData.destinations.find((item) => item.id === "milano_novecento")!;
    expect(dateDestinationSchema.safeParse(novecento).success).toBe(true);
    const reference = novecento.referenceImage!;
    expect(reference).toBeDefined();
    expect(dateDestinationSchema.safeParse({ ...novecento, referenceImage: { ...reference, url: "javascript:alert(1)" } }).success).toBe(false);
    expect(dateDestinationSchema.safeParse({ ...novecento, referenceImage: { ...reference, url: "http://example.org" } }).success).toBe(false);
    expect(dateDestinationSchema.safeParse({ ...novecento, referenceImage: { ...reference, backgroundNoteJa: "" } }).success).toBe(false);
    expect(dateDestinationSchema.safeParse({ ...novecento, referenceImage: undefined }).success).toBe(true);
  });

  it("accepts the three places without making them tourism/battle landmarks", async () => {
    const result = await buildContent(fixture, false);
    for (const id of ["milano_la_scala", "milano_brera", "milano_navigli"])
      expect(result.tourism.landmarks.some((landmark) => landmark.id === id)).toBe(false);
  });

  it("rejects duplicate destination IDs", async () => {
    await editScalaDestination((destination, catalog) => { catalog.destinations.push({ ...destination }); });
    await expect(buildContent(fixture, false)).rejects.toThrow("Duplicate date destination ID");
  });

  it("rejects an unknown destination and a city mismatch", async () => {
    await editScalaDate((date) => { date.destinationId = "missing_destination"; });
    await expect(buildContent(fixture, false)).rejects.toThrow("Unknown date destination");
    await editScalaDate((date) => { expect(date.destinationId).toBe("milano_la_scala"); date.chapterId = "unknown_city"; });
    await expect(buildContent(fixture, false)).rejects.toThrow("Date destination city mismatch");
  });

  it("rejects an unregistered background and a date/destination background mismatch", async () => {
    await editScalaDestination((destination) => { destination.backgroundId = "missing_background"; });
    await expect(buildContent(fixture, false)).rejects.toThrow("Unknown date destination background");
    // Back to the repository's destination (its own background), then a date with another background.
    await editScalaDestination((destination) => { expect(destination.backgroundId).toBe("milano_la_scala_date"); });
    await editScalaDate((date) => { date.backgroundId = "milano_cafe"; });
    await expect(buildContent(fixture, false)).rejects.toThrow("Date destination background mismatch");
  });

  it("rejects malformed source URL, date and claim classification", async () => {
    await editScalaDestination((destination) => { destination.facts[0].url = "not-a-url"; });
    await expect(buildContent(fixture, false)).rejects.toThrow(/url[\s\S]*Invalid URL/);
    await editScalaDestination((destination) => { destination.facts[0].checkedAt = "not-a-date"; });
    await expect(buildContent(fixture, false)).rejects.toThrow(/checkedAt[\s\S]*Invalid ISO date/);
    await editScalaDestination((destination) => { destination.facts[0].claimType = "unknown"; });
    await expect(buildContent(fixture, false)).rejects.toThrow(/claimType[\s\S]*Invalid option/);
  });

  it("rejects a reference to an unknown episode in the date's condition", async () => {
    await editScalaDate((date) => { date.when = { episodeCompleted: "missing_episode" }; });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Unknown episode in a condition of date milano_la_scala_date_01 (when): missing_episode");
  });
});
