import { getCityContent } from "../content";
import type { TravelEvent, TravelPlace, TravelRoute } from "../content/travel-schemas";
import type { GameState } from "./game";
import { NIGHT_START, groupDestinationEvents, selectNearbyDestinations, type DestinationPlace } from "./travel";
import { getTravelEventAvailability, getTravelSleepOptions, isTravelEventVisible, isUnclearedMainTravelEvent, waitForTravel } from "./travel-game";
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

/**
 * The 待機 menu: 「30分待つ」 and, while it is still day, 「夜(18:00)まで待つ」 (until NIGHT_START; user decision 2026-11-11:
 * no wait to the next opening time). The night wait is left out where it would be the same 30 minutes. Each is enabled
 * only if waiting is possible (the party can still get back to the hotel before the day ends).
 */
export function getTravelWaitOptions(state: GameState): TravelWaitOption[] {
  const toNight = NIGHT_START - state.travel.minute;
  const options = [{ minutes: 30, until: null }, ...(toNight > 0 && toNight !== 30 ? [{ minutes: toNight, until: NIGHT_START }] : [])];
  return options.map((option) => ({ ...option, available: waitForTravel(state, option.minutes, state.revision) !== state }));
}

/** One route of an event, as the destination's choices offer it (data order). */
export type RouteChoice = { route: TravelRoute; available: boolean; reason?: string };
/** One visible event at a place with its routes from the current place. */
export type EventChoice = { event: TravelDestinationEvent; routes: RouteChoice[]; available: boolean; reason?: string };
/**
 * What can be chosen at a destination (UI redesign §3.5 「Shared code」): the single answer
 * the list rows, the map and the expanded map's slot use. `onlyWay` is the one event × one
 * route × available case, where a second press on the name travels.
 */
export type DestinationChoices = {
  place: TravelPlace;
  isCurrent: boolean;
  events: EventChoice[];
  available: boolean;
  /** The row's reason when nothing is available there. */
  reason?: string;
  onlyWay: { eventId: string; mode: TravelRoute["mode"] } | null;
};

/** The choices of one destination of `getTravelDestinations` (the list builds every row at once). */
export function destinationChoicesOf(state: GameState, destination: TravelDestinationPlace): DestinationChoices {
  const events = destination.events.map((event): EventChoice => {
    const routes = event.routes.map((route): RouteChoice => {
      const availability = getTravelEventAvailability(state, event.id, route.mode);
      return availability.available ? { route, available: true } : { route, available: false, reason: availability.reason || "今は利用できません。" };
    });
    const available = routes.some((route) => route.available);
    return available ? { event, routes, available } : { event, routes, available, reason: event.unavailableReason || "今は利用できません。" };
  });
  const only = events.length === 1 && events[0].routes.length === 1 && events[0].routes[0].available ? events[0] : null;
  const first = destination.events[0];
  return {
    place: first.place,
    isCurrent: first.placeId === state.travel.currentPlaceId,
    events,
    available: destination.available,
    ...(destination.available ? {} : { reason: first.unavailableReason || "今は行けません。" }),
    onlyWay: only ? { eventId: only.event.id, mode: only.routes[0].route.mode } : null,
  };
}

/** The choices at `placeId`, or null when it is not a candidate place of the list. */
export function getDestinationChoices(state: GameState, placeId: string): DestinationChoices | null {
  const destination = getTravelDestinations(state).places.find((place) => place.id === placeId);
  return destination ? destinationChoicesOf(state, destination) : null;
}

export type SleepOption = ReturnType<typeof getTravelSleepOptions>[number];
export type TravelSleepChoices = { options: SleepOption[]; onlyWay: SleepOption["route"] | null };

/** The ways home for 休む; `onlyWay` when there is exactly one and it can be taken. */
export function getTravelSleepChoices(state: GameState): TravelSleepChoices {
  const options = getTravelSleepOptions(state);
  return { options, onlyWay: options.length === 1 && options[0].plan.ok ? options[0].route : null };
}
