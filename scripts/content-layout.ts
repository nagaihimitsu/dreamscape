import path from "node:path";

// Layout of the content layers and the rules that merge them.
//
// Layers: the core layer is `content/` without the journey folders below
// `content/journeys/`; every subdirectory of `content/journeys/` is a journey
// layer with the same relative layout, registered by its `manifest.json`.
// Catalog files of all layers are merged key by key (see CATALOG_RULES) and
// written, validated, to the generated mirror `src/content/generated/content/`
// which the game imports. The journey catalog is generated from the manifests.

export const CONTENT_DIRECTORY = "content";
export const JOURNEYS_DIRECTORY = "journeys";
export const MIRROR_DIRECTORY = "src/content/generated/content";
/** Registration of a journey layer: its former journey catalog entry plus the keys below. */
export const MANIFEST_FILE = "manifest.json";
/** Manifest keys that are not part of the generated journey catalog entry. */
export const MANIFEST_ONLY_KEYS: readonly string[] = ["schemaVersion", "order", "authoring"];
/** Generated from the journey manifests; no layer provides this file. */
export const JOURNEY_CATALOG_KIND = "journeys/catalog.json";

/**
 * How one key of a catalog file is merged across layers.
 * - same: every layer that sets it must use an identical value (schemaVersion).
 * - concat: arrays are concatenated, core first, then the journeys in order.
 * - record: objects are merged in layer order; a key may be defined once
 *   (equalDuplicates: a repeated key is accepted when its value is identical).
 * - core: only the core layer may set it.
 * - nested: an object whose own keys follow a nested table.
 */
export type FieldRule =
  | { readonly mode: "same" | "concat" | "core" }
  | { readonly mode: "record"; readonly equalDuplicates?: boolean }
  | { readonly mode: "nested"; readonly fields: FieldTable };
/** Output key order is the table order (the key order of the current files). */
export type FieldTable = { readonly [key: string]: FieldRule };

/**
 * A catalog is merged key by key (`fields`) or provided as a whole file:
 * `single` by at most one layer, `core` by the core layer only.
 */
export type CatalogRule =
  | { readonly kind: string; readonly fields: FieldTable }
  | { readonly kind: string; readonly file: "single" | "core" };

const same = { mode: "same" } as const;
const concat = { mode: "concat" } as const;
const record = { mode: "record" } as const;
const core = { mode: "core" } as const;
const entries = { schemaVersion: same, entries: concat };

export const CATALOG_RULES = [
  { kind: "battles/catalog.json", fields: { schemaVersion: same, battles: concat } },
  { kind: "encounters/catalog.json", fields: { schemaVersion: same, items: concat, encounters: concat } },
  { kind: "encounters/entry-rules.json", fields: entries },
  { kind: "learning/details.json", file: "single" },
  { kind: "learning/translations.json", fields: { schemaVersion: same, questions: record } },
  { kind: "learning/word-meanings.json", fields: { schemaVersion: same, words: { mode: "record", equalDuplicates: true } } },
  {
    kind: "presentation/characters.json",
    fields: {
      schemaVersion: same,
      battleCharacters: record,
      characters: concat,
      expressionIds: core,
      wardrobe: { mode: "nested", fields: { regions: core, countries: core, cities: record, scenes: record } },
    },
  },
  { kind: "presentation/dialogue-expressions.json", fields: entries },
  { kind: "presentation/dialogue-reactions.json", fields: entries },
  { kind: "presentation/reasoning-intros.json", fields: entries },
  { kind: "progression/journey.json", fields: { schemaVersion: same, episodes: concat, storyBattles: concat, rewards: concat } },
  { kind: "romance/balance.json", file: "core" },
  { kind: "romance/date_catalog.json", fields: { schemaVersion: same, dates: concat } },
  { kind: "romance/date_destinations.json", fields: { schemaVersion: same, destinations: concat } },
  { kind: "romance/effect_catalog.json", fields: { schemaVersion: same, effects: concat } },
  {
    kind: "romance/presentation.json",
    fields: { schemaVersion: same, deferred: core, ending: core, backgrounds: record, emotions: core, memories: record },
  },
  {
    kind: "romance/progression.json",
    fields: { schemaVersion: same, stages: core, confession: core, memoryCallbacks: concat, fallbackMemoryCallbackJa: core },
  },
  { kind: "romance/response_profiles.json", file: "core" },
  { kind: "tourism/catalog.json", fields: { schemaVersion: same, assets: concat, landmarks: concat, clues: concat } },
] as const satisfies readonly CatalogRule[];

/** A catalog merged from layer files. */
export type MergedKind = (typeof CATALOG_RULES)[number]["kind"];
/** Every catalog of the merged view (and of the generated mirror). */
export type CatalogKind = MergedKind | typeof JOURNEY_CATALOG_KIND;

