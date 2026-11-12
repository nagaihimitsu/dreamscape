import { describe, expect, it } from "vitest";
import { Story } from "inkjs";
import { compileInk } from "../../scripts/ink-validation";
import { readStoryFrame } from "../story/frame-reader";
import { storyFrameSchema } from "../story/runtime";
import { parseStoryTags } from "./tags";

// `# bgm: <ID>` / `# bgm: stop` / `# bgm: default` (2026-11-12): the scene's music from a line on (content:build checks
// the track, scripts/music-files.ts; here only the tag's form and the frames it lasts on).
const context = { effectIds: [], backgroundIds: ["night_roof"], emotionIds: ["neutral"] };

describe("a line's music tag", () => {
  it("reads a track, stop or default beside the other line tags, and leaves a line without one as it was", () => {
    expect(parseStoryTags(["background: night_roof", "bgm: immersed"], context)).toEqual({ background: "night_roof", bgm: "immersed", effects: [] });
    expect(parseStoryTags(["bgm: stop"], context).bgm).toBe("stop");
    expect(parseStoryTags(["bgm: default"], context).bgm).toBe("default");
    expect(parseStoryTags(["speaker: heroine"], context)).not.toHaveProperty("bgm");
  });

  it("rejects an ID that is not a file name of a-z, 0-9 and _, an empty tag and a second one on one line", () => {
    for (const [tag, message] of [
      ["bgm: Immersed", "Invalid bgm tag: Immersed"],
      ["bgm: late-night", "Invalid bgm tag: late-night"],
      ["bgm: immersed.mp3", "Invalid bgm tag: immersed.mp3"],
      ["bgm:", "Invalid story tag: bgm:"],
    ])
      expect(() => parseStoryTags([tag], context), tag).toThrow(message);
    expect(() => parseStoryTags(["bgm: immersed", "bgm: stop"], context)).toThrow("Duplicate bgm tag");
  });

  it("lasts from its line to the scene's end, stop and default included, and a saved frame keeps it", () => {
    const story = new Story(compileInk(`# background: night_roof
# bgm: immersed
屋上に出た。
風が吹いた。
# bgm: stop
静かになった。
# bgm: default
いつもの音に戻った。
-> END
`));
    const first = readStoryFrame(story, context).frame;
    expect(first).toMatchObject({ text: "屋上に出た。", background: "night_roof", bgm: "immersed" });
    expect(storyFrameSchema.parse(first).bgm).toBe("immersed");
    const second = readStoryFrame(story, context, first).frame;
    expect(second).toMatchObject({ text: "風が吹いた。", bgm: "immersed" });
    const third = readStoryFrame(story, context, second).frame;
    expect(third).toMatchObject({ text: "静かになった。", bgm: "stop" });
    const fourth = readStoryFrame(story, context, third).frame;
    expect(fourth.text).toBe("いつもの音に戻った。");
    expect(fourth).not.toHaveProperty("bgm");
  });

  it("starts a new scene without it, and a fresh frame with the music it is given (a battle's call returning)", () => {
    expect(readStoryFrame(new Story(compileInk("次の場面。\n-> END\n")), context).frame).not.toHaveProperty("bgm");
    const back = readStoryFrame(new Story(compileInk("戻ってきた。\n-> END\n")), context, undefined, [], undefined, undefined, "immersed").frame;
    expect(back).toMatchObject({ text: "戻ってきた。", bgm: "immersed" });
  });
});
