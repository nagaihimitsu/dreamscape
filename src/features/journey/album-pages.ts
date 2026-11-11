import type { AlbumPhoto } from "../../domain/album-state";
import { placeDisplayName } from "./travel-labels";
import { formatTravelTime } from "./travel-time";

// The album's pages (⚙設定 → 「アルバム」, 2026-11-11 user decision) as pure rules, apart from the dialog
// (AlbumDialog.tsx): one page per city in the journey's order, the page it opens on, and the swipe that turns one.

/** A city of the journey as the album names it and its places. */
export type AlbumCity = { id: string; nameJa: string; hotelPlaceId: string; places: readonly { id: string; nameJa: string }[] };
/**
 * What the pages are made from: the journey's cities in order, and the served path of the album image an ID names
 * (the author's illustration at public/assets/album/; src/content/album-images.ts), or null when the build has none.
 */
export type AlbumContent = { cities: readonly AlbumCity[]; imagePathOf: (imageId: string) => string | null };
/**
 * A photo as its page shows it: the illustration's served path and its alternative text (the caption, else
 * 「思い出の絵」), the caption, 「n日目 hh:mm」 and the place's name. No credit: the album shows only Dreamscape's own art.
 */
export type AlbumPhotoView = { imageId: string; path: string; altJa: string; caption?: string; whenJa: string; placeJa: string };
export type AlbumPage = { cityId: string; cityJa: string; photos: AlbumPhotoView[] };
/** The alternative text of an album illustration without a caption. */
export const ALBUM_IMAGE_ALT_JA = "思い出の絵";

/**
 * One page per city in the journey's order, each with its photos in the order they were taken; a city without a
 * photo has no page. The day is the city's day as the header shows it, the place is named as the header names it
 * (the hotel is 「滞在先のホテル」). A photo whose city or picture the content lacks is left out (a loaded save has none).
 */
export function albumPages(album: readonly AlbumPhoto[], content: AlbumContent): AlbumPage[] {
  return content.cities.flatMap((city): AlbumPage[] => {
    const photos = album.filter((photo) => photo.cityId === city.id).flatMap((photo): AlbumPhotoView[] => {
      const imagePath = content.imagePathOf(photo.imageId);
      if (imagePath === null) return [];
      return [{
        imageId: photo.imageId,
        path: imagePath,
        altJa: photo.caption ?? ALBUM_IMAGE_ALT_JA,
        ...(photo.caption === undefined ? {} : { caption: photo.caption }),
        whenJa: `${photo.day}日目 ${formatTravelTime(photo.minute)}`,
        placeJa: placeDisplayName({ travel: { hotelPlaceId: city.hotelPlaceId } }, city.places.find((place) => place.id === photo.placeId)),
      }];
    });
    return photos.length ? [{ cityId: city.id, cityJa: city.nameJa, photos }] : [];
  });
}

/** The page the album opens on: the current city's, else the last city's that has photos (0 for an empty album). */
export function initialAlbumPage(pages: readonly Pick<AlbumPage, "cityId">[], currentCityId: string): number {
  const current = pages.findIndex((page) => page.cityId === currentCityId);
  return current >= 0 ? current : Math.max(0, pages.length - 1);
}

/** How far a finger goes sideways (px) for a swipe to turn the page. */
export const ALBUM_SWIPE_PX = 48;

/**
 * The page a released swipe turns to, from where the finger went (`dx`, `dy` in px): to the left the next page (+1),
 * to the right the one before (-1); a short or mostly upright move (the page's own scrolling) turns none (0).
 */
export function albumSwipeStep(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) < ALBUM_SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return 0;
  return dx < 0 ? 1 : -1;
}
