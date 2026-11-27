import { albumImages, getAlbumImage } from "../../content";
import { getJourneyForCity } from "../../content/journeys";
import { pictureThumbPath } from "../../content/derived-images";
import type { GameState } from "../../domain/game";
import { ALBUM_IMAGE_ALT_JA, albumPages } from "./album-pages";
import { journeyAlbumContent } from "./journey-moments";

// 旅の記録 (2026-11-19 user decisions: 旅の記録 and アルバム made one; reshaped 2026-11-20; 2026-11-27: 「体験」 made the
// SNS, SnsView.tsx): its 「写真」, every photo the lines took on the journey, the newest first, and once the journey is over
// the photos not taken yet after them, in grey (2026-11-20). Pure rules apart from the dialog (TravelLog.tsx). Never a
// relationship value, a quiz score or a place not visited yet.

/**
 * A photo of 「写真」, as its thumbnail and its larger view show it: the picture (its served path and alternative text), the
 * title (the caption, else the place), the line under it, and whether it is one the album has (in colour) or one no line
 * has taken yet (`missed`, in grey; shown once the journey is over). `thumbPath`: its square copy (256 px), which the grid
 * reads (content:build derived-images.ts; 2026-11-27).
 */
export type LogPhoto = { imageId: string; path: string; thumbPath: string; altJa: string; titleJa: string; metaJa: string; missed: boolean };
/** The line under a photo not taken yet, after its city. */
export const MISSED_PHOTO_JA = "まだ残していない写真";

const byId = new Intl.Collator("en", { numeric: true }).compare;

/**
 * 「写真」: every photo of the album the journey's content can show, the newest first (2026-11-20 user decision: a new
 * photo always at the grid's top left), across the cities. With `missed` (album-pages.ts showsMissedPhotos), after them
 * the journey's other photos (2026-11-20 user decision: the album images a line's `# photo:` takes, generated
 * album-images.json), in the story's order: by the journey's cities, and in a city by their IDs (numbers by their value:
 * gt_album_d9 before gt_album_d10), titled by their first line's caption, else the city.
 */
export function travelLogPhotos(game: GameState, missed = false): LogPhoto[] {
  const content = journeyAlbumContent(game.currentCityId);
  const views = new Map(albumPages(game.album, content).flatMap((page) => page.photos).map((photo) => [photo.imageId, photo]));
  const taken = [...game.album].reverse().flatMap((photo): LogPhoto[] => {
    const view = views.get(photo.imageId);
    const image = getAlbumImage(photo.imageId);
    return view && image ? [{ imageId: view.imageId, path: view.path, thumbPath: pictureThumbPath(image), altJa: view.altJa, titleJa: view.caption ?? view.placeJa,
      metaJa: `${view.whenJa} · ${view.placeJa}`, missed: false }] : [];
  });
  if (!missed) return taken;
  const journeyId = getJourneyForCity(game.currentCityId)?.id;
  const kept = new Set(game.album.map((photo) => photo.imageId));
  const notTaken = content.cities.flatMap((city) => albumImages
    .filter((image) => image.journeyId === journeyId && image.photo?.cityId === city.id && !kept.has(image.id))
    .sort((left, right) => byId(left.id, right.id))
    .map((image): LogPhoto => ({ imageId: image.id, path: image.path, thumbPath: pictureThumbPath(image), altJa: image.photo?.caption ?? ALBUM_IMAGE_ALT_JA,
      titleJa: image.photo?.caption ?? city.nameJa, metaJa: `${city.nameJa} · ${MISSED_PHOTO_JA}`, missed: true })));
  return [...taken, ...notTaken];
}
