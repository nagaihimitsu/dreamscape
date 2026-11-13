import { describe, expect, it } from "vitest";
import { getCityContent } from "../content";
import type { StoryPhoto } from "../content/tags";
import { cityStart, openTourismScene } from "../dev/scenario-builders";
import { photoTaken, recordAlbumPhoto } from "./album";
import { albumPhotoSchema } from "./album-state";
import { validateGameState, type GameState } from "./game";
import { applyPlayerAction } from "./player-action";

// The album's recording rule (src/domain/album.ts, 2026-11-11): the photo of the line on screen, once per image,
// with where and when it was read; and what a saved album may name (an album image of the build: the author's
// illustrations at public/assets/album/). On the sample journey's market guide (fictional).

const GUIDE = "places/smp_mihon_market.smp_mihon_market_guide";
const restore = (state: GameState) => validateGameState(JSON.parse(JSON.stringify(state)));
/** The market's guide open at its first line, with this photo on the line (or none). */
function guideWith(photo: StoryPhoto | undefined, state = openTourismScene(cityStart("mihon"), "mihon_market")): GameState {
  const active = state.activeTourism!;
  const { photo: _photo, ...frame } = active.frame!;
  return { ...state, activeTourism: { ...active, frame: photo ? { ...frame, photo } : frame } };
}

describe("the album's recording rule", () => {
  it("takes the photo of the line on screen with the city, the city's day and minute, the place and the story, without a revision of its own", () => {
    const state = guideWith({ imageId: "smp_album_market", caption: "朝市の屋根" });
    const recorded = recordAlbumPhoto(state);
    expect(recorded.album).toEqual([{ imageId: "smp_album_market", caption: "朝市の屋根", cityId: "mihon",
      day: state.travel.day, minute: state.travel.minute, placeId: "mihon_market", storyId: GUIDE }]);
    expect(recorded.revision).toBe(state.revision);
    expect(restore(recorded)).toEqual(recorded);
  });

  it("takes each image once: the line read again, the image on another line, a resumed save add nothing; another image comes next", () => {
    const recorded = recordAlbumPhoto(guideWith({ imageId: "smp_album_market" }));
    expect(recordAlbumPhoto(recorded)).toBe(recorded);
    const otherLine = guideWith({ imageId: "smp_album_market", caption: "別の行" }, recorded);
    expect(recordAlbumPhoto(otherLine)).toBe(otherLine);
    const resumed = restore(recorded);
    expect(recordAlbumPhoto(resumed)).toBe(resumed);
    const next = recordAlbumPhoto(guideWith({ imageId: "smp_album_library" }, recorded));
    expect(next.album.map((photo) => photo.imageId)).toEqual(["smp_album_market", "smp_album_library"]);
    expect(next.album[1]).not.toHaveProperty("caption");
  });

  it("takes nothing without a photo on screen: a line without the tag, free time", () => {
    const plain = guideWith(undefined);
    expect(recordAlbumPhoto(plain)).toBe(plain);
    const free = cityStart("mihon");
    expect(recordAlbumPhoto(free)).toBe(free);
  });

  it("is applied to the snapshot an action leaves, never after an action that changed nothing", () => {
    const plain = guideWith(undefined);
    const shown = guideWith({ imageId: "smp_album_market" });
    expect(applyPlayerAction(plain, () => ({ ...shown, revision: plain.revision + 1 }), () => 0).album)
      .toEqual([expect.objectContaining({ imageId: "smp_album_market", storyId: GUIDE })]);
    // (A load or a refused action changes nothing: the line it shows was taken when it was first shown.)
    expect(applyPlayerAction(shown, (current) => current, () => 0)).toBe(shown);
  });

  it("names the photo an action has just taken, for its notice, and none when the album did not grow", () => {
    const plain = guideWith(undefined);
    const taken = recordAlbumPhoto(guideWith({ imageId: "smp_album_market", caption: "朝市の屋根" }));
    expect(photoTaken(plain, taken)).toEqual(taken.album[0]);
    expect(photoTaken(taken, taken)).toBeNull();
    expect(photoTaken(taken, recordAlbumPhoto(guideWith({ imageId: "smp_album_market" }, taken)))).toBeNull();
    const next = recordAlbumPhoto(guideWith({ imageId: "smp_album_library" }, taken));
    expect(photoTaken(taken, next)?.imageId).toBe("smp_album_library");
  });
});

describe("a saved album", () => {
  it("names only what this build knows: a photo the content has, a city of the save's journey and a place of that city, each image once", () => {
    const saved = recordAlbumPhoto(guideWith({ imageId: "smp_album_market", caption: "朝市" }));
    const photo = saved.album[0];
    const withAlbum = (album: unknown) => ({ ...saved, album });
    for (const album of [
      [{ ...photo, imageId: "smp_album_gone" }],
      [{ ...photo, placeId: "mihon_nowhere" }],
      [{ ...photo, cityId: "milano", placeId: getCityContent("milano").travelSettings.hotelPlaceId }],
    ]) expect(() => validateGameState(withAlbum(album)), JSON.stringify(album)).toThrow("アルバムの写真の参照先が見つかりません。");
    // Malformed: the same image twice, an empty caption, a key the record does not have, a minute off the clock.
    for (const album of [[photo, photo], [{ ...photo, caption: "" }], [{ ...photo, takenAt: 1 }], [{ ...photo, minute: 2000 }]])
      expect(() => validateGameState(withAlbum(album)), JSON.stringify(album)).toThrow();
    // An album image's ID is its file name, which may start with a digit (unlike the other saved IDs).
    expect(albumPhotoSchema.safeParse({ ...photo, imageId: "01_tower" }).success).toBe(true);
    expect(albumPhotoSchema.safeParse({ ...photo, imageId: "Tower" }).success).toBe(false);
    // A tourism photo is no album image (the album shows only the author's illustrations).
    expect(() => validateGameState(withAlbum([{ ...photo, imageId: "smp_img_mihon_market" }]))).toThrow("アルバムの写真の参照先が見つかりません。");
    // A line on screen saved with an image no content has is refused like its background would be.
    expect(() => validateGameState(guideWith({ imageId: "smp_album_gone" }, saved))).toThrow("保存された場面の情報が一致しません。");
  });
});
