// Where each value of a JSON text starts (its line), for the on-demand checks that name a file and a line
// (sources:check, text:check). JSON.parse gives the values; this gives their lines, by the same paths the
// data-language warning prints (`places[3].sources[0].title`). Light module (no content loading).

/** The path of a value, as the messages print it: `key`, `a.b`, `a[0].b`. */
export const joinJsonPath = (path: string, key: string | number) => (typeof key === "number" ? `${path}[${key}]` : path ? `${path}.${key}` : key);

/**
 * The line (from 1) where each value of `text` starts, by its path (the whole document is ""). Throws for text
 * that is not JSON (as JSON.parse would).
 */
export function jsonValueLines(text: string): Map<string, number> {
  const lines = new Map<string, number>();
  let index = 0;
  let line = 1;
  const fail = (what: string): never => { throw new Error(`JSON として読めません（${line}行目：${what}）`); };
  const space = () => {
    while (index < text.length && /\s/u.test(text[index])) {
      if (text[index] === "\n") line++;
      index++;
    }
  };
  const string = (): string => {
    const start = index;
    index++;
    while (index < text.length && text[index] !== "\"") {
      if (text[index] === "\\") index++;
      else if (text[index] === "\n") fail("文字列の途中で改行");
      index++;
    }
    if (index >= text.length) fail("文字列が閉じていない");
    index++;
    return JSON.parse(text.slice(start, index)) as string;
  };
  const value = (path: string): void => {
    space();
    lines.set(path, line);
    const char = text[index];
    if (char === "{") {
      index++;
      space();
      if (text[index] === "}") { index++; return; }
      for (;;) {
        space();
        if (text[index] !== "\"") fail("キーがない");
        const key = string();
        space();
        if (text[index] !== ":") fail(": がない");
        index++;
        value(joinJsonPath(path, key));
        space();
        if (text[index] === ",") { index++; continue; }
        if (text[index] === "}") { index++; return; }
        fail(", か } がない");
      }
    }
    if (char === "[") {
      index++;
      space();
      if (text[index] === "]") { index++; return; }
      for (let item = 0; ; item++) {
        value(joinJsonPath(path, item));
        space();
        if (text[index] === ",") { index++; continue; }
        if (text[index] === "]") { index++; return; }
        fail(", か ] がない");
      }
    }
    if (char === "\"") { string(); return; }
    const literal = /^(?:true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/u.exec(text.slice(index, index + 40));
    if (!literal) fail("値がない");
    index += literal![0].length;
  };
  value("");
  space();
  if (index < text.length) fail("余分な文字");
  return lines;
}

/** A string of a JSON value: its path, the nearest object key it is under (an array's items keep the array's key) and its text. */
export type JsonString = { path: string; field: string | undefined; value: string };

/** Every string of a parsed JSON value, in document order. */
export function jsonStrings(value: unknown): JsonString[] {
  const walk = (item: unknown, at: string, field: string | undefined): JsonString[] =>
    typeof item === "string" ? [{ path: at, field, value: item }]
      : Array.isArray(item) ? item.flatMap((entry, index) => walk(entry, joinJsonPath(at, index), field))
        : typeof item === "object" && item !== null ? Object.entries(item).flatMap(([name, entry]) => walk(entry, joinJsonPath(at, name), name)) : [];
  return walk(value, "", undefined);
}

/**
 * The nearest `id` at or above a path of a parsed JSON value (an entry's own `id`, else its parent's): what a message
 * names besides the path (a record entry such as a transit ledger's `sourceRefs.<key>` is named by its path).
 */
export function nearestId(root: unknown, path: string): string | undefined {
  const steps = [...path.matchAll(/([^.[\]]+)|\[(\d+)\]/gu)].map((match) => (match[2] !== undefined ? Number(match[2]) : match[1]));
  const chain: unknown[] = [root];
  let current: unknown = root;
  for (const step of steps) {
    current = typeof current === "object" && current !== null ? (current as Record<string | number, unknown>)[step] : undefined;
    chain.push(current);
  }
  for (let depth = chain.length - 1; depth >= 0; depth--) {
    const item = chain[depth];
    if (typeof item === "object" && item !== null && !Array.isArray(item) && typeof (item as { id?: unknown }).id === "string")
      return (item as { id: string }).id;
  }
  return undefined;
}
