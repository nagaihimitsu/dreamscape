import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getJourneyAuthoringProfile } from "./journey-authoring";
import { inspectJourneyReadiness, loadJourneyReadiness } from "./journey-readiness";
import { buildJourneyFragments, journeyRequirements, loadJourneyScaffold, type JourneyScaffoldInput } from "./journey-scaffold";
import { journeyInputFingerprint, journeyReleaseChanges, mergeJourneyReleaseFragments, writeJourneyReleaseFiles, type ReleaseFiles } from "./promote-journey";

const ids = ["tashkent", "samarkand", "bukhara", "khiva"];
// Only test fixtures: cloning India here avoids shipping invented Uzbek scenarios.
function renamed<T>(value: T, cityId: string): T {
  return JSON.parse(JSON.stringify(value).replaceAll("gt_delhi", `uz_${cityId}`).replaceAll("delhi", cityId));
}
function scaffoldFixture(): JourneyScaffoldInput {
  const source = loadJourneyScaffold(process.cwd(), "golden_triangle");
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
/** Manifests of three journeys, with Uzbekistan's cities in `layer` (the core layer by default). */
function releaseFixture(layer = "content") {
  const root = mkdtempSync(path.join(tmpdir(), "dreamscape-journey-release-test-"));
  const manifest = (order: number, id: string, status: string, cities: string[], authoring = true) => JSON.stringify({ schemaVersion: 1, order, id, status,
    cities: cities.map((city) => ({ id: city })), ...(authoring ? { authoring: getJourneyAuthoringProfile(process.cwd(), id) } : {}) }, null, 2);
  const original: Record<string, string> = {
    "content/journeys/milano/manifest.json": manifest(10, "milano", "available", ["milano"], false),
    "content/journeys/golden_triangle/manifest.json": manifest(20, "golden_triangle", "preparing", ["delhi", "agra", "jaipur"]),
    [uzbekManifest]: manifest(30, "uzbekistan", "preparing", ids),
  };
  for (const id of ids) {
    original[`${layer}/cities/${id}.json`] = JSON.stringify({ id, productionStatus: "prototype" });
    original[`${layer}/travel/${id}.json`] = JSON.stringify({ cityId: id, events: [{ id: `uz_${id}_event`, contentStatus: "pending_content" }] });
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
    const source = loadJourneyReadiness(process.cwd(), "golden_triangle");
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

  it("releases into the journey's own folder: creates its missing catalogs there and removes them again on failure", () => {
    const layer = "content/journeys/uzbekistan";
    const { root, original } = releaseFixture(layer);
    try {
      const write = (file: string, value: unknown) => {
        mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
        writeFileSync(path.join(root, file), JSON.stringify(value));
        return JSON.stringify(value);
      };
      // Core catalogs the release must leave alone, and one existing catalog of the journey folder.
      const coreJourney = { schemaVersion: 1, episodes: [{ id: "milano_episode", cityId: "milano" }], storyBattles: [], rewards: [] };
      const corePresentation = { schemaVersion: 1, backgrounds: {}, memories: { shared_memory: { titleJa: "共有の思い出" } } };
      const coreTranslations = JSON.parse(readFileSync(path.join(process.cwd(), "src/content/generated/content/learning/translations.json"), "utf8"));
      const core = { "content/progression/journey.json": write("content/progression/journey.json", coreJourney),
        "content/romance/presentation.json": write("content/romance/presentation.json", corePresentation),
        "content/learning/translations.json": write("content/learning/translations.json", coreTranslations) };
      const ownPresentation = { schemaVersion: 1, backgrounds: { uz_tashkent_bg: { nameJa: "タシケント" } }, memories: {} };
      const fragmentKinds = ["progression/journey.json", "battles/catalog.json", "romance/date_catalog.json", "tourism/catalog.json",
        "romance/effect_catalog.json", "romance/presentation.json", "learning/translations.json"];
      const releaseOriginal: ReleaseFiles = { ...original, ...Object.fromEntries(fragmentKinds.map((kind) => [`${layer}/${kind}`, null])),
        [`${layer}/romance/presentation.json`]: write(`${layer}/romance/presentation.json`, ownPresentation) };
      const merged = { "progression/journey.json": coreJourney, "learning/translations.json": coreTranslations,
        "romance/presentation.json": { ...corePresentation, backgrounds: ownPresentation.backgrounds } };
      const quiz = loadJourneyReadiness(process.cwd(), "golden_triangle").quizzes.find((item) => item.id === "sound_duomo_b1")!;
      const fragments = { episodes: [{ id: "uz_tashkent_episode", cityId: "tashkent" }], rewards: [],
        battles: [{ id: "uz_tashkent_battle", quizId: quiz.id }], dates: [], landmarks: [], clues: [], finaleEvents: [],
        effects: [{ id: "uz_tashkent_effect" }], memories: { shared_memory: { titleJa: "共有の思い出" }, uz_memory: { titleJa: "タシケント" } },
      } as unknown as Parameters<typeof mergeJourneyReleaseFragments>[2];
      const release = journeyReleaseChanges(releaseOriginal, "uzbekistan", "tashkent", layer);
      const next = mergeJourneyReleaseFragments(releaseOriginal, release, fragments, [quiz], undefined, { layer, merged });
      // Catalogs without new entries are not created; definitions of other layers are not repeated.
      expect(Object.keys(next)).toEqual([uzbekManifest, `${layer}/cities/tashkent.json`, `${layer}/travel/tashkent.json`,
        `${layer}/progression/journey.json`, `${layer}/battles/catalog.json`, `${layer}/romance/effect_catalog.json`, `${layer}/romance/presentation.json`]);
      expect(JSON.parse(next[`${layer}/progression/journey.json`])).toEqual({ schemaVersion: 1, episodes: fragments.episodes, storyBattles: [], rewards: [] });
      expect(JSON.parse(next[`${layer}/romance/presentation.json`])).toEqual({ ...ownPresentation, memories: { uz_memory: { titleJa: "タシケント" } } });
      const collision = { ...fragments, episodes: [{ id: "milano_episode", cityId: "tashkent" }] } as typeof fragments;
      expect(() => mergeJourneyReleaseFragments(releaseOriginal, release, collision, [quiz], undefined, { layer, merged }))
        .toThrow("Existing episode differs: milano_episode");

      // Three renames of release markers, three new catalogs, then the existing presentation fails.
      let moves = 0;
      expect(() => writeJourneyReleaseFiles(root, releaseOriginal, next, "uzbekistan", (from, to) => {
        if (++moves === 4) throw new Error("test write failure");
        renameSync(from, to);
      }, undefined, layer)).toThrow("test write failure");
      for (const [file, content] of Object.entries({ ...releaseOriginal, ...core }))
        if (content === null) expect(existsSync(path.join(root, file)), file).toBe(false);
        else expect(readFileSync(path.join(root, file), "utf8"), file).toBe(content);
      expect(readdirSync(path.join(root, layer)).sort()).toEqual(["cities", "manifest.json", "romance", "travel"]);
      expect(readdirSync(path.join(root, layer, "romance"))).toEqual(["presentation.json"]);
      // Only the journey's manifest and its own folder may be written.
      expect(() => writeJourneyReleaseFiles(root, releaseOriginal, { ...next, "content/progression/journey.json": "{}" }, "uzbekistan", undefined, undefined, layer))
        .toThrow("Invalid Journey release file set");

      writeJourneyReleaseFiles(root, releaseOriginal, next, "uzbekistan", undefined, undefined, layer);
      for (const [file, content] of Object.entries(next)) expect(readFileSync(path.join(root, file), "utf8"), file).toBe(content);
      for (const [file, content] of Object.entries(core)) expect(readFileSync(path.join(root, file), "utf8"), file).toBe(content);
      expect(existsSync(path.join(root, layer, "learning"))).toBe(false);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("releases into journey catalogs that leave keys out, adding only the keys that gain entries", () => {
    const layer = "content/journeys/uzbekistan";
    const { root, original } = releaseFixture(layer);
    try {
      const write = (file: string, value: unknown) => {
        const content = `${JSON.stringify(value, null, 2)}\n`;
        mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
        writeFileSync(path.join(root, file), content);
        return content;
      };
      const corePresentation = { schemaVersion: 1, backgrounds: {}, memories: { shared_memory: { titleJa: "共有の思い出" } } };
      const coreFile = "content/romance/presentation.json";
      const core = write(coreFile, corePresentation);
      // The merge accepts fragments that leave keys out: the layer contributes nothing there.
      const partial = {
        "progression/journey.json": { schemaVersion: 1, storyBattles: [] },
        "battles/catalog.json": { schemaVersion: 1 },
        "romance/date_catalog.json": { schemaVersion: 1 },
        "tourism/catalog.json": { schemaVersion: 1, assets: [] },
        "romance/presentation.json": { schemaVersion: 1, backgrounds: { uz_tashkent_bg: { nameJa: "タシケント" } } },
        "learning/translations.json": { questions: {} },
      };
      const releaseOriginal: ReleaseFiles = { ...original, [`${layer}/romance/effect_catalog.json`]: null,
        ...Object.fromEntries(Object.entries(partial).map(([kind, value]) => [`${layer}/${kind}`, write(`${layer}/${kind}`, value)])) };
      const coreTranslations = JSON.parse(readFileSync(path.join(process.cwd(), "src/content/generated/content/learning/translations.json"), "utf8"));
      const merged = { "learning/translations.json": coreTranslations,
        "romance/presentation.json": { ...corePresentation, backgrounds: partial["romance/presentation.json"].backgrounds } };
      const quiz = loadJourneyReadiness(process.cwd(), "golden_triangle").quizzes.find((item) => item.id === "sound_duomo_b1")!;
      const fragments = { episodes: [{ id: "uz_tashkent_episode", cityId: "tashkent" }], rewards: [],
        battles: [{ id: "uz_tashkent_battle", quizId: quiz.id }], dates: [], landmarks: [], clues: [], finaleEvents: [],
        effects: [], memories: { shared_memory: { titleJa: "共有の思い出" }, uz_memory: { titleJa: "タシケント" } },
      } as unknown as Parameters<typeof mergeJourneyReleaseFragments>[2];
      const release = journeyReleaseChanges(releaseOriginal, "uzbekistan", "tashkent", layer);
      const next = mergeJourneyReleaseFragments(releaseOriginal, release, fragments, [quiz], undefined, { layer, merged });
      const json = (kind: string) => JSON.parse(next[`${layer}/${kind}`]);
      // Missing keys that gain entries are appended; present keys keep their order.
      expect(Object.keys(json("progression/journey.json"))).toEqual(["schemaVersion", "storyBattles", "episodes"]);
      expect(json("progression/journey.json").episodes).toEqual(fragments.episodes);
      expect(json("battles/catalog.json")).toStrictEqual({ schemaVersion: 1, battles: fragments.battles });
      expect(json("romance/presentation.json")).toStrictEqual({ ...partial["romance/presentation.json"], memories: { uz_memory: { titleJa: "タシケント" } } });
      // Catalogs without new entries keep their bytes (no empty keys or schemaVersion added).
      for (const kind of ["romance/date_catalog.json", "tourism/catalog.json", "learning/translations.json"])
        expect(next[`${layer}/${kind}`], kind).toBe(releaseOriginal[`${layer}/${kind}`]);
      expect(next[`${layer}/romance/effect_catalog.json`]).toBeUndefined();

      writeJourneyReleaseFiles(root, releaseOriginal, next, "uzbekistan", undefined, undefined, layer);
      expect(Object.keys(next).filter((file) => file !== uzbekManifest && !file.startsWith(`${layer}/`))).toEqual([]);
      for (const [file, content] of Object.entries(next)) expect(readFileSync(path.join(root, file), "utf8"), file).toBe(content);
      expect(readFileSync(path.join(root, coreFile), "utf8")).toBe(core);
      expect(existsSync(path.join(root, layer, "romance/effect_catalog.json"))).toBe(false);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
