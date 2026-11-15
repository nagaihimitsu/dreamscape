import { taggedLines } from "./line-tag-text";

// content:build's check of where a `# translation:` is written (2026-11-15; src/content/tags.ts): inside a choice's
// brackets it is the choice's Japanese, and on a `# letter:` line the Japanese shown under that line's English
// (frame-reader.ts). Any other line would drop it without a word, so it stops. Read statically from the Ink source
// (line-tag-text.ts), so a line in a branch no walk takes counts too. Light module (no content loading): unit tests use
// it directly. Japanese first, English after.

/**
 * Throws at the first `# translation:` of a line (not a choice's) without a translation, with no line of text after it,
 * on a line without `# letter:`, or twice on one line.
 */
export function checkTranslationTags(source: string): void {
  const tags = taggedLines(source, ["translation", "letter"]);
  const letterLines = new Set(tags.filter((tag) => tag.key === "letter" && !tag.choice).map((tag) => tag.textLine));
  const translated = new Set<number>();
  for (const { key, value, line, knot, textLine, choice } of tags) {
    if (key !== "translation" || choice) continue;
    // The tag in brackets: a translation ends in its own 。
    const where = `${knot ? `knot ${knot} の` : ""}${line}行目の「# translation:${value ? ` ${value}` : ""}」`;
    if (!value)
      throw new Error(`訳がありません：${where}。# translation: <日本語の訳> と書いてください（# translation: without a translation）。`);
    if (textLine === null)
      throw new Error(`訳の札の後に行がありません：${where}。訳は、選択肢の角括弧の中か、# letter: の行のすぐ上に書いてください` +
        "（# translation: without a line）。");
    if (!letterLines.has(textLine))
      throw new Error(`# translation: は、選択肢か # letter: の行にだけ書けます：${where}。ほかの行の訳は画面に出ません。` +
        `選択肢の訳は角括弧の中に、紙に書いた英文の訳は同じ行に # letter: を書いてください（# translation: on line ${textLine}, ` +
        "which is neither a choice nor a # letter: line）。");
    if (translated.has(textLine))
      throw new Error(`1つの行に # translation: が2つあります：${where}。1つにしてください（Duplicate translation tag on line ${textLine}）。`);
    translated.add(textLine);
  }
}
