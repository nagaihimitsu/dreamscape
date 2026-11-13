import { battles, cityContents, encounters, episodes, getAlbumImage, landmarks, presentation, tourismAssets, type EpisodeDefinition } from "../../content";
import { derivedImagePath } from "../../content/derived-images";
import { getJourneyForCity } from "../../content/journeys";
import { getPlacePhoto } from "../../content/place-photo";
import type { TourismAsset } from "../../content/tourism-schemas";
import type { AlbumPhoto } from "../../domain/album-state";
import { isJourneyComplete } from "../../domain/city-travel";
import { isCarriedItem } from "../../domain/item-cities";
import type { GameState } from "../../domain/game";
import { eventPlace } from "../../domain/moments";
import { withNames } from "../romance/names";
import { albumPages, type AlbumContent, type AlbumPhotoView } from "./album-pages";
import { metPeopleGroups } from "./met-people";
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

// ── 話の終わりの「完」の判 ───────────────────────────────────────────────────────────

/**
 * The episode this change completed (`previous` to `next`; the last one when several were, as a finale recorded with the
 * stop before it), or null. completedEpisodeIds only grows as episodes are completed (chapter.ts recordEpisodes): a replay
 * or a retry of a completed episode completes nothing, and a load or a new game is no change.
 */
export function completedEpisodeId(previous: Pick<GameState, "completedEpisodeIds">, next: Pick<GameState, "completedEpisodeIds">): string | null {
  return next.completedEpisodeIds.filter((id) => !previous.completedEpisodeIds.includes(id) && episodes.some((episode) => episode.id === id)).at(-1) ?? null;
}

/** The stamp of a completed episode: its title (the names filled in), stamped with 「完」. */
export type ChapterStampCard = { episodeId: string; titleJa: string };

export function chapterStampOf(game: Pick<GameState, "playerName" | "heroineName">, episodeId: string): ChapterStampCard | null {
  const episode = episodes.find((item) => item.id === episodeId);
  return episode ? { episodeId, titleJa: withNames(episode.titleJa, game) } : null;
}

// ── 前回までのあらすじ ───────────────────────────────────────────────────────────────

/** A photo as the credit roll shows it: the album's view and the city it was taken in. */
export type MomentPhoto = AlbumPhotoView & { cityId: string; cityJa: string };

function photoViews(album: readonly AlbumPhoto[], currentCityId: string): MomentPhoto[] {
  return albumPages(album, journeyAlbumContent(currentCityId)).flatMap((page) => page.photos.map((photo) => ({ ...photo, cityId: page.cityId, cityJa: page.cityJa })));
}

/**
 * The recap's picture (2026-11-13 user decision: it belongs to the same story as the text): an album photo of the episode
 * (the author's illustration with its caption, else its place's name; no credit), or the photo of the episode's place with
 * the place's name, the reduced `card` copy free time's card shows, and the photo's credit (`credit`).
 */
export type RecapPicture = { path: string; altJa: string; captionJa: string; credit?: TourismAsset };

/**
 * The stories an episode's own parts are read from, as the album records a photo's story (album.ts lineOnScreen): its
 * landmark's guide (the observation has no line), its battle and, for a city finale, its epilogue. A date's, an
 * encounter's or an inserted scene's story is never one, even at the same place or in the same place file (the Red Fort's
 * file holds both its own battle and Delhi's finale).
 */
function episodeStoryIds(episode: EpisodeDefinition): string[] {
  const guide = landmarks.find((item) => item.id === episode.landmarkId)?.guideStoryId;
  const battle = battles.find((item) => item.id === episode.battleId)?.storyId;
  return [guide, battle, episode.epilogueStoryId].filter((id) => id !== undefined);
}

/**
 * The picture of an episode in the recap: the latest album photo taken in the episode's own parts (episodeStoryIds);
 * else the photo of the place the episode happens at on the map (a landmark's place, or where a finale is set; content:build
 * checks that each episode has its map event and that a landmark's is at the landmark's place), the one free time's card
 * shows for that place (getPlacePhoto), with its credit; else none (a place without a photo, or with only a placeholder).
 */
export function recapPicture(game: Pick<GameState, "album" | "currentCityId">, episode: EpisodeDefinition): RecapPicture | null {
  const own = episodeStoryIds(episode);
  const photo = photoViews(game.album.filter((item) => own.includes(item.storyId)), game.currentCityId).at(-1);
  if (photo) return { path: photo.path, altJa: photo.altJa, captionJa: photo.caption ?? photo.placeJa };
  const placeId = eventPlace(episode.cityId, episode.id);
  const place = cityContents[episode.cityId]?.travel.places.find((item) => item.id === placeId);
  const asset = place ? getPlacePhoto(episode.cityId, place.id) : null;
  return place && asset ? { path: derivedImagePath(asset, "card"), altJa: asset.altJa, captionJa: place.nameJa, credit: asset } : null;
}

/**
 * The recap of a resumed game: where and when the party is, the last episode completed (its clear title and record,
 * the names filled in; the city it was in when that is not the city now) and that episode's picture (recapPicture: its
 * own album photo, else its place's photo with the credit). Null before any episode is completed: there is nothing to
 * recap yet (the header shows the place and time).
 */
export type ResumeRecap = {
  cityJa: string;
  whenJa: string;
  chapter: { titleJa: string; descriptionJa: string; cityJa?: string };
  photo?: RecapPicture;
};

export function resumeRecap(game: GameState): ResumeRecap | null {
  const episode = episodes.find((item) => item.id === game.completedEpisodeIds.at(-1));
  if (!episode) return null;
  const photo = recapPicture(game, episode);
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

const packedView = (item: (typeof encounters.items)[number]): PackedItem =>
  ({ id: item.id, nameJa: item.nameJa, ...(item.iconPath ? { iconPath: item.iconPath } : {}) });

/**
 * What a departure would take and leave now (the departure's dialog 「{都市}へ出発」, 2026-11-13): the held items that go on
 * to the next city (registered to be carried through the journey: isCarriedItem, as leaveForNextCity keeps them) and those
 * that stay in this city, in the catalog's order. Both empty when nothing is held.
 */
export function departureLuggage(state: Pick<GameState, "inventory">): { carried: PackedItem[]; left: PackedItem[] } {
  const held = encounters.items.filter((item) => state.inventory[item.id] === "held");
  return { carried: held.filter((item) => isCarriedItem(item.id)).map(packedView), left: held.filter((item) => !isCarriedItem(item.id)).map(packedView) };
}

/**
 * The packing of the departure this change made (`previous` in the city left, `next` in the next city: the departure's
 * scenes ran before, as leaveForNextCity leaves the items behind after them): the items held on arriving (an item
 * carried through the journey keeps its status) and the items the departure left behind, in the catalog's order.
 * Null when the change departed nowhere or no item was held.
 */
export function packingOf(previous: GameState, next: GameState): Packing | null {
  if (previous.currentCityId === next.currentCityId) return null;
  const view = packedView;
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
 * its completed episodes, the people met there (旅の記録's 「出会った人」: met-people.ts metPeopleGroups) and the album's
 * photos taken there. Never a relationship value.
 */
export function endRollOf(game: GameState): EndRoll {
  const journey = getJourneyForCity(game.currentCityId);
  const photos = photoViews(game.album, game.currentCityId);
  const met = metPeopleGroups(game);
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
      people: met.find((group) => group.cityId === id)?.people.map((person) => person.nameJa) ?? [],
      photos: photos.filter((photo) => photo.cityId === id),
    })),
  };
}
