/** Pure calculations for a future city. They do not reserve or save an action. */
import type { TravelEvent, TravelPlace, TravelRoute } from "../content/travel-schemas";

export type DestinationCandidate = {
  id: string;
  category: "main" | "date";
  /** Actual walking-route duration, before display rounding. */
  walkMinutes: number;
};

export type Coordinate = { id?: string; latitude: number; longitude: number };
export type Direction = "現在地" | "方角不明" | "北" | "北東" | "東" | "南東" | "南" | "南西" | "西" | "北西";
export type Route = Pick<TravelRoute, "fromPlaceId" | "toPlaceId" | "mode" | "minutes" | "cost">;
export type Event = Pick<TravelEvent, "id" | "placeId" | "activityMinutes" | "apCost" | "startWindows" | "endWindows">;

export type TravelSnapshot = {
  currentPlaceId: string;
  hotelPlaceId: string;
  day: number;
  minute: number;
  ap: number;
  travelBudget: number;
};
type FailureReason = "invalid" | "closed" | "time" | "budget" | "ap" | "route";
type Failure = { ok: false; reason: FailureReason };
const failure = (reason: FailureReason): Failure => ({ ok: false, reason });
const DAY_START = 9 * 60;
const NIGHT_START = 18 * 60;
const DAY_END = 22 * 60;

/** 18:00 starts the night; 22:00 is no longer a time to start activities. */
export function getTimePeriod(minute: number): "day" | "night" | "closed" {
  if (minute >= DAY_START && minute < NIGHT_START) return "day";
  if (minute >= NIGHT_START && minute < DAY_END) return "night";
  return "closed";
}

