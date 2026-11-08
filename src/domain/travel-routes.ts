import type { TravelRoute } from "../content/travel-schemas";
import { WALK_MODE_ID } from "../content/transport-schemas";
import { DAY_END } from "./travel";

type RouteEstimate = Pick<TravelRoute, "minutes" | "cost">;

/** Stable tie-breaking is shared by displayed options and return planning. */
export const compareRouteTime = (a: RouteEstimate, b: RouteEstimate) => a.minutes - b.minutes || a.cost - b.cost;
export const compareRouteCost = (a: RouteEstimate, b: RouteEstimate) => a.cost - b.cost || a.minutes - b.minutes;

export type HomeRoute = Pick<TravelRoute, "fromPlaceId" | "toPlaceId" | "mode" | "minutes" | "cost" | "transferNote"> & { viaPlaceId?: string };

/**
 * Every way home from a place: the direct routes and a vehicle leg followed by a
 * walk to the hotel. Compose only existing directed transit and walking legs;
 * never infer a reverse leg. Keeps the time/fare trade-offs within each mode.
 */
export function composeHomeRoutes(routes: readonly TravelRoute[], fromPlaceId: string, hotelPlaceId: string): HomeRoute[] {
  const direct = routes.filter((item) => item.fromPlaceId === fromPlaceId && item.toPlaceId === hotelPlaceId);
  // Already home: leaving and circling back is not a way to return to the hotel.
  if (fromPlaceId === hotelPlaceId) return direct;
  const transfers = routes.flatMap((first) => {
    if (first.fromPlaceId !== fromPlaceId || first.toPlaceId === hotelPlaceId || first.mode === WALK_MODE_ID) return [];
    const last = routes.find((item) => item.fromPlaceId === first.toPlaceId && item.toPlaceId === hotelPlaceId && item.mode === WALK_MODE_ID);
    return last ? [{ fromPlaceId, toPlaceId: hotelPlaceId, mode: first.mode, minutes: first.minutes + last.minutes,
      cost: first.cost + last.cost, viaPlaceId: first.toPlaceId, transferNote: first.transferNote }] : [];
  });
  // Keep the useful time/fare trade-offs within each mode. Dropping a slower
  // but cheaper connection can strand a player who has reserved that fare.
  // Direct routes are listed first for equal time and fare.
  const candidates = [...direct, ...transfers].sort(compareRouteTime);
  return candidates.filter((item, index) => !candidates.some((other, otherIndex) =>
    other.mode === item.mode && other.minutes <= item.minutes && other.cost <= item.cost &&
    (other.minutes < item.minutes || other.cost < item.cost || otherIndex < index)));
}

/**
 * The ways home offered to the player (休む, the return reserve and the return
 * checks): composeHomeRoutes without the vehicle options that are neither
 * faster nor cheaper than walking straight home (rule a). Only that direct walk
 * is compared, because walking needs no condition; `routes` are the routes the
 * player can use now (getUsableRoutes), so a mode that still needs renting is
 * neither offered nor compared with anything. Whenever a dropped option would
 * fit a deadline or a budget, the walk fits too and costs no more, so the
 * reserve and the return checks are the same as without the rule.
 */
export function findTravelHomeRoutes(routes: readonly TravelRoute[], fromPlaceId: string, hotelPlaceId: string): HomeRoute[] {
  const home = composeHomeRoutes(routes, fromPlaceId, hotelPlaceId);
  const walks = home.filter((item) => item.mode === WALK_MODE_ID && item.viaPlaceId === undefined);
  return home.filter((item) => item.mode === WALK_MODE_ID ||
    !walks.some((walk) => item.minutes >= walk.minutes && item.cost >= walk.cost));
}

/** The cheapest of these ways home that arrives in time; allow emergency return at closing. */
export function cheapestOnTimeFare(homeRoutes: readonly RouteEstimate[], minute: number): number | undefined {
  const deadline = minute < DAY_END ? DAY_END : 1980 - 1;
  const fares = homeRoutes.filter((item) => minute + item.minutes <= deadline).map((item) => item.cost);
  return fares.length ? Math.min(...fares) : undefined;
}

/** Minimum protected fare for an on-time return. */
export function minimumHomeFare(routes: readonly TravelRoute[], fromPlaceId: string, hotelPlaceId: string, minute: number): number | undefined {
  return cheapestOnTimeFare(findTravelHomeRoutes(routes, fromPlaceId, hotelPlaceId), minute);
}
