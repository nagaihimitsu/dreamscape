import { describe, expect, it } from "vitest";
import { Story } from "inkjs";
import { Compiler } from "inkjs/compiler/Compiler";
import { parseStoryTags } from "./tags";
import { readStoryFrame, stageFrame } from "../story/frame-reader";
import { storyFrameSchema } from "../story/runtime";

// `# remembered` (2026-11-16 user decision): words a person said earlier, heard again in someone's head. Written alone
// (no value) with the line's own `# speaker:`; the line it is written on only.
const context = { effectIds: [], backgroundIds: ["street"], emotionIds: ["neutral", "serious"], photoIds: ["smp_album"], personIds: ["smp_lili"] };

function story(source: string): Story {
  const compiled = new Compiler(`${source}\n-> END\n`).Compile().ToJson();
  if (typeof compiled !== "string") throw new Error("Test Ink did not compile");
  return new Story(compiled);
}

describe("a line's # remembered", () => {
  it("reads on a person's, the enemy's or the heroine's line, alone, with the other line tags", () => {
    expect(parseStoryTags(["speaker: smp_lili", "remembered", "recall: smp_album", "reaction: heroine,serious"], context)).toEqual({
      speaker: "person", speakerPersonId: "smp_lili", remembered: true, recall: "smp_album",
      reactions: { heroine: { expression: "serious" } }, effects: [],
    });
    expect(parseStoryTags(["speaker: enemy", " remembered "], context)).toMatchObject({ speaker: "enemy", remembered: true });
    // The heroine's own earlier words (allowed: her plate shows her name with 「回想」).
    expect(parseStoryTags(["speaker: heroine", "remembered"], context)).toMatchObject({ speaker: "heroine", remembered: true });
    expect(parseStoryTags(["speaker: smp_lili"], context)).not.toHaveProperty("remembered");
  });

  it("refuses the narration, the player, a line without its own speaker, a repeat, a value, a phone message and a letter", () => {
    expect(() => parseStoryTags(["speaker: narrator", "remembered"], context))
      .toThrow("# remembered は地の文の行には書けません。名札に出す名前がないためです。思い出す言葉は、地の文の中に『』で書いてください");
    expect(() => parseStoryTags(["speaker: player", "remembered"], context)).toThrow("# remembered は主人公の行には書けません。主人公は話さないためです");
    expect(() => parseStoryTags(["remembered"], context)).toThrow("同じ行に # speaker: <人物ID>（enemy・heroine も書けます）を書いてください");
    expect(() => parseStoryTags(["speaker: smp_lili", "remembered", "remembered"], context)).toThrow("1つの行に # remembered が2つあります");
    for (const tag of ["remembered: yes", "remembered:"])
      expect(() => parseStoryTags(["speaker: smp_lili", tag], context), tag).toThrow("# remembered には値を書きません");
    for (const tag of ["phone: received", "letter: note"])
      expect(() => parseStoryTags(["speaker: smp_lili", "remembered", tag], context), tag).toThrow("携帯（# phone:）と手紙（# letter:）の行には書けません");
  });

  it("stays on its own line only, goes with the speaker written beside it and is saved with the frame", () => {
    const lines = story("# speaker: smp_lili\n# remembered\nまた来てね\n# speaker: smp_lili\n今度は本当に\n# speaker: heroine\n# remembered\n言えたよ");
    const first = readStoryFrame(lines, context, undefined, [], "street").frame;
    expect(first).toMatchObject({ text: "また来てね", speaker: "person", speakerPersonId: "smp_lili", remembered: true });
    expect(storyFrameSchema.parse(first)).toEqual(first);
    const second = readStoryFrame(lines, context, first, [], "street").frame;
    expect(second).toMatchObject({ text: "今度は本当に", speakerPersonId: "smp_lili" });
    expect(second).not.toHaveProperty("remembered");
    expect(readStoryFrame(lines, context, second, [], "street").frame).toMatchObject({ speaker: "heroine", remembered: true });
    // A choice's tags belong to the line after it: the line's own # speaker: then says whose line it is.
    const after = story("# speaker: heroine\nうん");
    expect(readStoryFrame(after, context, undefined, ["speaker: smp_lili", "remembered"], "street").frame).not.toHaveProperty("remembered");
  });

  it("stays on the line on screen when no new line is read (the story stopped at a choice or its end)", () => {
    const shown = { speaker: "person" as const, speakerPersonId: "smp_lili", text: "また来てね", remembered: true as const };
    expect(stageFrame({}, shown, false)).toEqual({ remembered: true });
    expect(stageFrame({}, shown, true)).toEqual({});
  });
});
