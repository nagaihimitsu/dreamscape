import { existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { journeyCatalogSchema, type JourneyCatalog } from "../src/content/journey-catalog";
import { mergeCatalog, type CatalogSource, type MergedCatalog } from "./catalog-merge";
import {
  CATALOG_RULES,
  classifyContentFile,
  compareLayerFiles,
  coreLayerDirectory,
  JOURNEY_CATALOG_KIND,
  journeysDirectory,
  MANIFEST_FILE,
  MANIFEST_ONLY_KEYS,
  toPosix,
  type CatalogKind,
  type LayerType,
} from "./content-layout";

export type ContentLayer = { id: string; type: LayerType; directory: string };
/** A journey folder's `manifest.json` (unvalidated apart from id, order and schemaVersion). */
export type JourneyManifest = { id: string; order: number; directory: string; file: string; data: Record<string, unknown> };
/** City file plus the travel files expected next to it in the same layer. */
export type CitySource = { id: string; layer: string; file: string; travelFile: string; settingsFile: string };
export type StorySource = { id: string; file: string; layer: string };
export type QuizSource = { file: string; layer: string; sample: boolean };

export type ContentSources = {
  root: string;
  layers: ContentLayer[];
  /** Journey manifests in layer order. */
  manifests: JourneyManifest[];
  /** Merged, unvalidated catalogs with provenance; a kind no layer provides is absent. */
  catalogs: Partial<Record<CatalogKind, MergedCatalog>>;
  cities: CitySource[];
  storyFiles: StorySource[];
  quizFiles: QuizSource[];
  /** Static file roots served by the game: root `public/`, then each journey's `public/`. */
  publicRoots: string[];
};

type LayerFile = { layer: ContentLayer; layerIndex: number; relative: string; file: string };

function readJson(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read JSON ${file}`, { cause: error });
  }
}

/** Files below `directory` (posix paths relative to it); dot entries are skipped. */
function listFiles(directory: string, skipDirectory: (relative: string) => boolean = () => false, prefix = ""): string[] {
  return readdirSync(path.join(directory, prefix), { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".")) return [];
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (!entry.isDirectory()) return [relative];
    return skipDirectory(relative) ? [] : listFiles(directory, skipDirectory, relative);
  });
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Every journey folder below `content/journeys/` with its `manifest.json`,
 * sorted by the manifest `order`. A folder must be named after its journey
 * ID, and every folder must have a manifest with a unique integer order.
 */
export function readJourneyManifests(root: string): JourneyManifest[] {
  const journeys = journeysDirectory(root);
  if (!existsSync(journeys)) return [];
  const manifests = readdirSync(journeys, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort()
    .map((id): JourneyManifest => {
      const directory = path.join(journeys, id);
      const file = path.join(directory, MANIFEST_FILE);
      if (!existsSync(file)) throw new Error(`Missing journey manifest: ${file}`);
      const data = readJson(file);
      if (!isObject(data)) throw new Error(`Expected a JSON object in ${file}`);
      if (data.schemaVersion !== 1) throw new Error(`Unsupported journey manifest schemaVersion in ${file}: ${JSON.stringify(data.schemaVersion)}`);
      if (data.id !== id) throw new Error(`Journey folder name must equal the manifest id: ${file} has id ${JSON.stringify(data.id)}`);
      if (!Number.isSafeInteger(data.order)) throw new Error(`Journey manifest order must be an integer: ${file}`);
      return { id, order: data.order as number, directory, file, data };
    });
  const byOrder = new Map<number, JourneyManifest>();
  for (const manifest of manifests) {
    const previous = byOrder.get(manifest.order);
    if (previous) throw new Error(`Duplicate journey order ${manifest.order}: ${previous.file} and ${manifest.file}`);
    byOrder.set(manifest.order, manifest);
  }
  return manifests.sort((a, b) => a.order - b.order);
}

/**
 * The journey catalog generated from the manifests: every manifest without
 * its manifest-only keys (schemaVersion, order, authoring), in manifest order.
 */
export function journeyCatalogFromManifests(manifests: readonly JourneyManifest[]): MergedCatalog {
  const journeys = manifests.map((manifest) =>
    Object.fromEntries(Object.entries(manifest.data).filter(([key]) => !MANIFEST_ONLY_KEYS.includes(key))));
  const files = manifests.map((manifest) => manifest.file);
  return { value: { schemaVersion: 1, journeys }, provenance: { files, items: { journeys: files }, keys: {}, values: {} } };
}

/** The validated journey catalog of `root` (generated from the journey manifests). */
export function readJourneyCatalog(root: string): JourneyCatalog {
  return journeyCatalogSchema.parse(journeyCatalogFromManifests(readJourneyManifests(root)).value);
}

/**
 * Content layers: the core layer (`content/` without the journey folders),
 * then every journey folder below `content/journeys/` in manifest order.
 */
export function contentLayers(root: string, manifests = readJourneyManifests(root)): ContentLayer[] {
  return [
    { id: "core", type: "core", directory: coreLayerDirectory(root) },
    ...manifests.map(({ id, directory }): ContentLayer => ({ id, type: "journey", directory })),
  ];
}

/**
 * Read every content layer synchronously and merge it into one view.
 * Throws on files outside the layout, merge conflicts and duplicate files;
 * the merged data itself is validated by the content pipeline.
 */
export function loadContentSources(root: string): ContentSources {
  const manifests = readJourneyManifests(root);
  const layers = contentLayers(root, manifests);
  const files: LayerFile[] = layers.flatMap((layer, layerIndex) => {
    const skip = layer.type === "core"
      ? (relative: string) => relative.startsWith("journeys/") && relative.split("/").length === 2
      : () => false;
    return listFiles(layer.directory, skip).map((relative) => ({
      layer, layerIndex, relative, file: path.join(layer.directory, relative),
    }));
  }).sort(compareLayerFiles);

  const catalogFiles = new Map<CatalogKind, LayerFile[]>();
  const cityFiles: (LayerFile & { id: string })[] = [];
  const travelFiles: (LayerFile & { cityId: string })[] = [];
  const storyFiles: StorySource[] = [];
  const storyFileById = new Map<string, string>();
  const quizFiles: QuizSource[] = [];
  for (const item of files) {
    const type = classifyContentFile(item.relative, item.layer.type);
    if (type.type === "unknown") {
      const hint = item.layer.type === "core" && item.relative === JOURNEY_CATALOG_KIND
        ? " (journeys are registered by content/journeys/<journeyId>/manifest.json)" : "";
      throw new Error(`Unknown content file: ${item.file}${hint}`);
    }
    if (type.type === "catalog") catalogFiles.set(type.kind, [...(catalogFiles.get(type.kind) ?? []), item]);
    else if (type.type === "city") cityFiles.push({ ...item, id: type.id });
    else if (type.type === "travel") travelFiles.push({ ...item, cityId: type.cityId });
    else if (type.type === "quiz") quizFiles.push({ file: item.file, layer: item.layer.id, sample: type.sample });
    else if (type.type === "story") {
      const previous = storyFileById.get(type.id);
      if (previous) throw new Error(`Duplicate story ID ${type.id}: ${previous} and ${item.file}`);
      storyFileById.set(type.id, item.file);
      storyFiles.push({ id: type.id, file: item.file, layer: item.layer.id });
    }
  }

  const catalogs: Partial<Record<CatalogKind, MergedCatalog>> = { [JOURNEY_CATALOG_KIND]: journeyCatalogFromManifests(manifests) };
  for (const rule of CATALOG_RULES) {
    // Layer order (core first), not path order, decides the merge order.
    const sources: CatalogSource[] = (catalogFiles.get(rule.kind) ?? [])
      .sort((a, b) => a.layerIndex - b.layerIndex)
      .map((item) => ({ file: item.file, core: item.layer.type === "core", data: readJson(item.file) }));
    const merged = mergeCatalog(rule, sources);
    if (merged) catalogs[rule.kind] = merged;
  }

  const cities: CitySource[] = [];
  const cityLayer = new Map<string, LayerFile>();
  for (const item of cityFiles) {
    const previous = cityLayer.get(item.id);
    if (previous) throw new Error(`Duplicate city file: ${previous.file} and ${item.file}`);
    cityLayer.set(item.id, item);
    const travel = path.join(item.layer.directory, "travel");
    cities.push({
      id: item.id, layer: item.layer.id, file: item.file,
      travelFile: path.join(travel, `${item.id}.json`), settingsFile: path.join(travel, `${item.id}-settings.json`),
    });
  }
  for (const item of travelFiles)
    if (cityLayer.get(item.cityId)?.layer !== item.layer)
      throw new Error(`Travel file without a city in the same layer: ${item.file}`);

  const publicRoots = [path.join(root, "public"), ...layers
    .filter((layer) => layer.type === "journey")
    .map((layer) => path.join(layer.directory, "public"))
    .filter((directory) => existsSync(directory))];
  return { root, layers, manifests, catalogs, cities, storyFiles, quizFiles, publicRoots };
}

/** Root-relative posix path for messages, e.g. `content/stories/milano/sound_cafe_01.ink`. */
export function displayPath(root: string, file: string): string {
  return toPosix(path.relative(root, file));
}

/**
 * Write the validated merged view to `directory` (the generated mirror) with
 * the old `content/` relative paths: catalogs as formatted JSON, city and
 * travel files byte for byte. Files are written in place, unchanged files
 * are left untouched and files no longer produced are removed.
 */
export function writeContentMirror(sources: ContentSources, directory: string): void {
  const outputs = new Map<string, Buffer>();
  for (const [kind, merged] of Object.entries(sources.catalogs) as [CatalogKind, MergedCatalog][])
    outputs.set(kind, Buffer.from(`${JSON.stringify(merged.value, null, 2)}\n`));
  for (const city of sources.cities) {
    outputs.set(`cities/${city.id}.json`, readFileSync(city.file));
    outputs.set(`travel/${city.id}.json`, readFileSync(city.travelFile));
    outputs.set(`travel/${city.id}-settings.json`, readFileSync(city.settingsFile));
  }
  const existing = existsSync(directory) ? listFiles(directory) : [];
  for (const relative of existing)
    if (!outputs.has(relative)) rmSync(path.join(directory, relative), { force: true });
  for (const [relative, data] of outputs) {
    const file = path.join(directory, relative);
    if (existsSync(file) && readFileSync(file).equals(data)) continue;
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, data);
  }
  removeEmptyDirectories(directory);
}

/** Remove empty directories below and including `directory`; true when it was removed. */
function removeEmptyDirectories(directory: string): boolean {
  if (!existsSync(directory)) return false;
  let empty = true;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const removed = entry.isDirectory() && removeEmptyDirectories(path.join(directory, entry.name));
    if (!removed) empty = false;
  }
  if (empty) rmdirSync(directory);
  return empty;
}
