import { emphasisSpans } from "../src/content/emphasis";
import { taggedLines } from "./line-tag-text";

// content:build's checks of a line's emphasis (2026-11-13; src/content/tags.ts): `# em: <語>` shows the first <語> of
// the line's text emphasised, `# em_shake: <語>` makes it tremble. Read statically from the Ink source (line-tag-text.ts),
// so a line in a branch no walk takes counts too; the word is matched in the line's raw text as written (a name is
// matched as {heroine_name}). Light module (no content loading): unit tests use it directly. Japanese first, English after.

const KEYS = ["em", "em_shake"] as const;

/**
 * Throws at the first `# em:` or `# em_shake:` that cannot be shown: without a word, on a choice, with no line of text
 * after it, a word the line's text does not contain, two of the same tag on one line, and the two words of one line on
 * the same letters.
 */
export function checkEmphasisTags(source: string): void {
  const lines = new Map<number, { em?: string; em_shake?: string }>();
  for (const { key, value, line, knot, textLine, text, choice } of taggedLines(source, KEYS)) {
    const where = `${knot ? `knot ${knot} の` : ""}${line}行目の # ${key}${value ? `: ${value}` : ""}`;
    if (!value)
      throw new Error(`強調する語がありません：${where}。# ${key}: <語> と、その行の字の中の語を書いてください（# ${key}: without a word）。`);
    if (choice)
      throw new Error(`選択肢には強調の札を書けません：${where}。台詞か地の文の行に書いてください（# ${key}: on a choice）。`);
    if (textLine === null || text === null)
      throw new Error(`強調の札の後に行がありません：${where}。札は強調する行のすぐ上か、行の後ろに書いてください（# ${key}: without a line）。`);
    if (!text.includes(value))
      throw new Error(`強調する語が行にありません：${where}。${textLine}行目「${text}」の中にある語を、書いたとおりに書いてください` +
        `（名前は {heroine_name} のように書きます。The word of # ${key}: is not in its line: ${value}）。`);
    // taggedLines returns the key as a string; it is always one of KEYS.
    const tag = key as (typeof KEYS)[number];
    const own = lines.get(textLine) ?? {};
    if (own[tag] !== undefined)
      throw new Error(`1つの行に # ${key}: が2つあります：${where}。1つの行に1つにしてください（Duplicate ${key} tag on line ${textLine}）。`);
    own[tag] = value;
    lines.set(textLine, own);
    if (own.em !== undefined && own.em_shake !== undefined) {
      const spans = emphasisSpans(text, own.em, own.em_shake);
      if (!spans.some((span) => span.kind === "shake"))
        throw new Error(`# em: と # em_shake: が同じ字を指しています：${where}。別々の語にしてください` +
          `（# em: ${own.em} and # em_shake: ${own.em_shake} overlap on line ${textLine}）。`);
    }
  }
}
