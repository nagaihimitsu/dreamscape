import path from "node:path";
import { CATALOG_RULES, classifyContentFile, type FieldTable, type MergedKind } from "./content-layout";
import { localIssuePath } from "./catalog-merge";
import { imageReferences } from "./content-ownership";
import { CODE_IMAGE_FILES } from "../src/content/code-images";
import { displayPath, journeyFileOf, type ContentSources } from "./content-sources";
import { normalizeWord, wordPattern } from "../src/content/word-meanings";
import { isObservationOnlyClue } from "../src/content/tourism-schemas";

// What content:build reports besides errors (pure, on the loaded sources):
// warnings about files and IDs that are probably mistakes but do not break
// the game, and what each journey folder provides. content:build prints the
// warnings as counts (details with --verbose) and one line per journey.

export type ContentWarningKind = "unknown-file" | "unused-public-file" | "id-prefix" | "unused-transport-mode" | "tourism-photo"
  | "transit-walk-missing" | "transit-route-unsourced" | "never-offered" | "date-condition-trip"
  | "later-never-again" | "same-priority" | "repeat-without-until" | "data-language" | "cond-walk-partial"
  | "never-met-again" | "romance-only-city" | "unfindable-clue" | "battle-after-epilogue" | "money-shortfall" | "ap-shortfall"
  | "scene-tag" | "special-date-ap" | "epilogue-unreachable" | "then-loop";
export type ContentWarning = { kind: ContentWarningKind; message: string };
/** How content:build counts each kind of warning. */
export const CONTENT_WARNING_LABELS: Record<ContentWarningKind, string> = {
  "scene-tag": "scene tag note(s) (place files and choice tags)",
  "special-date-ap": "special date(s) that cost AP",
  "epilogue-unreachable": "city(ies) whose author-started epilogue may never start (then: epilogue out of reach in some or all plays)",
  "then-loop": "then: loop(s) left only when a condition turns false",
  "unknown-file": "unknown file(s) in journey folders",
  "unused-public-file": "unused public file(s)",
  "id-prefix": "ID(s) without the journey prefix",
  "unused-transport-mode": "declared transport mode(s) without routes",
  "tourism-photo": "tourism photo(s) to convert to WebP (npm run images:optimize)",
  "transit-walk-missing": "city(ies) with a transit ledger and direction(s) without a walking route",
  "transit-route-unsourced": "city transport mode(s) with route(s) lacking a game-model estimate or a documented fact",
  "never-offered": "encounter(s) or date(s) whose condition can never be met where it is checked",
  "date-condition-trip": "date condition(s) reading the time, rides or money, which the trip to the date changes",
  "later-never-again": "encounter(s) whose 「また今度」 leads to no later moment",
  "same-priority": "group(s) of encounters sharing a priority at one moment (run in file-name order)",
  "repeat-without-until": "repeated encounter(s) without # until:",
  "data-language": "data field(s) whose text is not in the field's language (Japanese fields, the quizzes' English)",
  "cond-walk-partial": "scene(s) with more than four cond texts, walked with each text true and false rather than in every combination",
  "never-met-again": "city(ies) whose finale condition may never be met again (money spent, an item given, a battle or date under not; no other way)",
  "romance-only-city": "city(ies) that can be cleared only through the romance values",
  "unfindable-clue": "landmark(s) without an observation that list clues no observation finds",
  "battle-after-epilogue": "battle(s) that may be left unplayable after the epilogue (the journey moves on after it)",
  "money-shortfall": "journey(s) whose budget may run short for a city's required main parts after the other events (not stopped)",
  "ap-shortfall": "city(ies) whose finale needs dates that the city's AP may not cover after the other dates (not stopped)",
};

/**
 * IDs of journey folders that existed before the prefix warning and do not
 * follow the convention (they stay, because saves and other data use them).
 * Add nothing here for new content: give it the prefix instead.
 */
export const UNPREFIXED_ID_EXCEPTIONS: Readonly<Record<string, readonly string[]>> = {
  luang_prabang: ["luang_prabang_hotel_bg"],
};

type Entry = Record<string, unknown>;
const isObject = (value: unknown): value is Entry => typeof value === "object" && value !== null && !Array.isArray(value);
const list = (value: unknown): Entry[] => (Array.isArray(value) ? value.filter(isObject) : []);

/** Warnings of the loaded content: unknown files, unused public files, IDs without the journey prefix, transport modes without routes. */
export function contentWarnings(sources: ContentSources): ContentWarning[] {
  return [...unknownJourneyFiles(sources), ...unusedPublicFiles(sources), ...unprefixedIds(sources), ...unusedTransportModes(sources)];
}