/** Sort eligible events by walking time; reserve only the fifth slot for a main event. */
export function selectNearbyDestinations<T extends DestinationCandidate>(destinations: readonly T[]): { nearby: T[]; other: T[]; recommendedMainId: string | null } {
  if (destinations.some((item) => !item.id || !Number.isFinite(item.walkMinutes) || item.walkMinutes < 0) ||
      new Set(destinations.map((item) => item.id)).size !== destinations.length) {
    throw new Error("Invalid or duplicate destination");
  }
  const sorted = [...destinations].sort((a, b) => a.walkMinutes - b.walkMinutes || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const nearby = sorted.slice(0, 5);
  let recommendedMainId: string | null = null;
  if (nearby.length === 5 && !nearby.some((item) => item.category === "main")) {
    const nearestMain = sorted.find((item) => item.category === "main");
    if (nearestMain) {
      nearby[4] = nearestMain;
      recommendedMainId = nearestMain.id;
    }
  }
  const selectedIds = new Set(nearby.map((item) => item.id));
  return { nearby, other: sorted.filter((item) => !selectedIds.has(item.id)), recommendedMainId };
}

/** Initial geographic bearing; only an identical place ID establishes the current location. */
export function getDirection(from: Coordinate, to: Coordinate): Direction {
  for (const point of [from, to]) {
    if (!Number.isFinite(point.latitude) || Math.abs(point.latitude) > 90 ||
        !Number.isFinite(point.longitude) || Math.abs(point.longitude) > 180) throw new Error("Invalid coordinate");
  }
  if (from.id && from.id === to.id) return "現在地";
  if (from.latitude === to.latitude && from.longitude === to.longitude) return "方角不明";
  const radians = Math.PI / 180;
  const latitude1 = from.latitude * radians;
  const latitude2 = to.latitude * radians;
  const deltaLongitude = (to.longitude - from.longitude) * radians;
  const y = Math.sin(deltaLongitude) * Math.cos(latitude2);
  const x = Math.cos(latitude1) * Math.sin(latitude2) - Math.sin(latitude1) * Math.cos(latitude2) * Math.cos(deltaLongitude);
  const bearing = (Math.atan2(y, x) / radians + 360) % 360;
  const directions = ["北", "北東", "東", "南東", "南", "南西", "西", "北西"] as const;
  return directions[Math.floor((bearing + 22.5) / 45) % 8];
}

function validSnapshot(state: TravelSnapshot): boolean {
  return !!state.currentPlaceId && !!state.hotelPlaceId && Number.isSafeInteger(state.day) && state.day >= 1 &&
    Number.isSafeInteger(state.minute) && state.minute >= DAY_START && Number.isSafeInteger(state.ap) && state.ap >= 0 &&
    Number.isSafeInteger(state.travelBudget) && state.travelBudget >= 0;
}

function validRoute(route: Route): boolean {
  return !!route.fromPlaceId && !!route.toPlaceId && ["walk", "rail", "tram", "bus", "taxi"].includes(route.mode) &&
    Number.isSafeInteger(route.minutes) && route.minutes >= 0 && Number.isSafeInteger(route.cost) && route.cost >= 0 &&
    (route.fromPlaceId !== route.toPlaceId || (route.minutes === 0 && route.cost === 0)) &&
    (route.fromPlaceId === route.toPlaceId || route.minutes > 0) &&
    (route.mode !== "walk" || route.cost === 0);
}

/** Calculate a route only. This does not check whether an activity or return trip is possible. */
export function planTravel(state: TravelSnapshot, route: Route): Failure | { ok: true; arrivalMinute: number; remainingBudget: number } {
  if (!validSnapshot(state)) return failure("invalid");
  if (!validRoute(route) || route.fromPlaceId !== state.currentPlaceId) return failure("route");
  if (state.travelBudget < route.cost) return failure("budget");
  if (state.minute >= DAY_END || state.minute + route.minutes > DAY_END) return failure("time");
  return { ok: true, arrivalMinute: state.minute + route.minutes, remainingBudget: state.travelBudget - route.cost };
}

/**
 * Check travel, an activity, and an affordable return route before anything is spent.
 * Place opening windows control entry at arrival; an event's separate end windows
 * impose any completion deadline. None of these calculations commits the action.
 */
export function planTravelEvent(state: TravelSnapshot, event: Event, outbound: Route, returnRoute: Route,
  place: Pick<TravelPlace, "id" | "openingWindows">): Failure | {
  ok: true; arrivalMinute: number; endMinute: number; returnMinute: number; remainingBudget: number; remainingAp: number;
} {
  if (!validSnapshot(state) || !event.id || !event.placeId || !Number.isSafeInteger(event.activityMinutes) || event.activityMinutes <= 0 ||
      !Number.isSafeInteger(event.apCost) || event.apCost < 0) return failure("invalid");
  if (place.id !== event.placeId || outbound.toPlaceId !== event.placeId || !validRoute(returnRoute) || returnRoute.fromPlaceId !== event.placeId ||
      returnRoute.toPlaceId !== state.hotelPlaceId) return failure("route");
  const travel = planTravel(state, outbound);
  if (!travel.ok) return travel;
  if (travel.remainingBudget < returnRoute.cost) return failure("budget");
  if (state.ap < event.apCost) return failure("ap");
  const endMinute = travel.arrivalMinute + event.activityMinutes;
  const windowsValid = (windows: Event["startWindows"]) => !windows || windows.every((window) =>
    Number.isSafeInteger(window.start) && Number.isSafeInteger(window.end) && window.start >= 0 && window.start < window.end && window.end <= 24 * 60);
  if (!windowsValid(event.startWindows) || !windowsValid(event.endWindows) || !windowsValid(place.openingWindows)) return failure("invalid");
  if (travel.arrivalMinute >= DAY_END ||
      (place.openingWindows && !place.openingWindows.some((window) => travel.arrivalMinute >= window.start && travel.arrivalMinute < window.end)) ||
      (event.startWindows && !event.startWindows.some((window) => travel.arrivalMinute >= window.start && travel.arrivalMinute < window.end)) ||
      (event.endWindows && !event.endWindows.some((window) => endMinute >= window.start && endMinute <= window.end))) return failure("closed");
  const returnMinute = endMinute + returnRoute.minutes;
  if (returnMinute > DAY_END) return failure("time");
  return { ok: true, arrivalMinute: travel.arrivalMinute, endMinute, returnMinute,
    remainingBudget: travel.remainingBudget, remainingAp: state.ap - event.apCost };
}

/** Pay the available lodging cost without debt; no AP is charged and no budget is granted. */
export function planOvernight(state: TravelSnapshot, returnRoute: Route, lodgingCost: number): Failure | {
  ok: true; arrivalMinute: number; nextDay: number; nextMinute: number; remainingBudget: number; remainingAp: number; usedAssistance: boolean;
} {
  if (!validSnapshot(state) || !Number.isSafeInteger(lodgingCost) || lodgingCost < 0 || !Number.isSafeInteger(state.day + 1)) return failure("invalid");
  if (!validRoute(returnRoute) || returnRoute.fromPlaceId !== state.currentPlaceId || returnRoute.toPlaceId !== state.hotelPlaceId) return failure("route");
  if (!Number.isSafeInteger(state.minute + returnRoute.minutes)) return failure("invalid");
  // Normally the return must finish by closing time. A scene that has already
  // run past 22:00 can still return rather than trapping the player overnight.
  if (state.minute <= DAY_END && state.minute + returnRoute.minutes > DAY_END) return failure("time");
  // Do not put the next morning before an unexpectedly late arrival.
  if (state.minute + returnRoute.minutes >= 24 * 60 + DAY_START) return failure("time");
  if (returnRoute.cost > state.travelBudget) return failure("budget");
  const available = state.travelBudget - returnRoute.cost;
  return { ok: true, arrivalMinute: state.minute + returnRoute.minutes, nextDay: state.day + 1, nextMinute: DAY_START,
    remainingBudget: Math.max(0, available - lodgingCost), remainingAp: state.ap, usedAssistance: available < lodgingCost };
}
