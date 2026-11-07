import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { journeyCatalogSchema, type JourneyCatalog } from "../src/content/journey-catalog";
import { localIssuePath, mergeCatalog, sourceFileOf, type CatalogSource, type MergedCatalog } from "./catalog-merge";
import {
  absentCatalog,
  CATALOG_RULES,
  classifyContentFile,
  compareLayerFiles,
  CONTENT_DIRECTORY,
  coreLayerDirectory,
  JOURNEY_CATALOG_KIND,
  JOURNEYS_DIRECTORY,
  journeysDirectory,
  MANIFEST_FILE,
  MANIFEST_ONLY_KEYS,
  toPosix,
  type CatalogKind,
  type LayerType,
} from "./content-layout";

// The single reader of the content: readContentTree reads every content file
// once (synchronously), and contentSourcesFromTree assembles the layers, the
// merged catalogs and every city, travel, quiz and Ink file from what was
// read, without touching the disk. The content pipeline validates and writes
// that view; the authoring tools look up the same view.

export type ContentLayer = { id: string; type: LayerType; directory: string };
/** A journey folder's `manifest.json` (unvalidated apart from id, order and schemaVersion). */
export type JourneyManifest = { id: string; order: number; directory: string; file: string; data: Record<string, unknown> };
/**
 * A city file and the travel files next to it in the same layer: their paths,
 * their parsed (unvalidated) JSON and their bytes, which the generated mirror
 * copies unchanged.
 */
export type CitySource = {
  id: string; layer: string;
  file: string; travelFile: string; settingsFile: string;
  data: unknown; travel: unknown; settings: unknown;
  bytes: { city: Buffer; travel: Buffer; settings: Buffer };
};
/** An Ink file and its text. */
export type StorySource = { id: string; file: string; layer: string; source: string };
/** A quiz file and its parsed (unvalidated) JSON. */
export type QuizSource = { file: string; layer: string; sample: boolean; data: unknown };

/**
 * The content files of a repository as read from disk: every file below
 * `content/` and `public/` (dot entries skipped), keyed by its posix path
 * relative to `root` (e.g. `content/journeys/milano/manifest.json`), with the
 * bytes of each data file (`.json` and `.ink` outside the journeys' `public/`
 * folders) and null for the files that are only listed (images, notes).
 */
export type ContentTree = {
  root: string;
  /**
   * Journey folder names (= journey IDs), sorted: every folder directly below
   * `content/journeys/` (dot folders skipped) and every extra journey folder.
   */
  journeyFolders: string[];
  /**
   * Extra journey folders outside `content/journeys/` (ContentLoadOptions):
   * journey ID → the folder's posix path relative to `root`.
   */
  extraJourneyFolders?: Readonly<Record<string, string>>;
  files: ReadonlyMap<string, Buffer | null>;
};

export type ContentLoadOptions = {
  /**
   * Journey folders outside `content/journeys/` that are loaded as journey
   * layers too (paths relative to `root`, or absolute, inside `root` but not
   * inside `content/`; the folder name is the journey ID). Only explicit
   * callers pass them: `content:build --with-sample` passes the sample journey
   * (SAMPLE_JOURNEY_DIRECTORY); the authoring tools never do.
   */
  extraJourneyDirectories?: readonly string[];
};

export type ContentSources = {
  root: string;
  layers: ContentLayer[];
  /** Journey manifests in layer order. */
  manifests: JourneyManifest[];
  /**
   * Merged, unvalidated catalogs with provenance. A journey kind no layer
   * provides is its empty value (absentCatalog, no provenance files); a
   * missing core-layer kind is absent.
   */
  catalogs: Partial<Record<CatalogKind, MergedCatalog>>;
  cities: CitySource[];
  storyFiles: StorySource[];
  quizFiles: QuizSource[];
  /** Static file roots served by the game: root `public/`, then each journey's `public/` that has files. */
  publicRoots: string[];
  /** Every served file: URL path (posix, e.g. `assets/items/item.svg`) → its file, in root order. */
  publicFiles: ReadonlyMap<string, string>;
  /** What was read; selectJourneys assembles a part of it again. */
  tree: ContentTree;
};

type LayerFile = { layer: ContentLayer; layerIndex: number; relative: string; file: string; bytes: Buffer | null };

