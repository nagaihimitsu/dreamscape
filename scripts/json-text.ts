import { isDeepStrictEqual } from "node:util";

// How the authoring tools write a JSON file an author also edits (city:bundle apply, journey:release),
// so that a diff shows only what changed: an unchanged document keeps its exact text, and a changed one
// keeps the file's own key order (a schema's parse returns its keys in the schema's order instead).

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** The fields that name an entry without an `id`: a route's or a transit decision's direction and mode. */
const IDENTITY_FIELDS = ["fromPlaceId", "toPlaceId", "mode"] as const;
const sameIdentity = (a: Record<string, unknown>, b: Record<string, unknown>) =>
  IDENTITY_FIELDS.every((field) => typeof a[field] === "string" && a[field] === b[field]);

/**
 * The previous array entry whose key order an entry takes: the one with the same `id`; else an equal one
 * (an unchanged entry keeps its own order wherever it moved); else the one with the same direction and mode
 * (routes, transit decisions); else the one at its index, else the last (an added entry looks like its neighbours).
 */
function templateOf(before: readonly unknown[], item: unknown, index: number): unknown {
  if (isObject(item) && typeof item.id === "string") {
    const sameId = before.find((entry) => isObject(entry) && entry.id === item.id);
    if (sameId) return sameId;
  }
  const equal = before.find((entry) => isDeepStrictEqual(entry, item));
  if (equal !== undefined) return equal;
  if (isObject(item)) {
    const same = before.find((entry) => isObject(entry) && sameIdentity(entry, item));
    if (same) return same;
  }
  return index < before.length ? before[index] : before.at(-1);
}

/**
 * `value` with the key order of `previous`, at every depth: an object's keys that `previous` has come in
 * its order, the others after them in their own order. An array entry follows its previous entry (templateOf).
 */
export function withKeyOrderOf(previous: unknown, value: unknown): unknown {
  if (Array.isArray(value)) {
    const before = Array.isArray(previous) ? previous : [];
    return value.map((item, index) => withKeyOrderOf(templateOf(before, item, index), item));
  }
  if (!isObject(value)) return value;
  const template = isObject(previous) ? previous : {};
  const keys = [...Object.keys(template).filter((key) => Object.hasOwn(value, key)), ...Object.keys(value).filter((key) => !Object.hasOwn(template, key))];
  return Object.fromEntries(keys.map((key) => [key, withKeyOrderOf(template[key], value[key])]));
}

/** Formatted JSON text with a final newline (the repository's style). */
export const jsonText = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

/** The text to write for `value`: `before` itself when its data is the same, else formatted JSON in `before`'s key order. */
export function jsonTextKeeping(before: string | null | undefined, value: unknown): string {
  if (typeof before !== "string") return jsonText(value);
  const previous: unknown = JSON.parse(before);
  return isDeepStrictEqual(previous, value) ? before : jsonText(withKeyOrderOf(previous, value));
}
