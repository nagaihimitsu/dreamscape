import { battles, cityContents, encounters, episodes, getAlbumImage, landmarks, presentation, storyState, tourismAssets, type EpisodeDefinition } from "../../content";
import { getJourneyForCity } from "../../content/journeys";
import type { TourismAsset } from "../../content/tourism-schemas";
import type { AlbumPhoto } from "../../domain/album-state";
import { isJourneyComplete } from "../../domain/city-travel";
import { meets } from "../../domain/conditions";
import type { GameState } from "../../domain/game";
import { withNames } from "../romance/names";
import { albumPages, type AlbumContent, type AlbumPhotoView } from "./album-pages";
import { formatTravelTime } from "./travel-time";

// The journey's moments (2026-11-11 user decision) as pure rules, apart from their screens: the title card when an
// episode begins, the recap when a saved game is resumed, the packing when the party leaves a city and the credit roll
// at the end of a journey. Each reads the game (and the generated content) only; none writes anything or shows a
// relationship value.

/** The journey's cities in order and the album images' served paths, from the generated content (the album, the recap and the credit roll). */
export function journeyAlbumContent(currentCityId: string): AlbumContent {
  const cityIds = getJourneyForCity(currentCityId)?.cities.map((city) => city.id) ?? [currentCityId];
  return {
    cities: cityIds.flatMap((id) => {
      const content = cityContents[id];
      return content ? [{ id, nameJa: content.city.nameJa, hotelPlaceId: content.travelSettings.hotelPlaceId, places: content.travel.places }] : [];
    }),
    imagePathOf: (imageId) => getAlbumImage(imageId)?.path ?? null,
  };
}

const cityNameJa = (cityId: string) => cityContents[cityId]?.city.nameJa ?? cityId;

// ── 話の始まりの題名の札 ─────────────────────────────────────────────────────────────

/** The parts of a visit or a finale that are the episode itself (its guide, observation and battle). */
const EPISODE_PARTS: readonly string[] = ["guide", "observe", "battle"];

/**
 * Whether the episode's own part has begun in this state: its occasion (the map's visit or finale) has run or started
 * one of its main parts, or (an episode started without an occasion) its guide, observation or battle is open.
 */
function episodeBegun(state: GameState, episode: EpisodeDefinition): boolean {
  const occasion = state.occasion;
  if (occasion?.eventId === episode.id && (occasion.ran.some((part) => EPISODE_PARTS.includes(part)) ||
      occasion.at?.startsWith("main:") || occasion.at === "left:observe")) return true;
  return state.activeBattle?.battleId === episode.battleId ||
    (episode.landmarkId !== null && state.activeTourism?.landmarkId === episode.landmarkId);
}

/**
 * The episode (a landmark's main episode or a city finale) whose first part began with this change (`previous` to
 * `next`): its guide, observation or battle opened, before which only the trip's, the ticket counter's and the inserted
 * scenes ran. Only an episode not completed yet: a replay or a retry of a completed one shows no title. A load or a
 * resumed save is no change, so a scene the save brings back shows none either.
 */
export function openingEpisodeId(previous: GameState, next: GameState): string | null {
  return episodes.find((episode) => episode.cityId === next.currentCityId && !next.completedEpisodeIds.includes(episode.id) &&
    episodeBegun(next, episode) && !episodeBegun(previous, episode))?.id ?? null;
}

/** The title card of an episode: its title (the names filled in), where it is (the landmark, or the city of a finale) and its photo. */
export type EpisodeTitleCard = { episodeId: string; titleJa: string; placeJa: string; finale: boolean; photo?: TourismAsset };

export function episodeTitleCard(game: GameState, episodeId: string): EpisodeTitleCard | null {
  const episode = episodes.find((item) => item.id === episodeId);
  if (!episode) return null;
  const landmark = landmarks.find((item) => item.id === episode.landmarkId);
  const battle = battles.find((item) => item.id === episode.battleId);
  // The photo the episode's first screen shows: the landmark's, or the finale battle's background photo.
  const assetId = landmark?.imageAssetId ?? (battle ? presentation.backgrounds[battle.backgroundId]?.imageAssetId : undefined);
  const photo = tourismAssets.find((asset) => asset.id === assetId);
  return {
    episodeId, titleJa: withNames(episode.titleJa, game), placeJa: landmark?.nameJa ?? cityNameJa(episode.cityId),
    finale: episode.kind === "city_finale", ...(photo ? { photo } : {}),
  };
}

// ── 前回までのあらすじ ───────────────────────────────────────────────────────────────

/** A photo as the recap and the credit roll show it: the album's view and the city it was taken in. */
export type MomentPhoto = AlbumPhotoView & { cityId: string; cityJa: string };

