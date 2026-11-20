import { albumImages, dates, episodes } from "../../content";
import { getJourneyForCity } from "../../content/journeys";
import type { GameState } from "../../domain/game";
import { ALBUM_IMAGE_ALT_JA, albumPages } from "./album-pages";
import { journeyAlbumContent, lookBackOf, subjectPlacePicture, type LookBack, type RecapPicture, type RecapSubject } from "./journey-moments";
import { metPeopleGroups, type MetPerson } from "./met-people";
import { formatTravelTime } from "./travel-time";

// 旅の記録 (2026-11-19 user decisions: 旅の記録 and アルバム made one; reshaped 2026-11-20): the journey kept on two axes.
// 「体験」 is what was lived, city by city in the journey's order (each episode completed and each date with a destination
// played, with its place's photo and her few words looking back on the place, then the people met there); 「写真」 is every
// photo the lines took on the journey, the newest first, and once the journey is over the photos not taken yet after them,
// in grey (2026-11-20). Pure rules apart from the dialog (TravelLog.tsx). Never a relationship value, a quiz score or a
// place not visited yet.

/** One thing lived in a city: an episode (a landmark's or the city's finale) or a date, looked back on. */
export type LogExperience = Omit<LookBack, "photo"> & {
  id: string;
  kind: "visit" | "finale" | "date";
  /** When it was lived (「n日目 hh:mm」, the city's day as the header shows it; save livedTimes), when the save knows. */
  whenJa?: string;
  /**
   * Its place's photo (2026-11-20 user decision: always the place, the album's illustrations being on 「写真」); none for a
   * place without one. Its credit is listed in 出典・権利の一覧 with the journey's photos, not under the card.
   */
  picture?: RecapPicture;
};

/** A city of 「体験」: what was lived there and the people met there. */
export type LogCity = { cityId: string; cityJa: string; experiences: LogExperience[]; people: MetPerson[] };

/**
 * The things lived in a city in the order they were: those the save has no time for (lived before times were kept) first,
 * episodes as completed and then dates as played, then the timed ones by their time (lived-times.ts: in the order
 * recorded, which is the clock's).
 */
function experiencesIn(game: GameState, cityId: string): LogExperience[] {
  const times = game.livedTimes ?? [];
  const lived: { id: string; kind: LogExperience["kind"]; subject: RecapSubject }[] = [
    ...game.completedEpisodeIds.flatMap((id) => episodes.filter((episode) => episode.id === id && episode.cityId === cityId))
      .map((episode) => ({ id: episode.id, kind: episode.kind === "city_finale" ? "finale" as const : "visit" as const, subject: { kind: "episode" as const, episode } })),
    ...game.playedDateIds.flatMap((id) => dates.filter((date) => date.id === id && date.destinationId))
      .map((date) => ({ id: date.id, kind: "date" as const, subject: { kind: "date" as const, date } })),
  ];
  const at = (id: string) => times.findIndex((item) => item.id === id);
  // Untimed first (-1), keeping their order (a stable sort), then the timed by their place in the record.
  lived.sort((left, right) => at(left.id) - at(right.id));
  return lived.flatMap(({ id, kind, subject }) => {
    const { photo: _albumOrPlace, ...look } = lookBackOf(game, subject);
    if (look.cityId !== cityId) return [];
    const time = times[at(id)];
    const picture = subjectPlacePicture(subject);
    return [{ ...look, id, kind, ...(time ? { whenJa: `${time.day}日目 ${formatTravelTime(time.minute)}` } : {}), ...(picture ? { picture } : {}) }];
  });
}

/**
 * The cities of 「体験」 in the journey's order: the city the party is in always (even with nothing in it yet), the others
 * once something was lived or someone met there.
 */
export function travelLogCities(game: GameState): LogCity[] {
  const content = journeyAlbumContent(game.currentCityId);
  const met = metPeopleGroups(game);
  return content.cities.flatMap((city): LogCity[] => {
    const experiences = experiencesIn(game, city.id);
    const people = met.find((group) => group.cityId === city.id)?.people ?? [];
    if (city.id !== game.currentCityId && !experiences.length && !people.length) return [];
    return [{ cityId: city.id, cityJa: city.nameJa, experiences, people }];
  });
}

/**
 * A photo of 「写真」, as its thumbnail and its larger view show it: the picture (its served path and alternative text), the
 * title (the caption, else the place), the line under it, and whether it is one the album has (in colour) or one no line
 * has taken yet (`missed`, in grey; shown once the journey is over).
 */
export type LogPhoto = { imageId: string; path: string; altJa: string; titleJa: string; metaJa: string; missed: boolean };
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
    return view ? [{ imageId: view.imageId, path: view.path, altJa: view.altJa, titleJa: view.caption ?? view.placeJa,
      metaJa: `${view.whenJa} · ${view.placeJa}`, missed: false }] : [];
  });
  if (!missed) return taken;
  const journeyId = getJourneyForCity(game.currentCityId)?.id;
  const kept = new Set(game.album.map((photo) => photo.imageId));
  const notTaken = content.cities.flatMap((city) => albumImages
    .filter((image) => image.journeyId === journeyId && image.photo?.cityId === city.id && !kept.has(image.id))
    .sort((left, right) => byId(left.id, right.id))
    .map((image): LogPhoto => ({ imageId: image.id, path: image.path, altJa: image.photo?.caption ?? ALBUM_IMAGE_ALT_JA,
      titleJa: image.photo?.caption ?? city.nameJa, metaJa: `${city.nameJa} · ${MISSED_PHOTO_JA}`, missed: true })));
  return [...taken, ...notTaken];
}