/**
 * Transport modes a manifest declares (`transportModes`) that no route of
 * the journey's cities uses: a leftover or a typo, or routes still to come.
 * The game only shows a mode on its routes, so nothing breaks.
 */
export function unusedTransportModes(sources: ContentSources): ContentWarning[] {
  return sources.manifests.flatMap((manifest): ContentWarning[] => {
    const cityIds = new Set(list(manifest.data.cities).map((city) => city.id));
    const routed = new Set(sources.cities.filter((city) => cityIds.has(city.id))
      .flatMap((city) => list(isObject(city.travel) ? city.travel.routes : undefined).map((route) => route.mode)));
    return list(manifest.data.transportModes).map((mode) => mode.id).filter((id): id is string => typeof id === "string" && !routed.has(id))
      .map((id) => ({ kind: "unused-transport-mode", message: `Transport mode without routes: ${displayPath(sources.root, manifest.file)} ` +
        `declares "${id}" in transportModes, but no route of ${manifest.id}'s cities uses it (add its routes or remove the declaration)` }));
  });
}

/**
 * Files of a journey folder that content:build neither reads nor serves:
 * anything but `.json`/`.ink` data and `public/assets/` (notes `*.md` are fine).
 * They are probably misplaced (e.g. an image outside public/assets/).
 */
