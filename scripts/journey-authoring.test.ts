import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadIndiaReadiness } from "./india-readiness";
import { loadIndiaScaffold } from "./india-scaffold";
import { getJourneyAuthoringProfile } from "./journey-authoring";
import { inspectJourneyReadiness } from "./journey-readiness";
import { buildJourneyFragments, journeyRequirements, type JourneyScaffoldInput } from "./journey-scaffold";
import { journeyInputFingerprint, journeyReleaseChanges, writeJourneyReleaseFiles } from "./promote-journey";

const ids = ["tashkent", "samarkand", "bukhara", "khiva"];
// Only test fixtures: cloning India here avoids shipping invented Uzbek scenarios.
function renamed<T>(value: T, cityId: string): T {
  return JSON.parse(JSON.stringify(value).replaceAll("gt_delhi", `uz_${cityId}`).replaceAll("delhi", cityId));
}
function scaffoldFixture(): JourneyScaffoldInput {
  const source = loadIndiaScaffold(process.cwd());
  const city = source.cities.find((item) => item.cityId === "delhi")!;
  const planned = source.plannedLandmarks.delhi;
  return {
    eventPrefix: "uz", cityClearAp: source.cityClearAp,
    cities: ids.map((id) => renamed(city, id)),
    plannedLandmarks: Object.fromEntries(ids.map((id) => [id, renamed(planned, id)])),
    observations: ids.flatMap((id) => renamed(source.observations.filter((clue) => planned.includes(clue.landmarkId)), id)),
    destinations: ids.flatMap((id) => renamed(source.destinations.filter((entry) => entry.cityId === "delhi"), id)),
    imageAssetIds: Object.fromEntries(ids.flatMap((id) => renamed(planned, id).map((landmark, index) => [landmark, `${id}_test_photo_${index}`]))),
  };
}
const uzbekManifest = "content/journeys/uzbekistan/manifest.json";
function releaseFixture() {
  const root = mkdtempSync(path.join(tmpdir(), "dreamscape-journey-release-test-"));
  const manifest = (order: number, id: string, status: string, cities: string[], authoring = true) => JSON.stringify({ schemaVersion: 1, order, id, status,
    cities: cities.map((city) => ({ id: city })), ...(authoring ? { authoring: getJourneyAuthoringProfile(process.cwd(), id) } : {}) }, null, 2);
  const original: Record<string, string> = {
    "content/journeys/milano/manifest.json": manifest(10, "milano", "available", ["milano"], false),
    "content/journeys/golden_triangle/manifest.json": manifest(20, "golden_triangle", "preparing", ["delhi", "agra", "jaipur"]),
    [uzbekManifest]: manifest(30, "uzbekistan", "preparing", ids),
  };
  for (const id of ids) {
    original[`content/cities/${id}.json`] = JSON.stringify({ id, productionStatus: "prototype" });
    original[`content/travel/${id}.json`] = JSON.stringify({ cityId: id, events: [{ id: `uz_${id}_event`, contentStatus: "pending_content" }] });
  }
  for (const [file, content] of Object.entries(original)) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), content);
  }
  mkdirSync(path.join(root, "public"));
  return { root, original };
}

