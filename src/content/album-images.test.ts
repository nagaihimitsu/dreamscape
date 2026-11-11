import { describe, expect, it } from "vitest";
import { albumImageIdOf, albumImageListSchema } from "./album-images";
import { albumImages, cityContents, getAlbumImage, tagContext } from "./index";

// The album's illustrations (2026-11-11 user decision): a journey's public/assets/album/<ID>.<ext>, the file name the ID.

describe("album image paths", () => {
  it("name an ID only directly in assets/album/, of a-z, 0-9 and _, with a WebP, PNG or JPEG extension", () => {
    expect(albumImageIdOf("assets/album/smp_album_market.webp")).toBe("smp_album_market");
    for (const [file, id] of [["01_tower.png", "01_tower"], ["tower.jpg", "tower"], ["tower.jpeg", "tower"]])
      expect(albumImageIdOf(`assets/album/${file}`), file).toBe(id);
    for (const bad of ["assets/album/Tower.webp", "assets/album/tower.WEBP", "assets/album/tower.gif", "assets/album/tower-1.webp",
      "assets/album/sub/tower.webp", "assets/album/.webp", "assets/album/tower", "assets/tourism/tower.webp", "album/tower.webp"])
      expect(albumImageIdOf(bad), bad).toBeUndefined();
  });

  it("are listed each ID once", () => {
    const image = { id: "a_tower", path: "assets/album/a_tower.webp", journeyId: "trip_a" };
    expect(albumImageListSchema.safeParse([image, { ...image, id: "b_tower", path: "assets/album/b_tower.png" }]).success).toBe(true);
    expect(albumImageListSchema.safeParse([image, { ...image, path: "assets/album/a_tower.png", journeyId: "trip_b" }]).success).toBe(false);
    expect(albumImageListSchema.safeParse([{ ...image, credit: "x" }]).success).toBe(false);
  });
});

describe("the generated album images", () => {
  it("are what a line's # photo: and # recall: may name; the sample's three, when it is built in", () => {
    expect(tagContext.photoIds).toEqual(albumImages.map((image) => image.id));
    if (!cityContents.mihon) return;
    expect(albumImages.filter((image) => image.journeyId === "sample_trip")).toEqual([
      { id: "smp_album_clock_tower", path: "assets/album/smp_album_clock_tower.webp", journeyId: "sample_trip" },
      { id: "smp_album_library", path: "assets/album/smp_album_library.webp", journeyId: "sample_trip" },
      { id: "smp_album_market", path: "assets/album/smp_album_market.webp", journeyId: "sample_trip" },
    ]);
    expect(getAlbumImage("smp_album_market")?.path).toBe("assets/album/smp_album_market.webp");
    // A tourism photo is no album image.
    expect(getAlbumImage("smp_img_mihon_market")).toBeUndefined();
  });
});
