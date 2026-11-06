import path from "node:path";
import { displayPath, type ContentLayer, type ContentSources } from "./content-sources";
import { CORE_LAYER_KINDS, type MergedKind } from "./content-layout";
import { servedFile } from "./public-assets";

// Ownership of content across layers. Every journey folder must stay
// removable on its own: its entries describe only its own cities, and what
// they refer to lives in the same journey folder or in the core layer. The
// core layer is the base system shared by every journey: it holds no city,
// travel, story or quiz file and no journey-only catalog, describes no city
// and refers only to core content. Unknown IDs are left to the content
// pipeline, which reports them with its usual messages.

type Namespace =
  | "city" | "landmark" | "asset" | "clue" | "battle" | "episode" | "reward" | "date" | "destination" | "effect"
  | "background" | "memory" | "story" | "quiz" | "question" | "encounter" | "item";
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

/** References of an array element (`key`) or a record entry (`key` with `recordKey`) of a catalog. */
const ENTRY_REFERENCES: Partial<Record<MergedKind, Record<string, (entry: Entry, recordKey: string) => Reference[]>>> = {
  "battles/catalog.json": {
    battles: (entry) => [
      ...fields(entry, "city", ["cityId"]), ...fields(entry, "landmark", ["landmarkId"]), ...fields(entry, "story", ["storyId"]),
      ...fields(entry, "quiz", ["quizId"]), ...fields(entry, "background", ["backgroundAssetId"]),
      ...(isObject(entry.reasoning) ? fields(entry.reasoning, "clue", ["caseClueIds", "correctClueIds"]) : []),
    ],
  },
  "encounters/catalog.json": {
    items: (entry) => fields(entry, "city", ["cityId"]),
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
    entries: (entry) => [
      ...fields(entry, "encounter", ["encounterId"]), ...fields(entry, "landmark", ["landmarkId"]),
      ...fields(entry, "episode", ["completedEpisodeId"]), ...fields(entry, "story", ["storyId"]),
      ...fields(entry, "battle", ["completedStoryBattleId"]),
    ],
  },
  "learning/details.json": { questions: (entry, key) => [ref("question", "question ID", key), ...fields(entry, "story", ["storyId"])] },
  "learning/translations.json": { questions: (_, key) => [ref("question", "question ID", key)] },
  "presentation/characters.json": {
    battleCharacters: (_, key) => [ref("battle", "battle ID", key)],
    "wardrobe.cities": (_, key) => [ref("city", "city ID", key)],
    "wardrobe.scenes": (_, key) => [ref(SCENE, "scene ID", key)],
  },
  "presentation/dialogue-expressions.json": { entries: (entry) => fields(entry, "story", ["storyId"]) },
  "presentation/dialogue-reactions.json": { entries: (entry) => fields(entry, "story", ["storyId"]) },
  "presentation/reasoning-intros.json": {
    entries: (entry) => [...fields(entry, "battle", ["battleId"]), ...fields(entry, "story", ["storyId"])],
  },
  "progression/journey.json": {
    episodes: (entry) => [
      ...fields(entry, "city", ["cityId"]), ...fields(entry, "landmark", ["landmarkId"]), ...fields(entry, "battle", ["battleId"]),
      ...fields(entry, "episode", ["requiredEpisodeIds"]), ...fields(entry, "story", ["epilogueStoryId"]),
    ],
    storyBattles: (entry) => [...fields(entry, "battle", ["battleId"]), ...fields(entry, "episode", ["requiredEpisodeIds"])],
    rewards: (entry) => [...fields(entry, "episode", ["episodeId"]), ...fields(entry, "battle", ["battleId"])],
  },
  "romance/date_catalog.json": {
    dates: (entry) => [
      ...fields(entry, "city", ["chapterId", "requiredCompletedChapters", "requiredCompletedCityIds"]),
      ...fields(entry, "story", ["storyId"]), ...fields(entry, "background", ["backgroundAssetId"]),
      ...fields(entry, "destination", ["destinationId"]), ...fields(entry, "date", ["requiredPlayedDateIds"]),
      ...fields(entry, "episode", ["requiredCompletedEpisodeIds", "forbiddenCompletedEpisodeIds"]),
      ...list(entry.validationContexts).flatMap((context) => fields(context, "memory", ["memoryId", "memoryIds"])),
    ],
  },
  "romance/date_destinations.json": {
    destinations: (entry) => [...fields(entry, "city", ["cityId"]), ...fields(entry, "background", ["backgroundAssetId"])],
  },
  "romance/effect_catalog.json": { effects: (entry) => fields(entry, "memory", ["memoryId"]) },
  "romance/presentation.json": { backgrounds: (entry) => fields(entry, "asset", ["imageAssetId"]) },
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
];

/** `# background: id` and `# effect: id` tags of an Ink source. */
function inkTagReferences(source: string): Reference[] {
  return [...source.matchAll(/#\s*(background|effect)\s*:\s*([A-Za-z0-9_]+)/gu)]
    .map(([, tag, id]) => ref(tag === "background" ? "background" : "effect", `#${tag}`, id));
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
 * - A manifest's title art image is served from the journey's own public/
 *   folder or the root public/.
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
  const quizzes = sources.quizFiles;
  for (const quiz of quizzes.filter((item) => !item.sample && isObject(item.data))) {
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
        ref("landmark", "landmarkIdsPlanned", data.landmarkIdsPlanned),
      ]);
    if (isObject(settings)) checkReferences(city.settingsFile, "", fields(settings, "background", ["storyBackgroundAssetId"]));
    if (!isObject(travel)) continue;
    checkReferences(city.travelFile, "", fields(travel, "city", ["cityId"]));
    for (const place of list(travel.places))
      checkReferences(city.travelFile, `places["${String(place.id)}"]`, [
        ...fields(place, "city", ["cityId"]), ...fields(place, "background", ["backgroundAssetId"]),
        ...fields(place, "landmark", ["landmarkIds"]), ...fields(place, "destination", ["destinationIds"]),
      ]);
    for (const event of list(travel.events))
      checkReferences(city.travelFile, `events["${String(event.id)}"]`, [...fields(event, "city", ["cityId"]), ref(EVENT, "id", event.id)]);
  }
  // A journey's title art is served from its own public/ folder or the root public/.
  for (const manifest of sources.manifests) {
    const imagePath = isObject(manifest.data.titleArt) ? manifest.data.titleArt.imagePath : undefined;
    const file = typeof imagePath === "string" ? servedFile(sources.publicFiles, imagePath) : undefined;
    const owner = file && sources.layers.find((layer) => layer.type === "journey" && file.startsWith(path.join(layer.directory, "public") + path.sep));
    if (owner && owner.id !== manifest.id)
      errors.push(`Reference to another layer: ${show(manifest.file)} titleArt.imagePath "${imagePath}" is the image of ${show(file)}; ` +
        "a journey folder may only refer to its own content and the core layer.");
  }
  for (const quiz of quizzes)
    if (isObject(quiz.data)) checkReferences(quiz.file, "", [...fields(quiz.data, "landmark", ["landmarkId"]), ...fields(quiz.data, "city", ["cityId"])]);
  for (const story of sources.storyFiles) checkReferences(story.file, "", inkTagReferences(story.source));

  if (errors.length) throw new Error([...new Set(errors)].join("\n"));
}
