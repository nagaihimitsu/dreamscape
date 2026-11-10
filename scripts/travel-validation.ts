import { isTourOnlyPlace, type TravelCatalog } from "../src/content/travel-schemas";
import type { JourneyConfig } from "../src/content/journey-schemas";
import type { BattleDefinition, DateDefinition } from "../src/content/schemas";
import { DAY_END, DAY_START } from "../src/domain/travel";

/** Check the city's authored destinations against the existing game catalogs. */
export function validateTravelContent(
  travel: TravelCatalog,
  settings: { hotelPlaceId: string; storyBackgroundId?: string },
  cityId: string,
  journey: JourneyConfig,
  dates: DateDefinition[],
  battles: BattleDefinition[],
  landmarkIds: readonly string[],
  destinationIds: readonly string[],
  backgrounds: Record<string, unknown>,
  options: { allowPendingContent?: boolean; plannedLandmarkIds?: readonly string[]; rentalModeIds?: readonly string[] } = {},
): void {
  if (travel.cityId !== cityId) throw new Error(`Unknown travel city: ${travel.cityId}`);
  if (!travel.places.some((place) => place.id === settings.hotelPlaceId))
    throw new Error(`Unknown travel hotel: ${settings.hotelPlaceId}`);
  if (isTourOnlyPlace(travel.places.find((place) => place.id === settings.hotelPlaceId)))
    throw new Error(`宿の地点 ${settings.hotelPlaceId} はツアー専用の地点（"access": "tour"）にできません（Tour-only hotel: ${cityId}）`);
  // A tour-only place (tour stage 2a) is reached only on a tour: the map's routes join the other places.
  const normalPlaces = travel.places.filter((place) => !isTourOnlyPlace(place));
  if (settings.storyBackgroundId !== undefined && !backgrounds[settings.storyBackgroundId])
    throw new Error(`Unknown travel story background: ${cityId}/${settings.storyBackgroundId}`);
  const assignedLandmarks = new Set<string>();
  const assignedDestinations = new Set<string>();
  for (const place of travel.places) {
    if (!backgrounds[place.backgroundId]) throw new Error(`Unknown travel background: ${place.id}/${place.backgroundId}`);
    for (const landmarkId of place.landmarkIds ?? []) {
      if (!landmarkIds.includes(landmarkId) || assignedLandmarks.has(landmarkId)) throw new Error(`Unknown or duplicate travel landmark: ${place.id}/${landmarkId}`);
      assignedLandmarks.add(landmarkId);
    }
    for (const destinationId of place.destinationIds ?? []) {
      if (!destinationIds.includes(destinationId) || assignedDestinations.has(destinationId)) throw new Error(`Unknown or duplicate travel destination: ${place.id}/${destinationId}`);
      assignedDestinations.add(destinationId);
    }
    // Events at the current place and returning from the hotel require an
    // explicit zero-time self route. A different place can be reached by any
    // authored transport: never infer a walking route from its coordinates.
    if (!travel.routes.some((route) => route.fromPlaceId === place.id && route.toPlaceId === place.id && route.mode === "walk"))
      throw new Error(`Missing same-place route: ${place.id}`);
    if (isTourOnlyPlace(place)) {
      // Its only route is that same-place walk: any other would let the party reach it, or leave it, outside a tour.
      const other = travel.routes.find((route) => (route.fromPlaceId === place.id || route.toPlaceId === place.id) &&
        !(route.fromPlaceId === route.toPlaceId && route.mode === "walk"));
      if (other)
        throw new Error(`ツアー専用の地点 ${place.id} には、同じ地点の徒歩のほかに経路を書けません（ツアーで行きます）: ${other.fromPlaceId} → ${other.toPlaceId}（${other.mode}）` +
          `（Route of a tour-only place: ${cityId}/${place.id}）`);
      continue;
    }
    // A rental mode is an extra way to go: without the rental every place is still reached (and the hotel).
    for (const destination of normalPlaces) {
      if (place.id === destination.id) continue;
      if (!travel.routes.some((route) => route.fromPlaceId === place.id && route.toPlaceId === destination.id && route.minutes < DAY_END - DAY_START &&
          !options.rentalModeIds?.includes(route.mode)))
        throw new Error(`Missing usable directed route: ${place.id}/${destination.id}`);
    }
  }
  const mainIds = new Set([...journey.episodes.map((episode) => episode.id), ...journey.storyBattles.map((battle) => battle.battleId)]);
  const datesById = new Map(dates.map((date) => [date.id, date]));
  const eventIds = new Set(travel.events.map((event) => event.id));
  for (const id of [...mainIds, ...datesById.keys()]) {
    if (!eventIds.has(id)) throw new Error(`Missing travel event: ${id}`);
  }
  for (const event of travel.events) {
    const date = datesById.get(event.id);
    const place = travel.places.find((candidate) => candidate.id === event.placeId)!;
    if (event.contentStatus === "pending_content" && !options.allowPendingContent)
      throw new Error(`Pending travel event in playable city: ${event.id}`);
    if (event.contentStatus === "pending_content" && !date && !mainIds.has(event.id)) {
      if (event.category === "main") {
        if (event.apCost !== 0 || !options.plannedLandmarkIds?.includes(place.id))
          throw new Error(`Invalid pending main travel event: ${event.id}`);
      } else if (event.category === "date") {
        if (!place.destinationIds?.some((id) => destinationIds.includes(id)))
          throw new Error(`Pending date lacks its city destination: ${event.id}`);
      } else throw new Error(`Invalid pending travel event: ${event.id}`);
      continue;
    }
    if (date) {
      if (event.category !== "date" || event.apCost !== date.apCost)
        throw new Error(`Travel date category or AP mismatch: ${event.id}`);
      // Some special/confession events do not have an existing destination ID.
      if (date.destinationId && !place.destinationIds?.includes(date.destinationId))
        throw new Error(`Travel date place mismatch: ${event.id}/${date.destinationId}`);
    } else if (!mainIds.has(event.id) || event.category !== "main" || event.apCost !== 0) {
      throw new Error(`Unknown or invalid main travel event: ${event.id}`);
    } else {
      const episode = journey.episodes.find((candidate) => candidate.id === event.id);
      const battle = battles.find((candidate) => candidate.id === event.id);
      // The city finale deliberately has no landmark; its location is authored in the travel data.
      const landmarkId = episode ? episode.landmarkId : battle?.landmarkId;
      if (landmarkId && !place.landmarkIds?.includes(landmarkId))
        throw new Error(`Travel landmark place mismatch: ${event.id}/${landmarkId}`);
    }
  }
}
