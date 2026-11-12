import { describe, expect, it } from "vitest";
import { Story } from "inkjs";
import { compileInk } from "../../scripts/ink-validation";
import { readStoryFrame } from "../story/frame-reader";
import { storyFrameSchema } from "../story/runtime";
import { parseStoryTags } from "./tags";

// `# se: <ID>` (2026-11-12): a sound effect played as the line starts, a registered public/assets/se/<ID>.mp3
// (content:build checks the list and the file, scripts/sound-files.ts; here only the tag's form and the frame).
const context = { effectIds: [], backgroundIds: [], emotionIds: ["neutral"] };

describe("a line's sound effect tag", () => {
  it("reads the sound's ID beside the other line tags, and leaves a line without one as it was", () => {
    expect(parseStoryTags(["speaker: heroine", "se: door_knock", "voice: gt_voice_001"], context)).toEqual({
      speaker: "heroine", seId: "door_knock", voiceId: "gt_voice_001", effects: [],
    });
    expect(parseStoryTags(["se: 3_bells"], context).seId).toBe("3_bells");
    expect(parseStoryTags(["speaker: heroine"], context)).not.toHaveProperty("seId");
  });

  it("rejects an ID that is not a file name of a-z, 0-9 and _, an empty tag and a second sound on one line", () => {
    for (const [tag, message] of [
      ["se: Door_Knock", "Invalid se tag: Door_Knock"],
      ["se: door-knock", "Invalid se tag: door-knock"],
      ["se: door knock", "Invalid se tag: door knock"],
      ["se: door_knock.mp3", "Invalid se tag: door_knock.mp3"],
      ["se: se/door_knock", "Invalid se tag: se/door_knock"],
      ["se:", "Invalid story tag: se:"],
    ])
      expect(() => parseStoryTags([tag], context), tag).toThrow(message);
    expect(() => parseStoryTags(["se: door_knock", "se: door_open"], context)).toThrow("Duplicate se tag");
  });

  it("is on the frame of its own line only, and a saved frame keeps it", () => {
    const story = new Story(compileInk(`# se: door_knock
戸を叩く音がした。
誰も答えない。
-> END
`));
    const first = readStoryFrame(story, context).frame;
    expect(first).toMatchObject({ text: "戸を叩く音がした。", seId: "door_knock" });
    expect(storyFrameSchema.parse(first).seId).toBe("door_knock");
    const second = readStoryFrame(story, context, first).frame;
    expect(second.text).toBe("誰も答えない。");
    expect(second).not.toHaveProperty("seId");
  });
});
