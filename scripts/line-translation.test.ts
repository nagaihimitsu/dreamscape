import { describe, expect, it } from "vitest";
import { checkTranslationTags } from "./line-translation";

// content:build's check of where a # translation: is written (2026-11-15): a choice's, or a # letter: line's.

describe("content:build's translation check", () => {
  it("lets a choice and a letter's line carry a translation, wherever the line's tags are written before it", () => {
    expect(() => checkTranslationTags("* [Look closer. # option: look # translation: 近くで見てみる。]\n    -> END\n")).not.toThrow();
    expect(() => checkTranslationTags("# speaker: narrator\n# letter: card\n# translation: 本が好きだった。\nHe loved books.\n")).not.toThrow();
    expect(() => checkTranslationTags("# translation: 本が好きだった。\n# letter: note\n\nHe loved books.\n")).not.toThrow();
    expect(() => checkTranslationTags("He loved books. # letter: card # translation: 本が好きだった。\n")).not.toThrow();
    // A sheet of lines, each with its own (or none), in a branch too.
    expect(() => checkTranslationTags([
      "{ quiz_correct:", "    # letter: card", "    # translation: 一行目。", "    Line one.", "    # letter: card", "    Line two.", "}",
    ].join("\n"))).not.toThrow();
    // Comments are not read.
    expect(() => checkTranslationTags("// # translation: 訳\n朝。\n")).not.toThrow();
  });

  it("stops one on any other line, without a line after it, without a translation, and two on one line", () => {
    expect(() => checkTranslationTags("# speaker: heroine\n# translation: 本が好きだった。\nHe loved books.\n"))
      .toThrow("# translation: は、選択肢か # letter: の行にだけ書けます：2行目の「# translation: 本が好きだった。」。ほかの行の訳は画面に出ません。");
    expect(() => checkTranslationTags("He loved books. # translation: 本が好きだった。\n")).toThrow("neither a choice nor a # letter: line");
    // A letter's line is its own: the line after it has no letter.
    expect(() => checkTranslationTags("# letter: card\nLine one.\n# translation: 二行目。\nLine two.\n")).toThrow("# translation: on line 4");
    expect(() => checkTranslationTags("=== knot ===\n# letter: card\n# translation: 訳。\n-> END\n"))
      .toThrow("訳の札の後に行がありません：knot knot の3行目の「# translation: 訳。」。");
    expect(() => checkTranslationTags("# letter: card\n# translation:\nA line.\n")).toThrow("# translation: without a translation");
    expect(() => checkTranslationTags("# letter: card\n# translation: 一。\n# translation: 二。\nA line.\n")).toThrow("Duplicate translation tag on line 4");
  });
});