describe("journey authoring with four cities", () => {
  it("builds all four isolated cities without India prefixes or a three-city limit", () => {
    const input = scaffoldFixture();
    const requirements = journeyRequirements(input);
    expect(requirements.map((city) => city.cityId)).toEqual(ids);
    expect(requirements.every((city) => city.main.length === 4 && city.dates.length === 6)).toBe(true);
    const scene = { titleJa: "試験", descriptionJa: "試験用", clearTitleJa: "試験", clearDescriptionJa: "試験用",
      enemyNameJa: "試験", enemyTitleJa: "試験", enemyDescriptionJa: "試験用" };
    const narrative = {
      main: Object.fromEntries(requirements.flatMap((city) => city.main.map((event) => [event.eventId, scene]))),
      dates: Object.fromEntries(requirements.flatMap((city) => city.dates.map((event) => [event.eventId,
        { titleJa: "試験", descriptionJa: "試験用", memoryTitleJa: "試験", memoryDescriptionJa: "試験用" }]))),
      finales: Object.fromEntries(requirements.map((city) => [city.cityId,
        { ...scene, placeId: city.main[0].landmarkId, activityMinutes: 60 }])),
    };
    const fragments = buildJourneyFragments(input, narrative);
    expect(fragments.episodes).toHaveLength(20);
    expect(fragments.dates).toHaveLength(24);
    expect(fragments.landmarks.every((landmark) => landmark.imageAssetId === input.imageAssetIds[landmark.id])).toBe(true);
    for (const city of requirements) {
      expect(fragments.episodes.find((episode) => episode.id === city.finale.eventId)?.requiredEpisodeIds)
        .toEqual(city.main.map((event) => event.eventId));
      for (const main of city.main) {
        expect(fragments.rewards.filter((reward) => reward.episodeId === main.eventId).map((reward) => [reward.trigger, reward.ap]))
          .toEqual([["guide_read", 1], ["battle_complete", 1], ["battle_score", 1], ["episode_clear", 1]]);
      }
    }
    expect(fragments.episodes.filter((episode) => episode.kind === "episode").every((episode) => episode.requiredEpisodeIds.length === 0)).toBe(true);
    expect(new Set(fragments.rewards.map((reward) => reward.id)).size).toBe(fragments.rewards.length);
    expect(requirements.at(-1)?.finale.battleStoryId).toBe("battles/uz_khiva_finale");
    expect(() => getJourneyAuthoringProfile(process.cwd(), "missing")).toThrow(/Unknown authoring journey/);
    expect(() => getJourneyAuthoringProfile(process.cwd(), "milano")).toThrow(/Unknown authoring journey/);
  });

  it("reports missing narrative content in the fourth city instead of declaring readiness", () => {
    const source = loadIndiaReadiness(process.cwd());
    const delhi = source.cities.find((entry) => entry.city.id === "delhi")!;
    const report = inspectJourneyReadiness({ ...source,
      trip: { ...source.trip, id: "uzbekistan", cities: ids.map((id) => ({ id, nameJa: id })) },
      cities: ids.map((id) => renamed(delhi, id)),
      storyExists: () => false,
    });
    expect(report.cities.map((city) => city.cityId)).toEqual(ids);
    expect(report.ready).toBe(false);
    expect(report.readyForPromotion).toBe(false);
    expect(report.cities.at(-1)?.issues.some((issue) => issue.code === "finale_missing")).toBe(true);
    expect(report.cities.at(-1)?.events.some((event) => event.issues.some((issue) => issue.code === "episode_missing"))).toBe(true);
  });

  it("promotes the city prefix in the journey's own manifest and preserves both unrelated journeys", () => {
    const { root, original } = releaseFixture();
    try {
      const two = journeyReleaseChanges(original, "uzbekistan", "samarkand");
      expect(Object.keys(two)).toHaveLength(5);
      expect(two["content/cities/bukhara.json"]).toBeUndefined();
      expect(Object.keys(two).filter((file) => file.startsWith("content/journeys/"))).toEqual([uzbekManifest]);
      expect(JSON.parse(two[uzbekManifest])).toEqual({ ...JSON.parse(original[uzbekManifest]), status: "available" });
      expect(() => journeyReleaseChanges(original, "milano")).toThrow(/Unknown authoring journey/);
      const all = journeyReleaseChanges(original, "uzbekistan");
      expect(Object.keys(all)).toHaveLength(9);
      expect(JSON.parse(all["content/cities/khiva.json"]).productionStatus).toBe("complete");
      expect(() => journeyReleaseChanges(original, "uzbekistan", "delhi")).toThrow(/Unknown journey release city/);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("rolls back failed four-city writes and rejects edits to Uzbek observation inputs", () => {
    const { root, original } = releaseFixture();
    try {
      const next = journeyReleaseChanges(original, "uzbekistan");
      let writes = 0;
      expect(() => writeJourneyReleaseFiles(root, original, next, "uzbekistan", (from, to) => {
        if (++writes === 4) throw new Error("test write failure");
        renameSync(from, to);
      })).toThrow("test write failure");
      for (const [file, content] of Object.entries(original)) expect(readFileSync(path.join(root, file), "utf8")).toBe(content);
      const before = journeyInputFingerprint(root);
      const observation = path.join(root, getJourneyAuthoringProfile(root, "uzbekistan").observationFile);
      mkdirSync(path.dirname(observation), { recursive: true });
      writeFileSync(observation, "{}");
      expect(journeyInputFingerprint(root)).not.toBe(before);
      expect(() => writeJourneyReleaseFiles(root, original, next, "uzbekistan", undefined, before)).toThrow(/Content or assets changed/);
      expect(readFileSync(path.join(root, "content/cities/tashkent.json"), "utf8")).toBe(original["content/cities/tashkent.json"]);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
