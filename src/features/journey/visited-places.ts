import { dates, getCityContent } from "../../content";
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
  const { travel } = getCityContent(game.currentCityId);
  const placeIds = new Set([game.travel.hotelPlaceId, game.travel.currentPlaceId, ...game.travel.todayPlaceIds]);
  const landmarkIds = new Set([...game.visitedLandmarkIds, ...game.completedGuideIds,
    ...encounters.encounters.filter((encounter) => encounter.landmarkId && game.seenEncounterIds.includes(encounter.id)).map((encounter) => encounter.landmarkId!)]);
  const destinationIds = new Set(dates.filter((date) => date.destinationId && game.playedDateIds.includes(date.id)).map((date) => date.destinationId!));
  const eventDone = (eventId: string) => game.completedEpisodeIds.includes(eventId) || game.playedDateIds.includes(eventId) || battlePlayed(game, eventId);
  for (const event of travel.events) if (eventDone(event.id)) placeIds.add(event.placeId);
  return travel.places.filter((place) => placeIds.has(place.id) ||
    place.landmarkIds?.some((id) => landmarkIds.has(id)) || place.destinationIds?.some((id) => destinationIds.has(id))).map((place) => place.id);
}
