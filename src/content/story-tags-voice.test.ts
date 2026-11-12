import { describe, expect, it } from "vitest";
import { Story } from "inkjs";
import { compileInk } from "../../scripts/ink-validation";
import { readStoryFrame } from "../story/frame-reader";
import { parseStoryTags } from "./tags";

// `# voice: <ID>` (2026-11-12): the line's recording, a journey's public/assets/voice/<ID>.mp3 (content:build checks
// that the file is there, scripts/voice-files.ts; here only the tag's form).
const context = { effectIds: [], backgroundIds: [], emotionIds: ["neutral"] };

describe("a line's voice tag", () => {
  it("reads the voice's ID beside the other line tags, and leaves a line without one as it was", () => {
    expect(parseStoryTags(["speaker: heroine", "voice: gt_delhi_date_agrasen_baoli_001"], context)).toEqual({
      speaker: "heroine", voiceId: "gt_delhi_date_agrasen_baoli_001", effects: [],
    });
    // An ID is a file name: it may start with a digit.
    expect(parseStoryTags(["voice: 001"], context).voiceId).toBe("001");
    expect(parseStoryTags(["speaker: heroine"], context)).not.toHaveProperty("voiceId");
  });

  it("rejects an ID that is not a file name of a-z, 0-9 and _, an empty tag and a second voice on one line", () => {
    for (const [tag, message] of [
      ["voice: Gt_Voice", "Invalid voice tag: Gt_Voice"],
      ["voice: gt-voice", "Invalid voice tag: gt-voice"],
      ["voice: gt voice", "Invalid voice tag: gt voice"],
      ["voice: gt_voice.mp3", "Invalid voice tag: gt_voice.mp3"],
      ["voice: old/gt_voice", "Invalid voice tag: old/gt_voice"],
      ["voice:", "Invalid story tag: voice:"],
    ])
      expect(() => parseStoryTags([tag], context), tag).toThrow(message);
    expect(() => parseStoryTags(["voice: gt_a", "voice: gt_b"], context)).toThrow("Duplicate voice tag");
  });

  it("is on the frame of its own line only", () => {
    const story = new Story(compileInk(`# speaker: heroine
# voice: gt_voice_001
声のある行。
声のない行。
-> END
`));
    const first = readStoryFrame(story, context).frame;
    expect(first).toMatchObject({ text: "声のある行。", voiceId: "gt_voice_001" });
    const second = readStoryFrame(story, context, first).frame;
    expect(second.text).toBe("声のない行。");
    expect(second).not.toHaveProperty("voiceId");
  });
});
