import { cityContents, dates, getCityContent } from "../../content";
import { encounters } from "../../content/encounters";
import { battlePlayed } from "../../domain/conditions";
import type { GameState } from "../../domain/game";

/**
 * The places of the current city the party has been to (「行った場所」 on its maps; 2026-11-11 user decision), read
 * only from records the game already keeps (nothing new is saved):
 * - the hotel, the place the party is at, and the places moved to today (`travel.todayPlaceIds`);
 * - the places of the landmarks visited (`visitedLandmarkIds`), whose guide was read (`completedGuideIds`) or where an
 *   encounter of a landmark's visit was seen (`seenEncounterIds`);
 * - the places of the dates played: their destination's place (`destinationIds`);
 * - the places of the map events finished there (an episode completed, a date played, a battle played).
 * In the city's place order.
 */
export function visitedPlaceIds(game: Readonly<GameState>): string[] {
  return visitedPlaceIdsIn(game, game.currentCityId);
}

/**
 * The places of a city of the journey the party has been to, by the same records: for the current city visitedPlaceIds;
 * for another, the places where something happened (eventPlaceIdsIn: the hotel and today's moves belong to the current
 * city only). None for a city whose content this build lacks.
 */
export function visitedPlaceIdsIn(game: Readonly<GameState>, cityId: string): string[] {
  if (!cityContents[cityId]) return [];
  const here = new Set(cityId === game.currentCityId ? [game.travel.hotelPlaceId, game.travel.currentPlaceId, ...game.travel.todayPlaceIds] : []);
  const happened = new Set(eventPlaceIdsIn(game, cityId));
  return getCityContent(cityId).travel.places.filter((place) => here.has(place.id) || happened.has(place.id)).map((place) => place.id);
}

/**
 * The places of a city of the journey where something happened, the only ones the saved records keep for every city and
 * day (旅の数字's 「出来事のあった場所」, 2026-11-13; a place only passed through is kept for today only): a landmark
 * visited, its guide read or an encounter of its visit seen; a date played (its destination's place); a map event
 * finished there (an episode completed, a date played, a battle played). In the city's place order; none for a city
 * whose content this build lacks.
 */
export function eventPlaceIdsIn(game: Readonly<GameState>, cityId: string): string[] {
  if (!cityContents[cityId]) return [];
  const { travel } = getCityContent(cityId);
  const landmarkIds = new Set([...game.visitedLandmarkIds, ...game.completedGuideIds,
    ...encounters.encounters.filter((encounter) => encounter.landmarkId && game.seenEncounterIds.includes(encounter.id)).map((encounter) => encounter.landmarkId!)]);
  const destinationIds = new Set(dates.filter((date) => date.destinationId && game.playedDateIds.includes(date.id)).map((date) => date.destinationId!));
  const eventDone = (eventId: string) => game.completedEpisodeIds.includes(eventId) || game.playedDateIds.includes(eventId) || battlePlayed(game, eventId);
  const placeIds = new Set(travel.events.filter((event) => eventDone(event.id)).map((event) => event.placeId));
  return travel.places.filter((place) => placeIds.has(place.id) ||
    place.landmarkIds?.some((id) => landmarkIds.has(id)) || place.destinationIds?.some((id) => destinationIds.has(id))).map((place) => place.id);
}
