import { describe, expect, it } from "vitest";
import { Story } from "inkjs";
import { Compiler } from "inkjs/compiler/Compiler";
import { parseStoryTags } from "./tags";
import { readStoryFrame } from "../story/frame-reader";
import { storyFrameSchema } from "../story/runtime";

// `# unnamed` (2026-11-27): the person speaking has not given their name yet, so the plate shows their call (callJa).
// Written alone with the line's own `# speaker: <person ID>`; it lasts as long as that speaker does.
const context = { effectIds: [], backgroundIds: ["street"], emotionIds: ["neutral"], personIds: ["smp_lili", "smp_toma"],
  calledPersonIds: ["smp_lili"] };

function story(source: string): Story {
  const compiled = new Compiler(`${source}\n-> END\n`).Compile().ToJson();
  if (typeof compiled !== "string") throw new Error("Test Ink did not compile");
  return new Story(compiled);
}

describe("a line's # unnamed", () => {
  it("reads on the line of a person with a call", () => {
    expect(parseStoryTags(["speaker: smp_lili", "unnamed"], context)).toEqual({
      speaker: "person", speakerPersonId: "smp_lili", unnamed: true, effects: [],
    });
    expect(parseStoryTags(["speaker: smp_lili"], context)).not.toHaveProperty("unnamed");
  });

  it("refuses a line without its own person, a person without a call, the name plate's line, a repeat and a value", () => {
    for (const tags of [["unnamed"], ["speaker: heroine", "unnamed"], ["speaker: enemy", "unnamed"], ["speaker: narrator", "unnamed"]])
      expect(() => parseStoryTags(tags, context), tags.join()).toThrow("同じ行に # speaker: <人物ID> を書いてください");
    expect(() => parseStoryTags(["speaker: smp_toma", "unnamed"], context)).toThrow("smp_toma には呼び名がありません");
    expect(() => parseStoryTags(["speaker: smp_lili", "unnamed", "cutin: name"], context)).toThrow("# unnamed と # cutin: name は同じ行に書けません");
    expect(() => parseStoryTags(["speaker: smp_lili", "unnamed", "unnamed"], context)).toThrow("1つの行に # unnamed が2つあります");
    expect(() => parseStoryTags(["speaker: smp_lili", "unnamed: yes"], context)).toThrow("# unnamed には値を書きません");
  });

  it("lasts on the speaker's next lines and ends at the next # speaker:, which the saved frame keeps", () => {
    const source = story([
      "# speaker: smp_lili", "# unnamed", "Photo, please!",
      "ふたりめの行",
      "# speaker: smp_lili", "# cutin: name", "わたし、リリ",
    ].join("\n"));
    const first = readStoryFrame(source, context).frame;
    expect(first).toMatchObject({ speaker: "person", speakerPersonId: "smp_lili", unnamed: true });
    expect(storyFrameSchema.parse(first)).toMatchObject({ unnamed: true });
    const second = readStoryFrame(source, context, first).frame;
    expect(second).toMatchObject({ text: "ふたりめの行", unnamed: true });
    const named = readStoryFrame(source, context, second).frame;
    expect(named).toMatchObject({ text: "わたし、リリ", speakerPersonId: "smp_lili", cutin: "name" });
    expect(named).not.toHaveProperty("unnamed");
  });
});
