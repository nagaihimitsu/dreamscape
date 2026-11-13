import path from "node:path";
import { displayPath, type ContentLayer, type ContentSources } from "./content-sources";
import { CORE_LAYER_KINDS, type MergedKind } from "./content-layout";
import { localIssuePath } from "./catalog-merge";
import { servedFile } from "./public-assets";
import { conditionLeaves, conditionSchema, leafKind, leafReference } from "../src/content/condition-schemas";
import { normalizeWord, wordPattern } from "../src/content/word-meanings";

// Ownership of content across layers. Every journey folder must stay
// removable on its own: its entries describe only its own cities, and what
// they refer to lives in the same journey folder or in the core layer. The
// core layer is the base system shared by every journey: it holds no city,
// travel, story or quiz file and no journey-only catalog, describes no city
// and refers only to core content. Unknown IDs are left to the content
// pipeline, which reports them with its usual messages.

type Namespace =
  | "city" | "landmark" | "asset" | "clue" | "battle" | "episode" | "reward" | "date" | "destination" | "effect"
  | "background" | "memory" | "story" | "quiz" | "question" | "encounter" | "item" | "localWord" | "place";
/** A reference: what it points to, through which field, and the referenced ID(s). */
type Reference = { namespace: Namespace | readonly Namespace[]; field: string; ids: unknown };
type Definition = { layer: string; file: string; cityId?: string };
type Entry = Record<string, unknown>;

/** Wardrobe scenes and travel events reuse the ID of a date, battle, landmark or episode. */
const SCENE = ["date", "battle", "landmark", "episode"] as const;
const EVENT = ["episode", "date", "battle"] as const;

const isObject = (value: unknown): value is Entry => typeof value === "object" && value !== null && !Array.isArray(value);
const list = (value: unknown): Entry[] => (Array.isArray(value) ? value.filter(isObject) : []);
const ref = (namespace: Reference["namespace"], field: string, ids: unknown): Reference => ({ namespace, field, ids });
const fields = (entry: Entry, namespace: Namespace, names: string[]) => names.map((name) => ref(namespace, name, entry[name]));
/**
 * What a condition (src/content/condition-schemas.ts) names, field `when.episodeCompleted` and
 * so on. A malformed condition names nothing here: its schema error follows with its own message.
 * Transport modes are checked against the journey's manifest by condition-validation.ts.
 */
function conditionReferences(raw: unknown, field: string): Reference[] {
  if (raw === undefined) return [];
  const parsed = conditionSchema.safeParse(raw);
  if (!parsed.success) return [];
  return conditionLeaves(parsed.data).flatMap((leaf) => {
    const reference = leafReference(leaf);
    // Transport modes, flags, people and named conditions are checked by condition-validation.ts.
    return reference && !["mode", "flag", "person", "condition"].includes(reference.kind)
      ? [ref(reference.kind as Namespace, `${field}.${leafKind(leaf)}`, reference.id)] : [];
  });
}

