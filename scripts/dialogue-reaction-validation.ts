import type { DialogueReactionCatalog } from "../src/content/dialogue-reactions";

/** Validate annotations against actual static Ink source and reachable frames. */
export function createDialogueReactionValidator(
  catalog: DialogueReactionCatalog,
  sources: Record<string, string>,
  storyIds: readonly string[],
  expressionIds: readonly string[],
  characterIds: readonly string[],
  unsupportedStoryIds: readonly string[] = [],
) {
  const key = (storyId: string, text: string, speaker: string) => JSON.stringify([storyId, text, speaker]);
  const expected = new Set<string>();
  const seen = new Set<string>();
  for (const entry of catalog.entries) {
    if (unsupportedStoryIds.includes(entry.storyId))
      throw new Error(`Unsupported dialogue reaction story: ${entry.storyId}`);
    if (!characterIds.includes(entry.targetCharacterId))
      throw new Error(`Unknown dialogue reaction target: ${entry.targetCharacterId}`);
    if (entry.expression && !expressionIds.includes(entry.expression))
      throw new Error(`Unknown dialogue reaction expression: ${entry.storyId}/${entry.expression}`);
    if (/[{}]/u.test(entry.text))
      throw new Error(`Dialogue reaction is not a static Ink line: ${entry.storyId}/${entry.text}`);
    if (!storyIds.includes(entry.storyId) || !sources[entry.storyId]) {
      console.warn(`Stale dialogue reaction (story no longer exists): ${entry.storyId}/${entry.speaker}/${entry.text}`);
      continue;
    }
    const lines = sources[entry.storyId].split(/\r?\n/u);
    const matches = lines.filter((line) => line.trim() === entry.text);
    if (matches.length === 0) {
      console.warn(`Stale dialogue reaction (line no longer exists): ${entry.storyId}/${entry.speaker}/${entry.text}`);
      continue;
    }
    // A frame stores its rendered text rather than a source pointer. Requiring
    // a single source occurrence prevents accidentally reacting in another branch.
    if (matches.length > 1)
      throw new Error(`Ambiguous dialogue reaction line: ${entry.storyId}/${entry.text}`);
    expected.add(key(entry.storyId, entry.text, entry.speaker));
  }
  return {
    observe(storyId: string, text: string, speaker: string) {
      const id = key(storyId, text, speaker);
      if (expected.has(id)) seen.add(id);
    },
    finish() {
      for (const entry of catalog.entries) {
        const id = key(entry.storyId, entry.text, entry.speaker);
        if (expected.has(id) && !seen.has(id))
          console.warn(`Stale dialogue reaction (unreachable or speaker changed): ${entry.storyId}/${entry.speaker}/${entry.text}`);
      }
    },
  };
}
