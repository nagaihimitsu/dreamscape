import type { DialogueExpressionCatalog } from "../src/content/dialogue-expressions";

export type DialogueObserver = (text: string, speaker: string, explicitEmotion: boolean) => void;

/** Validate against real Ink source and each route already exercised by the compiler checks. */
export function createDialogueExpressionValidator(
  catalog: DialogueExpressionCatalog,
  sources: Record<string, string>,
  storyIds: readonly string[],
  emotionIds: readonly string[],
) {
  const key = (storyId: string, text: string, speaker: string) => JSON.stringify([storyId, text, speaker]);
  const expected = new Set<string>();
  const seen = new Set<string>();
  for (const entry of catalog.entries) {
    if (!storyIds.includes(entry.storyId) || !sources[entry.storyId])
      throw new Error(`Unknown dialogue expression storyId: ${entry.storyId}`);
    if (!emotionIds.includes(entry.emotion))
      throw new Error(`Unknown dialogue expression emotion: ${entry.storyId}/${entry.emotion}`);
    // The whole source line must be static; rendered name substitutions or
    // other Ink interpolation must not accidentally match a test input.
    const lines = sources[entry.storyId].split(/\r?\n/u);
    const matches = lines.map((line, index) => line.trim() === entry.text ? index : -1).filter((index) => index >= 0);
    if (/[{}]/u.test(entry.text) || !matches.length)
      throw new Error(`Dialogue expression is not a static Ink line: ${entry.storyId}/${entry.text}`);
    // Also check contiguous source metadata regardless of which validation
    // input reaches the line. The runtime observer checks reached branches.
    for (const index of matches) {
      for (let cursor = index - 1; cursor >= 0; cursor--) {
        const line = lines[cursor].trim();
        if (!line) continue;
        if (!/^#\s*[a-z_]+\s*:/u.test(line)) break;
        if (/^#\s*emotion\s*:/u.test(line))
          throw new Error(`Dialogue expression conflicts with Ink emotion: ${entry.storyId}/${entry.text}`);
      }
    }
    expected.add(key(entry.storyId, entry.text, entry.speaker));
  }
  return {
    observe(storyId: string, text: string, speaker: string, explicitEmotion: boolean) {
      const id = key(storyId, text, speaker);
      if (!expected.has(id)) return;
      // A neutral frame cannot tell an explicit neutral tag from no tag.
      // Reject conflicts on *any* route, including metadata-only Ink lines.
      if (explicitEmotion) throw new Error(`Dialogue expression conflicts with Ink emotion: ${storyId}/${text}`);
      seen.add(id);
    },
    finish() {
      for (const entry of catalog.entries) {
        if (!seen.has(key(entry.storyId, entry.text, entry.speaker)))
          throw new Error(`Unreachable or mismatched dialogue expression: ${entry.storyId}/${entry.speaker}/${entry.text}`);
      }
    },
  };
}
