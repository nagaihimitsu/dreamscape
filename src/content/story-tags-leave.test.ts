import { describe, expect, it } from "vitest";
import { Story } from "inkjs";
import { Compiler } from "inkjs/compiler/Compiler";
import { parseStoryTags } from "./tags";
import { readStoryFrame, type StoryFrame } from "../story/frame-reader";
import { storyFrameSchema } from "../story/runtime";

// `# leave: <who>` (2026-11-13 user decision): who goes off the scene's stage at the line (src/components/scene-stage.ts).
const context = { effectIds: [], backgroundIds: ["street"], emotionIds: ["neutral"], personIds: ["smp_mihon_lili", "smp_mihon_toma"] };

describe("a line's # leave:", () => {
  it("reads the heroine, the enemy and declared people, one tag per figure", () => {
    expect(parseStoryTags(["speaker: narrator", "leave: smp_mihon_lili"], context)).toEqual({ speaker: "narrator", leave: ["smp_mihon_lili"], effects: [] });
    expect(parseStoryTags(["leave: heroine", "leave: enemy", "leave: smp_mihon_toma"], context))
      .toMatchObject({ leave: ["heroine", "enemy", "smp_mihon_toma"] });
  });

  it("rejects an undeclared person, the narrator and the player (never on the stage), a malformed or empty value and a repeat", () => {
    for (const value of ["smp_mihon_nobody", "narrator", "player", "Lili", "リリ"])
      expect(() => parseStoryTags([`leave: ${value}`], context), value).toThrow(`Unknown leave: ${value}`);
    expect(() => parseStoryTags(["leave:"], context)).toThrow("Invalid story tag");
    expect(() => parseStoryTags(["leave: heroine", "leave: heroine"], context)).toThrow("Duplicate leave tag: heroine");
  });

  it("leaves the person unchecked for a tool that only reads the lines (no people list), but not its form", () => {
    const reader = { effectIds: [], backgroundIds: [], emotionIds: [] };
    expect(parseStoryTags(["leave: any_person"], reader)).toMatchObject({ leave: ["any_person"] });
    expect(() => parseStoryTags(["leave: Any"], reader)).toThrow("Unknown leave: Any");
  });

  it("is on the line it is written on only, kept with that line while a choice follows it, and saved with the frame", () => {
    const source = "# speaker: smp_mihon_lili\nまたね。\n# speaker: narrator\n# leave: smp_mihon_lili\nリリが帰ったあと、広場は静かだった。\n" +
      "* [見送る]\n- (next)\n* [歩き出す]\n-\nふたりで歩き出す。\n-> END\n";
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
    expect(frames.map((frame) => [frame.text, frame.leave])).toEqual([
      ["またね。", undefined],
      ["リリが帰ったあと、広場は静かだった。", ["smp_mihon_lili"]],
      // The next choice set comes without a new line: the line on screen keeps who left at it.
      ["リリが帰ったあと、広場は静かだった。", ["smp_mihon_lili"]],
      ["ふたりで歩き出す。", undefined],
    ]);
  });
});
