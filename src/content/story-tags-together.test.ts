import { describe, expect, it } from "vitest";
import { Story } from "inkjs";
import { Compiler } from "inkjs/compiler/Compiler";
import { parseStoryTags } from "./tags";
import { readStoryFrame, type StoryFrame } from "../story/frame-reader";
import { storyFrameSchema } from "../story/runtime";

// `# together: <who> <who> [<who>]` (2026-11-15 user decision; three 2026-11-20): two or three people stand opposite the
// heroine from the line (src/components/scene-stage.ts).
const context = { effectIds: [], backgroundIds: ["street"], emotionIds: ["neutral"], personIds: ["smp_mihon_lili", "smp_mihon_toma"] };

describe("a line's # together:", () => {
  it("reads two or three people as written: declared people or the scene's enemy, separated by spaces", () => {
    expect(parseStoryTags(["speaker: narrator", "together: smp_mihon_lili smp_mihon_toma"], context))
      .toEqual({ speaker: "narrator", together: ["smp_mihon_lili", "smp_mihon_toma"], effects: [] });
    expect(parseStoryTags(["together: enemy  smp_mihon_lili"], context)).toMatchObject({ together: ["enemy", "smp_mihon_lili"] });
    expect(parseStoryTags(["together: enemy smp_mihon_lili smp_mihon_toma"], context))
      .toMatchObject({ together: ["enemy", "smp_mihon_lili", "smp_mihon_toma"] });
  });

  it("stops, in Japanese, at one name or four, an undeclared person, the heroine, the narrator or the player, one name twice and a repeat", () => {
    for (const value of ["smp_mihon_lili", "smp_mihon_lili smp_mihon_toma enemy smp_mihon_nobody"])
      expect(() => parseStoryTags([`together: ${value}`], context), value).toThrow("# together: には、向かいに立つ2人か3人を書きます");
    for (const name of ["smp_mihon_nobody", "heroine", "narrator", "player", "Lili"])
      expect(() => parseStoryTags([`together: smp_mihon_lili ${name}`], context), name)
        .toThrow(`# together: の ${name} は、向かいに立てる人ではありません`);
    expect(() => parseStoryTags(["together: enemy enemy"], context)).toThrow("# together: に同じ人を2回書いています");
    expect(() => parseStoryTags(["together: enemy smp_mihon_lili smp_mihon_lili"], context)).toThrow("# together: に同じ人を2回書いています");
    expect(() => parseStoryTags(["together:"], context)).toThrow("Invalid story tag");
    expect(() => parseStoryTags(["together: enemy smp_mihon_lili", "together: enemy smp_mihon_toma"], context))
      .toThrow("1つの行に # together: が2つあります");
  });

  it("is on the line it is written on only, kept with that line while a choice follows it, and saved with the frame", () => {
    const source = "# speaker: narrator\n# together: smp_mihon_lili smp_mihon_toma\nリリとトーマが並んでいた。\n" +
      "* [話しかける]\n- (next)\n* [見ている]\n-\n# speaker: smp_mihon_lili\nこんにちは。\n-> END\n";
    const compiled = new Compiler(source).Compile().ToJson();
    if (typeof compiled !== "string") throw new Error("Test Ink did not compile");
    const story = new Story(compiled);
    const frames: StoryFrame[] = [];
    let previous: StoryFrame | undefined;
    for (let step = 0; step < 5; step++) {
      previous = readStoryFrame(story, context, previous, [], "street").frame;
      frames.push(storyFrameSchema.parse(JSON.parse(JSON.stringify(previous))));
      if (previous.choices.length) story.ChooseChoiceIndex(0);
      if (previous.ended) break;
    }
    expect(frames.map((frame) => [frame.text, frame.together])).toEqual([
      ["リリとトーマが並んでいた。", ["smp_mihon_lili", "smp_mihon_toma"]],
      // The next choice set comes without a new line: the line on screen keeps its tag.
      ["リリとトーマが並んでいた。", ["smp_mihon_lili", "smp_mihon_toma"]],
      ["こんにちは。", undefined],
    ]);
  });
});
