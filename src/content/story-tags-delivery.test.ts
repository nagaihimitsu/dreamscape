import { describe, expect, it } from "vitest";
import { LINE_PAUSE_MS, parseStoryTags } from "./tags";

const context = { effectIds: [], backgroundIds: ["cafe"], emotionIds: ["neutral", "smile"] };

describe("a line's pause, shake and size tags", () => {
  it("reads them together with the other line tags, and leaves a line without them as it was", () => {
    expect(parseStoryTags(["speaker: heroine", "pause: 600", "shake: window", "size: large"], context)).toEqual({
      speaker: "heroine", delivery: { pauseMs: 600, shake: true, large: true }, effects: [],
    });
    expect(parseStoryTags(["pause: 100"], context).delivery).toEqual({ pauseMs: LINE_PAUSE_MS.min });
    expect(parseStoryTags([`pause: ${LINE_PAUSE_MS.max}`], context).delivery).toEqual({ pauseMs: LINE_PAUSE_MS.max });
    expect(parseStoryTags(["speaker: heroine", "emotion: smile"], context)).not.toHaveProperty("delivery");
  });

  it("rejects a pause that is not a sane number of milliseconds, other values and repeated tags", () => {
    for (const [tag, message] of [
      ["pause: 0.6", "Invalid pause tag: 0.6"],
      ["pause: 600ms", "Invalid pause tag: 600ms"],
      ["pause: -600", "Invalid pause tag: -600"],
      ["pause: 99", "Invalid pause tag: 99"],
      ["pause: 3001", "Invalid pause tag: 3001"],
      ["pause: long", "Invalid pause tag: long"],
      ["shake: screen", "Invalid shake tag: screen"],
      ["size: small", "Invalid size tag: small"],
      ["shake", "Invalid story tag: shake"],
    ])
      expect(() => parseStoryTags([tag], context), tag).toThrow(message);
    expect(() => parseStoryTags(["pause: 300", "pause: 600"], context)).toThrow("Duplicate pause tag");
    expect(() => parseStoryTags(["shake: window", "shake: window"], context)).toThrow("Duplicate shake tag");
    expect(() => parseStoryTags(["size: large", "size: large"], context)).toThrow("Duplicate size tag");
  });
});
