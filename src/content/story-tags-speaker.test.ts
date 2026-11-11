import { describe, expect, it } from "vitest";
import { Story } from "inkjs";
import { Compiler } from "inkjs/compiler/Compiler";
import { parseStoryTags } from "./tags";
import { readStoryFrame } from "../story/frame-reader";

// `# speaker: <person ID>` (2026-11-11 user decision): a person of progression/story.json people says the line.
const context = { effectIds: [], backgroundIds: ["street"], emotionIds: ["neutral"], personIds: ["smp_mihon_lili"] };

describe("a line's speaker", () => {
  it("reads the reserved speakers as before and a declared person as a person's line", () => {
    for (const speaker of ["narrator", "heroine", "player", "enemy"])
      expect(parseStoryTags([`speaker: ${speaker}`], context)).toEqual({ speaker, effects: [] });
    expect(parseStoryTags(["speaker: smp_mihon_lili", "emotion: neutral"], context)).toEqual({
      speaker: "person", speakerPersonId: "smp_mihon_lili", emotion: "neutral", effects: [],
    });
  });

  it("rejects a person who is not declared, a malformed speaker and two speakers on a line", () => {
    for (const [tag, message] of [
      ["speaker: smp_mihon_nobody", "Unknown speaker: smp_mihon_nobody"],
      ["speaker: Lili", "Unknown speaker: Lili"],
      ["speaker: リリ", "Unknown speaker: リリ"],
    ])
      expect(() => parseStoryTags([tag], context), tag).toThrow(message);
    expect(() => parseStoryTags(["speaker: smp_mihon_lili", "speaker: heroine"], context)).toThrow("Duplicate speaker tag");
  });

  it("leaves the person unchecked for a tool that only reads the lines (no people list), but not its form", () => {
    const reader = { effectIds: [], backgroundIds: [], emotionIds: [] };
    expect(parseStoryTags(["speaker: any_person"], reader)).toMatchObject({ speaker: "person", speakerPersonId: "any_person" });
    expect(() => parseStoryTags(["speaker: Any"], reader)).toThrow("Unknown speaker: Any");
  });

  it("keeps the person on the lines that follow until another speaker is written", () => {
    const compiled = new Compiler("# speaker: smp_mihon_lili\nこんにちは。\nいい天気ね。\n# speaker: heroine\nほんとに。\n-> END\n").Compile().ToJson();
    if (typeof compiled !== "string") throw new Error("Test Ink did not compile");
    const story = new Story(compiled);
    const first = readStoryFrame(story, context, undefined, [], "street").frame;
    expect(first).toMatchObject({ text: "こんにちは。", speaker: "person", speakerPersonId: "smp_mihon_lili" });
    const second = readStoryFrame(story, context, first).frame;
    expect(second).toMatchObject({ text: "いい天気ね。", speaker: "person", speakerPersonId: "smp_mihon_lili" });
    const third = readStoryFrame(story, context, second).frame;
    expect(third.speaker).toBe("heroine");
    expect(third).not.toHaveProperty("speakerPersonId");
  });
});
