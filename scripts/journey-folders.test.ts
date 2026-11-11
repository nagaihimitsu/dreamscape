import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { sceneDataCatalogSchema, storyStateCatalogSchema } from "../src/content/scene-schemas";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { characterCatalogSchema } from "../src/content/character-assets";
import { dateDestinationsSchema } from "../src/content/date-destinations";
import { dialogueExpressionCatalogSchema } from "../src/content/dialogue-expressions";
import { dialogueReactionCatalogSchema } from "../src/content/dialogue-reactions";
import { encounterEntryRulesSchema } from "../src/content/encounter-entry-rules";
import { normalizeEncounterCatalog } from "../src/content/encounter-schemas";
import { journeyCatalogSchema } from "../src/content/journey-catalog";
import { journeySchema } from "../src/content/journey-schemas";
import { learningDetailsSchema } from "../src/content/learning-details";
import { learningCatalogSchema } from "../src/content/learning-schema";
import { localWordsCatalogSchema } from "../src/content/local-words";
import { ownArtworkCatalogSchema } from "../src/content/own-artwork-schema";
import {
  balanceSchema, battleCatalogSchema, citySchema, dateCatalogSchema, effectCatalogSchema,
  presentationSchema, progressionSchema, responseProfileCatalogSchema,
} from "../src/content/schemas";
import { prepareContentFixture } from "../src/content/test-fixtures";
import { tourismCatalogSchema } from "../src/content/tourism-schemas";
import { travelCatalogSchema, travelSettingsSchema } from "../src/content/travel-schemas";
import { wordMeaningsSchema } from "../src/content/word-meanings";
import { GENERATED_PUBLIC_DIRECTORY, journeyDirectory, MIRROR_DIRECTORY, SAMPLE_JOURNEY_DIRECTORY, SAMPLE_JOURNEY_ID, type CatalogKind } from "./content-layout";
import { buildContent } from "./content-pipeline";
import { journeyCatalogOf, listFiles, loadContentSources, readJourneyManifests } from "./content-sources";

// Acceptance tests of the journey-folder layout: a journey is one folder below
// content/journeys/, so adding, renaming or removing a folder is all it takes
// (plus `npm run content:build`). Every test works on one temporary copy of
// the repository's content and restores the copy's folders afterwards.

const repository = path.resolve(".");
const sampleJourney = path.join(repository, SAMPLE_JOURNEY_DIRECTORY);
let root: string;

beforeAll(async () => {
  root = mkdtempSync(path.join(tmpdir(), "dreamscape-journey-folders-"));
  await prepareContentFixture(root);
});
afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

const readJson = (file: string) => JSON.parse(readFileSync(file, "utf8"));
const mirror = (relative: string) => readJson(path.join(root, MIRROR_DIRECTORY, relative));
const generated = (file: string) => readJson(path.join(root, "src/content/generated", file));
const journeyIds = () => (mirror("journeys/catalog.json").journeys as { id: string; status: string }[]);

/** The schemas the game parses each generated catalog with (src/content/*.ts). */
const runtimeSchemas = {
  "battles/catalog.json": battleCatalogSchema,
  "encounters/catalog.json": { parse: (value: unknown) => normalizeEncounterCatalog(value, mirror("tourism/catalog.json").landmarks) },
  "encounters/entry-rules.json": encounterEntryRulesSchema,
  "journeys/catalog.json": journeyCatalogSchema,
  "learning/details.json": learningDetailsSchema,
  "learning/local-words.json": localWordsCatalogSchema,
  "learning/translations.json": learningCatalogSchema,
  "learning/word-meanings.json": wordMeaningsSchema,
  "presentation/characters.json": characterCatalogSchema,
  "presentation/dialogue-expressions.json": dialogueExpressionCatalogSchema,
  "presentation/dialogue-reactions.json": dialogueReactionCatalogSchema,
  // Not imported by the game: content:build checks the served images against it (scripts/image-rights.ts).
  "presentation/own-artwork.json": ownArtworkCatalogSchema,
  "progression/journey.json": journeySchema,
  "progression/story.json": storyStateCatalogSchema,
  "romance/balance.json": balanceSchema,
  "romance/date_catalog.json": dateCatalogSchema,
  "romance/date_destinations.json": dateDestinationsSchema,
  "romance/effect_catalog.json": effectCatalogSchema,
  "romance/presentation.json": presentationSchema,
  "romance/progression.json": progressionSchema,
  "romance/response_profiles.json": responseProfileCatalogSchema,
  "scenes/catalog.json": sceneDataCatalogSchema,
  "tourism/catalog.json": tourismCatalogSchema,
} satisfies Record<CatalogKind, { parse(value: unknown): unknown }>;

