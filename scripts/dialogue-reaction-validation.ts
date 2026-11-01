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
    if (!storyIds.includes(entry.storyId) || !sources[entry.storyId])
      throw new Error(`Unknown dialogue reaction storyId: ${entry.storyId}`);
    if (unsupportedStoryIds.includes(entry.storyId))
      throw new Error(`Unsupported dialogue reaction story: ${entry.storyId}`);
    if (!characterIds.includes(entry.targetCharacterId))
      throw new Error(`Unknown dialogue reaction target: ${entry.targetCharacterId}`);
    if (entry.expression && !expressionIds.includes(entry.expression))
      throw new Error(`Unknown dialogue reaction expression: ${entry.storyId}/${entry.expression}`);
    const lines = sources[entry.storyId].split(/\r?\n/u);
    const matches = lines.filter((line) => line.trim() === entry.text);
    if (/[{}]/u.test(entry.text) || matches.length === 0)
      throw new Error(`Dialogue reaction is not a static Ink line: ${entry.storyId}/${entry.text}`);
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
        if (!seen.has(key(entry.storyId, entry.text, entry.speaker)))
          throw new Error(`Unreachable or mismatched dialogue reaction: ${entry.storyId}/${entry.speaker}/${entry.text}`);
      }
    },
  };
}