/** References of an array element (`key`) or a record entry (`key` with `recordKey`) of a catalog. */
const ENTRY_REFERENCES: Partial<Record<MergedKind, Record<string, (entry: Entry, recordKey: string) => Reference[]>>> = {
  "battles/catalog.json": {
    battles: (entry) => [
      ...fields(entry, "city", ["cityId"]), ...fields(entry, "landmark", ["landmarkId"]), ...fields(entry, "story", ["storyId"]),
      ...fields(entry, "quiz", ["quizId"]), ...fields(entry, "background", ["backgroundId"]),
      ...(isObject(entry.reasoning) ? fields(entry.reasoning, "clue", ["caseClueIds", "correctClueIds"]) : []),
    ],
  },
  "encounters/catalog.json": {
    items: (entry) => [...fields(entry, "city", ["cityId"]),
      ...list(entry.linesJa).flatMap((line) => conditionReferences(line.when, "linesJa[].when"))],
    encounters: (entry) => [
      ...fields(entry, "city", ["cityId"]), ...fields(entry, "landmark", ["landmarkId"]), ...fields(entry, "story", ["storyId"]),
      ...fields(entry, "item", ["completionItemId"]), ...fields(entry, "reward", ["alternativeApRewardId"]),
      ...list(entry.options).flatMap((option) => fields(option, "item", ["requiresItemId", "consumeItemId", "giftItemId"])),
      ...(isObject(entry.quiz)
        ? [...fields(entry.quiz, "story", ["wonStoryId", "lostStoryId", "alreadyStoryId"]), ...fields(entry.quiz, "item", ["rewardItemId"])]
        : []),
    ],
  },
  "encounters/entry-rules.json": {
    entries: (entry) => [...fields(entry, "encounter", ["encounterId"]), ...conditionReferences(entry.when, "when")],
  },
  "learning/details.json": { questions: (entry, key) => [ref("question", "question ID", key), ...fields(entry, "story", ["storyId"])] },
  "learning/local-words.json": { words: (entry) => fields(entry, "city", ["cityId"]) },
  "learning/translations.json": { questions: (_, key) => [ref("question", "question ID", key)] },
  "presentation/characters.json": {
    battleCharacters: (_, key) => [ref("battle", "battle ID", key)],
    "wardrobe.cities": (_, key) => [ref("city", "city ID", key)],
    "wardrobe.scenes": (_, key) => [ref(SCENE, "scene ID", key)],
  },
  "presentation/dialogue-expressions.json": { entries: (entry) => fields(entry, "story", ["storyId"]) },
  "presentation/dialogue-reactions.json": { entries: (entry) => fields(entry, "story", ["storyId"]) },
  "progression/journey.json": {
    episodes: (entry) => [
      ...fields(entry, "city", ["cityId"]), ...fields(entry, "landmark", ["landmarkId"]), ...fields(entry, "battle", ["battleId"]),
      ...fields(entry, "episode", ["requiredEpisodeIds"]), ...fields(entry, "story", ["epilogueStoryId"]), ...conditionReferences(entry.when, "when"),
    ],
    storyBattles: (entry) => [...fields(entry, "battle", ["battleId"]), ...fields(entry, "episode", ["requiredEpisodeIds"]),
      ...conditionReferences(entry.when, "when")],
    rewards: (entry) => [...fields(entry, "episode", ["episodeId"]), ...fields(entry, "battle", ["battleId"])],
  },
  "romance/date_catalog.json": {
    dates: (entry) => [
      ...fields(entry, "city", ["chapterId"]), ...conditionReferences(entry.when, "when"), ...conditionReferences(entry.until, "until"),
      ...fields(entry, "story", ["storyId"]), ...fields(entry, "background", ["backgroundId"]),
      ...fields(entry, "destination", ["destinationId"]),
      ...list(entry.validationContexts).flatMap((context) => fields(context, "memory", ["memoryId", "memoryIds"])),
    ],
  },
  "romance/date_destinations.json": {
    destinations: (entry) => [...fields(entry, "city", ["cityId"]), ...fields(entry, "background", ["backgroundId"])],
  },
  "romance/effect_catalog.json": { effects: (entry) => fields(entry, "memory", ["memoryId"]) },
  "romance/presentation.json": { backgrounds: (entry) => [...fields(entry, "asset", ["imageAssetId"]), ...fields(entry, "place", ["placeId"])] },
  "romance/progression.json": { memoryCallbacks: (entry) => fields(entry, "memory", ["memoryId"]) },
  "tourism/catalog.json": {
    landmarks: (entry) => [
      ...fields(entry, "city", ["cityId"]), ...fields(entry, "asset", ["imageAssetId"]), ...fields(entry, "story", ["guideStoryId"]),
      ...fields(entry, "battle", ["battleId"]), ...fields(entry, "clue", ["clueIds"]),
    ],
    clues: (entry) => [...fields(entry, "landmark", ["landmarkId"]), ...fields(entry, "question", ["relatedQuestionIds"])],
  },
};