/** Parse the whole generated mirror the way the game imports it; returns its city IDs. */
function parseMirror(): string[] {
  for (const [kind, schema] of Object.entries(runtimeSchemas)) schema.parse(mirror(kind));
  const cityIds = listFiles(path.join(root, MIRROR_DIRECTORY, "cities")).map((file) => citySchema.parse(mirror(`cities/${file}`)).id);
  for (const id of cityIds) {
    expect(travelCatalogSchema.parse(mirror(`travel/${id}.json`)).cityId).toBe(id);
    travelSettingsSchema.parse(mirror(`travel/${id}-settings.json`));
  }
  return cityIds;
}

/** Every image of a journey folder's public/ is (or is no longer) served from the assembled folder. */
function expectAssembledImages(journeyFolder: string, served = true) {
  const files = listFiles(path.join(journeyFolder, "public"));
  expect(files.length).toBeGreaterThan(0);
  for (const relative of files) {
    const target = path.join(root, GENERATED_PUBLIC_DIRECTORY, relative);
    if (served) expect(statSync(target).size).toBe(statSync(path.join(journeyFolder, "public", relative)).size);
    else expect(existsSync(target)).toBe(false);
  }
}

describe("journey folders", () => {
  it("turns a renamed folder with a matching manifest ID into a playable journey under the new ID", async () => {
    const source = journeyDirectory(root, "golden_triangle");
    const clone = journeyDirectory(root, "gt_clone");
    const manifestFile = path.join(source, "manifest.json");
    const original = readFileSync(manifestFile, "utf8");
    // The folder name and the manifest ID are the journey's identity; its authoring files move with it.
    renameSync(source, clone);
    try {
      const renamed = original.replace('"id": "golden_triangle"', '"id": "gt_clone"');
      writeFileSync(path.join(clone, "manifest.json"), renamed);
      await expect(buildContent(root)).rejects.toThrow("Keep the authoring files of gt_clone below authoring/journeys/gt_clone/");
      writeFileSync(path.join(clone, "manifest.json"), renamed.replaceAll("authoring/journeys/golden_triangle/", "authoring/journeys/gt_clone/"));
      await expect(buildContent(root)).resolves.toBeDefined();

      const repositoryJourneys = readJourneyManifests(repository).map((item) => item.id);
      expect(journeyIds().map((item) => item.id)).toEqual(repositoryJourneys.map((id) => (id === "golden_triangle" ? "gt_clone" : id)));
      expect(journeyIds().find((item) => item.id === "gt_clone")?.status).toBe("available");

      const repositorySources = loadContentSources(repository);
      const storyIds = repositorySources.storyFiles.filter((story) => story.layer === "golden_triangle").map((story) => story.id);
      const quizIds = repositorySources.quizFiles.filter((quiz) => quiz.layer === "golden_triangle" && !quiz.example)
        .map((quiz) => readJson(quiz.file).id as string);
      expect(storyIds.length).toBeGreaterThan(0);
      expect(quizIds.length).toBeGreaterThan(0);
      expect(Object.keys(generated("stories.json"))).toEqual(expect.arrayContaining(storyIds));
      expect(Object.keys(generated("quizzes.json"))).toEqual(expect.arrayContaining(quizIds));

      const cityIds = parseMirror();
      const gt = readJson(path.join(clone, "manifest.json")).cities.map((city: { id: string }) => city.id);
      expect(cityIds).toEqual(expect.arrayContaining(gt));
      expectAssembledImages(clone);
    } finally {
      writeFileSync(path.join(clone, "manifest.json"), original);
      renameSync(clone, source);
    }
  });

  it("adds the sample journey folder as one more available journey, in manifest order, with its images", async () => {
    // A complete journey folder (the sample journey) next to the repository's journeys.
    const target = journeyDirectory(root, SAMPLE_JOURNEY_ID);
    cpSync(sampleJourney, target, { recursive: true });
    const manifestFile = path.join(target, "manifest.json");
    try {
      await expect(buildContent(root)).resolves.toBeDefined();
      const repositoryJourneys = journeyCatalogOf(loadContentSources(repository)).journeys;
      // Order 9000: after every other journey, which all stay as they were.
      expect(journeyIds()).toEqual([...repositoryJourneys.map(({ id, status }) => ({ id, status })), { id: SAMPLE_JOURNEY_ID, status: "available" }]
        .map((journey) => expect.objectContaining(journey)));
      expect(parseMirror()).toContain("mihon");
      expect(mirror("romance/date_destinations.json").destinations.map((item: { id: string }) => item.id)).toContain("mihon_tower_square");
      const sampleStories = loadContentSources(root).storyFiles.filter((story) => story.layer === SAMPLE_JOURNEY_ID).map((story) => story.id);
      expect(sampleStories.length).toBeGreaterThan(0);
      expect(Object.keys(generated("stories.json"))).toEqual(expect.arrayContaining(sampleStories));
      expectAssembledImages(target);

      // The same folder as a preparing journey takes its place by its manifest order, whatever its name.
      const manifest = readJson(manifestFile);
      writeFileSync(manifestFile, JSON.stringify({ ...manifest, order: 25, status: "preparing" }));
      await expect(buildContent(root, false)).resolves.toBeDefined();
      const manifests = [...readJourneyManifests(repository), { id: SAMPLE_JOURNEY_ID, order: 25 }].sort((a, b) => a.order - b.order);
      const catalog = journeyCatalogOf(loadContentSources(root)).journeys;
      expect(catalog.map((journey) => journey.id)).toEqual(manifests.map((item) => item.id));
      expect(catalog.find((journey) => journey.id === SAMPLE_JOURNEY_ID)?.status).toBe("preparing");
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it("merges the English-note details of two journey folders, each question opening its own story", async () => {
    // Test data (never shipped): one Golden Triangle question gets details and a learning story of its own.
    const folder = journeyDirectory(root, "golden_triangle");
    const detailsFile = path.join(folder, "learning/details.json");
    const storyFolder = path.join(folder, "stories/learning");
    mkdirSync(storyFolder);
    writeFileSync(path.join(storyFolder, "gt_english.ink"), [
      'VAR player_name = ""', 'VAR heroine_name = ""', 'VAR topic = ""', "# speaker: heroine", "{",
      '- topic == "gt_which_subject":', "    「世話をした人、Whoが主語だね。」", "    「だからdidは置かずに、looked afterがすぐ続くよ。」",
      "- else:", "    「この英文のまとまりを一緒に見よう。」", "}", "-> END", "",
    ].join("\n"));
    const details = { schemaVersion: 1, questions: { gt_agra_fort_jahanara_care: {
      storyId: "learning/gt_english",
      summaryJa: "主語はWho。主語を尋ねる疑問文なのでdidは置かず、過去形のlooked afterが続く。",
      segments: [{ textEn: "Who looked after Shah Jahan", meaningJa: "誰がシャー・ジャハーンの世話をしたか" }],
      topics: [{
        id: "gt_which_subject", category: "grammar", titleJa: "なぜdidがない？",
        explanationJa: "主語はWho。主語を尋ねる疑問文なのでdidは置かず、過去形のlooked afterが続く。",
        targetEn: "Who looked after Shah Jahan", exampleEn: "Who opened the window?", exampleJa: "誰が窓を開けましたか。",
        sourceUrl: "https://dictionary.cambridge.org/grammar/british-grammar/questions-wh-questions", checkedAt: "2026-11-02",
      }],
    } } };
    writeFileSync(detailsFile, JSON.stringify(details));
    try {
      await expect(buildContent(root)).resolves.toBeDefined();
      const merged = learningDetailsSchema.parse(mirror("learning/details.json"));
      expect(Object.entries(merged.questions).map(([id, detail]) => [id, detail.storyId])).toEqual([
        ["milano_last_supper_q1", "learning/milano_english"],
        ["milano_last_supper_q2", "learning/milano_english"],
        ["milano_last_supper_q3", "learning/milano_english"],
        ["gt_agra_fort_jahanara_care", "learning/gt_english"],
      ]);
      expect(Object.keys(generated("stories.json"))).toEqual(expect.arrayContaining(["learning/milano_english", "learning/gt_english"]));

      // A question without its story stops the build, naming only that journey's file.
      delete (details.questions.gt_agra_fort_jahanara_care as { storyId?: string }).storyId;
      writeFileSync(detailsFile, JSON.stringify(details));
      const error = await buildContent(root, false).then(() => undefined, (caught: Error) => caught);
      expect(error?.message.startsWith(`Invalid content in ${detailsFile}: `)).toBe(true);
      expect((error?.cause as { issues: { path: PropertyKey[] }[] }).issues.map((issue) => issue.path))
        .toEqual([["questions", "gt_agra_fort_jahanara_care", "storyId"]]);
    } finally {
      rmSync(detailsFile, { force: true });
      rmSync(storyFolder, { recursive: true, force: true });
    }
  });

  // Every journey folder can be left out: catalogs only one journey provides
  // (e.g. Milan's encounters or English-note details) become empty.
  it.each(readJourneyManifests(repository).map((item) => item.id))("still builds and parses without %s", async (journeyId) => {
    const folder = journeyDirectory(root, journeyId);
    const aside = path.join(root, `removed-${journeyId}`);
    renameSync(folder, aside);
    try {
      await expect(buildContent(root)).resolves.toBeDefined();
      expect(journeyIds().map((item) => item.id)).not.toContain(journeyId);
      expect(journeyIds().some((item) => item.status === "available")).toBe(true);
      const cities = readJson(path.join(aside, "manifest.json")).cities.map((city: { id: string }) => city.id);
      const mirrored = parseMirror();
      for (const city of cities) expect(mirrored).not.toContain(city);
      expectAssembledImages(aside, false);
      expect(existsSync(path.join(root, GENERATED_PUBLIC_DIRECTORY, "assets/items/item.svg"))).toBe(true);
    } finally {
      renameSync(aside, folder);
    }
  });
});
