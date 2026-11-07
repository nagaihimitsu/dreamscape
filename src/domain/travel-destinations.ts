import { getCityContent } from "../content";
import type { TravelEvent, TravelPlace, TravelRoute } from "../content/travel-schemas";
import type { GameState } from "./game";
import { DAY_END, NIGHT_START, groupDestinationEvents, selectNearbyDestinations, type DestinationPlace } from "./travel";
import { getTravelEventAvailability, isTravelEventVisible, isUnclearedMainTravelEvent, waitForTravel } from "./travel-game";
import { isTransportModeUsable } from "./transport";

export type TravelDestinationEvent = TravelEvent & {
  walkMinutes: number | null;
  place: TravelPlace;
  /** Every route there, a not-yet-rented rental route included (the route dialog shows it with its reason). */
  routes: TravelRoute[];
  /**
   * The routes the destination line and the event's availability use: those the party
   * may ride now (a rental mode once rented), or every route when none can be ridden.
   */
  describedRoutes: TravelRoute[];
  available: boolean;
  unavailableReason?: string;
  unclearedMain: boolean;
};
export type TravelDestinationPlace = DestinationPlace<TravelDestinationEvent>;

/** Build the same city-local candidates for the destination list and map. */
export function getTravelDestinations(state: GameState) {
  const { travel } = getCityContent(state.currentCityId);
  const current = travel.places.find((place) => place.id === state.travel.currentPlaceId);
  const outgoing = current ? travel.routes.filter((route) => route.fromPlaceId === current.id) : [];
  const candidates: TravelDestinationEvent[] = travel.events.filter((event) => isTravelEventVisible(state, event)).flatMap((event) => {
    const place = travel.places.find((item) => item.id === event.placeId);
    const routes = outgoing.filter((route) => route.toPlaceId === event.placeId);
    if (!place || routes.length === 0) return [];
    const walk = routes.find((route) => route.mode === "walk");
    // The menu lists a rental route before it is rented (with its reason), but the event's
    // reason comes from a usable route: a closed event says so, not 「…で借りると乗れます」.
    const usable = routes.filter((route) => isTransportModeUsable(state, route.mode));
    const describedRoutes = usable.length ? usable : routes;
    const availability = describedRoutes.map((route) => getTravelEventAvailability(state, event.id, route.mode));
    return [{ ...event, walkMinutes: walk?.minutes ?? null, place, routes, describedRoutes,
      available: availability.some((result) => result.available), unavailableReason: availability[0]?.reason,
      unclearedMain: isUnclearedMainTravelEvent(state, event.id) }];
  });
  const places = groupDestinationEvents(candidates);
  return { current, candidates, places, ...selectNearbyDestinations(places) };
}

export type TravelWaitOption = { minutes: number; until: number | null; available: boolean };

/** The 待機 menu (TravelActions): 30 minutes, then until the next time something opens, each enabled only if waiting is possible. */
export function getTravelWaitOptions(state: GameState): TravelWaitOption[] {
  const next = getNextTravelWaitTime(state);
  const options = [{ minutes: 30, until: null }, ...(next === null ? [] : [{ minutes: next - state.travel.minute, until: next }])];
  return options.map((option) => ({ ...option, available: waitForTravel(state, option.minutes, state.revision) !== state }));
}

/** Next visible event, opening time or evening boundary before the day ends. */
export function getNextTravelWaitTime(state: GameState): number | null {
  const { travel } = getCityContent(state.currentCityId);
  const events = travel.events.filter((event) => isTravelEventVisible(state, event));
  const nextTimes = [NIGHT_START,
    ...events.flatMap((event) => event.startWindows?.map((window) => window.start) ?? []),
    ...travel.places.flatMap((place) => place.openingWindows?.map((window) => window.start) ?? []),
  ].filter((minute) => minute > state.travel.minute && minute < DAY_END);
  return nextTimes.length ? Math.min(...nextTimes) : null;
}
