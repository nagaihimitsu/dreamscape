// 「前に出た単語の印」 (2026-11-11 user decision): in a battle's English question and options, a word the word book holds
// (the `vocabularyJa` of the questions answered before) is marked where it comes again. Seen only, and said to screen
// readers; pressing the word does what it always does (its meaning). No score.
import { normalizeWord } from "../../content/word-meanings";

/** Said after a word met before: in its name for screen readers and in its meaning's note. */
export const MET_WORD_HINT = "（前に出た単語）";

/**
 * The key two words match by, kept simple: the word in lower case without accents (normalizeWord), its spaces made one,
 * without a possessive 's or ' at its end and without one plural -s on a word of four letters or more (not -ss, -is,
 * -us: glass, this, status stay whole). So rings and ring, visitors and visitor, keeper's and keeper match; kept and
 * keep, cities and city do not. A phrase of the vocabulary ("keep time") matches only the same phrase.
 */
export function metWordKey(word: string): string {
  const base = normalizeWord(word).trim().replace(/\s+/gu, " ").replace(/'s?$/u, "");
  return base.length >= 4 && /[^isu]s$/u.test(base) ? base.slice(0, -1) : base;
}

/** The keys of the words of these questions' `vocabularyJa`, leaving out the question on screen (its own words are not "again"). */
export function metWordKeys(
  questions: readonly { id: string; vocabularyJa: readonly { word: string }[] }[],
  shownQuestionId?: string,
): ReadonlySet<string> {
  const keys = new Set<string>();
  for (const question of questions)
    if (question.id !== shownQuestionId) for (const item of question.vocabularyJa) keys.add(metWordKey(item.word));
  return keys;
}

/**
 * The segments of an English text (englishTokens: its words, phrases and what lies between them), each marked `met`
 * when it has a letter and its key is one of `met`.
 */
export function markMetWords<T extends { text: string }>(segments: readonly T[], met?: ReadonlySet<string>): (T & { met: boolean })[] {
  return segments.map((segment) => ({ ...segment, met: !!met?.size && /\p{L}/u.test(segment.text) && met.has(metWordKey(segment.text)) }));
}
