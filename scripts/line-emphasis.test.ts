import { describe, expect, it } from "vitest";
import { checkEmphasisTags } from "./line-emphasis";
import { taggedLines } from "./line-tag-text";

// A line tag's line, read statically (line-tag-text.ts), and content:build's checks of # em: and # em_shake: (2026-11-13).

describe("the line a line tag belongs to", () => {
  it("is the next line of text for a tag line, the same line for a tag after its text", () => {
    const story = [
      "=== knot ===", "# speaker: heroine", "# em: 三時", "", "「三時に会おう」", "鐘が鳴った。 # em_shake: 鳴った", "-> END",
    ].join("\n");
    expect(taggedLines(story, ["em", "em_shake"])).toEqual([
      { key: "em", value: "三時", line: 3, knot: "knot", textLine: 5, text: "「三時に会おう」", choice: false },
      { key: "em_shake", value: "鳴った", line: 6, knot: "knot", textLine: 6, text: "鐘が鳴った。", choice: false },
    ]);
  });

  it("passes over a conditional's opening and branch lines, gathers and labels, and keeps names as written", () => {
    const story = [
      "{ quiz_correct:", "    # em: {heroine_name}", "    {heroine_name}が笑った。", "- else:", "    # em_shake: 嘘", "    - (gone) 嘘でしょ", "}",
    ].join("\n");
    expect(taggedLines(story, ["em", "em_shake"]).map((tag) => [tag.value, tag.textLine, tag.text])).toEqual([
      ["{heroine_name}", 3, "{heroine_name}が笑った。"], ["嘘", 6, "嘘でしょ"],
    ]);
  });

  it("gives a tag on a choice or right before one to the choice, and none to a tag with no line after it in its knot", () => {
    const story = ["# em: 一枚", "* [一枚ください # em: 一枚]", "    くれた。", "# em: 夜", "=== next ===", "朝。"].join("\n");
    expect(taggedLines(story, ["em"]).map((tag) => [tag.line, tag.choice, tag.text])).toEqual([[1, true, null], [2, true, null], [4, false, null]]);
    // Comments and other tags are not read.
    expect(taggedLines("// # em: 朝\n# speaker: heroine\n朝。", ["em"])).toEqual([]);
  });
});

describe("content:build's emphasis checks", () => {
  it("let a line emphasise a word of its text and make another tremble", () => {
    expect(() => checkEmphasisTags("# em: 三時 # em_shake: 止まって\n本当に止まってる。三時のまま\n")).not.toThrow();
    expect(() => checkEmphasisTags("# em: {heroine_name}\n{heroine_name}が笑った。\n")).not.toThrow();
  });

  it("stop an empty word, a word the line lacks, a choice's tag, a tag without a line, two of a tag on a line and overlapping words", () => {
    expect(() => checkEmphasisTags("# em:\n朝。\n")).toThrow("# em: without a word");
    expect(() => checkEmphasisTags("# em: 夜\n朝。\n")).toThrow("The word of # em: is not in its line: 夜");
    // A name is matched as written in the source, not as it is filled in.
    expect(() => checkEmphasisTags("# em: さくら\n{heroine_name}が笑った。\n")).toThrow("強調する語が行にありません");
    expect(() => checkEmphasisTags("* [朝 # em: 朝]\n  朝。\n")).toThrow("# em: on a choice");
    expect(() => checkEmphasisTags("# em_shake: 朝\n-> END\n")).toThrow("# em_shake: without a line");
    expect(() => checkEmphasisTags("# em: 朝\n# em: 夜\n朝と夜。\n")).toThrow("Duplicate em tag on line 3");
    expect(() => checkEmphasisTags("# em: 時計 # em_shake: 計塔\n時計塔。\n")).toThrow("overlap on line 2");
  });
});
