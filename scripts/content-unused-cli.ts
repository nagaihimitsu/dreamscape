import { globSync, readFileSync } from "node:fs";
import path from "node:path";
import { localIssuePath } from "./catalog-merge";
import { errorText } from "./cli-error";
import type { MergedKind } from "./content-layout";
import { displayPath, loadContentSources, type ContentSources } from "./content-sources";
import {
  codeWords, CORE, formatUnusedReport, jsonKeyCounts, namedKnots, readingText, schemaKeys, unreachedKnots, unreadSchemaKeys, unusedEntries,
  type CatalogEntry,
} from "./content-unused";
import { jsonStrings } from "./json-lines";

// npm run content:unused [-- --journey <journeyId>]: what nothing reaches (content-unused.ts), from content/ as it is
// now (no content:build needed) and the code of src/ and scripts/. Notes only: it changes no file and exits 0 (1 when
// it cannot run).
const usage = "使い方: npm run content:unused -- [--journey 旅行編ID]";
const help = [
  usage,
  "content/ の今の版（content:build は要りません）と src/・scripts/ のコードから、使われていないものを注意として出します。ファイルは変えません。",
  "(a) どこからも届かない knot と関数、場面に届かないデータ（デートのない行き先、地図に出ないクイズ、訪ねない観光地、名前の出ない人物）。",
  "(b) 画面が読まないかもしれないスキーマの欄（src/content/ のスキーマの欄の名前が、src/ のほかのコードに一度も出ないもの。名前で探す推定）。",
  "content:build がもう止めるもの（# at: のない差し込みの場面、どのカタログも指さない本筋の場面、どこからも指されない Ink のファイル、" +
    "scenes/catalog.json の場面のない ID）と注意に出すもの（never-offered、unused-public-file、sound・music・ambience、glossary など）は繰り返しません。",
].join("\n");

type Entry = Record<string, unknown>;
const isObject = (value: unknown): value is Entry => typeof value === "object" && value !== null && !Array.isArray(value);

/** The layer (journey ID, or CORE) a content file belongs to. */
const layerOf = (sources: ContentSources, file: string) =>
  sources.layers.find((layer) => layer.type === "journey" && file.startsWith(layer.directory + path.sep))?.id ?? CORE;

/** The entries of a merged catalog's list `key`, each with its file and its position in that file. */
function entriesOf(sources: ContentSources, kind: MergedKind, key: string): CatalogEntry[] {
  const merged = sources.catalogs[kind];
  const list = isObject(merged?.value) ? merged.value[key] : undefined;
  if (!merged || !Array.isArray(list)) return [];
  return list.flatMap((value, index): CatalogEntry[] => {
    const file = merged.provenance.items[key]?.[index];
    if (!isObject(value) || !file) return [];
    return [{ value, file: displayPath(sources.root, file), journey: layerOf(sources, file), where: `${key}[${String(localIssuePath(merged.provenance, [key, index])[1])}]` }];
  });
}

/** The repository's TypeScript files matching `patterns`, without tests and generated files, as [path, text]. */
function codeFiles(root: string, patterns: string[]): [string, string][] {
  return patterns.flatMap((pattern) => globSync(pattern, { cwd: root })).map((file) => file.split(path.sep).join("/"))
    .filter((file) => !/\.test\.tsx?$/u.test(file) && !file.includes("/generated/")).sort()
    .map((file) => [file, readFileSync(path.join(root, file), "utf8")]);
}

try {
  const args = process.argv.slice(2);
  if (args.includes("--help")) { console.log(help); process.exit(0); }
  if (args.length && (args.length !== 2 || args[0] !== "--journey" || args[1].startsWith("--"))) throw new Error(usage);
  const journey = args[1];
  const root = process.cwd();
  const sources = loadContentSources(root);
  if (journey && !sources.manifests.some((manifest) => manifest.id === journey))
    throw new Error(`旅行編がありません：${journey}（content/journeys/ のフォルダ名を書いてください。あるもの：${sources.manifests.map((item) => item.id).join("、")}）。`);

  // (a) The knots, and the data entries that lead to scenes.
  const strings = [...Object.values(sources.catalogs).map((catalog) => catalog?.value),
    ...sources.cities.flatMap((city) => [city.data, city.travel, city.settings]), ...sources.tourFiles.map((tour) => tour.data),
    ...sources.quizFiles.map((quiz) => quiz.data)].flatMap((value) => jsonStrings(value).map((item) => item.value));
  const battles = entriesOf(sources, "battles/catalog.json", "battles");
  const named = namedKnots(strings, battles.map((battle) => battle.value.storyId).filter((id): id is string => typeof id === "string"));
  const knots = unreachedKnots(sources.storyFiles.map((story) => ({ storyId: story.id, file: displayPath(root, story.file), journey: story.layer, source: story.source })), named);
  const entries = unusedEntries({
    destinations: entriesOf(sources, "romance/date_destinations.json", "destinations"), dates: entriesOf(sources, "romance/date_catalog.json", "dates"),
    battles, episodes: entriesOf(sources, "progression/journey.json", "episodes"), storyBattles: entriesOf(sources, "progression/journey.json", "storyBattles"),
    landmarks: entriesOf(sources, "tourism/catalog.json", "landmarks"), people: entriesOf(sources, "progression/story.json", "people"),
    inkSources: sources.storyFiles.map((story) => story.source),
  });

  // (b) The keys of the content schemas that the game's code never names.
  const schemaFiles = codeFiles(root, ["src/content/*.ts"]).filter(([, text]) => /\bz\s*\.\s*(?:object|strictObject)\s*\(/u.test(text));
  const keys = schemaFiles.flatMap(([file, text]) => schemaKeys(file, text));
  // Schemas only (src/content/*schema*.ts, schemas.ts) and validation modules are left out; a module with code too keeps its code.
  const game = codeFiles(root, ["src/**/*.ts", "src/**/*.tsx"]).filter(([file]) => !/^src\/content\/[^/]*schema[^/]*\.ts$/u.test(file) && !/validation[^/]*\.ts$/u.test(file));
  const tools = codeFiles(root, ["scripts/**/*.ts"]);
  const dataKeys = new Map<string, Map<string, number>>();
  for (const [file, bytes] of sources.tree.files) if (file.endsWith(".json") && bytes) {
    const layer = layerOf(sources, path.join(root, file));
    dataKeys.set(layer, jsonKeyCounts(JSON.parse(bytes.toString("utf8")), dataKeys.get(layer)));
  }
  const unread = unreadSchemaKeys(keys, codeWords(game.map(([, text]) => readingText(text))), codeWords(tools.map(([, text]) => readingText(text))), dataKeys);

  const journeys = [...sources.manifests.filter((manifest) => !journey || manifest.id === journey).map((manifest) => ({
    id: manifest.id, ...(typeof manifest.data.nameJa === "string" ? { nameJa: manifest.data.nameJa } : {}),
    ...(typeof manifest.data.status === "string" ? { status: manifest.data.status } : {}),
  })), ...(journey ? [] : [{ id: CORE }])];
  console.log(formatUnusedReport({
    journeys,
    knots: knots.filter((item) => !journey || item.journey === journey),
    entries: entries.filter((item) => !journey || item.journey === journey),
    keys: unread.filter((item) => !journey || item.dataUses.some((use) => use.journey === journey)),
  }).join("\n"));
} catch (error) {
  // The message and what caused it, without a stack trace that would bury them.
  console.error(errorText(error));
  process.exitCode = 1;
}
