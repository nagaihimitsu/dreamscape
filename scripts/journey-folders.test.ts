import { cpSync, existsSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
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
import { reasoningIntroCatalogSchema } from "../src/content/reasoning-intros";
import {
  balanceSchema, battleCatalogSchema, citySchema, dateCatalogSchema, effectCatalogSchema,
  presentationSchema, progressionSchema, responseProfileCatalogSchema,
} from "../src/content/schemas";
import { prepareContentFixture } from "../src/content/test-fixtures";
import { tourismCatalogSchema } from "../src/content/tourism-schemas";
import { travelCatalogSchema, travelSettingsSchema } from "../src/content/travel-schemas";
import { wordMeaningsSchema } from "../src/content/word-meanings";
import { GENERATED_PUBLIC_DIRECTORY, journeyDirectory, MIRROR_DIRECTORY, type CatalogKind } from "./content-layout";
import { buildContent } from "./content-pipeline";
import { listFiles, loadContentSources, readJourneyManifests } from "./content-sources";

// Acceptance tests of the journey-folder layout: a journey is one folder below
// content/journeys/, so adding, renaming or removing a folder is all it takes
// (plus `npm run content:build`). Every test works on one temporary copy of
// the repository's content and restores the copy's folders afterwards.

const repository = path.resolve(".");
const fixtureJourney = path.join(repository, "tests/fixtures/journeys/zz_fixture_trip");
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
  "learning/translations.json": learningCatalogSchema,
  "learning/word-meanings.json": wordMeaningsSchema,
  "presentation/characters.json": characterCatalogSchema,
  "presentation/dialogue-expressions.json": dialogueExpressionCatalogSchema,
  "presentation/dialogue-reactions.json": dialogueReactionCatalogSchema,
  "presentation/reasoning-intros.json": reasoningIntroCatalogSchema,
  "progression/journey.json": journeySchema,
  "romance/balance.json": balanceSchema,
  "romance/date_catalog.json": dateCatalogSchema,
  "romance/date_destinations.json": dateDestinationsSchema,
  "romance/effect_catalog.json": effectCatalogSchema,
  "romance/presentation.json": presentationSchema,
  "romance/progression.json": progressionSchema,
  "romance/response_profiles.json": responseProfileCatalogSchema,
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
  it("turns a copied folder with a new manifest ID into a new playable journey", async () => {
    const source = journeyDirectory(root, "golden_triangle");
    const clone = journeyDirectory(root, "gt_clone");
    const manifestFile = path.join(source, "manifest.json");
    const original = readFileSync(manifestFile, "utf8");
    // The folder name and the manifest ID are the journey's only identity.
    renameSync(source, clone);
    try {
      writeFileSync(path.join(clone, "manifest.json"), original.replace('"id": "golden_triangle"', '"id": "gt_clone"'));
      await expect(buildContent(root)).resolves.toBeDefined();

      const repositoryJourneys = readJourneyManifests(repository).map((item) => item.id);
      expect(journeyIds().map((item) => item.id)).toEqual(repositoryJourneys.map((id) => (id === "golden_triangle" ? "gt_clone" : id)));
      expect(journeyIds().find((item) => item.id === "gt_clone")?.status).toBe("available");

      const repositorySources = loadContentSources(repository);
      const storyIds = repositorySources.storyFiles.filter((story) => story.layer === "golden_triangle").map((story) => story.id);
      const quizIds = repositorySources.quizFiles.filter((quiz) => quiz.layer === "golden_triangle" && !quiz.sample)
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

  it("lists an added preparing journey folder in manifest order and serves its image", async () => {
    const target = journeyDirectory(root, "zz_fixture_trip");
    cpSync(fixtureJourney, target, { recursive: true });
    try {
      await expect(buildContent(root)).resolves.toBeDefined();
      // Order 25: after golden_triangle (20) and before uzbekistan (30), whatever the folder name.
      const manifests = [...readJourneyManifests(repository), { id: "zz_fixture_trip", order: readJson(path.join(target, "manifest.json")).order }]
        .sort((a, b) => a.order - b.order);
      expect(journeyIds().map((item) => item.id)).toEqual(manifests.map((item) => item.id));
      expect(journeyIds().find((item) => item.id === "zz_fixture_trip")?.status).toBe("preparing");
      expect(parseMirror()).toContain("zz_fixture_city");
      expect(mirror("romance/date_destinations.json").destinations.map((item: { id: string }) => item.id)).toContain("zz_fixture_square");
      expectAssembledImages(target);
    } finally {
      rmSync(target, { recursive: true, force: true });
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
