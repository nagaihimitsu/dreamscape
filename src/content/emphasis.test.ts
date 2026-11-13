import { describe, expect, it } from "vitest";
import { emphasisSpans } from "./emphasis";

// A line's emphasis (2026-11-13): the first occurrence of `# em:`'s and `# em_shake:`'s words as spans, in characters.

describe("emphasisSpans", () => {
  it("marks the first occurrence of the word and leaves the rest plain", () => {
    expect(emphasisSpans("三時、また三時。", "三時")).toEqual([
      { kind: "em", text: "三時", start: 0, end: 2 },
      { kind: "plain", text: "、また三時。", start: 2, end: 8 },
    ]);
    expect(emphasisSpans("え、嘘でしょ", undefined, "嘘")).toEqual([
      { kind: "plain", text: "え、", start: 0, end: 2 },
      { kind: "shake", text: "嘘", start: 2, end: 3 },
      { kind: "plain", text: "でしょ", start: 3, end: 6 },
    ]);
  });

  it("puts both words in their order, whichever comes first", () => {
    expect(emphasisSpans("本当に止まってる。三時のまま", "三時", "止まって").map((span) => [span.kind, span.text])).toEqual([
      ["plain", "本当に"], ["shake", "止まって"], ["plain", "る。"], ["em", "三時"], ["plain", "のまま"],
    ]);
  });

  it("counts characters, not UTF-16 units (a character outside the BMP is one)", () => {
    expect(emphasisSpans("𠮷野の朝", "朝")).toEqual([
      { kind: "plain", text: "𠮷野の", start: 0, end: 3 },
      { kind: "em", text: "朝", start: 3, end: 4 },
    ]);
  });

  it("leaves a word the text lacks plain, and a trembling word on the emphasised letters out", () => {
    expect(emphasisSpans("朝の塔", "夜")).toEqual([{ kind: "plain", text: "朝の塔", start: 0, end: 3 }]);
    expect(emphasisSpans("時計塔", "時計", "計塔").map((span) => span.kind)).toEqual(["em", "plain"]);
    expect(emphasisSpans("", "朝")).toEqual([]);
  });
});