const catalogRules = new Map<string, CatalogRule>(CATALOG_RULES.map((rule) => [rule.kind, rule]));

export function catalogRule(kind: MergedKind): CatalogRule {
  return catalogRules.get(kind)!;
}

/**
 * An empty fragment of a merged catalog, for a layer that does not have the
 * file yet: schemaVersion plus every mergeable key, empty. Core-only keys are
 * left out (a journey layer may not set them).
 */
export function emptyCatalog(kind: MergedKind, schemaVersion: unknown = 1): Record<string, unknown> {
  const rule = catalogRule(kind);
  if ("file" in rule) throw new Error(`${kind} is provided as a whole file and has no empty fragment`);
  const empty = (table: FieldTable): Record<string, unknown> => Object.fromEntries(Object.entries(table).flatMap(([key, field]) => {
    if (field.mode === "same") return [[key, schemaVersion]];
    if (field.mode === "concat") return [[key, []]];
    if (field.mode === "record") return [[key, {}]];
    if (field.mode === "nested") return [[key, empty(field.fields)]];
    return [];
  }));
  return empty(rule.fields);
}

export type LayerType = "core" | "journey";

export type ContentFileType =
  | { type: "catalog"; kind: MergedKind }
  | { type: "manifest" }
  | { type: "city"; id: string }
  | { type: "travel"; cityId: string; settings: boolean }
  | { type: "story"; id: string }
  | { type: "quiz"; sample: boolean }
  | { type: "public" }
  | { type: "other" }
  | { type: "unknown" };

/**
 * Classify a file by its path relative to its layer (posix separators).
 * Only `.json` and `.ink` files are data; notes such as `*.md` or research
 * tables are ignored. A data file outside the known layout is `unknown`.
 * Journey layers keep their images under `public/assets/` and are registered
 * by `manifest.json` at their root.
 */
export function classifyContentFile(relative: string, layer: LayerType): ContentFileType {
  if (relative.split("/").some((segment) => segment.startsWith("."))) return { type: "other" };
  if (layer === "journey" && relative.startsWith("public/"))
    return relative.startsWith("public/assets/") ? { type: "public" } : { type: "unknown" };
  if (!relative.endsWith(".json") && !relative.endsWith(".ink")) return { type: "other" };
  if (layer === "journey" && relative === MANIFEST_FILE) return { type: "manifest" };
  const rule = catalogRules.get(relative);
  if (rule) return { type: "catalog", kind: rule.kind as MergedKind };
  const city = /^cities\/([^/]+)\.json$/u.exec(relative);
  if (city) return { type: "city", id: city[1] };
  const travel = /^travel\/([^/]+?)(-settings)?\.json$/u.exec(relative);
  if (travel) return { type: "travel", cityId: travel[1], settings: Boolean(travel[2]) };
  const story = storyIdFromPath(relative);
  if (story !== undefined) return { type: "story", id: story };
  if (/^quizzes\/.+\.json$/u.test(relative)) return { type: "quiz", sample: relative.endsWith(".sample.json") };
  return { type: "unknown" };
}

/** `stories/milano/sound_cafe_01.ink` (relative to its layer) → `milano/sound_cafe_01`. */
export function storyIdFromPath(relative: string): string | undefined {
  return /^stories\/(.+)\.ink$/u.exec(relative)?.[1];
}

export function coreLayerDirectory(root: string): string {
  return path.join(root, CONTENT_DIRECTORY);
}

export function journeysDirectory(root: string): string {
  return path.join(root, CONTENT_DIRECTORY, JOURNEYS_DIRECTORY);
}

/** `content/journeys/<journeyId>/` */
export function journeyDirectory(root: string, journeyId: string): string {
  return path.join(journeysDirectory(root), journeyId);
}

/** Root-relative posix path of a journey's manifest, e.g. `content/journeys/milano/manifest.json`. */
export function journeyManifestPath(journeyId: string): string {
  return `${CONTENT_DIRECTORY}/${JOURNEYS_DIRECTORY}/${journeyId}/${MANIFEST_FILE}`;
}

export function mirrorDirectory(root: string): string {
  return path.join(root, MIRROR_DIRECTORY);
}

export const toPosix = (file: string) => file.split(path.sep).join("/");

/** Sort key used for files of every layer: relative path (with extension), then layer order. */
export function compareLayerFiles(
  a: { relative: string; layerIndex: number },
  b: { relative: string; layerIndex: number },
): number {
  if (a.relative !== b.relative) return a.relative < b.relative ? -1 : 1;
  return a.layerIndex - b.layerIndex;
}
