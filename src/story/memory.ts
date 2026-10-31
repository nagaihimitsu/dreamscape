import type { Story } from "inkjs";

/** A read-only external: story scripts cannot mutate or execute game state. */
export function bindMemoryReader(story: Story, memoryIds: readonly string[], knownIds: readonly string[]): void {
  const memories = new Set(memoryIds);
  const known = new Set(knownIds);
  story.BindExternalFunction("has_memory", (id: unknown) => {
    if (typeof id !== "string" || !known.has(id))
      throw new Error(`Unknown memory ID: ${String(id)}`);
    return memories.has(id);
  }, true);
}

/** Only literal, registered IDs are accepted; Ink cannot query arbitrary state. */
export function validateMemoryReferences(source: string, knownIds: readonly string[]): string[] {
  const known = new Set(knownIds);
  const references = new Set<string>();
  for (const line of source.split(/\r?\n/)) {
    const code = line.replace(/\/\/.*$/, "");
    if (/^\s*EXTERNAL\s+has_memory\s*\(/.test(code)) continue;
    for (const call of code.matchAll(/\bhas_memory\s*\(([^)]*)\)/g)) {
      const id = /^\s*"([a-z][a-z0-9_]*)"\s*$/.exec(call[1])?.[1];
      if (!id) throw new Error("has_memory requires a literal memory ID");
      if (!known.has(id)) throw new Error(`Unknown memory ID: ${id}`);
      references.add(id);
    }
  }
  return [...references];
}