const CONTENT_PREFIX = `${CONTENT_DIRECTORY}/`;
const JOURNEYS_PREFIX = `${CONTENT_DIRECTORY}/${JOURNEYS_DIRECTORY}/`;
const PUBLIC_PREFIX = "public/";

function parseJson(file: string, bytes: Buffer): unknown {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new Error(`Cannot read JSON ${file}`, { cause: error });
  }
}

/** Files below `directory` (posix paths relative to it); dot entries are skipped. */
export function listFiles(directory: string, skipDirectory: (relative: string) => boolean = () => false, prefix = ""): string[] {
  return readdirSync(path.join(directory, prefix), { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".")) return [];
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (!entry.isDirectory()) return [relative];
    return skipDirectory(relative) ? [] : listFiles(directory, skipDirectory, relative);
  });
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The posix folder of a journey of `tree`, relative to its root (`content/journeys/<id>` or an extra folder). */
export function journeyFolderPath(tree: Pick<ContentTree, "extraJourneyFolders">, journeyId: string): string {
  return tree.extraJourneyFolders?.[journeyId] ?? `${JOURNEYS_PREFIX}${journeyId}`;
}

/**
 * The journey folder a tree path lies in (`content/journeys/<id>/…` or an
 * extra journey folder) and the path relative to that folder, if any.
 */
export function journeyFileOf(tree: Pick<ContentTree, "extraJourneyFolders">, treePath: string): { journey: string; relative: string } | undefined {
  if (treePath.startsWith(JOURNEYS_PREFIX)) {
    const rest = treePath.slice(JOURNEYS_PREFIX.length);
    const slash = rest.indexOf("/");
    return slash > 0 ? { journey: rest.slice(0, slash), relative: rest.slice(slash + 1) } : undefined;
  }
  for (const [journey, folder] of Object.entries(tree.extraJourneyFolders ?? {}))
    if (treePath.startsWith(`${folder}/`)) return { journey, relative: treePath.slice(folder.length + 1) };
  return undefined;
}

/** Data files are read; images (a journey's `public/`) and notes are only listed. `relative` is the path inside its journey folder. */
function isDataFile(treePath: string, journey: { relative: string } | undefined): boolean {
  if (!treePath.endsWith(".json") && !treePath.endsWith(".ink")) return false;
  return !journey || !journey.relative.startsWith(PUBLIC_PREFIX);
}

/**
 * The extra journey folders of `root` (ContentLoadOptions) as journey ID →
 * posix path relative to `root`. Each must be an existing folder inside
 * `root`, outside `content/`, named like no other journey folder.
 */
function resolveExtraJourneyFolders(root: string, directories: readonly string[], journeyFolders: readonly string[]): Record<string, string> {
  const folders: Record<string, string> = {};
  for (const directory of directories) {
    const absolute = path.resolve(root, directory);
    const relative = toPosix(path.relative(root, absolute));
    const id = path.basename(absolute);
    if (!relative || relative.startsWith("../") || relative === ".." || path.isAbsolute(relative) || relative === CONTENT_DIRECTORY || relative.startsWith(CONTENT_PREFIX))
      throw new Error(`Extra journey folder must lie inside ${root} and outside content/: ${directory}`);
    if (!existsSync(absolute) || !statSync(absolute).isDirectory()) throw new Error(`Missing extra journey folder: ${absolute}`);
    const other = journeyFolders.includes(id) ? `${JOURNEYS_PREFIX}${id}` : folders[id];
    if (other) throw new Error(`Journey folder ${id} exists twice: ${other} and ${relative}`);
    folders[id] = relative;
  }
  return folders;
}

/**
 * Read the content of `root` from disk: every file below `content/` and
 * `public/` and in the extra journey folders, data files with their bytes.
 * With `scope` "manifests" only the journey folders and their manifests are
 * read (for readJourneyManifests).
 */
