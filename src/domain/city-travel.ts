import { encounters, getCities, getCityContent } from "../content";
import { getJourneyForCity } from "../content/journeys";
import { startCityArrival, startCityEpilogue } from "./epilogue";
import { DAY_END } from "./travel";
import type { GameState } from "./game";

/** Only the explicitly registered next city is a travel destination. */
export function getNextCity(state: GameState): ReturnType<typeof getCityContent> | undefined {
  if (!state.completedCityIds.includes(state.currentCityId)) return undefined;
  const current = getCityContent(state.currentCityId).city;
  const next = current.nextCityId && getCities().find((entry) => entry.id === current.nextCityId);
  if (!next || next.productionStatus !== "complete" || state.completedCityIds.includes(next.id)) return undefined;
  return getCityContent(next.id);
}

/** Leave once; the caller commits the returned snapshot with the existing save guard. */
export function departToNextCity(state: GameState, expectedRevision: number): GameState {
  if (state.revision !== expectedRevision || !state.completedCityIds.includes(state.currentCityId) ||
      state.activeDate || state.activeBattle || state.activeTourism || state.activeEncounter || state.activeEpilogue || state.travel.activeEvent)
    return state;
  const next = getNextCity(state);
  if (!next) return state;
  // A held item cannot belong to another city. Preserve acquired/used history,
  // but leave any remaining possessions behind when departing.
  const inventory = { ...state.inventory };
  for (const [id, status] of Object.entries(inventory)) {
    if (status !== "held") continue;
    if (!encounters.items.some((item) => item.id === id && item.cityId === state.currentCityId)) return state;
    inventory[id] = "left_behind";
  }
  const hotel = next.travelSettings.hotelPlaceId;
  const arrived: GameState = {
    ...state,
    revision: state.revision + 1,
    currentCityId: next.city.id,
    inventory,
    travel: { currentPlaceId: hotel, hotelPlaceId: hotel, day: 1, minute: 9 * 60,
      returnReserve: 0, returnDeadline: DAY_END, activeEvent: null,
      ...(state.travel.calendar ? { calendar: { ...state.travel.calendar, cityStartJourneyDay: state.travel.calendar.journeyDay } } : {}) },
  };
  return startCityArrival(arrived, arrived.revision);
}

/** Advance a configured journey only after the current city's result and epilogue.
 * Read the ending even in the last city; only depart to a completed successor.
 * Callers persist the returned snapshot together with the action that produced it.
 */
export function advanceCompletedJourneyCity(state: GameState, expectedRevision: number): GameState {
  if (state.revision !== expectedRevision || getJourneyForCity(state.currentCityId)?.cityTransition !== "after_epilogue" ||
      !state.completedCityIds.includes(state.currentCityId) || state.activeDate || state.activeBattle || state.activeTourism ||
      state.activeEncounter || state.activeEpilogue || state.travel.activeEvent) return state;
  if (!state.viewedEpilogueCityIds.includes(state.currentCityId))
    return startCityEpilogue(state, state.currentCityId, expectedRevision);
  return departToNextCity(state, expectedRevision);
}
