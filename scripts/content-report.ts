import path from "node:path";
import { CATALOG_RULES, classifyContentFile, CONTENT_DIRECTORY, JOURNEYS_DIRECTORY, type FieldTable, type MergedKind } from "./content-layout";
import { localIssuePath } from "./catalog-merge";
import { imageReferences } from "./content-ownership";
import { CODE_IMAGE_FILES } from "../src/content/code-images";
import { displayPath, type ContentSources } from "./content-sources";

// What content:build reports besides errors (pure, on the loaded sources):
// warnings about files and IDs that are probably mistakes but do not break
// the game, and what each journey folder provides. content:build prints the
// warnings as counts (details with --verbose) and one line per journey.

export type ContentWarningKind = "unknown-file" | "unused-public-file" | "id-prefix";
export type ContentWarning = { kind: ContentWarningKind; message: string };
/** How content:build counts each kind of warning. */
export const CONTENT_WARNING_LABELS: Record<ContentWarningKind, string> = {
  "unknown-file": "unknown file(s) in journey folders",
  "unused-public-file": "unused public file(s)",
  "id-prefix": "ID(s) without the journey prefix",
};

/**
 * IDs of journey folders that existed before the prefix warning and do not
 * follow the convention (they stay, because saves and other data use them).
 * Add nothing here for new content: give it the prefix instead.
 */
export const UNPREFIXED_ID_EXCEPTIONS: Readonly<Record<string, readonly string[]>> = {
  golden_triangle: ["delhi_legacy_episode_placeholder", "agra_legacy_episode_placeholder", "jaipur_legacy_episode_placeholder"],
  uzbekistan: [
    "tashkent_legacy_episode_placeholder", "samarkand_legacy_episode_placeholder",
    "bukhara_legacy_episode_placeholder", "khiva_legacy_episode_placeholder",
  ],
  luang_prabang: ["luang_prabang_legacy_episode_placeholder", "luang_prabang_hotel_bg"],
};

type Entry = Record<string, unknown>;
const isObject = (value: unknown): value is Entry => typeof value === "object" && value !== null && !Array.isArray(value);
const list = (value: unknown): Entry[] => (Array.isArray(value) ? value.filter(isObject) : []);
const JOURNEYS_PREFIX = `${CONTENT_DIRECTORY}/${JOURNEYS_DIRECTORY}/`;

/** Warnings of the loaded content: unknown files, unused public files, IDs without the journey prefix. */
export function contentWarnings(sources: ContentSources): ContentWarning[] {
  return [...unknownJourneyFiles(sources), ...unusedPublicFiles(sources), ...unprefixedIds(sources)];
}

/**
 * Files of a journey folder that content:build neither reads nor serves:
 * anything but `.json`/`.ink` data and `public/assets/` (notes `*.md` are fine).
 * They are probably misplaced (e.g. an image outside public/assets/).
 */
export function unknownJourneyFiles(sources: ContentSources): ContentWarning[] {
  const journeys = new Set(sources.manifests.map((manifest) => manifest.id));
  return [...sources.tree.files.keys()].sort().flatMap((treePath): ContentWarning[] => {
    if (!treePath.startsWith(JOURNEYS_PREFIX)) return [];
    const [journey, ...rest] = treePath.slice(JOURNEYS_PREFIX.length).split("/");
    const relative = rest.join("/");
    if (!journeys.has(journey) || !relative || relative.endsWith(".md") || classifyContentFile(relative, "journey").type !== "other") return [];
    return [{ kind: "unknown-file", message: `Unknown file in a journey folder: ${treePath} (content:build reads only .json and .ink files ` +
      `and serves public/assets/; keep notes as .md, images in public/assets/, other material in authoring/journeys/${journey}/)` }];
  });
}

/**
 * Served images that neither content (tourism images, backgrounds, item
 * icons, character images, title art) nor the game's code (CODE_IMAGE_FILES)
 * refers to: every file of a journey's public/ folder and of the root
 * public/assets/. The rest of the root public/ (browser icons, the web app
 * manifest) is linked from index.html and checked by app-icons.test.ts.
 */
export function unusedPublicFiles(sources: ContentSources): ContentWarning[] {
  const used = new Set([...imageReferences(sources).map((image) => path.posix.normalize(image.path)), ...CODE_IMAGE_FILES]);
  const checked = [path.join(sources.root, "public", "assets"), ...sources.layers.filter((layer) => layer.type === "journey")
    .map((layer) => path.join(layer.directory, "public"))].map((directory) => directory + path.sep);
  return [...sources.publicFiles].flatMap(([assetPath, file]): ContentWarning[] =>
    used.has(assetPath) || !checked.some((directory) => file.startsWith(directory)) ? []
      : [{ kind: "unused-public-file", message: `Unused public file: ${displayPath(sources.root, file)} (neither content nor the game's code ` +
        `refers to ${assetPath}; it would be published without being used)` }]);
}

