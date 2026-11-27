import type { AlbumPhoto } from "../../domain/album-state";
import { isJourneyComplete } from "../../domain/city-travel";
import type { GameState } from "../../domain/game";
import { FLICK_MIN_PX, FLICK_SPEED } from "./photo-cards";
import { placeDisplayName } from "./travel-labels";
import { formatTravelTime } from "./travel-time";

// The album's pages (≡メニュー → 「旅の記録」 → 「写真」; 2026-11-11, made one with 旅の記録 2026-11-19) as pure rules, apart from the dialog
// (TravelLog.tsx): one page per city in the journey's order, the page it opens on, and the swipe that turns one.

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

/**
 * Whether 旅の記録's 「写真」 shows the photos not taken yet too, in grey (2026-11-20 user decision: the reward of a finished
 * journey, which is long and seldom played twice; travel-log.ts travelLogPhotos): once the journey is over, and from then on
 * in the journey 「もう一度この旅を」 started from it (`kept`: the slot keeps the finished journey as its 旅の思い出).
 */
export const showsMissedPhotos = (game: GameState, kept: boolean): boolean => kept || isJourneyComplete(game);

/** How far a finger goes sideways (px) for a swipe to turn the page. */
export const ALBUM_SWIPE_PX = 48;

/**
 * The page a released swipe turns to, from where the finger went (`dx`, `dy` in px) and its sideways speed as it let go
 * (`speed`, px per ms, negative leftwards; photo-cards.ts flickSpeed): to the left the next page (+1), to the right the one
 * before (-1). It turns after ALBUM_SWIPE_PX, or sooner on a quick flick (FLICK_MIN_PX at FLICK_SPEED or faster its way, as
 * the free-time cards' flick up; 2026-11-27 user request: a flick turns the photos); a short slow or mostly upright move
 * (the page's own scrolling) turns none (0).
 */
export function albumSwipeStep(dx: number, dy: number, speed = 0): -1 | 0 | 1 {
  if (Math.abs(dx) < Math.abs(dy) * 1.5) return 0;
  const flick = Math.abs(dx) >= FLICK_MIN_PX && Math.abs(speed) >= FLICK_SPEED && Math.sign(speed) === Math.sign(dx);
  if (Math.abs(dx) < ALBUM_SWIPE_PX && !flick) return 0;
  return dx < 0 ? 1 : -1;
}

/** A finger that went this far (px) sideways, and more sideways than upright, takes the page along (swipeOffset). */
export const SWIPE_FOLLOW_PX = 8;
/** Towards a side with nothing to turn to, the page goes only this share of the finger's way (and comes back). */
export const SWIPE_EDGE_GIVE = 0.3;

/**
 * How far (px) the page goes with a finger that went `dx`, `dy` from its press, or null while it does not go along: until
 * the finger has gone SWIPE_FOLLOW_PX more sideways than upright (`following`: it already goes along, and keeps on).
 * `canStep` says whether there is a page on the side the finger pulls towards (+1: the next, to the left); towards none,
 * it gives only SWIPE_EDGE_GIVE of the way.
 */
export function swipeOffset(dx: number, dy: number, following: boolean, canStep: (step: -1 | 1) => boolean): number | null {
  if (!following && (Math.abs(dx) < SWIPE_FOLLOW_PX || Math.abs(dx) <= Math.abs(dy))) return null;
  if (dx === 0) return 0;
  return Math.round(dx * (canStep(dx < 0 ? 1 : -1) ? 1 : SWIPE_EDGE_GIVE));
}
