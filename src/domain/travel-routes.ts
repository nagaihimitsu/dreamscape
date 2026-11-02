import type { TravelRoute } from "../content/travel-schemas";
import { DAY_END } from "./travel";

export type HomeRoute = Pick<TravelRoute, "fromPlaceId" | "toPlaceId" | "mode" | "minutes" | "cost"> & { viaPlaceId?: string };

/** Compose only existing directed transit and walking legs; never infer a reverse leg. */
export function findTravelHomeRoutes(routes: readonly TravelRoute[], fromPlaceId: string, hotelPlaceId: string): HomeRoute[] {
  const direct = routes.filter((item) => item.fromPlaceId === fromPlaceId && item.toPlaceId === hotelPlaceId);
  const transfers = routes.flatMap((first) => {
    if (first.fromPlaceId !== fromPlaceId || first.toPlaceId === hotelPlaceId || first.mode === "walk") return [];
    const last = routes.find((item) => item.fromPlaceId === first.toPlaceId && item.toPlaceId === hotelPlaceId && item.mode === "walk");
    return last ? [{ fromPlaceId, toPlaceId: hotelPlaceId, mode: first.mode, minutes: first.minutes + last.minutes,
      cost: first.cost + last.cost, viaPlaceId: first.toPlaceId }] : [];
  });
  const byMode = new Map<TravelRoute["mode"], HomeRoute>();
  for (const item of [...direct, ...transfers].sort((a, b) => a.minutes - b.minutes || a.cost - b.cost)) {
    if (!byMode.has(item.mode)) byMode.set(item.mode, item);
  }
  return [...byMode.values()];
}

/** Minimum protected fare for an on-time return; allow emergency return at closing. */
export function minimumHomeFare(routes: readonly TravelRoute[], fromPlaceId: string, hotelPlaceId: string, minute: number, dayEnd = DAY_END): number | undefined {
  const deadline = minute < dayEnd ? dayEnd : 1980 - 1;
  const candidates = findTravelHomeRoutes(routes, fromPlaceId, hotelPlaceId)
    .filter((item) => minute + item.minutes <= deadline);
  return candidates.length ? Math.min(...candidates.map((item) => item.cost)) : undefined;
}