export function readContentTree(root: string, scope: "all" | "manifests" = "all", options: ContentLoadOptions = {}): ContentTree {
  const journeys = journeysDirectory(root);
  const contentFolders = existsSync(journeys)
    ? readdirSync(journeys, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => entry.name)
    : [];
  const extra = resolveExtraJourneyFolders(root, options.extraJourneyDirectories ?? [], contentFolders);
  const tree = {
    root,
    journeyFolders: [...contentFolders, ...Object.keys(extra)].sort(),
    ...(Object.keys(extra).length ? { extraJourneyFolders: extra } : {}),
  };
  const files = new Map<string, Buffer | null>();
  if (scope === "manifests") {
    for (const id of tree.journeyFolders) {
      const treePath = `${journeyFolderPath(tree, id)}/${MANIFEST_FILE}`;
      const file = path.join(root, treePath);
      if (existsSync(file) && statSync(file).isFile()) files.set(treePath, readFileSync(file));
    }
    return { ...tree, files };
  }
  const add = (treePath: string) => files.set(treePath, isDataFile(treePath, journeyFileOf(tree, treePath)) ? readFileSync(path.join(root, treePath)) : null);
  for (const relative of listFiles(coreLayerDirectory(root))) add(`${CONTENT_PREFIX}${relative}`);
  for (const folder of Object.values(extra)) for (const relative of listFiles(path.join(root, folder))) add(`${folder}/${relative}`);
  const shared = path.join(root, "public");
  if (existsSync(shared)) for (const relative of listFiles(shared)) files.set(`${PUBLIC_PREFIX}${relative}`, null);
  return { ...tree, files };
}

/**
 * A ContentTree from files in memory (posix paths relative to `root` →
 * contents; null for a listed file that is not read, such as an image), for
 * tests and tools that check content without writing it to disk.
 */
export function contentTreeFromFiles(
  root: string,
  files: Readonly<Record<string, string | Buffer | null>>,
  extraJourneyFolders: Readonly<Record<string, string>> = {},
): ContentTree {
  const tree = new Map(Object.entries(files).map(([treePath, data]): [string, Buffer | null] =>
    [treePath, data === null ? null : Buffer.isBuffer(data) ? data : Buffer.from(data)]));
  const folders = Object.keys(extraJourneyFolders).length ? { extraJourneyFolders } : {};
  const journeyFolders = [...new Set([...tree.keys()].map((treePath) => journeyFileOf(folders, treePath)?.journey)
    .filter((id): id is string => !!id && !id.startsWith(".")))].sort();
  return { root, journeyFolders, ...folders, files: tree };
}

/**
 * The journey manifests of a tree, sorted by their `order`. A folder must be
 * named after its journey ID, and every folder must have a manifest with a
 * unique integer order.
 */