/** IDs each catalog entry defines (array key → namespace). */
const DEFINITIONS: [MergedKind, string, Namespace][] = [
  ["tourism/catalog.json", "landmarks", "landmark"],
  ["tourism/catalog.json", "assets", "asset"],
  ["tourism/catalog.json", "clues", "clue"],
  ["battles/catalog.json", "battles", "battle"],
  ["progression/journey.json", "episodes", "episode"],
  ["progression/journey.json", "rewards", "reward"],
  ["romance/date_catalog.json", "dates", "date"],
  ["romance/date_destinations.json", "destinations", "destination"],
  ["romance/effect_catalog.json", "effects", "effect"],
  ["encounters/catalog.json", "encounters", "encounter"],
  ["encounters/catalog.json", "items", "item"],
  ["learning/local-words.json", "words", "localWord"],
];

/** `# background: id`, `# effect: id` and `# local_word: id` tags of an Ink source. */
function inkTagReferences(source: string): Reference[] {
  const namespaces: Record<string, Namespace> = { background: "background", effect: "effect", local_word: "localWord" };
  return [...[...source.matchAll(/#\s*(background|effect|local_word)\s*:\s*([A-Za-z0-9_]+)/gu)]
    .map(([, tag, id]) => ref(namespaces[tag], `#${tag}`, id)),
  // A # minigame:'s bg <id> (docs/13) is a background like # background:.
  ...[...source.matchAll(/#\s*minigame\s*:[^#\n]*?\sbg\s+([A-Za-z0-9_]+)/gu)].map(([, id]) => ref("background", "#minigame bg", id))];
}

/** A served image (a path below public/, e.g. `assets/tourism/x.webp`) that a content file refers to. */
export type ImageReference = { file: string; label: string; field: string; path: string };

/** Image fields of an array element (`key`) or a record entry of a catalog: [field, path] pairs. */
const IMAGE_FIELDS: Partial<Record<MergedKind, Record<string, (entry: Entry) => [string, unknown][]>>> = {
  "encounters/catalog.json": { items: (entry) => [["iconPath", entry.iconPath]] },
  "presentation/characters.json": {
    characters: (entry) => [
      ["imagePath", entry.imagePath],
      ...list(entry.variants).map((variant, index): [string, unknown] => [`variants[${index}].imagePath`, variant.imagePath]),
      ...list(entry.costumes).flatMap((costume) => list(costume.poses).flatMap((pose) =>
        Object.entries(isObject(pose.expressions) ? pose.expressions : {}).map(([expression, imagePath]): [string, unknown] =>
          [`costumes["${String(costume.id)}"].poses["${String(pose.id)}"].expressions.${expression}`, imagePath]))),
    ],
  },
  "romance/presentation.json": { backgrounds: (entry) => [["imagePath", entry.imagePath]] },
  "tourism/catalog.json": { assets: (entry) => [["path", entry.path]] },
};

/**
 * Every served image the loaded content names, with the layer file that
 * names it: catalog image fields, each manifest's title art and each city's
 * own-artwork backdrop. Values that are not strings are left to the schemas.
 */
export function imageReferences(sources: Pick<ContentSources, "catalogs" | "manifests" | "cities">): ImageReference[] {
  const images: ImageReference[] = [];
  const add = (file: string, label: string, pairs: [string, unknown][]) => {
    for (const [field, value] of pairs) if (typeof value === "string") images.push({ file, label, field, path: value });
  };
  for (const [kind, keys] of Object.entries(IMAGE_FIELDS) as [MergedKind, Record<string, (entry: Entry) => [string, unknown][]>][]) {
    const merged = sources.catalogs[kind];
    if (!merged) continue;
    for (const [key, fieldsOf] of Object.entries(keys)) {
      const value = (merged.value as Entry)[key];
      if (Array.isArray(value))
        value.forEach((entry, index) => {
          if (isObject(entry))
            add(merged.provenance.items[key][index],
              `${key}[${typeof entry.id === "string" ? `"${entry.id}"` : String(localIssuePath(merged.provenance, [key, index])[1])}]`, fieldsOf(entry));
        });
      else if (isObject(value))
        for (const [recordKey, entry] of Object.entries(value))
          if (isObject(entry)) add(merged.provenance.keys[key][recordKey], `${key}.${recordKey}`, fieldsOf(entry));
    }
  }
  for (const manifest of sources.manifests)
    if (isObject(manifest.data.titleArt)) add(manifest.file, "", [["titleArt.imagePath", manifest.data.titleArt.imagePath]]);
  // The opening movie is a served file of its journey too (ownership; never an unused public file).
  for (const manifest of sources.manifests)
    if (isObject(manifest.data.openingMovie)) add(manifest.file, "", [["openingMovie.videoPath", manifest.data.openingMovie.videoPath]]);
  for (const city of sources.cities)
    if (isObject(city.data)) add(city.file, "", [["backdropImagePath", city.data.backdropImagePath]]);
  return images;
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
 * with word meanings, and the layers whose texts use it, each with the first
 * file that does: questions and options of the quiz files (samples excluded),
 * and of encounters: their quiz, their catalog option texts and the choices of
 * their Ink story.
 */
export function wordUses(sources: ContentSources): Map<string, Map<string, string>> {
  const uses = new Map<string, Map<string, string>>();
  const use = (text: unknown, layer: string, file: string) => {
    if (typeof text === "string") for (const word of text.match(wordPattern) ?? []) {
      const key = normalizeWord(word);
      const layers = uses.get(key) ?? new Map<string, string>();
      if (!layers.has(layer)) layers.set(layer, file);
      uses.set(key, layers);
    }
  };
  const question = (value: unknown, layer: string, file: string) => {
    if (!isObject(value)) return;
    use(value.questionEn, layer, file);
    for (const option of list(value.options)) use(option.textEn, layer, file);
  };
  for (const quiz of sources.quizFiles)
    if (!quiz.example && isObject(quiz.data)) for (const item of list(quiz.data.questions)) question(item, quiz.layer, quiz.file);
  const layerOf = (file: string) => sources.layers.find((layer) => layer.type === "journey" && file.startsWith(layer.directory + path.sep))?.id ?? "core";
  const stories = new Map(sources.storyFiles.map((story) => [story.id, story]));
  const encounters = sources.catalogs["encounters/catalog.json"];
  const entries = isObject(encounters?.value) && Array.isArray(encounters.value.encounters) ? encounters.value.encounters : [];
  entries.forEach((encounter: unknown, index: number) => {
    if (!isObject(encounter)) return;
    const file = encounters!.provenance.items.encounters[index];
    if (isObject(encounter.quiz)) question(encounter.quiz.question, layerOf(file), file);
    for (const option of list(encounter.options)) use(option.textEn, layerOf(file), file);
    const story = typeof encounter.storyId === "string" ? stories.get(encounter.storyId) : undefined;
    if (story) for (const text of inkChoiceTexts(story.source)) use(text, story.layer, story.file);
  });
  return uses;
}

/**
 * The files that define each word meaning (learning/word-meanings.json of the
 * core layer and the journey fragments), read from each file itself: the
 * merged catalog keeps one owner per word, and fragments may repeat a word
 * with the same meaning.
 */
function wordDefinitions(sources: ContentSources): Map<string, string[]> {
  const definitions = new Map<string, string[]>();
  for (const file of sources.catalogs["learning/word-meanings.json"]?.provenance.files ?? []) {
    const bytes = sources.tree.files.get(path.relative(sources.root, file).split(path.sep).join("/"));
    // The merge has already read every file as JSON.
    const data: unknown = bytes ? JSON.parse(bytes.toString("utf8")) : undefined;
    for (const word of isObject(data) && isObject(data.words) ? Object.keys(data.words) : [])
      definitions.set(word, [...(definitions.get(word) ?? []), file]);
  }
  return definitions;
}

/**
 * Check that every layer keeps to its own content (spec: ownership checks).
 * - A city file in a journey folder must be listed in that journey's manifest.
 * - The core layer holds only CORE_LAYER_KINDS catalogs (no cities, travel,
 *   stories, quizzes or journey-only catalogs).
 * - An entry's cities (cityId, chapterId, the city of its landmark, …) must be
 *   cities of its own layer: a journey's manifest cities or the city files in
 *   the layer (the core layer describes no city).
 * - Everything an entry, city, travel, quiz or Ink file refers to (stories,
 *   battles, quizzes, backgrounds, images, memories, effects, …) must be
 *   defined in the same layer or in the core layer; the core layer may refer
 *   only to core content.
 * - The English of a journey's quizzes and encounters uses only word
 *   meanings of the core dictionary or of the journey's own fragment.
 * - Images (tourism images, backgrounds, item icons, character images, a
 *   manifest's title art, a city's own-artwork backdrop) are served from the
 *   journey's own public/ folder or the root public/; the core layer uses only
 *   the root public/.
 * Throws one error listing every violation with the files involved. Works on
 * the loaded sources only (no file is read).
 */
export function checkContentOwnership(sources: ContentSources): void {
  const { root } = sources;
  // Journey folders sit inside the core directory: the deepest matching layer wins.
  const byDepth = [...sources.layers].sort((a, b) => b.directory.length - a.directory.length);
  const layerOf = (file: string): ContentLayer => byDepth.find((layer) => file.startsWith(layer.directory + path.sep))!;
  const show = (file: string) => displayPath(root, file);
  const errors: string[] = [];

  // The core layer is the shared base system.
  const coreFiles = [
    ...sources.cities.flatMap((city) => [city.file, city.travelFile, city.settingsFile]),
    ...sources.storyFiles.map((story) => story.file),
    ...sources.quizFiles.map((quiz) => quiz.file),
    ...Object.entries(sources.catalogs)
      .filter(([kind]) => !CORE_LAYER_KINDS.has(kind as MergedKind))
      .flatMap(([, merged]) => merged.provenance.files),
  ].filter((file) => layerOf(file).type === "core");
  for (const file of coreFiles)
    errors.push(`Journey content in the core layer: ${show(file)}; cities, travel, stories, quizzes and journey catalogs belong in content/journeys/<journeyId>/.`);

  // Cities: a journey owns the cities its manifest lists (in that order); a
  // city file belongs to the layer that holds it.
  const ownCities = new Map<string, Set<string>>(sources.layers.map((layer) => [layer.id, new Set()]));
  const cityOwner = new Map(sources.cities.map((city) => [city.id, show(city.file)]));
  for (const manifest of sources.manifests) {
    const planned = list(manifest.data.cities).map((city) => city.id).filter((id): id is string => typeof id === "string");
    for (const id of planned) {
      ownCities.get(manifest.id)!.add(id);
      if (!cityOwner.has(id)) cityOwner.set(id, show(manifest.file));
    }
    for (const city of sources.cities.filter((item) => item.layer === manifest.id && !planned.includes(item.id)))
      errors.push(`City file outside its journey: ${show(city.file)} (${city.id} is not listed in ${show(manifest.file)})`);
  }
  for (const city of sources.cities) ownCities.get(city.layer)!.add(city.id);

  // Definitions of every referable ID, with the file and layer that define it.
  const definitions = new Map<Namespace, Map<string, Definition[]>>();
  const define = (namespace: Namespace, id: unknown, file: string, cityId?: unknown) => {
    if (typeof id !== "string") return;
    const ids = definitions.get(namespace) ?? new Map<string, Definition[]>();
    definitions.set(namespace, ids);
    ids.set(id, [...(ids.get(id) ?? []), { layer: layerOf(file).id, file, ...(typeof cityId === "string" ? { cityId } : {}) }]);
  };
  const catalog = (kind: MergedKind) => sources.catalogs[kind];
  for (const [kind, key, namespace] of DEFINITIONS) {
    const merged = catalog(kind);
    if (!merged) continue;
    const items = (merged.value as Entry)[key];
    if (!Array.isArray(items)) continue;
    items.forEach((item, index) => {
      if (isObject(item)) define(namespace, item.id, merged.provenance.items[key][index], item.cityId);
    });
  }
  const journey = catalog("progression/journey.json");
  list((journey?.value as Entry | undefined)?.storyBattles).forEach((battle, index) => {
    if (isObject(battle.completionReward)) define("reward", battle.completionReward.id, journey!.provenance.items.storyBattles[index]);
  });
  const encounters = catalog("encounters/catalog.json");
  list((encounters?.value as Entry | undefined)?.encounters).forEach((encounter, index) => {
    if (isObject(encounter.quiz) && isObject(encounter.quiz.question))
      define("question", encounter.quiz.question.id, encounters!.provenance.items.encounters[index]);
  });
  const presentation = catalog("romance/presentation.json");
  for (const [key, namespace] of [["backgrounds", "background"], ["memories", "memory"]] as const)
    for (const [id, file] of Object.entries(presentation?.provenance.keys[key] ?? {})) define(namespace, id, file);
  for (const story of sources.storyFiles) define("story", story.id, story.file);
  // A city map's places (a background names where it is by one: placeId).
  for (const city of sources.cities)
    if (isObject(city.travel)) for (const place of list(city.travel.places)) define("place", place.id, city.travelFile);
  const quizzes = sources.quizFiles;
  for (const quiz of quizzes.filter((item) => !item.example && isObject(item.data))) {
    const data = quiz.data as Entry;
    define("quiz", data.id, quiz.file);
    for (const question of list(data.questions)) define("question", question.id, quiz.file);
  }

  const checkCity = (layer: ContentLayer, where: string, field: string, id: string) => {
    if (ownCities.get(layer.id)!.has(id) || !cityOwner.has(id)) return;
    const scope = layer.type === "core"
      ? "the core layer is shared by every journey and may not describe a city"
      : `${show(layer.directory)}/ may only describe the cities of its manifest (${[...ownCities.get(layer.id)!].join(", ")})`;
    errors.push(`Content entry outside its layer's cities: ${where} ${field} "${id}" is a city of ${cityOwner.get(id)}; ${scope}.`);
  };
  const checkReferences = (file: string, label: string, references: Reference[]) => {
    const layer = layerOf(file);
    const where = `${show(file)}${label ? ` ${label}` : ""}`;
    for (const reference of references) {
      const ids = (Array.isArray(reference.ids) ? reference.ids : [reference.ids]).filter((id): id is string => typeof id === "string");
      const namespaces: readonly Namespace[] = typeof reference.namespace === "string" ? [reference.namespace] : reference.namespace;
      for (const id of ids) {
        if (namespaces.includes("city")) {
          checkCity(layer, where, reference.field, id);
          continue;
        }
        const found = namespaces.flatMap((namespace) => (definitions.get(namespace)?.get(id) ?? []).map((definition) => ({ namespace, ...definition })));
        if (!found.length) continue;
        const usable = found.filter((definition) => definition.layer === layer.id || definition.layer === "core");
        if (!usable.length) {
          const other = found[0];
          const scope = layer.type === "core"
            ? "the core layer may only refer to core content"
            : "a journey folder may only refer to its own content and the core layer";
          errors.push(`Reference to another layer: ${where} ${reference.field} "${id}" is the ${other.namespace} defined in ${show(other.file)}; ${scope}.`);
          continue;
        }
        // An entry tied to a landmark belongs to the landmark's city.
        for (const definition of usable.filter((item) => item.namespace === "landmark" && item.cityId))
          checkCity(layer, where, `${reference.field} "${id}" (city)`, definition.cityId!);
      }
    }
  };

  // Catalog entries, with the layer file each one comes from.
  for (const [kind, keys] of Object.entries(ENTRY_REFERENCES) as [MergedKind, Record<string, (entry: Entry, key: string) => Reference[]>][]) {
    const merged = catalog(kind);
    if (!merged) continue;
    for (const [key, references] of Object.entries(keys)) {
      const value = key.split(".").reduce<unknown>((current, part) => (isObject(current) ? current[part] : undefined), merged.value);
      if (Array.isArray(value))
        value.forEach((entry, index) => {
          if (isObject(entry))
            checkReferences(merged.provenance.items[key][index], `${key}[${typeof entry.id === "string" ? `"${entry.id}"` : index}]`, references(entry, ""));
        });
      else if (isObject(value))
        for (const [recordKey, entry] of Object.entries(value))
          checkReferences(merged.provenance.keys[key][recordKey], `${key}.${recordKey}`, references(isObject(entry) ? entry : {}, recordKey));
    }
  }

  // City, travel, quiz and Ink files.
  for (const city of sources.cities) {
    const { data, settings, travel } = city;
    if (isObject(data))
      checkReferences(city.file, "", [
        ref("city", "nextCityId", data.nextCityId), ref("story", "arrivalStoryId", data.arrivalStoryId),
        ref("landmark", "landmarkIdsPlanned", data.landmarkIdsPlanned), ref("asset", "backdropAssetId", data.backdropAssetId),
      ]);
    if (isObject(settings)) checkReferences(city.settingsFile, "", fields(settings, "background", ["storyBackgroundId"]));
    if (!isObject(travel)) continue;
    checkReferences(city.travelFile, "", fields(travel, "city", ["cityId"]));
    for (const place of list(travel.places))
      checkReferences(city.travelFile, `places["${String(place.id)}"]`, [
        ...fields(place, "city", ["cityId"]), ...fields(place, "background", ["backgroundId"]), ...fields(place, "asset", ["photoAssetId"]),
        ...fields(place, "landmark", ["landmarkIds"]), ...fields(place, "destination", ["destinationIds"]),
        ...list(place.heroineLinesJa).flatMap((line) => conditionReferences(line.when, "heroineLinesJa[].when")),
      ]);
    for (const event of list(travel.events))
      checkReferences(city.travelFile, `events["${String(event.id)}"]`, [...fields(event, "city", ["cityId"]), ref(EVENT, "id", event.id)]);
  }
  // Images are served from the data's own journey public/ folder or the root public/ (core data: the root one only).
  const servedOwner = (file: string) =>
    sources.layers.find((layer) => layer.type === "journey" && file.startsWith(path.join(layer.directory, "public") + path.sep));
  for (const image of imageReferences(sources)) {
    const served = servedFile(sources.publicFiles, image.path);
    const owner = served && servedOwner(served);
    const layer = layerOf(image.file);
    if (!owner || owner.id === layer.id) continue;
    const scope = layer.type === "core"
      ? "the core layer may only use images of the root public/ folder"
      : "a journey folder may only use images of its own public/ folder and the root public/ folder";
    errors.push(`Reference to another layer: ${show(image.file)}${image.label ? ` ${image.label}` : ""} ${image.field} "${image.path}" ` +
      `is the image of ${show(served)}; ${scope}.`);
  }
  for (const quiz of quizzes)
    if (isObject(quiz.data)) checkReferences(quiz.file, "", [...fields(quiz.data, "landmark", ["landmarkId"]), ...fields(quiz.data, "city", ["cityId"])]);
  for (const story of sources.storyFiles) checkReferences(story.file, "", inkTagReferences(story.source));
  // Tours (tour design stage 2a): a city of their own journey, its map events, and what their conditions name.
  for (const tour of sources.tourFiles)
    if (isObject(tour.data))
      checkReferences(tour.file, "", [...fields(tour.data, "city", ["cityId"]),
        ...list(tour.data.steps).map((step) => ref(EVENT, "steps[].eventId", step.eventId)), ...conditionReferences(tour.data.when, "when"),
        ...list(tour.data.offers).flatMap((offer) => conditionReferences(offer.when, "offers[].when"))]);

  // Word meanings merge into one dictionary, so a journey's English could lean on another journey's fragment and lose its
  // meanings when that journey is removed. A word with no meaning at all is left to the content pipeline.
  const wordFiles = wordDefinitions(sources);
  for (const [word, users] of wordUses(sources)) {
    const files = wordFiles.get(word);
    if (!files) continue;
    for (const [layerId, file] of users)
      if (!files.some((item) => layerOf(item).type === "core" || layerOf(item).id === layerId))
        errors.push(`Reference to another layer: ${show(file)} uses the English word "${word}", whose meaning is defined in ${show(files[0])}; ` +
          "a journey's quizzes and encounters may only use the word meanings of content/learning/word-meanings.json and of their own journey folder.");
  }

  if (errors.length) throw new Error([...new Set(errors)].join("\n"));
}
