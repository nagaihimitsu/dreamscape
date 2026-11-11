import { describe, expect, it } from "vitest";
import { parseStoryTags } from "./tags";

// `# local_word: <id>` (2026-11-11 user decision): the line teaches a word of learning/local-words.json.
const context = { effectIds: [], backgroundIds: [], emotionIds: ["neutral"], localWordIds: ["gt_word_namaste", "gt_word_chai"] };

describe("a line's local_word tags", () => {
  it("reads the words a line teaches, in their order, beside the other line tags", () => {
    expect(parseStoryTags(["speaker: narrator", "local_word: gt_word_namaste"], context)).toEqual({
      speaker: "narrator", localWordIds: ["gt_word_namaste"], effects: [],
    });
    expect(parseStoryTags(["local_word: gt_word_chai", "local_word: gt_word_namaste"], context).localWordIds)
      .toEqual(["gt_word_chai", "gt_word_namaste"]);
    expect(parseStoryTags(["speaker: heroine"], context)).not.toHaveProperty("localWordIds");
  });

  it("rejects a word the catalog does not have, a malformed tag and the same word twice on a line", () => {
    for (const [tag, message] of [
      ["local_word: gt_word_unknown", "Unknown local word: gt_word_unknown"],
      ["local_word: GT_Word", "Invalid local_word tag: GT_Word"],
      ["local_word: gt word", "Invalid local_word tag: gt word"],
      ["local_word: नमस्ते", "Invalid local_word tag: नमस्ते"],
      ["local_word:", "Invalid story tag: local_word:"],
      ["local_word", "Invalid story tag: local_word"],
    ])
      expect(() => parseStoryTags([tag], context), tag).toThrow(message);
    expect(() => parseStoryTags(["local_word: gt_word_chai", "local_word: gt_word_chai"], context)).toThrow("Duplicate local_word tag: gt_word_chai");
    // A build without words has none to teach.
    expect(() => parseStoryTags(["local_word: gt_word_chai"], { ...context, localWordIds: [] })).toThrow("Unknown local word: gt_word_chai");
  });

  it("leaves the IDs unchecked for a tool that only reads the lines (no word list), but not their form", () => {
    const reader = { effectIds: [], backgroundIds: [], emotionIds: [] };
    expect(parseStoryTags(["local_word: any_word"], reader).localWordIds).toEqual(["any_word"]);
    expect(() => parseStoryTags(["local_word: Any"], reader)).toThrow("Invalid local_word tag: Any");
  });
});
