import { isDeepStrictEqual } from "node:util";
import type { CatalogRule, FieldTable } from "./content-layout";

/** One layer's copy of a catalog file (`layer`: its layer's ID, for a key each layer keeps apart; `core` when left out). */
export type CatalogSource = { file: string; core: boolean; layer?: string; data: unknown };

/**
 * Which file contributed what. Key paths are dot-joined (`wardrobe.cities`).
 * - items: the file of every array element of a concatenated key;
 * - keys: the file of every key of a merged record;
 * - values: the file whose value was used for a single value (same/core).
 * A key each layer keeps apart (layers) records its files under keys too, by layer ID.
 */
export type CatalogProvenance = {
  files: string[];
  items: Record<string, string[]>;
  keys: Record<string, Record<string, string>>;
  values: Record<string, string>;
};

export type MergedCatalog = { value: unknown; provenance: CatalogProvenance };

type ObjectSource = { file: string; core: boolean; layer?: string; data: Record<string, unknown> };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const show = (value: unknown) => JSON.stringify(value);

/** Merge every layer's copy of one catalog file (layer order: core first). */
export function mergeCatalog(rule: CatalogRule, sources: readonly CatalogSource[]): MergedCatalog | undefined {
  if (!sources.length) return undefined;
  const provenance: CatalogProvenance = { files: sources.map((source) => source.file), items: {}, keys: {}, values: {} };
  if ("file" in rule) {
    // There is one core layer, so a second copy is always a journey's.
    const journey = sources.find((source) => !source.core);
    if (journey) throw new Error(`Only the core layer may provide ${rule.kind}: ${journey.file}`);
    return { value: sources[0].data, provenance };
  }
  const objects = sources.map((source) => {
    if (!isObject(source.data)) throw new Error(`Expected a JSON object in ${source.file}`);
    return source as ObjectSource;
  });
  return { value: mergeFields(rule.kind, rule.fields, objects, "", provenance), provenance };
}

function mergeFields(
  kind: string,
  table: FieldTable,
  sources: readonly ObjectSource[],
  prefix: string,
  provenance: CatalogProvenance,
): Record<string, unknown> {
  for (const source of sources)
    for (const key of Object.keys(source.data))
      if (!Object.hasOwn(table, key)) throw new Error(`Unknown key "${prefix}${key}" in ${source.file}`);
  const result: [string, unknown][] = [];
  for (const [key, rule] of Object.entries(table)) {
    const name = `${prefix}${key}`;
    const present = sources.filter((source) => Object.hasOwn(source.data, key));
    if (!present.length) continue;
    if (rule.mode === "same") {
      const [first, ...rest] = present;
      const other = rest.find((source) => !isDeepStrictEqual(source.data[key], first.data[key]));
      if (other)
        throw new Error(`Mismatched "${name}" in ${kind}: ${first.file} has ${show(first.data[key])}, ${other.file} has ${show(other.data[key])}`);
      provenance.values[name] = first.file;
      result.push([key, first.data[key]]);
    } else if (rule.mode === "core") {
      const journey = present.find((source) => !source.core);
      if (journey) throw new Error(`Core-only key "${name}" set in a journey layer: ${journey.file}`);
      provenance.values[name] = present[0].file;
      result.push([key, present[0].data[key]]);
    } else if (rule.mode === "concat") {
      const items: unknown[] = [];
      const files: string[] = [];
      for (const source of present) {
        const value = source.data[key];
        if (!Array.isArray(value)) throw new Error(`Expected an array for "${name}" in ${source.file}`);
        items.push(...value);
        files.push(...value.map(() => source.file));
      }
      provenance.items[name] = files;
      result.push([key, items]);
    } else if (rule.mode === "record") {
      const merged = new Map<string, unknown>();
      const owners: Record<string, string> = Object.create(null);
      for (const source of present) {
        const value = source.data[key];
        if (!isObject(value)) throw new Error(`Expected an object for "${name}" in ${source.file}`);
        for (const [entryKey, entry] of Object.entries(value)) {
          if (merged.has(entryKey)) {
            if (rule.equalDuplicates && isDeepStrictEqual(merged.get(entryKey), entry)) continue;
            throw new Error(`Duplicate key "${name}.${entryKey}" in ${kind}: ${owners[entryKey]} and ${source.file}`);
          }
          merged.set(entryKey, entry);
          owners[entryKey] = source.file;
        }
      }
      provenance.keys[name] = owners;
      result.push([key, Object.fromEntries(merged)]);
    } else if (rule.mode === "layers") {
      // Each layer's own value, by its layer ID (the core layer's under "core"): no layer's value replaces another's.
      const byLayer: Record<string, unknown> = Object.create(null);
      const owners: Record<string, string> = Object.create(null);
      for (const source of present) {
        const layer = source.core ? "core" : source.layer ?? source.file;
        byLayer[layer] = source.data[key];
        owners[layer] = source.file;
      }
      provenance.keys[name] = owners;
      result.push([key, { ...byLayer }]);
    } else if (rule.mode === "nested") {
      const nested = present.map((source) => {
        const value = source.data[key];
        if (!isObject(value)) throw new Error(`Expected an object for "${name}" in ${source.file}`);
        return { ...source, data: value };
      });
      result.push([key, mergeFields(kind, rule.fields, nested, `${name}.`, provenance)]);
    }
  }
  return Object.fromEntries(result);
}

/**
 * The file an error at `issuePath` (e.g. a zod issue path `["battles", 3, "id"]`)
 * comes from, or undefined when the merged value has no single source there.
 */
export function sourceFileOf(provenance: CatalogProvenance, issuePath: readonly PropertyKey[]): string | undefined {
  for (let length = 1; length <= issuePath.length; length++) {
    const name = issuePath.slice(0, length).map(String).join(".");
    const next = issuePath[length];
    const items = provenance.items[name];
    if (items && typeof next === "number" && items[next]) return items[next];
    const keys = provenance.keys[name];
    if (keys && typeof next === "string" && Object.hasOwn(keys, next)) return keys[next];
    if (Object.hasOwn(provenance.values, name)) return provenance.values[name];
  }
  return provenance.files.length === 1 ? provenance.files[0] : undefined;
}

/**
 * `issuePath` (a path in the merged value) as a path inside the file it comes
 * from: the index of a concatenated array becomes the element's index in its
 * own file (`["battles", 9, "id"]` → `["battles", 0, "id"]` for the first
 * battle of a journey's file). Record keys and other paths stay as they are.
 */
export function localIssuePath(provenance: CatalogProvenance, issuePath: readonly PropertyKey[]): PropertyKey[] {
  const local = [...issuePath];
  for (let length = 1; length < issuePath.length; length++) {
    const items = provenance.items[issuePath.slice(0, length).map(String).join(".")];
    const index = issuePath[length];
    if (items && typeof index === "number" && items[index]) {
      local[length] = items.slice(0, index).filter((file) => file === items[index]).length;
      break;
    }
  }
  return local;
}
