import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { journeyRequirements, loadJourneyScaffold } from "./journey-scaffold";
import { prepareJourneyRelease } from "./promote-journey";
import { splitStoryAddress, storyFileOf } from "../src/content/story-address";
import { placeKnot } from "../src/content/test-fixtures";

// The whole journey:release pipeline (prepareJourneyRelease) on a copy of the
// project. It needs a journey with an authoring profile, travel data and
// observation cards, so it uses the Golden Triangle as its example; if that
// journey is removed, rewrite it for another one (docs/02 「旅行編をやめる場合」).
// The release rules alone are checked on a fictional journey in journey-release.test.ts.

/** India's journey folder: its cities, stories, quizzes and catalog fragments. */
const layer = "content/journeys/golden_triangle";
/** Milan's folder: the source of the test templates, and a layer the release must leave alone. */
const milano = "content/journeys/milano";

/** Explicit unpublished fixture; this test must not depend on India's release date. */
function prepareUnpublishedFixture(root: string) {
  const plans = journeyRequirements(loadJourneyScaffold(root, "golden_triangle"));
  const cityIds = new Set(plans.map((city) => city.cityId));
  const eventIds = new Set(plans.flatMap((city) => [...city.main.map((event) => event.eventId), city.finale.eventId]));
  const dateIds = new Set(plans.flatMap((city) => city.dates.map((event) => event.eventId)));
  const landmarkIds = new Set(plans.flatMap((city) => city.main.map((event) => event.landmarkId)));
  const battleIds = new Set(plans.flatMap((city) => [...city.main.map((event) => event.battleId), city.finale.battleId]));
  const quizIds = new Set(plans.flatMap((city) => [...city.main.map((event) => event.quizId), city.finale.quizId]));
  const memoryIds = new Set(plans.flatMap((city) => city.dates.map((event) => event.memoryId)));
  const storyIds = new Set(plans.flatMap((city) => [...city.main.flatMap((event) => [event.guideStoryId, event.battleStoryId]),
    ...city.dates.map((event) => event.storyId), city.finale.battleStoryId, city.finale.epilogueStoryId]).filter((id): id is string => id !== null));
  const edit = (file: string, change: (data: any) => void) => {
    const target = path.join(root, file);
    const data = JSON.parse(readFileSync(target, "utf8"));
    change(data);
    writeFileSync(target, JSON.stringify(data));
  };
  edit(`${layer}/manifest.json`, (data) => { data.status = "preparing"; });
  for (const city of plans) {
    edit(`${layer}/cities/${city.cityId}.json`, (data) => {
      data.productionStatus = "prototype";
      if (data.arrivalStoryId) storyIds.add(data.arrivalStoryId);
      delete data.arrivalStoryId;
    });
    edit(`${layer}/travel/${city.cityId}.json`, (data) => {
      // The rooftop dates (no scaffold dates) leave with their place files below.
      data.events = data.events.filter((event: any) => event.id !== city.finale.eventId && (event.category !== "date" || dateIds.has(event.id))).map((event: any) => ({ ...event, contentStatus: "pending_content" }));
      for (const place of data.places) if (place.landmarkIds) place.landmarkIds = place.landmarkIds.filter((id: string) => !landmarkIds.has(id));
    });
  }
  edit(`${layer}/progression/journey.json`, (data) => {
    data.episodes = data.episodes.filter((entry: any) => !cityIds.has(entry.cityId));
    data.rewards = data.rewards.filter((entry: any) => !eventIds.has(entry.episodeId));
  });
  edit(`${layer}/battles/catalog.json`, (data) => { data.battles = data.battles.filter((entry: any) => !battleIds.has(entry.id)); });
  // Every India date, also the rooftop dates at the hotel (no scaffold dates: their knots go with the place files below).
  edit(`${layer}/romance/date_catalog.json`, (data) => { data.dates = data.dates.filter((entry: any) => !cityIds.has(entry.chapterId)); });
  edit(`${layer}/tourism/catalog.json`, (data) => {
    data.landmarks = data.landmarks.filter((entry: any) => !cityIds.has(entry.cityId));
    data.clues = data.clues.filter((entry: any) => !landmarkIds.has(entry.landmarkId));
  });
  edit(`${layer}/romance/presentation.json`, (data) => { for (const id of memoryIds) delete data.memories[id]; });
  // The people drawn for India's battles (its battleCharacters, #72) go with the battles.
  edit(`${layer}/presentation/characters.json`, (data) => { for (const id of battleIds) delete data.battleCharacters[id]; });
  for (const file of ["presentation/dialogue-expressions.json", "presentation/dialogue-reactions.json"].map((kind) => `${layer}/${kind}`))
    if (existsSync(path.join(root, file))) edit(file, (data) => { data.entries = data.entries.filter((entry: any) => !storyIds.has(entry.storyId)); });
  // India's scenes (the scaffold's addresses, and its arrivals) are knots of its place files: unpublished with them, and with
  // the items and flags those scenes give and set.
  rmSync(path.join(root, layer, "stories/places"), { recursive: true, force: true });
  edit(`${layer}/encounters/catalog.json`, (data) => { data.items = data.items.filter((item: any) => !cityIds.has(item.cityId)); });
  edit(`${layer}/progression/story.json`, (data) => { data.flags = []; });
  // The sources of their inserted scenes (GT-4) go with them too.
  edit(`${layer}/scenes/catalog.json`, (data) => { data.scenes = []; });
  const questionIds = new Set<string>();
  for (const file of readdirSync(path.join(root, layer, "quizzes"))) {
    if (!file.endsWith(".json")) continue;
    const target = path.join(root, layer, "quizzes", file);
    const quiz = JSON.parse(readFileSync(target, "utf8"));
    if (!quizIds.has(quiz.id)) continue;
    for (const question of quiz.questions) questionIds.add(question.id);
    rmSync(target);
  }
  edit(`${layer}/learning/translations.json`, (data) => { for (const id of questionIds) delete data.questions[id]; });
}

