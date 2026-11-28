// The tabs of the terms of 旅の図鑑 and the words of 旅のことば that a line's text names (2026-11-28 user decision: what the
// reader has met once can be looked up again the moment it comes up). Each entry is searched for by its names
// (`mentionsJa`, or by default a term's name and other name, a word's reading). A name counts only where it stands as a
// word of its own: not inside a longer katakana word (サリー in サリーム), and not after a kanji when it begins with one
// (牛 in 水牛). Light module (no content loading): the game and content:build's list use it.

/** What a line's text may name: a term or a word, with the names it is searched for. */
export type MentionEntry = { kind: "term" | "word"; id: string; names: readonly string[] };

const katakana = (character: string) => /[ァ-ヺー]/u.test(character);
const kanji = (character: string) => /[一-鿿々]/u.test(character);

/** Whether `name` at `at` in `text` stands as a word of its own (the rule above). */
export function standsAlone(text: string, at: number, name: string): boolean {
  const before = text[at - 1] ?? "";
  const after = text[at + name.length] ?? "";
  if (before && katakana(before) && katakana(name[0])) return false;
  if (after && katakana(after) && katakana(name[name.length - 1])) return false;
  return !(before && kanji(before) && kanji(name[0]));
}

/** Where `name` first stands alone in `text`, or -1. */
function firstAt(text: string, name: string): number {
  for (let at = text.indexOf(name); at >= 0; at = text.indexOf(name, at + 1))
    if (standsAlone(text, at, name)) return at;
  return -1;
}

/**
 * The entries `text` names, in the order they first come in it, each once; of two entries found by the same name (a
 * food that is both a term and a word) only the first listed.
 */
export function lineMentions(text: string, entries: readonly MentionEntry[]): MentionEntry[] {
  const found: { entry: MentionEntry; at: number; name: string }[] = [];
  for (const entry of entries) {
    const hits = entry.names.map((name) => ({ name, at: firstAt(text, name) })).filter((hit) => hit.at >= 0);
    if (!hits.length) continue;
    const first = hits.reduce((earliest, hit) => (hit.at < earliest.at ? hit : earliest));
    if (found.some((other) => other.name === first.name)) continue;
    found.push({ entry, ...first });
  }
  return found.sort((left, right) => left.at - right.at).map((hit) => hit.entry);
}

/** A term's names: its `mentionsJa`, else its name and its other name. */
export const termMentionNames = (term: { nameJa: string; aliasJa?: string | null; mentionsJa?: readonly string[] }): string[] =>
  term.mentionsJa ? [...term.mentionsJa] : [term.nameJa, ...(term.aliasJa ? [term.aliasJa] : [])];

/** A word's names: its `mentionsJa`, else its reading. */
export const wordMentionNames = (word: { reading: string; mentionsJa?: readonly string[] }): string[] =>
  word.mentionsJa ? [...word.mentionsJa] : [word.reading];
