import type { Story } from "inkjs";

export type ItemStatus = "held" | "gifted" | "used";

/** Stories can inspect, but never mutate, the inventory. */
export function bindItemReader(story: Story, inventory: Readonly<Record<string, ItemStatus>>, knownIds: readonly string[]): void {
  const known = new Set(knownIds);
  story.BindExternalFunction("has_item_status", (id: unknown, status: unknown) => {
    if (typeof id !== "string" || !known.has(id) || (status !== "held" && status !== "gifted" && status !== "used"))
      throw new Error("Unknown item or item status");
    return inventory[id] === status;
  }, true);
}

/** Reject dynamic expressions and misspellings; the scenario cannot query arbitrary state. */
export function validateItemReferences(source: string, knownIds: readonly string[]): string[] {
  const known = new Set(knownIds);
  const references = new Set<string>();
  for (const line of source.split(/\r?\n/)) {
    const code = line.replace(/\/\/.*$/, "");
    if (/^\s*EXTERNAL\s+has_item_status\s*\(/.test(code)) continue;
    for (const call of code.matchAll(/\bhas_item_status\s*\(([^)]*)\)/g)) {
      const match = /^\s*"([a-z][a-z0-9_]*)"\s*,\s*"(held|gifted|used)"\s*$/.exec(call[1]);
      if (!match || !known.has(match[1])) throw new Error("has_item_status requires a known literal item and status");
      references.add(match[1]);
    }
  }
  return [...references];
}
