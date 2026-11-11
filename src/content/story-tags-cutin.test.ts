import { describe, expect, it } from "vitest";
import { Story } from "inkjs";
import { Compiler } from "inkjs/compiler/Compiler";
import { parseStoryTags } from "./tags";
import { readStoryFrame } from "../story/frame-reader";

// `# cutin: name` (2026-11-11 user decision): the speaker's name plate over the scene, on the line it is written on.
const context = { effectIds: [], backgroundIds: ["street"], emotionIds: ["neutral"], personIds: ["smp_mihon_lili"] };

describe("a line's name plate", () => {
  it("reads # cutin: name on an enemy's or a person's line", () => {
    expect(parseStoryTags(["speaker: enemy", "cutin: name"], context)).toEqual({ speaker: "enemy", cutin: "name", effects: [] });
    expect(parseStoryTags(["speaker: smp_mihon_lili", "cutin: name"], context)).toMatchObject({ speaker: "person", cutin: "name" });
  });

  it("rejects another value, a repeat, a line without the speaker's tag, someone with no name plate, a phone or a letter", () => {
    expect(() => parseStoryTags(["speaker: enemy", "cutin: title"], context)).toThrow("Invalid cutin tag: title");
    expect(() => parseStoryTags(["speaker: enemy", "cutin: name", "cutin: name"], context)).toThrow("Duplicate cutin tag");
    for (const tags of [["cutin: name"], ["speaker: narrator", "cutin: name"], ["speaker: heroine", "cutin: name"]])
      expect(() => parseStoryTags(tags, context), tags.join(" ")).toThrow("# cutin: name shows the speaker's name");
    expect(() => parseStoryTags(["speaker: enemy", "cutin: name", "phone: received"], context)).toThrow("not a phone message or a letter");
    expect(() => parseStoryTags(["speaker: enemy", "cutin: name", "letter: note"], context)).toThrow("not a phone message or a letter");
  });

  it("stays on its own line only", () => {
    const compiled = new Compiler("# speaker: smp_mihon_lili\n# cutin: name\nリリです。\nよろしくね。\n-> END\n").Compile().ToJson();
    if (typeof compiled !== "string") throw new Error("Test Ink did not compile");
    const story = new Story(compiled);
    const first = readStoryFrame(story, context, undefined, [], "street").frame;
    expect(first).toMatchObject({ text: "リリです。", cutin: "name" });
    const second = readStoryFrame(story, context, first, [], "street").frame;
    expect(second.text).toBe("よろしくね。");
    expect(second.cutin).toBeUndefined();
  });
});
