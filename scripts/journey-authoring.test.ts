import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { journeyCatalogOf, loadContentSources } from "./content-sources";
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
const testScene = { titleJa: "試験", descriptionJa: "試験用", clearTitleJa: "試験", clearDescriptionJa: "試験用",
  enemyNameJa: "試験", enemyTitleJa: "試験", enemyDescriptionJa: "試験用" };
/** Placeholder scenario metadata for every required event of `requirements`. */
function testNarrative(requirements: ReturnType<typeof journeyRequirements>) {
  return {
    main: Object.fromEntries(requirements.flatMap((city) => city.main.map((event) => [event.eventId, testScene]))),
    dates: Object.fromEntries(requirements.flatMap((city) => city.dates.map((event) => [event.eventId,
      { titleJa: "試験", descriptionJa: "試験用", memoryTitleJa: "試験", memoryDescriptionJa: "試験用" }]))),
    finales: Object.fromEntries(requirements.map((city) => [city.cityId,
      { ...testScene, placeId: city.main[0].landmarkId, activityMinutes: 60 }])),
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
    const fragments = buildJourneyFragments(input, testNarrative(requirements));
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
    expect(() => getJourneyAuthoringProfile(process.cwd(), "missing")).toThrow(/は登録されていないか、制作ツールの設定（manifest.json の authoring）がありません/u);
    expect(() => getJourneyAuthoringProfile(process.cwd(), "milano")).toThrow(/は登録されていないか、制作ツールの設定（manifest.json の authoring）がありません/u);
  });

  it("keeps a later finale or special battle at a main attraction out of the main-event requirements", () => {
    const input = scaffoldFixture();
    const city = input.cities.find((item) => item.cityId === "tashkent")!;
    const event = city.events.find((item) => item.category === "main")!;
    city.events.push({ ...event, id: "uz_tashkent_finale" }, { ...event, id: "uz_tashkent_special" });
    expect(journeyRequirements(input, ["tashkent"])[0].main).toHaveLength(4);
  });

  it("rejects invalid city selections, missing scenario data and a finale at another city's attraction", () => {
    const input = scaffoldFixture();
    expect(() => journeyRequirements(input, [])).toThrow("journey:scaffold: --city の都市がこの旅行編にないか、都市の選び方が正しくありません。");
    expect(() => journeyRequirements(input, ["missing"])).toThrow("journey:scaffold: --city の都市がこの旅行編にないか、都市の選び方が正しくありません。");
    expect(() => journeyRequirements(input, ["tashkent", "tashkent"])).toThrow("journey:scaffold: --city の都市がこの旅行編にないか、都市の選び方が正しくありません。");
    const missing = testNarrative(journeyRequirements(input, ["tashkent"]));
    delete missing.main[Object.keys(missing.main)[0]];
    expect(() => buildJourneyFragments(input, missing, ["tashkent"])).toThrow("journey:scaffold: 脚本の情報の main には、登録した ID をちょうど全部書きます");
    const wrongCity = testNarrative(journeyRequirements(input, ["tashkent"]));
    wrongCity.finales.tashkent.placeId = journeyRequirements(input, ["samarkand"])[0].main[0].landmarkId;
    expect(() => buildJourneyFragments(input, wrongCity, ["tashkent"])).toThrow("journey:scaffold: 都市 tashkent のフィナーレの placeId には、地図の出来事がある地点を書きます。");
    expect(buildJourneyFragments(input, testNarrative(journeyRequirements(input, ["samarkand"])), ["samarkand"]).episodes
      .every((episode) => episode.cityId === "samarkand")).toBe(true);
  });

  it("names the registered journeys when asked for one that is not", () => {
    const registered = journeyCatalogOf(loadContentSources(process.cwd())).journeys.map((journey) => journey.id);
    expect(() => loadJourneyReadiness(process.cwd(), "atlantis")).toThrow(
      `旅行編「atlantis」は登録されていません（content/journeys/<旅行編ID>/manifest.json）。登録されている旅行編: ${registered.join(", ")}（Unknown journey）。`);
  });

  it("journey:scaffold refuses observation cards that already name question IDs", () => {
    const root = mkdtempSync(path.join(tmpdir(), "dreamscape-scaffold-cards-"));
    try {
      // The real content with a copy of Golden Triangle's manifest and cards in the temporary root.
      const sources = loadContentSources(process.cwd());
      const manifest = "content/journeys/golden_triangle/manifest.json";
      const cardsFile = getJourneyAuthoringProfile(process.cwd(), "golden_triangle").observationFile;
      const cards = JSON.parse(readFileSync(cardsFile, "utf8"));
      for (const [file, content] of [[manifest, readFileSync(manifest, "utf8")], [cardsFile, JSON.stringify(cards)]]) {
        mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
        writeFileSync(path.join(root, file), content);
      }
      expect(loadJourneyScaffold(root, "golden_triangle", sources).observations).toHaveLength(cards.clues.length);
      const [card] = cards.clues;
      card.relatedQuestionIds = ["gt_delhi_main_red_fort_quiz_q1"];
      writeFileSync(path.join(root, cardsFile), JSON.stringify(cards));
      expect(() => loadJourneyScaffold(root, "golden_triangle", sources)).toThrow(
        `観察資料の観察ポイント「${card.id}」に問題ID（relatedQuestionIds: gt_delhi_main_red_fort_quiz_q1）が書かれています: ${cardsFile}。` +
        "観察資料には問題IDを書かず、[] のままにします。都市を公開（journey:release -- --apply）した後、旅行編の tourism/catalog.json で、その観察ポイントを本当に使う問題にだけ問題IDを書いてください。");
    } finally { rmSync(root, { recursive: true, force: true }); }
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
    // Every city, the fourth included, lacks its finale, its main episodes and its dates.
    for (const city of report.cities) {
      expect(city.issues.some((issue) => issue.code === "finale_missing"), city.cityId).toBe(true);
      expect(city.events.some((event) => event.category === "main" && event.issues.some((issue) => issue.code === "episode_missing")), city.cityId).toBe(true);
      expect(city.events.some((event) => event.category === "date" && event.issues.some((issue) => issue.code === "date_missing")), city.cityId).toBe(true);
    }
  });

  it("refuses a journey without a city plan with a Japanese message", () => {
    const source = loadJourneyReadiness(process.cwd(), "luang_prabang");
    expect(() => inspectJourneyReadiness({ ...source, trip: { ...source.trip, id: "kyoto", cityPlan: undefined } })).toThrow(
      "旅行編「kyoto」の manifest.json に都市の計画（cityPlan）がないため、準備を確かめられません（journey:readiness は cityPlan を持つ旅行編を確かめます）。");
  });

  it("does not promote a city whose transit ledger still has inconclusive decisions", () => {
    const source = loadJourneyReadiness(process.cwd(), "luang_prabang");
    expect(source.cities.map((entry) => entry.inconclusiveTransit)).toEqual([0]);
    expect(inspectJourneyReadiness(source).cities[0].issues.some((issue) => issue.code === "transit_inconclusive")).toBe(false);
    const report = inspectJourneyReadiness({ ...source, cities: source.cities.map((entry) => ({ ...entry, inconclusiveTransit: 2 })) });
    expect(report.cities[0].issues).toContainEqual({ code: "transit_inconclusive",
      detail: "交通判断台帳に「特定できず」の判断が2件あります: luang_prabang（調べて available・not_suitable・not_applicable に決めてください）" });
    expect(report.readyForPromotion).toBe(false);
  });

  it("promotes the city prefix in the journey's own manifest and preserves both unrelated journeys", () => {
    const { root, original } = releaseFixture();
    try {
      const two = journeyReleaseChanges(original, "uzbekistan", "samarkand");
      expect(Object.keys(two)).toHaveLength(5);
      expect(two["content/cities/bukhara.json"]).toBeUndefined();
      expect(Object.keys(two).filter((file) => file.startsWith("content/journeys/"))).toEqual([uzbekManifest]);
      expect(JSON.parse(two[uzbekManifest])).toEqual({ ...JSON.parse(original[uzbekManifest]), status: "available" });
      expect(() => journeyReleaseChanges(original, "milano")).toThrow(/は登録されていないか、制作ツールの設定（manifest.json の authoring）がありません/u);
      const all = journeyReleaseChanges(original, "uzbekistan");
      expect(Object.keys(all)).toHaveLength(9);
      expect(JSON.parse(all["content/cities/khiva.json"]).productionStatus).toBe("complete");
      expect(() => journeyReleaseChanges(original, "uzbekistan", "delhi")).toThrow("--through の都市 delhi は、この旅行編の cities にありません。");
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
      expect(() => writeJourneyReleaseFiles(root, original, next, "uzbekistan", undefined, before)).toThrow("公開するファイルの準備中に content/ か public/ が変わりました。書き込んでいません。");
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
      const quiz = loadJourneyReadiness(process.cwd(), "golden_triangle").quizzes.find((item) => item.id === "milano_main_duomo_quiz")!;
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
        .toThrow("登録済みの本筋の回と内容が違います: milano_episode");

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
        .toThrow("書き込むファイルの組が正しくありません");

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
      const quiz = loadJourneyReadiness(process.cwd(), "golden_triangle").quizzes.find((item) => item.id === "milano_main_duomo_quiz")!;
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
