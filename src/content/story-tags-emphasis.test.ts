import { describe, expect, it } from "vitest";
import { parseStoryTags } from "./tags";

// A line's emphasis (2026-11-13): `# em: <語>` and `# em_shake: <語>`, read into the line's delivery. Whether the line's
// text has the word is content:build's check of the source (scripts/line-emphasis.ts).

const context = { effectIds: [], backgroundIds: ["cafe"], emotionIds: ["neutral", "smile"] };

describe("a line's em and em_shake tags", () => {
  it("read their words into the line's delivery, together and beside its other tags", () => {
    expect(parseStoryTags(["speaker: heroine", "em: 三時"], context)).toEqual({ speaker: "heroine", delivery: { em: "三時" }, effects: [] });
    expect(parseStoryTags(["em_shake: 嘘"], context).delivery).toEqual({ emShake: "嘘" });
    expect(parseStoryTags(["em: 三時", "em_shake: 止まって", "size: large"], context).delivery).toEqual({ em: "三時", emShake: "止まって", large: true });
    // A name is written as Ink fills it in (a tag's {heroine_name} is the name by then).
    expect(parseStoryTags(["em:  さくら "], context).delivery).toEqual({ em: "さくら" });
  });

  it("stop a tag without a word and two of the same tag", () => {
    expect(() => parseStoryTags(["em:"], context)).toThrow("Invalid em tag");
    expect(() => parseStoryTags(["em_shake"], context)).toThrow("Invalid em_shake tag");
    expect(() => parseStoryTags(["em: 三時", "em: 朝"], context)).toThrow("Duplicate em tag");
    expect(() => parseStoryTags(["em_shake: 三時", "em_shake: 朝"], context)).toThrow("Duplicate em_shake tag");
  });
});