export function unknownJourneyFiles(sources: ContentSources): ContentWarning[] {
  const journeys = new Set(sources.manifests.map((manifest) => manifest.id));
  return [...sources.tree.files.keys()].sort().flatMap((treePath): ContentWarning[] => {
    const { journey, relative } = journeyFileOf(sources.tree, treePath) ?? {};
    if (!journey || !journeys.has(journey) || !relative || relative.endsWith(".md") || classifyContentFile(relative, "journey").type !== "other") return [];
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
  for (const quiz of sources.quizFiles.filter((item) => !item.example && isObject(item.data))) {
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
 * The first ID of the loaded content (a story by its file name) that starts
 * with `<prefix>_`: the ID family a new journey's prefix would join, whether
 * or not that journey declares authoring.eventPrefix (Milano does not).
 */
export function idWithPrefix(sources: ContentSources, prefix: string): { id: string; where: string } | undefined {
  const found = definitions(sources).find((item) => (item.rule === "story" ? item.id.split("/").at(-1)! : item.id).startsWith(`${prefix}_`));
  return found && { id: found.id, where: found.where };
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

/**
 * The English an encounter story shows as choices: the text of each Ink
 * choice line (`* [Could you play one note? # option: ask]`) without its
 * label, conditions, tags and divert. Narration and tags are Japanese or IDs.
 */
function inkChoiceTexts(source: string): string[] {
  return source.split("\n").flatMap((line) => {
    const choice = /^\s*[*+][\s*+]*(.*)$/u.exec(line);
    return choice ? [choice[1].replace(/^\([^)]*\)/u, "").replaceAll(/\{[^}]*\}/gu, "").split("#")[0].split("->")[0].replaceAll(/[[\]]/gu, "")] : [];
  });
}

/**
 * Each word (normalized like the game's word lookup) of the English shown
 * with word meanings, and the layers whose texts use it: questions and options
 * of the quiz files (samples excluded), and of encounters: their quiz, their
 * catalog option texts and the choices of their Ink story.
 */
export function wordUses(sources: ContentSources): Map<string, Set<string>> {
  const uses = new Map<string, Set<string>>();
  const use = (text: unknown, layer: string) => {
    if (typeof text === "string") for (const word of text.match(wordPattern) ?? []) {
      const key = normalizeWord(word);
      uses.set(key, (uses.get(key) ?? new Set()).add(layer));
    }
  };
  const question = (value: unknown, layer: string) => {
    if (!isObject(value)) return;
    use(value.questionEn, layer);
    for (const option of list(value.options)) use(option.textEn, layer);
  };
  for (const quiz of sources.quizFiles)
    if (!quiz.example && isObject(quiz.data)) for (const item of list(quiz.data.questions)) question(item, quiz.layer);
  const layerOf = (file: string) => sources.layers.find((layer) => layer.type === "journey" && file.startsWith(layer.directory + path.sep))?.id ?? "core";
  const stories = new Map(sources.storyFiles.map((story) => [story.id, story]));
  const encounters = sources.catalogs["encounters/catalog.json"];
  const entries = isObject(encounters?.value) && Array.isArray(encounters.value.encounters) ? encounters.value.encounters : [];
  entries.forEach((encounter: unknown, index: number) => {
    if (!isObject(encounter)) return;
    const layer = layerOf(encounters!.provenance.items.encounters[index]);
    if (isObject(encounter.quiz)) question(encounter.quiz.question, layer);
    for (const option of list(encounter.options)) use(option.textEn, layer);
    const story = typeof encounter.storyId === "string" ? stories.get(encounter.storyId) : undefined;
    if (story) for (const text of inkChoiceTexts(story.source)) use(text, story.layer);
  });
  return uses;
}

/** Words of a word-meanings file that no English text uses. */
export type UnusedWordMeanings = { file: string; words: string[] };

/**
 * Entries of the word meanings (the shared dictionary and journey fragments)
 * that no English text of the content uses (wordUses), per file. They do no
 * harm, so content:build reports them as a count (the list with --verbose)
 * for the authors to decide, not as a warning.
 */
export function unusedWordMeanings(sources: ContentSources): UnusedWordMeanings[] {
  const used = wordUses(sources);
  const byFile = new Map<string, string[]>();
  for (const [word, file] of Object.entries(sources.catalogs["learning/word-meanings.json"]?.provenance.keys.words ?? {}))
    if (!used.has(word)) byFile.set(file, [...(byFile.get(file) ?? []), word]);
  return [...byFile].map(([file, words]) => ({ file: displayPath(sources.root, file), words }));
}

/** What a journey folder provides: its cities, stories, quizzes and served files, and its entries of each catalog. */
export type JourneyContents = { id: string; status: unknown; counts: [string, number][] };

/** A short name for the entries of a catalog key: the key (`dates`, `wardrobe cities`), or the file for generic keys. */
function entryLabel(kind: MergedKind, key: string): string {
  // Groups of files, not files: "artworks 1" would read as one image.
  if (kind === "presentation/own-artwork.json") return "own artwork groups";
  const name = key === "questions" || key === "entries" ? path.posix.basename(kind, ".json").replaceAll("-", " ") : key;
  return name.replaceAll(".", " ").replace(/([a-z])([A-Z])/gu, "$1 $2").toLowerCase();
}

/** The merged keys of a catalog whose entries come from layers (concatenated arrays and records). */
function entryKeys(table: FieldTable, prefix = ""): string[] {
  return Object.entries(table).flatMap(([key, rule]) => rule.mode === "concat" || rule.mode === "record" ? [`${prefix}${key}`]
    : rule.mode === "nested" ? entryKeys(rule.fields, `${prefix}${key}.`) : []);
}

/**
 * The observation-only clues (no quiz question depends on them, docs/07) that
 * the files `own` accepts provide in the merged tourism catalog.
 */
function observationOnlyClues(sources: ContentSources, own: (file: string) => boolean): number {
  const catalog = sources.catalogs["tourism/catalog.json"];
  const files = catalog?.provenance.items.clues ?? [];
  const clues = isObject(catalog?.value) ? catalog.value.clues : undefined;
  return (Array.isArray(clues) ? clues : []).filter((clue, index) => own(files[index] ?? "") && isObject(clue) &&
    Array.isArray(clue.relatedQuestionIds) && isObservationOnlyClue({ relatedQuestionIds: clue.relatedQuestionIds })).length;
}

/**
 * What each journey folder provides, in manifest order (zero counts are left
 * out for catalogs). After its clues comes how many of them are observation-only.
 */
export function journeyContents(sources: ContentSources): JourneyContents[] {
  return sources.manifests.map((manifest): JourneyContents => {
    const own = (file: string) => file.startsWith(manifest.directory + path.sep);
    const counts: [string, number][] = [
      ["cities", sources.cities.filter((city) => city.layer === manifest.id).length],
      ["stories", sources.storyFiles.filter((story) => story.layer === manifest.id).length],
      ["quizzes", sources.quizFiles.filter((quiz) => quiz.layer === manifest.id && !quiz.example).length],
      ["public files", [...sources.publicFiles.values()].filter(own).length],
    ];
    for (const rule of CATALOG_RULES) {
      if (!("fields" in rule)) continue;
      const provenance = sources.catalogs[rule.kind]?.provenance;
      for (const key of entryKeys(rule.fields)) {
        const files = [...(provenance?.items[key] ?? []), ...Object.values(provenance?.keys[key] ?? {})];
        const count = files.filter(own).length;
        if (count) counts.push([entryLabel(rule.kind, key), count]);
        const observationOnly = rule.kind === "tourism/catalog.json" && key === "clues" ? observationOnlyClues(sources, own) : 0;
        if (observationOnly) counts.push(["observation-only clues", observationOnly]);
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