function photoViews(album: readonly AlbumPhoto[], currentCityId: string): MomentPhoto[] {
  return albumPages(album, journeyAlbumContent(currentCityId)).flatMap((page) => page.photos.map((photo) => ({ ...photo, cityId: page.cityId, cityJa: page.cityJa })));
}

/**
 * The recap of a resumed game: where and when the party is, the last episode completed (its clear title and record,
 * the names filled in; the city it was in when that is not the city now) and the latest photo of the album (the author's
 * illustration, no credit). Null before any episode is completed: there is nothing to recap yet (the header shows the place and time).
 */
export type ResumeRecap = {
  cityJa: string;
  whenJa: string;
  chapter: { titleJa: string; descriptionJa: string; cityJa?: string };
  photo?: MomentPhoto;
};

export function resumeRecap(game: GameState): ResumeRecap | null {
  const episode = episodes.find((item) => item.id === game.completedEpisodeIds.at(-1));
  if (!episode) return null;
  const latest = game.album.at(-1);
  const photo = latest ? photoViews([latest], game.currentCityId)[0] : undefined;
  return {
    cityJa: cityNameJa(game.currentCityId),
    whenJa: `${game.travel.day}日目 ${formatTravelTime(game.travel.minute)}`,
    chapter: {
      titleJa: withNames(episode.clearTitleJa, game), descriptionJa: withNames(episode.clearDescriptionJa, game),
      ...(episode.cityId !== game.currentCityId ? { cityJa: cityNameJa(episode.cityId) } : {}),
    },
    ...(photo ? { photo } : {}),
  };
}

// ── 荷造りの場面 ─────────────────────────────────────────────────────────────────────

export type PackedItem = { id: string; nameJa: string; iconPath?: string };
/** The packing of a departure: the held items that go along (carried through the journey) and those left in the city left. */
export type Packing = { fromCityJa: string; toCityJa: string; carried: PackedItem[]; left: PackedItem[] };

/**
 * The packing of the departure this change made (`previous` in the city left, `next` in the next city: the departure's
 * scenes ran before, as leaveForNextCity leaves the items behind after them): the items held on arriving (an item
 * carried through the journey keeps its status) and the items the departure left behind, in the catalog's order.
 * Null when the change departed nowhere or no item was held.
 */
export function packingOf(previous: GameState, next: GameState): Packing | null {
  if (previous.currentCityId === next.currentCityId) return null;
  const view = (item: (typeof encounters.items)[number]): PackedItem => ({ id: item.id, nameJa: item.nameJa, ...(item.iconPath ? { iconPath: item.iconPath } : {}) });
  const carried = encounters.items.filter((item) => next.inventory[item.id] === "held").map(view);
  const left = encounters.items.filter((item) => next.inventory[item.id] === "left_behind" && previous.inventory[item.id] !== "left_behind").map(view);
  if (!carried.length && !left.length) return null;
  return { fromCityJa: cityNameJa(previous.currentCityId), toCityJa: cityNameJa(next.currentCityId), carried, left };
}

// ── 旅の終わりのエンドロール ─────────────────────────────────────────────────────────

/** This change ended the journey: its last city cleared and that city's epilogue read (isJourneyComplete turned true). */
export const journeyEnded = (previous: GameState, next: GameState) => !isJourneyComplete(previous) && isJourneyComplete(next);

/** A city of the credit roll: the episodes completed there (their clear titles, in the order completed), the people met, the photos. */
export type EndRollCity = { id: string; nameJa: string; chapters: string[]; people: string[]; photos: MomentPhoto[] };
export type EndRoll = { journeyJa: string; playerName: string; heroineName: string; cities: EndRollCity[] };

/**
 * The credit roll of the journey: the two names, then each city of the journey in its order with the clear titles of
 * its completed episodes, the people met there (the story state's `people` whose `met` holds: a scene naming them was
 * seen) and the album's photos taken there. Never a relationship value.
 */
export function endRollOf(game: GameState): EndRoll {
  const journey = getJourneyForCity(game.currentCityId);
  const photos = photoViews(game.album, game.currentCityId);
  const cityIds = journey?.cities.map((city) => city.id) ?? [game.currentCityId];
  return {
    journeyJa: journey?.nameJa ?? "",
    playerName: game.playerName,
    heroineName: game.heroineName,
    cities: cityIds.map((id) => ({
      id,
      nameJa: cityNameJa(id),
      chapters: game.completedEpisodeIds.flatMap((episodeId) => episodes.filter((episode) => episode.id === episodeId && episode.cityId === id))
        .map((episode) => withNames(episode.clearTitleJa, game)),
      people: storyState.people.filter((person) => person.cityId === id && meets(game, { met: person.id })).map((person) => person.nameJa),
      photos: photos.filter((photo) => photo.cityId === id),
    })),
  };
}
