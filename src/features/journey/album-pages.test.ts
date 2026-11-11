import { describe, expect, it } from "vitest";
import type { TourismAsset } from "../../content/tourism-schemas";
import type { AlbumPhoto } from "../../domain/album-state";
import { ALBUM_SWIPE_PX, albumPages, albumSwipeStep, initialAlbumPage, type AlbumContent } from "./album-pages";

// The album's pages (⚙設定 → 「アルバム」): one per city in the journey's order, the page it opens on, the swipe.

const asset = (id: string) => ({ id, path: `assets/tourism/${id}.webp`, altJa: `${id}の写真` }) as TourismAsset;
const content: AlbumContent = {
  cities: [
    { id: "north", nameJa: "北の街", hotelPlaceId: "north_inn", places: [{ id: "north_inn", nameJa: "北の宿" }, { id: "north_tower", nameJa: "北の塔" }] },
    { id: "middle", nameJa: "真ん中の街", hotelPlaceId: "middle_inn", places: [{ id: "middle_inn", nameJa: "真ん中の宿（架空）" }] },
    { id: "south", nameJa: "南の街", hotelPlaceId: "south_inn", places: [{ id: "south_inn", nameJa: "南の宿" }, { id: "south_port", nameJa: "南の港" }] },
  ],
  assetOf: (imageId) => (imageId === "tower_bg" ? asset("tower") : imageId.startsWith("missing") ? null : asset(imageId)),
};
const photo = (imageId: string, cityId: string, placeId: string, fields: Partial<AlbumPhoto> = {}): AlbumPhoto =>
  ({ imageId, cityId, placeId, day: 1, minute: 600, storyId: "tourism/a_guide", ...fields });

describe("the album's pages", () => {
  it("are one per city in the journey's order with its photos in the order taken, leaving out cities without one", () => {
    const pages = albumPages([
      photo("port", "south", "south_port", { day: 2, minute: 1265, caption: "港の夕方" }),
      photo("tower_bg", "north", "north_tower"),
      photo("room", "north", "north_inn", { minute: 545 }),
    ], content);
    expect(pages.map((page) => [page.cityId, page.cityJa])).toEqual([["north", "北の街"], ["south", "南の街"]]);
    expect(pages[0].photos).toEqual([
      { imageId: "tower_bg", asset: asset("tower"), whenJa: "1日目 10:00", placeJa: "北の塔" },
      { imageId: "room", asset: asset("room"), whenJa: "1日目 09:05", placeJa: "滞在先" },
    ]);
    expect(pages[1].photos).toEqual([{ imageId: "port", asset: asset("port"), caption: "港の夕方", whenJa: "2日目 21:05", placeJa: "南の港" }]);
  });

  it("name the hotel as the header does and leave out a photo whose picture or city the content lacks", () => {
    expect(albumPages([photo("inn", "middle", "middle_inn")], content)[0].photos[0].placeJa).toBe("滞在先（架空）");
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
