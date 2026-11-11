import { describe, expect, it } from "vitest";
import { parseStoryTags } from "./tags";

// The album images the context lists (content:build: the files of the journeys' public/assets/album/).
const context = { effectIds: [], backgroundIds: ["cafe"], emotionIds: ["neutral", "smile"], photoIds: ["tower_photo", "cafe_art"] };

describe("a line's photo tags (the album, 2026-11-11)", () => {
  it("read # photo: alone or with its # photo_caption: among the line's tags, in either order, and leave a line without them as it was", () => {
    expect(parseStoryTags(["speaker: narrator", "photo: tower_photo"], context)).toEqual({
      speaker: "narrator", photo: { imageId: "tower_photo" }, effects: [],
    });
    expect(parseStoryTags(["photo: cafe_art", "photo_caption: 三時のお茶: 窓ぎわで"], context).photo)
      .toEqual({ imageId: "cafe_art", caption: "三時のお茶: 窓ぎわで" });
    expect(parseStoryTags(["photo_caption: 窓ぎわで", "photo: cafe_art"], context).photo).toEqual({ imageId: "cafe_art", caption: "窓ぎわで" });
    expect(parseStoryTags(["speaker: heroine", "emotion: smile"], context)).not.toHaveProperty("photo");
  });

  it("refuse an image the context does not name, a caption without its photo, an empty value and repeated tags", () => {
    expect(() => parseStoryTags(["photo: missing_photo"], context)).toThrow("Unknown photo image: missing_photo");
    // Without the album's images (a context that lists none), no photo can be named.
    expect(() => parseStoryTags(["photo: tower_photo"], { effectIds: [], backgroundIds: [], emotionIds: [] })).toThrow("Unknown photo image: tower_photo");
    expect(() => parseStoryTags(["photo_caption: 窓ぎわで"], context)).toThrow("Photo caption without a photo");
    expect(() => parseStoryTags(["photo:"], context)).toThrow("Invalid story tag: photo:");
    expect(() => parseStoryTags(["photo: tower_photo", "photo_caption:"], context)).toThrow("Invalid story tag: photo_caption:");
    expect(() => parseStoryTags(["photo: tower_photo", "photo: cafe_art"], context)).toThrow("Duplicate photo tag");
    expect(() => parseStoryTags(["photo: tower_photo", "photo_caption: a", "photo_caption: b"], context)).toThrow("Duplicate photo caption tag");
  });
});