/** An ID a journey folder defines, and where. `place` IDs name a location of a city. */
type Definition = { id: string; file: string; where: string; rule: "id" | "place" | "story" };
const ENTRY_IDS: [MergedKind, string, Definition["rule"]][] = [
  ["battles/catalog.json", "battles", "id"],
  ["encounters/catalog.json", "encounters", "id"],
  ["encounters/catalog.json", "items", "id"],
  ["presentation/characters.json", "characters", "id"],
  ["progression/journey.json", "episodes", "id"],
  ["progression/journey.json", "rewards", "id"],
  ["romance/date_catalog.json", "dates", "id"],
  ["romance/date_destinations.json", "destinations", "place"],
  ["romance/effect_catalog.json", "effects", "id"],
  ["tourism/catalog.json", "assets", "id"],
  ["tourism/catalog.json", "landmarks", "place"],
  ["tourism/catalog.json", "clues", "id"],
];

/** Every ID the loaded content defines, with its file (layer) and position. */
function definitions(sources: ContentSources): Definition[] {
  const show = (file: string) => displayPath(sources.root, file);
  const found: Definition[] = [];
  const add = (id: unknown, file: string, where: string, rule: Definition["rule"] = "id") => {
    if (typeof id === "string") found.push({ id, file, where: `${show(file)} ${where}`, rule });
  };
  // Entries of a concatenated catalog key, each with its file and its position inside that file.
  const entriesOf = (kind: MergedKind, key: string, each: (entry: Entry, file: string, position: string) => void) => {
    const merged = sources.catalogs[kind];
    const entries = isObject(merged?.value) ? merged.value[key] : undefined;
    if (Array.isArray(entries)) entries.forEach((entry, index) => {
      if (isObject(entry)) each(entry, merged!.provenance.items[key][index], `${key}[${String(localIssuePath(merged!.provenance, [key, index])[1])}]`);
    });
  };
  for (const [kind, key, rule] of ENTRY_IDS) entriesOf(kind, key, (entry, file, position) => add(entry.id, file, position, rule));
  entriesOf("progression/journey.json", "storyBattles", (battle, file, position) => {
    if (isObject(battle.completionReward)) add(battle.completionReward.id, file, `${position}.completionReward`);
  });
  entriesOf("encounters/catalog.json", "encounters", (encounter, file, position) => {
    if (isObject(encounter.quiz) && isObject(encounter.quiz.question)) add(encounter.quiz.question.id, file, `${position}.quiz.question`);
  });
  const presentation = sources.catalogs["romance/presentation.json"];
  for (const key of ["backgrounds", "memories"])
    for (const [id, file] of Object.entries(presentation?.provenance.keys[key] ?? {})) add(id, file, key);
  const details = sources.catalogs["learning/details.json"];
  for (const [questionId, detail] of Object.entries(isObject(details?.value) && isObject(details.value.questions) ? details.value.questions : {}))
    list(isObject(detail) ? detail.topics : undefined).forEach((topic, index) =>
      add(topic.id, details!.provenance.keys.questions[questionId], `questions.${questionId}.topics[${index}]`));
  for (const story of sources.storyFiles) found.push({ id: story.id, file: story.file, where: show(story.file), rule: "story" });
  for (const quiz of sources.quizFiles.filter((item) => !item.sample && isObject(item.data))) {
    const data = quiz.data as Entry;
    add(data.id, quiz.file, "id");
    list(data.questions).forEach((question, index) => add(question.id, quiz.file, `questions[${index}]`));
  }
  for (const city of sources.cities) {
    if (isObject(city.data) && isObject(city.data.firstClearReward))
      add(city.data.firstClearReward.rewardSourceId, city.file, "firstClearReward.rewardSourceId");
    if (!isObject(city.travel)) continue;
    list(city.travel.places).forEach((place, index) => add(place.id, city.travelFile, `places[${index}]`, "place"));
    list(city.travel.events).forEach((event, index) => add(event.id, city.travelFile, `events[${index}]`));
  }
  return found;
}

/**
 * IDs of journey folders with `authoring.eventPrefix` in their manifest that
 * do not follow the convention of docs/02 (IDs share one namespace across all
 * journeys): an ID starts with `<prefix>_`; a place (landmark, date
 * destination, travel place) starts with one of the journey's city IDs and
 * `_`; a story's file name starts with `<prefix>_` or is a city ID (one story
 * per city, e.g. `arrivals/delhi`). UNPREFIXED_ID_EXCEPTIONS lists the
 * existing exceptions. Journeys without a prefix (Milano) are not checked.
 */
