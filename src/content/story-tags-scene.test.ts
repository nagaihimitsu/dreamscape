import { describe, expect, it } from "vitest";
import { parseStoryTags } from "./tags";

const context = { effectIds: [], backgroundIds: ["cafe"], emotionIds: ["neutral", "smile"], photoIds: ["tower_photo", "cafe_bg"] };

// The scene tags (2026-11-11 user decision): # recall:, # phone:, # letter:, # quiet: and # stand:.
describe("a line's scene tags", () => {
  it("read each of them with the other line tags, and leave a line without them as it was", () => {
    expect(parseStoryTags(["speaker: heroine", "phone: received", "quiet: line", "stand: close", "recall: tower_photo"], context)).toEqual({
      speaker: "heroine", phone: "received", quiet: "line", stand: "close", recall: "tower_photo", effects: [],
    });
    expect(parseStoryTags(["phone: sent"], context).phone).toBe("sent");
    for (const kind of ["letter", "note", "card"]) expect(parseStoryTags([`letter: ${kind}`], context).letter).toBe(kind);
    expect(parseStoryTags(["quiet: scene"], context).quiet).toBe("scene");
    for (const position of ["apart", "near", "close"]) expect(parseStoryTags([`stand: ${position}`], context).stand).toBe(position);
    // A background that shows a photo is named as # photo: names it; recalling it puts nothing in the album.
    expect(parseStoryTags(["recall: cafe_bg"], context)).toEqual({ recall: "cafe_bg", effects: [] });
    const plain = parseStoryTags(["speaker: heroine", "emotion: smile"], context);
    for (const key of ["recall", "phone", "letter", "quiet", "stand", "photo"]) expect(plain).not.toHaveProperty(key);
  });

  it("refuse a recall of an image # photo: would not accept, other values, empty and repeated tags", () => {
    expect(() => parseStoryTags(["recall: missing_photo"], context)).toThrow("Unknown recall image: missing_photo");
    // Without the album's images (a context that lists none), no photo can be recalled.
    expect(() => parseStoryTags(["recall: tower_photo"], { effectIds: [], backgroundIds: [], emotionIds: [] })).toThrow("Unknown recall image");
    for (const [tag, message] of [
      ["phone: left", "Invalid phone tag: left (write # phone: received, # phone: sent)"],
      ["letter: postcard", "Invalid letter tag: postcard (write # letter: letter, # letter: note, # letter: card)"],
      ["quiet: all", "Invalid quiet tag: all"],
      ["stand: far", "Invalid stand tag: far (write # stand: apart, # stand: near, # stand: close)"],
      ["stand: Close", "Invalid stand tag: Close"],
      ["recall:", "Invalid story tag: recall:"],
      ["phone", "Invalid story tag: phone"],
      ["letter:", "Invalid story tag: letter:"],
    ])
      expect(() => parseStoryTags([tag], context), tag).toThrow(message);
    expect(() => parseStoryTags(["recall: tower_photo", "recall: cafe_bg"], context)).toThrow("Duplicate recall tag");
    expect(() => parseStoryTags(["phone: sent", "phone: sent"], context)).toThrow("Duplicate phone tag");
    expect(() => parseStoryTags(["letter: note", "letter: card"], context)).toThrow("Duplicate letter tag");
    expect(() => parseStoryTags(["quiet: line", "quiet: scene"], context)).toThrow("Duplicate quiet tag");
    expect(() => parseStoryTags(["stand: near", "stand: close"], context)).toThrow("Duplicate stand tag");
  });

  it("refuse a line that is both a phone message and a letter", () => {
    expect(() => parseStoryTags(["phone: received", "letter: note"], context)).toThrow("A line is a phone message or a letter, not both");
  });
});
