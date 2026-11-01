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
    if (!emotionIds.includes(entry.emotion))
      throw new Error(`Unknown dialogue expression emotion: ${entry.storyId}/${entry.emotion}`);
    if (/[{}]/u.test(entry.text))
      throw new Error(`Dialogue expression is not a static Ink line: ${entry.storyId}/${entry.text}`);
    if (!storyIds.includes(entry.storyId) || !sources[entry.storyId]) {
      console.warn(`Stale dialogue expression (story no longer exists): ${entry.storyId}/${entry.speaker}/${entry.text}`);
      continue;
    }
    // The whole source line must be static; rendered name substitutions or
    // other Ink interpolation must not accidentally match a test input.
    const lines = sources[entry.storyId].split(/\r?\n/u);
    const matches = lines.map((line, index) => line.trim() === entry.text ? index : -1).filter((index) => index >= 0);
    if (!matches.length) {
      console.warn(`Stale dialogue expression (line no longer exists): ${entry.storyId}/${entry.speaker}/${entry.text}`);
      continue;
    }
    expected.add(key(entry.storyId, entry.text, entry.speaker));
  }
  return {
    observe(storyId: string, text: string, speaker: string, _explicitEmotion: boolean) {
      const id = key(storyId, text, speaker);
      if (!expected.has(id)) return;
      seen.add(id);
    },
    finish() {
      for (const entry of catalog.entries) {
        const id = key(entry.storyId, entry.text, entry.speaker);
        if (expected.has(id) && !seen.has(id))
          console.warn(`Stale dialogue expression (unreachable or speaker changed): ${entry.storyId}/${entry.speaker}/${entry.text}`);
      }
    },
  };
}
