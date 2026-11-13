// A line's emphasis (2026-11-13; `# em:` and `# em_shake:`, src/content/tags.ts): the first occurrence of each word in
// the line's text, as spans for DialogueText and the message log. Pure; presentation only.

export type EmphasisKind = "plain" | "em" | "shake";
/** A part of a line: its text and where it lies, in characters (code points, as DialogueText reveals them). */
export type EmphasisSpan = { kind: EmphasisKind; text: string; start: number; end: number };

/** Where the first `word` of `text` lies (in characters), or null for none or an empty word. */
function firstAt(text: string, word: string | undefined): { start: number; end: number } | null {
  if (!word) return null;
  const index = text.indexOf(word);
  if (index < 0) return null;
  const start = Array.from(text.slice(0, index)).length;
  return { start, end: start + Array.from(word).length };
}

/**
 * The line `text` as spans: the first `em` emphasised, the first `shake` trembling, the rest plain, in order. A word
 * the text lacks is left plain (content:build stops it in the source; a name filled in may differ), and a trembling
 * word on the same letters as the emphasised one is left out.
 */
export function emphasisSpans(text: string, em?: string, shake?: string): EmphasisSpan[] {
  const chars = Array.from(text);
  const marked: { kind: Exclude<EmphasisKind, "plain">; start: number; end: number }[] = [];
  const emAt = firstAt(text, em);
  if (emAt) marked.push({ kind: "em", ...emAt });
  const shakeAt = firstAt(text, shake);
  if (shakeAt && !(emAt && shakeAt.start < emAt.end && emAt.start < shakeAt.end)) marked.push({ kind: "shake", ...shakeAt });
  marked.sort((a, b) => a.start - b.start);
  const spans: EmphasisSpan[] = [];
  let at = 0;
  const push = (kind: EmphasisKind, start: number, end: number) => {
    if (end > start) spans.push({ kind, text: chars.slice(start, end).join(""), start, end });
  };
  for (const span of marked) {
    push("plain", at, span.start);
    push(span.kind, span.start, span.end);
    at = span.end;
  }
  push("plain", at, chars.length);
  return spans;
}
