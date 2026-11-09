import { getCities, getCityContent } from "../content";
import { getJourneyForCity } from "../content/journeys";
import { isAuthoredEpilogueCity, startCityArrival, startCityEpilogue } from "./epilogue";
import { isSceneOpen } from "./game-state-schema";
import { isCarriedItem, itemUsableIn } from "./item-cities";
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

/** The next city free time offers to leave for (「…へ出発」): none for a journey that moves on by itself after the epilogue. */
export function getPlayerDeparture(state: GameState): ReturnType<typeof getCityContent> | undefined {
  return getJourneyForCity(state.currentCityId)?.cityTransition === "after_epilogue" ? undefined : getNextCity(state);
}

/** The end of a journey: its last city cleared and that city's epilogue read, with no next city to go to. */
export function isJourneyComplete(state: GameState): boolean {
  return state.completedCityIds.includes(state.currentCityId) && state.viewedEpilogueCityIds.includes(state.currentCityId) &&
    !getNextCity(state) && !state.activeEpilogue;
}

/** Leave once; the caller commits the returned snapshot with the existing save guard. */
export function departToNextCity(state: GameState, expectedRevision: number): GameState {
  if (state.revision !== expectedRevision || !state.completedCityIds.includes(state.currentCityId) || isSceneOpen(state) || state.travel.activeEvent)
    return state;
  const next = getNextCity(state);
  if (!next) return state;
  // A held item is this city's or one carried from an earlier city (a broken state is refused). Preserve the history;
  // an item carried through the journey stays held, the others are left behind (the item design §2.3).
  const inventory = { ...state.inventory };
  for (const [id, status] of Object.entries(inventory)) {
    if (status !== "held") continue;
    if (!itemUsableIn(state, id, state.currentCityId)) return state;
    if (!isCarriedItem(id)) inventory[id] = "left_behind";
  }
  const hotel = next.travelSettings.hotelPlaceId;
  const arrived: GameState = {
    ...state,
    revision: state.revision + 1,
    currentCityId: next.city.id,
    inventory,
    travel: { currentPlaceId: hotel, hotelPlaceId: hotel, day: 1, minute: 9 * 60,
      // Rentals, ride counts and the stay's flags end here: they belong to the city where they were made.
      returnReserve: 0, returnDeadline: DAY_END, activeEvent: null, rentedModeIds: [], rideCounts: {}, temporaryFlags: [],
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
      !state.completedCityIds.includes(state.currentCityId) || isSceneOpen(state) || state.travel.activeEvent) return state;
  // A city whose epilogue its author starts (3.9 (d)): never started here; it departs once cleared and read.
  if (!state.viewedEpilogueCityIds.includes(state.currentCityId))
    return isAuthoredEpilogueCity(state.currentCityId) ? state : startCityEpilogue(state, state.currentCityId, expectedRevision);
  return departToNextCity(state, expectedRevision);
}
