import { describe, expect, it } from "vitest";
import type { AlbumPhoto } from "../../domain/album-state";
import { ALBUM_SWIPE_PX, albumPages, albumSwipeStep, initialAlbumPage, type AlbumContent } from "./album-pages";

// The album's pages (⚙設定 → 「アルバム」): one per city in the journey's order, the page it opens on, the swipe. Each photo
// is the author's illustration (public/assets/album/<ID>.<ext>), shown by its served path with no credit.

const served = (id: string) => `assets/album/${id}.webp`;
const content: AlbumContent = {
  cities: [
    { id: "north", nameJa: "北の街", hotelPlaceId: "north_inn", places: [{ id: "north_inn", nameJa: "北の宿" }, { id: "north_tower", nameJa: "北の塔" }] },
    { id: "middle", nameJa: "真ん中の街", hotelPlaceId: "middle_inn", places: [{ id: "middle_inn", nameJa: "真ん中の宿（架空）" }] },
    { id: "south", nameJa: "南の街", hotelPlaceId: "south_inn", places: [{ id: "south_inn", nameJa: "南の宿" }, { id: "south_port", nameJa: "南の港" }] },
  ],
  imagePathOf: (imageId) => (imageId === "tower_png" ? "assets/album/tower_png.png" : imageId.startsWith("missing") ? null : served(imageId)),
};
const photo = (imageId: string, cityId: string, placeId: string, fields: Partial<AlbumPhoto> = {}): AlbumPhoto =>
  ({ imageId, cityId, placeId, day: 1, minute: 600, storyId: "tourism/a_guide", ...fields });

describe("the album's pages", () => {
  it("are one per city in the journey's order with its photos in the order taken, leaving out cities without one", () => {
    const pages = albumPages([
      photo("port", "south", "south_port", { day: 2, minute: 1265, caption: "港の夕方" }),
      photo("tower_png", "north", "north_tower"),
      photo("room", "north", "north_inn", { minute: 545 }),
    ], content);
    expect(pages.map((page) => [page.cityId, page.cityJa])).toEqual([["north", "北の街"], ["south", "南の街"]]);
    // The alternative text is the caption, else 「思い出の絵」.
    expect(pages[0].photos).toEqual([
      { imageId: "tower_png", path: "assets/album/tower_png.png", altJa: "思い出の絵", whenJa: "1日目 10:00", placeJa: "北の塔" },
      { imageId: "room", path: served("room"), altJa: "思い出の絵", whenJa: "1日目 09:05", placeJa: "滞在先のホテル" },
    ]);
    expect(pages[1].photos).toEqual([
      { imageId: "port", path: served("port"), altJa: "港の夕方", caption: "港の夕方", whenJa: "2日目 21:05", placeJa: "南の港" },
    ]);
  });

  it("name the hotel as the header does and leave out a photo whose picture or city the content lacks", () => {
    expect(albumPages([photo("inn", "middle", "middle_inn")], content)[0].photos[0].placeJa).toBe("滞在先のホテル");
    expect(albumPages([photo("missing_photo", "north", "north_tower"), photo("lost", "elsewhere", "x")], content)).toEqual([]);
    expect(albumPages([], content)).toEqual([]);
  });

  it("open on the current city's page, else on the last page that has photos", () => {
    const pages = [{ cityId: "north" }, { cityId: "south" }];
    expect(initialAlbumPage(pages, "north")).toBe(0);
    expect(initialAlbumPage(pages, "south")).toBe(1);
    expect(initialAlbumPage(pages, "middle")).toBe(1);
    expect(initialAlbumPage([], "north")).toBe(0);
  });

  it("turn on a sideways swipe (left: the next page, right: the one before), never on a short or upright move", () => {
    expect(albumSwipeStep(-ALBUM_SWIPE_PX, 0)).toBe(1);
    expect(albumSwipeStep(ALBUM_SWIPE_PX + 30, 20)).toBe(-1);
    expect(albumSwipeStep(-(ALBUM_SWIPE_PX - 1), 0)).toBe(0);
    expect(albumSwipeStep(-80, 60)).toBe(0);
    expect(albumSwipeStep(0, -200)).toBe(0);
  });
});
