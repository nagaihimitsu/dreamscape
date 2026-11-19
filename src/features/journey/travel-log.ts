import { dates, episodes } from "../../content";
import { storyBattlesForCity } from "../../domain/chapter";
import { battlePlayed } from "../../domain/conditions";
import type { GameState } from "../../domain/game";
import { albumPages, type AlbumPhotoView } from "./album-pages";
import { cityProgressParts } from "./city-progress-label";
import { journeyAlbumContent, lookBackOf, subjectStoryIds, type LookBack, type RecapSubject } from "./journey-moments";
import { metPeopleGroups, type MetPerson } from "./met-people";
import { formatTravelTime } from "./travel-time";

// 旅の記録 (2026-11-19 user decision: 旅の記録 and アルバム made one): the journey kept on two axes, page by page per city in the
// journey's order. 「体験」 is what was lived there (each episode completed and each date with a destination played, with its
// picture and her few words looking back on the place, the people met there); 「写真」 is the photos the lines took there.
// Pure rules apart from the dialog (TravelLog.tsx). Never a relationship value, a quiz score or a place not visited yet.

/** One thing lived in a city: an episode (a landmark's or the city's finale) or a date, looked back on. */
export type LogExperience = LookBack & {
  id: string;
  kind: "visit" | "finale" | "date";
  /** When it was lived (「n日目 hh:mm」, the city's day as the header shows it; save livedTimes), when the save knows. */
  whenJa?: string;
  /** The album photos its own stories took (subjectStoryIds), in the order taken: its card opens them all. */
  photos: AlbumPhotoView[];
};

export type LogPage = {
  cityId: string;
  cityJa: string;
  /** The city's progress in one line (「観光 1 / 4 · クイズ 0 / 2」, or 「都市クリア」). */
  progressJa: string;
  experiences: LogExperience[];
  photos: AlbumPhotoView[];
  people: MetPerson[];
};

/** The city's progress (旅の記録's first line on its page): its stops and special battles, or its clear. */
export function cityProgressJa(game: Readonly<GameState>, cityId: string): string {
  const stops = episodes.filter((episode) => episode.cityId === cityId && episode.kind !== "city_finale");
  const storyBattles = storyBattlesForCity(cityId);
  return cityProgressParts({
    completedStops: stops.filter((episode) => game.completedEpisodeIds.includes(episode.id)).length,
    stops: stops.length,
    completedSpecialBattles: storyBattles.filter((item) => battlePlayed(game, item.battleId)).length,
    specialBattles: storyBattles.length,
    cityCompleted: game.completedCityIds.includes(cityId),
  }).map((part) => part.text).join(" · ");
}

/**
 * The things lived in a city in the order they were: those the save has no time for (lived before times were kept) first,
 * episodes as completed and then dates as played, then the timed ones by their time (lived-times.ts: in the order
 * recorded, which is the clock's).
 */
function experiencesIn(game: GameState, cityId: string, taken: readonly AlbumPhotoView[]): LogExperience[] {
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
    const look = lookBackOf(game, subject);
    const time = times[at(id)];
    const stories = subjectStoryIds(subject);
    const own = new Set(game.album.filter((photo) => stories.includes(photo.storyId)).map((photo) => photo.imageId));
    return look.cityId === cityId
      ? [{ ...look, id, kind, ...(time ? { whenJa: `${time.day}日目 ${formatTravelTime(time.minute)}` } : {}), photos: taken.filter((photo) => own.has(photo.imageId)) }]
      : [];
  });
}

/**
 * One page per city of the journey in its order: the city the party is in always (even with nothing in it yet), the
 * others once something was lived, photographed or met there.
 */
export function travelLogPages(game: GameState): LogPage[] {
  const content = journeyAlbumContent(game.currentCityId);
  const photoPages = albumPages(game.album, content);
  const taken = photoPages.flatMap((page) => page.photos);
  const met = metPeopleGroups(game);
  return content.cities.flatMap((city): LogPage[] => {
    const experiences = experiencesIn(game, city.id, taken);
    const photos = photoPages.find((page) => page.cityId === city.id)?.photos ?? [];
    const people = met.find((group) => group.cityId === city.id)?.people ?? [];
    if (city.id !== game.currentCityId && !experiences.length && !photos.length && !people.length) return [];
    return [{
      cityId: city.id, cityJa: city.nameJa, progressJa: cityProgressJa(game, city.id),
      experiences, photos, people,
    }];
  });
}