export function unprefixedIds(sources: ContentSources): ContentWarning[] {
  const rules = new Map(sources.manifests.flatMap((manifest) => {
    const prefix = isObject(manifest.data.authoring) ? manifest.data.authoring.eventPrefix : undefined;
    if (typeof prefix !== "string") return [];
    const cities = list(manifest.data.cities).map((city) => city.id).filter((id): id is string => typeof id === "string");
    return [[manifest.directory + path.sep, { journey: manifest.id, prefix, cities }]];
  }));
  const seen = new Set<string>();
  const warnings: ContentWarning[] = [];
  for (const definition of definitions(sources)) {
    const rule = [...rules].find(([directory]) => definition.file.startsWith(directory))?.[1];
    if (!rule || UNPREFIXED_ID_EXCEPTIONS[rule.journey]?.includes(definition.id)) continue;
    const name = definition.rule === "story" ? definition.id.split("/").at(-1)! : definition.id;
    const followed = definition.rule === "place" ? rule.cities.some((city) => name.startsWith(`${city}_`))
      : name.startsWith(`${rule.prefix}_`) || (definition.rule === "story" && rule.cities.includes(name));
    const key = `${rule.journey}\0${definition.rule}\0${definition.id}`;
    if (followed || seen.has(key)) continue;
    seen.add(key);
    const convention = definition.rule === "place"
      ? `places of ${rule.journey} start with one of its city IDs (${rule.cities.map((city) => `${city}_`).join(", ")})`
      : definition.rule === "story"
        ? `story file names of ${rule.journey} start with "${rule.prefix}_" or are a city ID`
        : `IDs of ${rule.journey} start with "${rule.prefix}_", its authoring.eventPrefix`;
    warnings.push({ kind: "id-prefix", message: `ID without the journey prefix: ${definition.where} "${definition.id}" (${convention})` });
  }
  return warnings;
}

/** What a journey folder provides: its cities, stories, quizzes and served files, and its entries of each catalog. */
export type JourneyContents = { id: string; status: unknown; counts: [string, number][] };

/** A short name for the entries of a catalog key: the key (`dates`, `wardrobe cities`), or the file for generic keys. */
function entryLabel(kind: MergedKind, key: string): string {
  const name = key === "questions" || key === "entries" ? path.posix.basename(kind, ".json").replaceAll("-", " ") : key;
  return name.replaceAll(".", " ").replace(/([a-z])([A-Z])/gu, "$1 $2").toLowerCase();
}

/** The merged keys of a catalog whose entries come from layers (concatenated arrays and records). */
function entryKeys(table: FieldTable, prefix = ""): string[] {
  return Object.entries(table).flatMap(([key, rule]) => rule.mode === "concat" || rule.mode === "record" ? [`${prefix}${key}`]
    : rule.mode === "nested" ? entryKeys(rule.fields, `${prefix}${key}.`) : []);
}

/** What each journey folder provides, in manifest order (zero counts are left out for catalogs). */
export function journeyContents(sources: ContentSources): JourneyContents[] {
  return sources.manifests.map((manifest): JourneyContents => {
    const own = (file: string) => file.startsWith(manifest.directory + path.sep);
    const counts: [string, number][] = [
      ["cities", sources.cities.filter((city) => city.layer === manifest.id).length],
      ["stories", sources.storyFiles.filter((story) => story.layer === manifest.id).length],
      ["quizzes", sources.quizFiles.filter((quiz) => quiz.layer === manifest.id && !quiz.sample).length],
      ["public files", [...sources.publicFiles.values()].filter(own).length],
    ];
    for (const rule of CATALOG_RULES) {
      if (!("fields" in rule)) continue;
      const provenance = sources.catalogs[rule.kind]?.provenance;
      for (const key of entryKeys(rule.fields)) {
        const files = [...(provenance?.items[key] ?? []), ...Object.values(provenance?.keys[key] ?? {})];
        const count = files.filter(own).length;
        if (count) counts.push([entryLabel(rule.kind, key), count]);
      }
    }
    return { id: manifest.id, status: manifest.data.status, counts };
  });
}

/** One line for content:build, e.g. `Journey milano (available): cities 1, stories 63, …; battles 9, …`. */
export function formatJourneyContents(contents: JourneyContents): string {
  const [files, entries] = [contents.counts.slice(0, 4), contents.counts.slice(4)];
  const text = (counts: [string, number][]) => counts.map(([label, count]) => `${label} ${count}`).join(", ");
  return `Journey ${contents.id} (${String(contents.status)}): ${text(files)}${entries.length ? `; ${text(entries)}` : ""}`;
}
