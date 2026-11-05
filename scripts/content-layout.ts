import path from "node:path";

// Layout of the content layers and the rules that merge them.
//
// Layers: the core layer is `content/` without the journey folders below
// `content/journeys/`; every subdirectory of `content/journeys/` is a journey
// layer with the same relative layout. Catalog files of all layers are merged
// key by key (see CATALOG_RULES) and written, validated, to the generated
// mirror `src/content/generated/content/` which the game imports.

export const CONTENT_DIRECTORY = "content";
export const JOURNEYS_DIRECTORY = "journeys";
export const MIRROR_DIRECTORY = "src/content/generated/content";

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
  // Still one central core file until journeys register themselves with manifests.
  { kind: "journeys/catalog.json", file: "core" },
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

export type CatalogKind = (typeof CATALOG_RULES)[number]["kind"];

const catalogRules = new Map<string, CatalogRule>(CATALOG_RULES.map((rule) => [rule.kind, rule]));

export function catalogRule(kind: CatalogKind): CatalogRule {
  return catalogRules.get(kind)!;
}

export type LayerType = "core" | "journey";

export type ContentFileType =
  | { type: "catalog"; kind: CatalogKind }
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
 * Journey layers keep their images under `public/assets/`.
 */
export function classifyContentFile(relative: string, layer: LayerType): ContentFileType {
  if (relative.split("/").some((segment) => segment.startsWith("."))) return { type: "other" };
  if (layer === "journey" && relative.startsWith("public/"))
    return relative.startsWith("public/assets/") ? { type: "public" } : { type: "unknown" };
  if (!relative.endsWith(".json") && !relative.endsWith(".ink")) return { type: "other" };
  const rule = catalogRules.get(relative);
  if (rule && !(layer === "journey" && relative === "journeys/catalog.json"))
    return { type: "catalog", kind: rule.kind as CatalogKind };
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
