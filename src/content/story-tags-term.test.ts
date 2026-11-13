import { describe, expect, it } from "vitest";
import { parseStoryTags } from "./tags";

// `# term: <id>` (旅の図鑑, 2026-11-13 user decision): the line names a term of glossary/terms.json first.
const context = {
  effectIds: [], backgroundIds: [], emotionIds: ["neutral"],
  termIds: ["gt_term_golgappa", "gt_term_panipuri"], localWordIds: ["gt_word_chai"],
};

describe("a line's term tags", () => {
  it("reads the terms a line names, in their order, beside its other tags and its words of the country", () => {
    expect(parseStoryTags(["speaker: narrator", "term: gt_term_golgappa"], context)).toEqual({
      speaker: "narrator", termIds: ["gt_term_golgappa"], effects: [],
    });
    // Two terms on one line: their cards show one after the other, in the tags' order.
    expect(parseStoryTags(["term: gt_term_panipuri", "term: gt_term_golgappa"], context).termIds)
      .toEqual(["gt_term_panipuri", "gt_term_golgappa"]);
    // A term and a word of the country on the same line: both are read (the card shows, the word is learned).
    expect(parseStoryTags(["local_word: gt_word_chai", "term: gt_term_golgappa"], context))
      .toMatchObject({ localWordIds: ["gt_word_chai"], termIds: ["gt_term_golgappa"] });
    expect(parseStoryTags(["speaker: heroine"], context)).not.toHaveProperty("termIds");
  });

  it("rejects a term the catalog does not have, a malformed tag and the same term twice on a line", () => {
    for (const [tag, message] of [
      ["term: gt_term_unknown", "Unknown term: gt_term_unknown"],
      ["term: Golgappa", "Invalid term tag: Golgappa"],
      ["term: gt term", "Invalid term tag: gt term"],
      ["term:", "Invalid story tag: term:"],
    ])
      expect(() => parseStoryTags([tag], context), tag).toThrow(message);
    expect(() => parseStoryTags(["term: gt_term_golgappa", "term: gt_term_golgappa"], context)).toThrow("Duplicate term tag: gt_term_golgappa");
    // A tool that only reads the lines (no term list) does not check the ID.
    expect(parseStoryTags(["term: gt_term_other"], { effectIds: [], backgroundIds: [], emotionIds: [] }).termIds).toEqual(["gt_term_other"]);
  });
});