function manifestsFromTree(tree: ContentTree): JourneyManifest[] {
  const manifests = tree.journeyFolders.map((id): JourneyManifest => {
    const directory = path.join(tree.root, journeyFolderPath(tree, id));
    const file = path.join(directory, MANIFEST_FILE);
    const bytes = tree.files.get(`${journeyFolderPath(tree, id)}/${MANIFEST_FILE}`);
    if (!bytes) throw new Error(`Missing journey manifest: ${file}`);
    const data = parseJson(file, bytes);
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
 * Every journey folder below `content/journeys/` (and every extra journey
 * folder of `options`) with its `manifest.json`, sorted by the manifest
 * `order` (reads only the manifests).
 */
export function readJourneyManifests(root: string, options: ContentLoadOptions = {}): JourneyManifest[] {
  return manifestsFromTree(readContentTree(root, "manifests", options));
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

/** Without any journey folder there is nothing to play; name the file that registers one. */
export function requireJourneyManifests(manifests: readonly JourneyManifest[]): void {
  if (!manifests.length)
    throw new Error("旅行編が登録されていません: content/journeys/<旅行編ID>/manifest.json を追加してください（No journey folder with a manifest.json below content/journeys/）。");
}

/** The validated journey catalog of loaded sources (generated from the journey manifests). */
export function journeyCatalogOf(sources: Pick<ContentSources, "manifests" | "catalogs">): JourneyCatalog {
  requireJourneyManifests(sources.manifests);
  return journeyCatalogSchema.parse(sources.catalogs[JOURNEY_CATALOG_KIND]!.value);
}

/** The validated journey catalog of `root` (reads only the journey manifests). */
export function readJourneyCatalog(root: string): JourneyCatalog {
  const manifests = readJourneyManifests(root);
  return journeyCatalogOf({ manifests, catalogs: { [JOURNEY_CATALOG_KIND]: journeyCatalogFromManifests(manifests) } });
}

/**
 * Content layers: the core layer (`content/` without the journey folders),
 * then every journey folder (below `content/journeys/` and the extra ones)
 * in manifest order.
 */
export function contentLayers(root: string, manifests = readJourneyManifests(root)): ContentLayer[] {
  return [
    { id: "core", type: "core", directory: coreLayerDirectory(root) },
    ...manifests.map(({ id, directory }): ContentLayer => ({ id, type: "journey", directory })),
  ];
}

/** Read every content layer of `root` and assemble it (readContentTree, then contentSourcesFromTree). */
export function loadContentSources(root: string, options: ContentLoadOptions = {}): ContentSources {
  return contentSourcesFromTree(readContentTree(root, "all", options));
}

/**
 * Assemble the content layers of a tree into one view, without reading the
 * disk. Throws on files outside the layout, merge conflicts, duplicate files,
 * unreadable JSON and a public file served by two folders; the merged data
 * itself is validated by the content pipeline (validateContent).
 */
export function contentSourcesFromTree(tree: ContentTree): ContentSources {
  const { root } = tree;
  const manifests = manifestsFromTree(tree);
  const layers = contentLayers(root, manifests);
  const layerIndex = new Map(layers.map((layer, index) => [layer.id, index]));
  const files: LayerFile[] = [];
  for (const [treePath, bytes] of tree.files) {
    const journey = journeyFileOf(tree, treePath);
    if (!journey && !treePath.startsWith(CONTENT_PREFIX)) continue;
    const index = journey === undefined ? 0 : layerIndex.get(journey.journey);
    if (index === undefined) continue;
    const layer = layers[index];
    const relative = journey === undefined ? treePath.slice(CONTENT_PREFIX.length) : journey.relative;
    files.push({ layer, layerIndex: index, relative, file: path.join(root, treePath), bytes });
  }
  files.sort(compareLayerFiles);
  const bytesOf = (item: LayerFile): Buffer => item.bytes ?? Buffer.alloc(0);

  const catalogFiles = new Map<CatalogKind, LayerFile[]>();
  const cityFiles: (LayerFile & { id: string })[] = [];
  const travelFiles: (LayerFile & { cityId: string })[] = [];
  const stories: StorySource[] = [];
  const storyFileById = new Map<string, string>();
  const quizzes: (LayerFile & { sample: boolean })[] = [];
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
    else if (type.type === "quiz") quizzes.push({ ...item, sample: type.sample });
    else if (type.type === "story") {
      const previous = storyFileById.get(type.id);
      if (previous) throw new Error(`Duplicate story ID ${type.id}: ${previous} and ${item.file}`);
      storyFileById.set(type.id, item.file);
      stories.push({ id: type.id, file: item.file, layer: item.layer.id, source: bytesOf(item).toString("utf8") });
    }
  }

  const catalogs: Partial<Record<CatalogKind, MergedCatalog>> = { [JOURNEY_CATALOG_KIND]: journeyCatalogFromManifests(manifests) };
  for (const rule of CATALOG_RULES) {
    // Layer order (core first), not path order, decides the merge order.
    const sources: CatalogSource[] = (catalogFiles.get(rule.kind) ?? [])
      .sort((a, b) => a.layerIndex - b.layerIndex)
      .map((item) => ({ file: item.file, core: item.layer.type === "core", data: parseJson(item.file, bytesOf(item)) }));
    const absent = sources.length ? undefined : absentCatalog(rule.kind);
    const merged = absent ? { value: absent, provenance: { files: [], items: {}, keys: {}, values: {} } } : mergeCatalog(rule, sources);
    if (merged) catalogs[rule.kind] = merged;
  }

  const cityLayers = new Map<string, LayerFile>();
  for (const item of cityFiles) {
    const previous = cityLayers.get(item.id);
    if (previous) throw new Error(`Duplicate city file: ${previous.file} and ${item.file}`);
    cityLayers.set(item.id, item);
  }
  // Missing files are named with what to add (Japanese first, like the missing-manifest message).
  // travel/<city>.json is the city's 移動データ, travel/<city>-settings.json its 移動の設定, in every message.
  const travelLabel = (file: string) => file.endsWith("-settings.json") ? "移動の設定" : "移動データ";
  for (const item of travelFiles) {
    const city = cityLayers.get(item.cityId);
    if (city?.layer === item.layer) continue;
    const label = travelLabel(item.file);
    throw new Error(city
      ? `都市 ${item.cityId} の${label} ${item.file} は、都市ファイル ${city.file} と同じ旅行編フォルダの travel/ に置いてください` +
        "（Travel file without a city in the same layer）。"
      : `都市ファイル ${path.join(item.layer.directory, "cities", `${item.cityId}.json`)} がありません。${item.file} は都市 ${item.cityId} の${label}です。` +
        `都市ファイルを追加するか、この${label}を消してください（Travel file without a city in the same layer）。`);
  }

  // JSON of quizzes, then of every city with its travel settings and travel files.
  const quizFiles = quizzes.map((item): QuizSource =>
    ({ file: item.file, layer: item.layer.id, sample: item.sample, data: parseJson(item.file, bytesOf(item)) }));
  /** A travel file every city file needs next to it; missing, the error says which file to add and what it holds. */
  const readTravel = (city: LayerFile & { id: string }, file: string, settings: boolean): Buffer => {
    const bytes = tree.files.get(toPosix(path.relative(root, file)));
    if (bytes) return bytes;
    const [holds, english] = settings
      ? ["宿の地点・宿泊費・再挑戦の間隔", "Missing travel settings file"]
      : ["地点・経路・地図のイベント", "Missing travel file"];
    throw new Error(`${travelLabel(file)} ${file} がありません。都市 ${city.id}（${city.file}）の${holds}を書くファイルです（${english} of city ${city.id}）。`);
  };
  const cities = cityFiles.map((item): CitySource => {
    const travel = path.join(item.layer.directory, "travel");
    const travelFile = path.join(travel, `${item.id}.json`);
    const settingsFile = path.join(travel, `${item.id}-settings.json`);
    const city = bytesOf(item);
    const data = parseJson(item.file, city);
    const settingsBytes = readTravel(item, settingsFile, true);
    const settings = parseJson(settingsFile, settingsBytes);
    const travelBytes = readTravel(item, travelFile, false);
    return {
      id: item.id, layer: item.layer.id, file: item.file, travelFile, settingsFile,
      data, travel: parseJson(travelFile, travelBytes), settings,
      bytes: { city, travel: travelBytes, settings: settingsBytes },
    };
  });

  const publicDirectories = [path.join(root, "public"), ...layers
    .filter((layer) => layer.type === "journey")
    .map((layer) => path.join(layer.directory, "public"))];
  const publicFiles = new Map<string, string>();
  const servedRoots = new Set<string>([publicDirectories[0]]);
  for (const directory of publicDirectories) {
    const prefix = `${toPosix(path.relative(root, directory))}/`;
    const served = [...tree.files.keys()].filter((treePath) => treePath.startsWith(prefix)).sort();
    for (const treePath of served) {
      const relative = treePath.slice(prefix.length);
      const file = path.join(root, treePath);
      const previous = publicFiles.get(relative);
      if (previous) throw duplicatePublicFileError(root, relative, [previous, file]);
      publicFiles.set(relative, file);
      servedRoots.add(directory);
    }
  }

  return {
    root, layers, manifests, catalogs, cities, storyFiles: stories, quizFiles,
    publicRoots: publicDirectories.filter((directory) => servedRoots.has(directory)), publicFiles, tree,
  };
}

/**
 * The sources of the core layer and the given journey folders only: what
 * content:build reads when the other journey folders are removed. Lets a
 * test or tool validate one journey layer (with the core layer) in memory.
 */
export function selectJourneys(sources: ContentSources, journeyIds: readonly string[]): ContentSources {
  const { tree } = sources;
  for (const id of journeyIds)
    if (!tree.journeyFolders.includes(id)) throw new Error(`Unknown journey folder: ${id}`);
  const keep = (treePath: string) => {
    const journey = journeyFileOf(tree, treePath)?.journey;
    return journey === undefined || !tree.journeyFolders.includes(journey) || journeyIds.includes(journey);
  };
  const extra = Object.entries(tree.extraJourneyFolders ?? {}).filter(([id]) => journeyIds.includes(id));
  return contentSourcesFromTree({
    root: tree.root,
    journeyFolders: tree.journeyFolders.filter((id) => journeyIds.includes(id)),
    ...(extra.length ? { extraJourneyFolders: Object.fromEntries(extra) } : {}),
    files: new Map([...tree.files].filter(([treePath]) => keep(treePath))),
  });
}

/** Two public folders serve the same URL path: the game would serve only one of them. */
export function duplicatePublicFileError(root: string, assetPath: string, files: readonly string[]): Error {
  return new Error(`Public file ${assetPath} exists in more than one public folder: ${files.map((file) => displayPath(root, file)).join(" and ")}`);
}

/** Static file roots served by the game: root `public/`, then each journey layer's existing `public/`. */
export function publicRoots(root: string, layers: readonly ContentLayer[] = contentLayers(root)): string[] {
  return [path.join(root, "public"), ...layers
    .filter((layer) => layer.type === "journey")
    .map((layer) => path.join(layer.directory, "public"))
    .filter((directory) => existsSync(directory))];
}

/**
 * Parse the merged `kind` with its schema. Errors name the layer file each
 * failing entry comes from (provenance), with the issue paths as positions
 * inside that file (localIssuePath); the cause keeps the merged positions.
 * Issues without a single source file (e.g. a rule over the whole merged
 * list) name every file of the catalog with the merged positions.
 */
export function parseCatalog<T>(sources: Pick<ContentSources, "catalogs">, schema: { parse(value: unknown): T }, kind: CatalogKind): T {
  const merged = sources.catalogs[kind];
  if (!merged) throw new Error(`Missing content file: ${kind} (no content layer provides it)`);
  try {
    return schema.parse(merged.value);
  } catch (error) {
    const issues = (error as { issues?: { path?: PropertyKey[] }[] }).issues ?? [];
    const located = issues.map((issue) => ({ issue, file: sourceFileOf(merged.provenance, issue.path ?? []) }));
    if (located.length && located.every((item) => item.file)) {
      const byFile = new Map<string, unknown[]>();
      for (const { issue, file } of located)
        byFile.set(file!, [...(byFile.get(file!) ?? []), { ...issue, path: localIssuePath(merged.provenance, issue.path ?? []) }]);
      throw new Error([...byFile].map(([file, fileIssues]) => `Invalid content in ${file}: ${JSON.stringify(fileIssues, null, 2)}`).join("\n"),
        { cause: error });
    }
    const label = merged.provenance.files.join(", ") || `${kind} (no content layer provides it)`;
    throw new Error(
      `Invalid content in ${label}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

/** Parse one loaded file's JSON with its schema; errors name the file. */
export function parseSourceFile<T>(schema: { parse(value: unknown): T }, file: string, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    throw new Error(
      `Invalid content in ${file}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

/** The city's files (city plus travel files in the same layer), or a clear error when no layer has them. */
export function requireCity(sources: ContentSources, cityId: string): CitySource {
  const city = sources.cities.find((item) => item.id === cityId);
  if (!city) throw new Error(`Missing content file: cities/${cityId}.json (no content layer provides it)`);
  return city;
}

/** The Ink file of a story ID in whichever layer provides it. */
export function storyFile(sources: ContentSources, storyId: string): string | undefined {
  return sources.storyFiles.find((story) => story.id === storyId)?.file;
}

/**
 * The layer that holds (or will hold) a journey's city files: the one layer
 * where its existing cities live, else the journey's own folder.
 */
export function journeyLayer(sources: ContentSources, journeyId: string): ContentLayer {
  const manifest = sources.manifests.find((item) => item.id === journeyId);
  if (!manifest) throw new Error(`Unknown journey: ${journeyId}`);
  const planned = Array.isArray(manifest.data.cities) ? manifest.data.cities as { id?: unknown }[] : [];
  const layerIds = new Set(sources.cities.filter((city) => planned.some((item) => item.id === city.id)).map((city) => city.layer));
  if (layerIds.size > 1) throw new Error(`Journey cities must live in one content layer: ${journeyId} (${[...layerIds].join(", ")})`);
  const layerId = [...layerIds][0] ?? journeyId;
  return sources.layers.find((layer) => layer.id === layerId)!;
}

/** The layer that owns a city: the one with its city file, else the layer of its journey's cities. */
export function cityLayer(sources: ContentSources, cityId: string): ContentLayer {
  const city = sources.cities.find((item) => item.id === cityId);
  if (city) return sources.layers.find((layer) => layer.id === city.layer)!;
  const journeys = sources.manifests.filter((manifest) =>
    Array.isArray(manifest.data.cities) && (manifest.data.cities as { id?: unknown }[]).some((item) => item.id === cityId));
  if (journeys.length !== 1) throw new Error(`Register city ${cityId} in exactly one journey`);
  return journeyLayer(sources, journeys[0].id);
}

/** Root-relative posix path for messages, e.g. `content/journeys/milano/stories/milano/sound_cafe_01.ink`. */
export function displayPath(root: string, file: string): string {
  return toPosix(path.relative(root, file));
}