// Test-only scripts and questions are copied into a temporary project. They
// never become production India content and do not claim to describe India.
const source = process.cwd();
const read = (file: string) => readFileSync(path.join(source, file), "utf8");
const scene = { titleJa: "試験", descriptionJa: "試験の場面", clearTitleJa: "試験完了", clearDescriptionJa: "試験の記録",
  enemyNameJa: "試験人物", enemyTitleJa: "試験の人", enemyDescriptionJa: "試験用の人物" };
const date = { titleJa: "試験", descriptionJa: "試験の場面", memoryTitleJa: "試験の思い出", memoryDescriptionJa: "試験の記録" };
const originalQuiz = JSON.parse(read(`${milano}/quizzes/milano_main_duomo_quiz.json`));
const originalTranslations = JSON.parse(read(`${milano}/learning/translations.json`)).questions;
/**
 * A knot of Milan's place files (with its stitches) as a template for India's folder: Milan's own backgrounds become the
 * shared default background. India's scaffold names knots of place files, as Milan's scenes are.
 */
const withDefaultBackground = (text: string) => text.replace(/#\s*background\s*:\s*[A-Za-z0-9_]+/gu, "# background: default_scene");
const knotTemplate = (address: string) => {
  const { storyId, path: knot } = splitStoryAddress(address);
  return withDefaultBackground(placeKnot(read(`${milano}/stories/${storyId}.ink`), knot!).text);
};
/** A template knot under the scaffold's name, without its # title: (the catalog's title is the scene's). */
const renamedKnot = (template: string, knot: string) =>
  [`=== ${knot} ===`, ...template.split("\n").slice(1).filter((line) => !/^\s*#\s*title\s*:/u.test(line))].join("\n");
const guideTemplate = knotTemplate("places/milano_duomo.duomo_milano_guide");
const epilogueTemplate = knotTemplate("places/milano_darsena.milano_epilogue");
/** A normal date with # profile: and # memory: (a place file's date, the form of the scaffold's dates): Milan's cafe date. */
const dateTemplate = knotTemplate("places/milano_roastery.milano_cafe_01");
const dateTemplateMemory = "sound_memory_cafe_01";
/** A Milan battle's knot as a template (its own -> quiz(n) -> calls, stage 5). */
const battleTemplate = (battleId: string) =>
  knotTemplate(JSON.parse(read(`${milano}/battles/catalog.json`)).battles.find((item: { id: string }) => item.id === battleId).storyId);

/** India's catalogs that hold nothing but India's unpublished entries. */
const emptiedCatalogs = ["progression/journey.json", "battles/catalog.json", "romance/date_catalog.json",
  "romance/effect_catalog.json", "learning/translations.json"];

/**
 * A copy of the project with India unpublished. With `withoutEmptyCatalogs`
 * India's folder also loses the catalogs that only held unpublished entries.
 */
function unpublishedProject({ withoutEmptyCatalogs = false } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "dreamscape-india-full-release-"));
  cpSync(path.join(source, "content"), path.join(root, "content"), { recursive: true });
  cpSync(path.join(source, "public"), path.join(root, "public"), { recursive: true });
  const observation = "authoring/journeys/golden_triangle/drafts/observation-cards.json";
  mkdirSync(path.dirname(path.join(root, observation)), { recursive: true });
  cpSync(path.join(source, observation), path.join(root, observation));
  prepareUnpublishedFixture(root);
  if (withoutEmptyCatalogs) for (const kind of emptiedCatalogs) {
    const file = path.join(root, layer, kind);
    if (!existsSync(file)) continue; // India has no romance/effect_catalog.json since its dates use choice tags (GT-3b).
    const data = JSON.parse(readFileSync(file, "utf8"));
    expect(Object.values(data).filter(Array.isArray).every((items) => !(items as unknown[]).length), kind).toBe(true);
    if (kind === "learning/translations.json") expect(data.questions).toEqual({});
    rmSync(file);
  }
  return root;
}

/**
 * Write one city's hypothetical scenes and quizzes; returns its scenario and translation files and its plan. The scenes are
 * knots of place files at the scaffold's addresses; the finale's venue (the narrative's placeId) is the first landmark.
 */
function authorCity(root: string, input: ReturnType<typeof loadJourneyScaffold>, cityId: string, name: string) {
  const venue = journeyRequirements(input, [cityId])[0].main[0].landmarkId;
  const plan = journeyRequirements(input, [cityId], { [cityId]: venue })[0];
  const write = (file: string, value: string) => { const target = path.join(root, file); mkdirSync(path.dirname(target), { recursive: true }); writeFileSync(target, value); };
  const narrative = { main: Object.fromEntries(plan.main.map((item) => [item.eventId, scene])),
    dates: Object.fromEntries(plan.dates.map((item) => [item.eventId, date])),
    finales: { [plan.cityId]: { ...scene, placeId: venue, activityMinutes: 60 } } };
  /** The knots of each place file, in the order added. */
  const knots = new Map<string, string[]>();
  const add = (address: string, template: string) => {
    const { storyId, path: knot } = splitStoryAddress(address);
    knots.set(storyId, [...(knots.get(storyId) ?? []), renamedKnot(template, knot!)]);
  };
  const narrativeFile = path.join(root, `${name}scenario.json`);
  writeFileSync(narrativeFile, JSON.stringify(narrative));
  const translations: Record<string, { questionJa: string; optionsJa: Record<string, string> }> = {};
  for (const item of plan.main) {
    add(item.guideStoryId, guideTemplate);
    add(item.battleStoryId, battleTemplate("milano_duomo_01"));
    const quiz = { ...structuredClone(originalQuiz), id: item.quizId, landmarkId: item.landmarkId };
    quiz.questions.forEach((question: { id: string }, index: number) => {
      const translated = originalTranslations[question.id];
      question.id = `${item.quizId}_${index}`;
      translations[question.id] = { questionJa: translated.questionJa, optionsJa: translated.optionsJa };
    });
    write(`${layer}/quizzes/${item.quizId}.json`, JSON.stringify(quiz));
  }
  // A date keeps the scaffold's memory of its own.
  for (const item of plan.dates) add(item.storyId, dateTemplate.replaceAll(dateTemplateMemory, item.memoryId));
  add(plan.finale.battleStoryId!, battleTemplate("milano_city_boss_01"));
  add(plan.finale.epilogueStoryId, epilogueTemplate);
  for (const [storyId, texts] of knots) write(`${layer}/stories/${storyId}.ink`, ["INCLUDE modules.ink", "-> DONE", "", ...texts].join("\n"));
  const finalQuiz = JSON.parse(read(`${milano}/quizzes/milano_finale_quiz.json`));
  finalQuiz.id = plan.finale.quizId; finalQuiz.cityId = plan.cityId;
  finalQuiz.questions.forEach((question: { id: string }, index: number) => {
    const translated = originalTranslations[question.id];
    question.id = `${plan.finale.quizId}_${index}`;
    translations[question.id] = { questionJa: translated.questionJa, optionsJa: translated.optionsJa };
  });
  write(`${layer}/quizzes/${plan.finale.quizId}.json`, JSON.stringify(finalQuiz));
  const translationsFile = path.join(root, `${name}translations.json`);
  writeFileSync(translationsFile, JSON.stringify({ schemaVersion: 1, questions: translations }));
  return { narrativeFile, translationsFile, plan };
}

describe("journey release pipeline (the Golden Triangle as the example)", () => {
  it("validates, previews and releases Delhi alone, and can be rerun without duplicates", async () => {
    const root = unpublishedProject();
    try {
      const input = loadJourneyScaffold(root, "golden_triangle");
      const { narrativeFile, translationsFile, plan } = authorCity(root, input, "delhi", "");
      const cityFile = path.join(root, layer, "cities/delhi.json");
      const before = readFileSync(cityFile, "utf8");
      await expect(prepareJourneyRelease(root, "golden_triangle", true, "delhi", narrativeFile)).rejects.toThrow(/クイズの和訳がありません/u);
      expect(readFileSync(cityFile, "utf8")).toBe(before);
      // The first landmark's place file (its guide, its battle and the finale).
      const guidePath = path.join(root, layer, "stories", `${storyFileOf(plan.main[0].guideStoryId)}.ink`);
      const guide = readFileSync(guidePath, "utf8");
      rmSync(guidePath);
      await expect(prepareJourneyRelease(root, "golden_triangle", true, "delhi", narrativeFile, translationsFile)).rejects.toThrow("デリー（delhi）までに、脚本・クイズ・内容の参照がまだ揃っていません");
      expect(readFileSync(cityFile, "utf8")).toBe(before);
      writeFileSync(guidePath, guide);
      await prepareJourneyRelease(root, "golden_triangle", false, "delhi", narrativeFile, translationsFile);
      expect(readFileSync(cityFile, "utf8")).toBe(before);
      await prepareJourneyRelease(root, "golden_triangle", true, "delhi", narrativeFile, translationsFile);
      expect(JSON.parse(readFileSync(cityFile, "utf8")).productionStatus).toBe("complete");
      expect(JSON.parse(readFileSync(path.join(root, layer, "cities/agra.json"), "utf8")).productionStatus).toBe("prototype");
      expect(JSON.parse(readFileSync(path.join(root, layer, "travel/agra.json"), "utf8")).events.every((event: { contentStatus?: string }) => event.contentStatus === "pending_content")).toBe(true);
      expect(JSON.parse(readFileSync(path.join(root, layer, "manifest.json"), "utf8")).status).toBe("available");
      const journeyFile = path.join(root, layer, "progression/journey.json");
      const after = readFileSync(journeyFile, "utf8");
      expect(JSON.parse(after).episodes.filter((episode: { cityId: string }) => episode.cityId === "delhi")).toHaveLength(5);
      const translated = JSON.parse(readFileSync(path.join(root, layer, "learning/translations.json"), "utf8")).questions[`${plan.main[0].quizId}_0`];
      expect(translated.source.questionEn).toBe(originalQuiz.questions[0].questionEn);
      expect(existsSync(path.join(root, layer, "stories", `${storyFileOf(plan.finale.epilogueStoryId)}.ink`))).toBe(true);
      // A rerun of the published city writes nothing.
      expect((await prepareJourneyRelease(root, "golden_triangle", true, "delhi", narrativeFile, translationsFile)).files).toEqual([]);
      expect(readFileSync(journeyFile, "utf8")).toBe(after);
      // A wrong file path is refused although the published city would not read it.
      const missing = path.join(root, "missing-narrative.json");
      await expect(prepareJourneyRelease(root, "golden_triangle", true, "delhi", missing)).rejects.toThrow(`脚本の情報（--narrative）のファイルがありません: ${missing}`);
      await expect(prepareJourneyRelease(root, "golden_triangle", true, "delhi", narrativeFile, missing)).rejects.toThrow(`クイズの和訳（--translations）のファイルがありません: ${missing}`);

      // Add only the second city's own hypothetical content. The already
      // published first city must not be regenerated or duplicated.
      const second = authorCity(root, input, "agra", "agra-");
      await prepareJourneyRelease(root, "golden_triangle", true, "agra", second.narrativeFile, second.translationsFile);
      const afterSecond = JSON.parse(readFileSync(journeyFile, "utf8"));
      expect(afterSecond.episodes.filter((episode: { cityId: string }) => episode.cityId === "delhi")).toHaveLength(5);
      expect(afterSecond.episodes.filter((episode: { cityId: string }) => episode.cityId === "agra")).toHaveLength(5);
      expect(JSON.parse(readFileSync(path.join(root, layer, "cities/agra.json"), "utf8")).productionStatus).toBe("complete");
      expect(JSON.parse(readFileSync(path.join(root, layer, "cities/jaipur.json"), "utf8")).productionStatus).toBe("prototype");
    } finally { rmSync(root, { recursive: true, force: true }); }
  }, 120_000);

  it("releases Delhi into India's journey folder, creating the catalogs it lacks and leaving other layers' catalogs alone", async () => {
    const root = unpublishedProject({ withoutEmptyCatalogs: true });
    try {
      const { narrativeFile, translationsFile } = authorCity(root, loadJourneyScaffold(root, "golden_triangle"), "delhi", "");
      const kinds = ["progression/journey.json", "battles/catalog.json", "romance/date_catalog.json", "tourism/catalog.json",
        "romance/effect_catalog.json", "romance/presentation.json", "learning/translations.json"];
      // The core layer has the shared effects and presentation; Milan's folder has every kind but the effects (its dates
      // name none since its confession became a knot of the Darsena's place file), and the release does not make it one.
      const otherFiles = ["content", milano].flatMap((directory) => kinds.map((kind) => path.join(root, directory, kind))).filter((file) => existsSync(file));
      expect(otherFiles.map((file) => path.relative(root, file).split(path.sep).join("/"))).toEqual([
        "content/romance/effect_catalog.json", "content/romance/presentation.json",
        ...kinds.filter((kind) => kind !== "romance/effect_catalog.json").map((kind) => `${milano}/${kind}`),
      ]);
      const otherBefore = otherFiles.map((file) => readFileSync(file, "utf8"));
      expect(emptiedCatalogs.some((kind) => existsSync(path.join(root, layer, kind)))).toBe(false);
      await prepareJourneyRelease(root, "golden_triangle", true, "delhi", narrativeFile, translationsFile);
      expect(otherFiles.map((file) => readFileSync(file, "utf8"))).toEqual(otherBefore);
      expect(existsSync(path.join(root, milano, "romance/effect_catalog.json"))).toBe(false);
      expect(emptiedCatalogs.every((kind) => existsSync(path.join(root, layer, kind)))).toBe(true);
      expect(JSON.parse(readFileSync(path.join(root, layer, "cities/delhi.json"), "utf8")).productionStatus).toBe("complete");
      expect(JSON.parse(readFileSync(path.join(root, layer, "manifest.json"), "utf8")).status).toBe("available");
      const journeyFile = path.join(root, layer, "progression/journey.json");
      const after = readFileSync(journeyFile, "utf8");
      expect(JSON.parse(after).episodes.map((episode: { cityId: string }) => episode.cityId)).toEqual(Array(5).fill("delhi"));
      const translated = JSON.parse(readFileSync(path.join(root, layer, "learning/translations.json"), "utf8")).questions;
      expect(Object.keys(translated).every((id) => id.startsWith("gt_"))).toBe(true);
      expect((await prepareJourneyRelease(root, "golden_triangle", true, "delhi", narrativeFile, translationsFile)).files).toEqual([]);
      expect(readFileSync(journeyFile, "utf8")).toBe(after);
    } finally { rmSync(root, { recursive: true, force: true }); }
  }, 120_000);
});
