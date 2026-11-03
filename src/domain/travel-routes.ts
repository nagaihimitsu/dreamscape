import type { TravelRoute } from "../content/travel-schemas";
import { DAY_END } from "./travel";

export type HomeRoute = Pick<TravelRoute, "fromPlaceId" | "toPlaceId" | "mode" | "minutes" | "cost" | "transferNote"> & { viaPlaceId?: string };

/** Compose only existing directed transit and walking legs; never infer a reverse leg. */
export function findTravelHomeRoutes(routes: readonly TravelRoute[], fromPlaceId: string, hotelPlaceId: string): HomeRoute[] {
  const direct = routes.filter((item) => item.fromPlaceId === fromPlaceId && item.toPlaceId === hotelPlaceId);
  // Already home: leaving and circling back is not a way to return to the hotel.
  if (fromPlaceId === hotelPlaceId) return direct;
  const transfers = routes.flatMap((first) => {
    if (first.fromPlaceId !== fromPlaceId || first.toPlaceId === hotelPlaceId || first.mode === "walk") return [];
    const last = routes.find((item) => item.fromPlaceId === first.toPlaceId && item.toPlaceId === hotelPlaceId && item.mode === "walk");
    return last ? [{ fromPlaceId, toPlaceId: hotelPlaceId, mode: first.mode, minutes: first.minutes + last.minutes,
      cost: first.cost + last.cost, viaPlaceId: first.toPlaceId, transferNote: first.transferNote }] : [];
  });
  // Keep the useful time/fare trade-offs within each mode. Dropping a slower
  // but cheaper connection can strand a player who has reserved that fare.
  // Direct routes are listed first for equal time and fare.
  const candidates = [...direct, ...transfers].sort((a, b) => a.minutes - b.minutes || a.cost - b.cost);
  return candidates.filter((item, index) => !candidates.some((other, otherIndex) =>
    other.mode === item.mode && other.minutes <= item.minutes && other.cost <= item.cost &&
    (other.minutes < item.minutes || other.cost < item.cost || otherIndex < index)));
}

/** Minimum protected fare for an on-time return; allow emergency return at closing. */
export function minimumHomeFare(routes: readonly TravelRoute[], fromPlaceId: string, hotelPlaceId: string, minute: number, dayEnd = DAY_END): number | undefined {
  const deadline = minute < dayEnd ? dayEnd : 1980 - 1;
  const candidates = findTravelHomeRoutes(routes, fromPlaceId, hotelPlaceId)
    .filter((item) => minute + item.minutes <= deadline);
  return candidates.length ? Math.min(...candidates.map((item) => item.cost)) : undefined;
}
