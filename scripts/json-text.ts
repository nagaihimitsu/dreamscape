import { isDeepStrictEqual } from "node:util";

// How the authoring tools write a JSON file an author also edits (city:bundle apply, journey:release),
// so that a diff shows only what changed: an unchanged document keeps its exact text, and a changed one
// keeps the file's own key order (a schema's parse returns its keys in the schema's order instead).

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * `value` with the key order of `previous`, at every depth: an object's keys that `previous` has come in
 * its order, the others after them in their own order. An array element follows the previous element with
 * the same `id`, else the one at its index, else the last one (so an added entry looks like its neighbours).
 */
export function withKeyOrderOf(previous: unknown, value: unknown): unknown {
  if (Array.isArray(value)) {
    const before = Array.isArray(previous) ? previous : [];
    return value.map((item, index) => {
      const sameId = isObject(item) && typeof item.id === "string" ? before.find((entry) => isObject(entry) && entry.id === item.id) : undefined;
      return withKeyOrderOf(sameId ?? (index < before.length ? before[index] : before.at(-1)), item);
    });
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
