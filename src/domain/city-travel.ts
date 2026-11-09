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
    !getNextCity(state) && !state.activeEpilogue && !state.occasion;
}

/**
 * Leave once; the caller commits the returned snapshot with the existing save guard. The departure's moment
 * (stage 4: `depart <city>` scenes before the items are left behind) and the next city's arrival open through
 * the occasion (occasion.ts registers it); without scenes there, the city changes and the arrival begins at once.
 */
export function departToNextCity(state: GameState, expectedRevision: number): GameState {
  if (state.revision !== expectedRevision || !canDepart(state)) return state;
  return openDepartureMoment(state);
}

/** Whether the city can be left now (cleared, a next city, no scene open, no trip). */
export const canDepart = (state: GameState) =>
  state.completedCityIds.includes(state.currentCityId) && !isSceneOpen(state) && !state.travel.activeEvent && !!getNextCity(state);

/** The departure itself (the departure moment's main part): the items left behind and the next city reached, its arrival not begun. */
export function leaveForNextCity(state: GameState): GameState {
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
  return arrived;
}

/** The moments' entries (occasion.ts registers them: a stage-4 moment opens when scenes run there; else as before). */
type MomentOpeners = { depart: (state: GameState) => GameState; epilogue: (state: GameState) => GameState };
let openers: MomentOpeners | undefined;
export function registerMomentOpeners(next: MomentOpeners): void { openers = next; }
const openDepartureMoment = (state: GameState): GameState => {
  if (openers) return openers.depart(state);
  const arrived = leaveForNextCity(state);
  return arrived === state ? state : startCityArrival(arrived, arrived.revision);
};

/** Advance a configured journey only after the current city's result and epilogue.
 * Read the ending even in the last city; only depart to a completed successor.
 * Callers persist the returned snapshot together with the action that produced it.
 */
export function advanceCompletedJourneyCity(state: GameState, expectedRevision: number): GameState {
  if (state.revision !== expectedRevision || getJourneyForCity(state.currentCityId)?.cityTransition !== "after_epilogue" ||
      !state.completedCityIds.includes(state.currentCityId) || isSceneOpen(state) || state.travel.activeEvent) return state;
  // A city whose epilogue its author starts (3.9 (d)): never started here; it departs once cleared and read.
  if (!state.viewedEpilogueCityIds.includes(state.currentCityId))
    return isAuthoredEpilogueCity(state.currentCityId) ? state : openers ? openers.epilogue(state) : startCityEpilogue(state, state.currentCityId, expectedRevision);
  return departToNextCity(state, expectedRevision);
}
