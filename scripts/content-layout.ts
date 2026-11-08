import path from "node:path";
import { isDeepStrictEqual } from "node:util";

// Layout of the content layers and the rules that merge them.
//
// Layers: the core layer is `content/` without the journey folders below
// `content/journeys/`; every subdirectory of `content/journeys/` is a journey
// layer with the same relative layout, registered by its `manifest.json`.
// Catalog files of all layers are merged key by key (see CATALOG_RULES) and
// written, validated, to the generated mirror `src/content/generated/content/`
// which the game imports. The journey catalog is generated from the manifests.
// Static files (images) of the root `public/` and of every journey's `public/`
// are assembled into `src/content/generated/public/`, which Vite serves.

export const CONTENT_DIRECTORY = "content";
export const JOURNEYS_DIRECTORY = "journeys";
export const MIRROR_DIRECTORY = "src/content/generated/content";
/** The served static files, assembled by content:build (`publicDir` in vite.config.ts). */
export const GENERATED_PUBLIC_DIRECTORY = "src/content/generated/public";
/** Registration of a journey layer: its former journey catalog entry plus the keys below. */
export const MANIFEST_FILE = "manifest.json";
/** Manifest keys that are not part of the generated journey catalog entry. */
export const MANIFEST_ONLY_KEYS: readonly string[] = ["schemaVersion", "order", "authoring"];
/** Generated from the journey manifests; no layer provides this file. */
export const JOURNEY_CATALOG_KIND = "journeys/catalog.json";
/**
 * The sample journey ("見本の旅"): a playable minimal journey folder for
 * development and tests only. It lives outside content/journeys/, so the game
 * and production builds never contain it; `npm run content:build -- --with-sample`
 * (used by the unit tests and `npm run dev:sample`) loads it as an extra journey folder.
 */
export const SAMPLE_JOURNEY_ID = "sample_trip";
export const SAMPLE_JOURNEY_DIRECTORY = `authoring/templates/${SAMPLE_JOURNEY_ID}`;

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

/** A catalog is merged key by key (`fields`) or provided as a whole file by the core layer only (`file: "core"`). */
export type CatalogRule =
  | { readonly kind: string; readonly fields: FieldTable }
  | { readonly kind: string; readonly file: "core" };

const same = { mode: "same" } as const;
const concat = { mode: "concat" } as const;
const record = { mode: "record" } as const;
const core = { mode: "core" } as const;
const entries = { schemaVersion: same, entries: concat };

export const CATALOG_RULES = [
  { kind: "battles/catalog.json", fields: { schemaVersion: same, battles: concat } },
  { kind: "encounters/catalog.json", fields: { schemaVersion: same, items: concat, encounters: concat } },
  { kind: "encounters/entry-rules.json", fields: entries },
  { kind: "learning/details.json", fields: { schemaVersion: same, questions: record } },
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
  { kind: "presentation/own-artwork.json", fields: { schemaVersion: same, artworks: concat } },
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

/**
 * The catalogs the core layer may hold: the base system shared by every
 * journey (balance, response profiles, the common date effects, global
 * presentation, romance stages, the shared dictionary, the characters and the
 * list of artwork made for Dreamscape that the root public/ serves).
 * Every other catalog, and every city, travel, story and quiz file, belongs
 * to a journey folder.
 */
export const CORE_LAYER_KINDS: ReadonlySet<MergedKind> = new Set<MergedKind>([
  "learning/word-meanings.json",
  "presentation/characters.json",
  "presentation/own-artwork.json",
  "romance/balance.json",
  "romance/effect_catalog.json",
  "romance/presentation.json",
  "romance/progression.json",
  "romance/response_profiles.json",
]);
/** Every catalog of the merged view (and of the generated mirror). */
export type CatalogKind = MergedKind | typeof JOURNEY_CATALOG_KIND;

const catalogRules = new Map<string, CatalogRule>(CATALOG_RULES.map((rule) => [rule.kind, rule]));

export function catalogRule(kind: MergedKind): CatalogRule {
  return catalogRules.get(kind)!;
}

/**
 * The merged value of a catalog that no layer provides, so any journey folder
 * can be left out: journey catalogs are empty (the schemas decide whether
 * empty is valid). Core-layer kinds, including every whole-file kind, have
 * none: the base system must provide them.
 */
export function absentCatalog(kind: MergedKind): Record<string, unknown> | undefined {
  return CORE_LAYER_KINDS.has(kind) ? undefined : emptyCatalog(kind);
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

/**
 * Give a layer's existing fragment the top-level keys of emptyCatalog that it
 * leaves out (the merge accepts such a fragment: the layer contributes nothing
 * there), so authoring tools can edit every key. Missing keys are appended,
 * empty; present keys keep their values and order. Returns the added keys with
 * their empty values, for trimFragment.
 */
export function completeFragment(kind: MergedKind, data: Record<string, unknown>, schemaVersion?: unknown): Map<string, unknown> {
  const added = new Map<string, unknown>();
  for (const [key, empty] of Object.entries(emptyCatalog(kind, schemaVersion))) {
    if (Object.hasOwn(data, key)) continue;
    data[key] = empty;
    added.set(key, structuredClone(empty));
  }
  return added;
}

/** Remove the keys completeFragment added that are still empty, before the fragment is written back. */
export function trimFragment<T extends Record<string, unknown>>(data: T, added: ReadonlyMap<string, unknown>): T {
  for (const [key, empty] of added) if (isDeepStrictEqual(data[key], empty)) delete data[key];
  return data;
}

export type LayerType = "core" | "journey";

export type ContentFileType =
  | { type: "catalog"; kind: MergedKind }
  | { type: "manifest" }
  | { type: "city"; id: string }
  /** `travel/<city>.json` (routes), `-settings.json` (settings) or `-transit.json` (the per-city transit ledger). */
  | { type: "travel"; cityId: string; part: "routes" | "settings" | "transit" }
  | { type: "story"; id: string }
  | { type: "quiz"; example: boolean }
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
  const travel = /^travel\/([^/]+?)(?:-(settings|transit))?\.json$/u.exec(relative);
  if (travel) return { type: "travel", cityId: travel[1], part: travel[2] === "settings" ? "settings" : travel[2] === "transit" ? "transit" : "routes" };
  const story = storyIdFromPath(relative);
  if (story !== undefined) return { type: "story", id: story };
  if (/^quizzes\/.+\.json$/u.test(relative)) return { type: "quiz", example: relative.endsWith(".example.json") };
  return { type: "unknown" };
}

/** `stories/dates/milano_date_cafe.ink` (relative to its layer) → `dates/milano_date_cafe`. */
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

export function generatedPublicDirectory(root: string): string {
  return path.join(root, GENERATED_PUBLIC_DIRECTORY);
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
