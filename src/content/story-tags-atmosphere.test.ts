import { describe, expect, it } from "vitest";
import { Story } from "inkjs";
import { compileInk } from "../../scripts/ink-validation";
import { readStoryFrame, stickyOf } from "../story/frame-reader";
import { storyFrameSchema } from "../story/runtime";
import { parseStoryTags } from "./tags";

// The scene's atmosphere tags (2026-11-13): a line's `# item_show:`, and `# weather:`, `# tint:` and `# ambience:` from
// a line to the scene's end (content:build checks the item and the track, scripts/scene-effect-tags.ts and
// scripts/ambience-files.ts; here only the tags' form and the frames they last on).
const context = { effectIds: [], backgroundIds: ["square"], emotionIds: ["neutral"] };

describe("a line's item card tag", () => {
  it("reads an item's ID beside the other line tags", () => {
    expect(parseStoryTags(["speaker: narrator", "item_show: smp_mihon_three_bookmark"], context))
      .toEqual({ speaker: "narrator", itemShow: "smp_mihon_three_bookmark", effects: [] });
    expect(parseStoryTags(["speaker: heroine"], context)).not.toHaveProperty("itemShow");
  });

  it("rejects a tag without an item, an ID that is not one and a second one on one line", () => {
    for (const [tag, message] of [
      ["item_show", "Invalid item_show tag: name the item"],
      ["item_show:", "Invalid item_show tag: name the item"],
      ["item_show: Bookmark", "Invalid item_show tag: Bookmark"],
      ["item_show: 3_bookmark", "Invalid item_show tag: 3_bookmark"],
    ])
      expect(() => parseStoryTags([tag], context), tag).toThrow(message);
    expect(() => parseStoryTags(["item_show: a", "item_show: b"], context)).toThrow("Duplicate item_show tag");
  });

  it("shows on its line only, its choices on screen included", () => {
    const story = new Story(compileInk(`# item_show: smp_bookmark
しおりを受け取った。
次の行。
-> END
`));
    const first = readStoryFrame(story, context).frame;
    expect(first).toMatchObject({ text: "しおりを受け取った。", itemShow: "smp_bookmark" });
    expect(storyFrameSchema.parse(first).itemShow).toBe("smp_bookmark");
    expect(readStoryFrame(story, context, first).frame).not.toHaveProperty("itemShow");
    const choosing = new Story(compileInk(`# item_show: smp_bookmark
しおりを受け取った。
* [ありがとう]
  -> END
`));
    const line = readStoryFrame(choosing, context).frame;
    expect(line.choices).toHaveLength(1);
    expect(line.itemShow).toBe("smp_bookmark");
  });
});

describe("the weather, tint and ambience tags", () => {
  it("read their values beside the other line tags", () => {
    expect(parseStoryTags(["weather: rain", "tint: off", "ambience: amb_rain"], context))
      .toEqual({ weather: "rain", tint: "off", ambience: "amb_rain", effects: [] });
    for (const weather of ["dust", "colors", "petals", "stop"]) expect(parseStoryTags([`weather: ${weather}`], context).weather).toBe(weather);
    expect(parseStoryTags(["tint: on"], context).tint).toBe("on");
    expect(parseStoryTags(["ambience: stop"], context).ambience).toBe("stop");
    expect(parseStoryTags(["ambience: default"], context).ambience).toBe("default");
  });

  it("reject other values, empty tags and a second one on one line", () => {
    for (const [tag, message] of [
      ["weather: snow", "Invalid weather tag: snow"],
      ["weather: Rain", "Invalid weather tag: Rain"],
      ["weather:", "Invalid story tag: weather:"],
      ["tint: night", "Invalid tint tag: night"],
      ["tint", "Invalid story tag: tint"],
      ["ambience: Rain", "Invalid ambience tag: Rain"],
      ["ambience: amb-rain", "Invalid ambience tag: amb-rain"],
      ["ambience:", "Invalid story tag: ambience:"],
    ])
      expect(() => parseStoryTags([tag], context), tag).toThrow(message);
    expect(() => parseStoryTags(["weather: rain", "weather: stop"], context)).toThrow("Duplicate weather tag");
    expect(() => parseStoryTags(["tint: off", "tint: on"], context)).toThrow("Duplicate tint tag");
    expect(() => parseStoryTags(["ambience: a", "ambience: b"], context)).toThrow("Duplicate ambience tag");
  });

  it("last from their line to another tag, stop, on or default, and a saved frame keeps them", () => {
    const story = new Story(compileInk(`# background: square
# weather: petals
# tint: off
# ambience: amb_birds_park
広場に出た。
風が吹いた。
# weather: rain
# ambience: stop
雨になった。
# weather: stop
# tint: on
# ambience: default
雨がやんだ。
-> END
`));
    const first = readStoryFrame(story, context).frame;
    expect(first).toMatchObject({ text: "広場に出た。", weather: "petals", tint: "off", ambience: "amb_birds_park" });
    expect(storyFrameSchema.parse(first)).toMatchObject({ weather: "petals", tint: "off", ambience: "amb_birds_park" });
    const second = readStoryFrame(story, context, first).frame;
    expect(second).toMatchObject({ text: "風が吹いた。", weather: "petals", tint: "off", ambience: "amb_birds_park" });
    const third = readStoryFrame(story, context, second).frame;
    expect(third).toMatchObject({ text: "雨になった。", weather: "rain", tint: "off", ambience: "stop" });
    const fourth = readStoryFrame(story, context, third).frame;
    expect(fourth.text).toBe("雨がやんだ。");
    for (const key of ["weather", "tint", "ambience"]) expect(fourth).not.toHaveProperty(key);
  });

  it("start a new scene without them, and a fresh frame with the ones it is given (a battle's call returning)", () => {
    const fresh = readStoryFrame(new Story(compileInk("次の場面。\n-> END\n")), context).frame;
    for (const key of ["weather", "tint", "ambience", "bgm"]) expect(fresh).not.toHaveProperty(key);
    const back = readStoryFrame(new Story(compileInk("戻ってきた。\n-> END\n")), context, undefined, [], undefined, undefined,
      { bgm: "immersed", weather: "dust", tint: "off", ambience: "amb_wind" }).frame;
    expect(back).toMatchObject({ text: "戻ってきた。", bgm: "immersed", weather: "dust", tint: "off", ambience: "amb_wind" });
  });

  it("are the sticky parts a battle keeps over its call, the absent ones left out", () => {
    expect(stickyOf({ bgm: "a", weather: "rain", tint: undefined })).toEqual({ bgm: "a", weather: "rain" });
    expect(stickyOf(null)).toEqual({});
    expect(stickyOf(undefined)).toEqual({});
  });
});
