/** Pure calculations for a future city. They do not reserve or save an action. */
import type { TravelEvent, TravelPlace, TravelRoute } from "../content/travel-schemas";

export type DestinationEventCandidate = {
  id: string;
  placeId: string;
  category: "main" | "date";
  /** Walking-route duration, or null when no walking route is registered. */
  walkMinutes: number | null;
  available: boolean;
  /** Whether this main event has not yet been cleared, independent of availability. */
  unclearedMain: boolean;
};

export type DestinationPlace<T extends DestinationEventCandidate> = {
  id: string;
  walkMinutes: number | null;
  events: T[];
  available: boolean;
  hasAvailableUnclearedMain: boolean;
};

export type Coordinate = { id?: string; latitude: number; longitude: number };
export type Direction = "現在地" | "方角不明" | "北" | "北東" | "東" | "南東" | "南" | "南西" | "西" | "北西";
export type Route = Pick<TravelRoute, "fromPlaceId" | "toPlaceId" | "mode" | "minutes" | "cost">;
export type Event = Pick<TravelEvent, "id" | "placeId" | "activityMinutes" | "apCost" | "admissionCost" | "startWindows" | "endWindows">;

export type TravelSnapshot = {
  currentPlaceId: string;
  hotelPlaceId: string;
  day: number;
  minute: number;
  ap: number;
  travelBudget: number;
  /** Fictional journey weekday if a game calendar is configured; Monday is 0. */
  weekday?: number;
};
type FailureReason = "invalid" | "closed" | "closed_day" | "time" | "budget" | "ap" | "route";
type Failure = { ok: false; reason: FailureReason };
const failure = (reason: FailureReason): Failure => ({ ok: false, reason });
export const DAY_START = 9 * 60;
const NIGHT_START = 18 * 60;
export const DAY_END = 21 * 60;

/** Weekday comes from the saved in-game calendar, never the device clock. */
export function getGameWeekday(calendar: { journeyDay: number; startWeekday: number } | undefined): number | undefined {
  if (!calendar || !Number.isSafeInteger(calendar.journeyDay) || calendar.journeyDay < 1 ||
      !Number.isInteger(calendar.startWeekday) || calendar.startWeekday < 0 || calendar.startWeekday > 6) return undefined;
  return (calendar.startWeekday + (calendar.journeyDay - 1) % 7) % 7;
}

/** 18:00 starts the night; 21:00 is no longer a time to start activities. */
export function getTimePeriod(minute: number): "day" | "night" | "closed" {
  if (minute >= DAY_START && minute < NIGHT_START) return "day";
  if (minute >= NIGHT_START && minute < DAY_END) return "night";
  return "closed";
}

/** Group events at the same physical place without discarding unavailable events. */
export function groupDestinationEvents<T extends DestinationEventCandidate>(events: readonly T[]): DestinationPlace<T>[] {
  const places = new Map<string, DestinationPlace<T>>();
  const ids = new Set<string>();
  for (const event of events) {
    if (!event.id || !event.placeId || ids.has(event.id) || (event.walkMinutes !== null && (!Number.isFinite(event.walkMinutes) || event.walkMinutes < 0)))
      throw new Error("Invalid or duplicate destination event");
    ids.add(event.id);
    let place = places.get(event.placeId);
    if (!place) {
      place = { id: event.placeId, walkMinutes: event.walkMinutes, events: [], available: false, hasAvailableUnclearedMain: false };
      places.set(event.placeId, place);
    } else if (place.walkMinutes !== event.walkMinutes) {
      throw new Error("Events at the same place have inconsistent walking times");
    }
    place.events.push(event);
    place.available ||= event.available;
    place.hasAvailableUnclearedMain ||= event.category === "main" && event.unclearedMain && event.available;
  }
  return [...places.values()];
}

/** Sort known walking times first, leaving places without a walking route in the list. */
export function selectNearbyDestinations<T extends Pick<DestinationPlace<DestinationEventCandidate>, "id" | "walkMinutes" | "available" | "hasAvailableUnclearedMain">>(destinations: readonly T[]): { nearby: T[]; other: T[]; recommendedMainId: string | null } {
  if (destinations.some((item) => !item.id || (item.walkMinutes !== null && (!Number.isFinite(item.walkMinutes) || item.walkMinutes < 0))) ||
      new Set(destinations.map((item) => item.id)).size !== destinations.length) {
    throw new Error("Invalid or duplicate destination");
  }
  const compare = (a: T, b: T) => {
    if (a.walkMinutes === null && b.walkMinutes !== null) return 1;
    if (a.walkMinutes !== null && b.walkMinutes === null) return -1;
    return (a.walkMinutes === null || b.walkMinutes === null ? 0 : a.walkMinutes - b.walkMinutes) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  };
  const sorted = destinations.filter((item) => item.available).sort(compare);
  const nearby = sorted.slice(0, 5);
  let recommendedMainId: string | null = null;
  if (nearby.length === 5 && !nearby.some((item) => item.hasAvailableUnclearedMain)) {
    const nearestMain = sorted.find((item) => item.hasAvailableUnclearedMain);
    if (nearestMain) {
      nearby[4] = nearestMain;
      recommendedMainId = nearestMain.id;
    }
  }
  const selectedIds = new Set(nearby.map((item) => item.id));
  return { nearby, other: [...sorted.filter((item) => !selectedIds.has(item.id)), ...destinations.filter((item) => !item.available).sort(compare)], recommendedMainId };
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
    Number.isSafeInteger(state.travelBudget) && state.travelBudget >= 0 &&
    (state.weekday === undefined || (Number.isInteger(state.weekday) && state.weekday >= 0 && state.weekday <= 6));
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
  place: Pick<TravelPlace, "id" | "openingWindows" | "closedWeekdays">): Failure | {
  ok: true; arrivalMinute: number; endMinute: number; returnMinute: number; remainingBudget: number; remainingAp: number;
} {
  const admissionCost = event.admissionCost ?? 0;
  if (!validSnapshot(state) || !event.id || !event.placeId || !Number.isSafeInteger(event.activityMinutes) || event.activityMinutes <= 0 ||
      !Number.isSafeInteger(event.apCost) || event.apCost < 0 || !Number.isSafeInteger(admissionCost) || admissionCost < 0) return failure("invalid");
  if (place.id !== event.placeId || outbound.toPlaceId !== event.placeId || !validRoute(returnRoute) || returnRoute.fromPlaceId !== event.placeId ||
      returnRoute.toPlaceId !== state.hotelPlaceId) return failure("route");
  const travel = planTravel(state, outbound);
  if (!travel.ok) return travel;
  // Charge admission for both travelers once the scene actually starts, and
  // keep enough for the independently selected return route.
  if (travel.remainingBudget < admissionCost || travel.remainingBudget - admissionCost < returnRoute.cost) return failure("budget");
  if (state.ap < event.apCost) return failure("ap");
  const endMinute = travel.arrivalMinute + event.activityMinutes;
  const windowsValid = (windows: Event["startWindows"]) => !windows || windows.every((window) =>
    Number.isSafeInteger(window.start) && Number.isSafeInteger(window.end) && window.start >= 0 && window.start < window.end && window.end <= 24 * 60);
  if (!windowsValid(event.startWindows) || !windowsValid(event.endWindows) || !windowsValid(place.openingWindows)) return failure("invalid");
  if (place.closedWeekdays?.length) {
    if (place.closedWeekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6) || state.weekday === undefined) return failure("invalid");
    if (place.closedWeekdays.includes(state.weekday)) return failure("closed_day");
  }
  if (travel.arrivalMinute >= DAY_END ||
      (place.openingWindows && !place.openingWindows.some((window) => travel.arrivalMinute >= window.start && travel.arrivalMinute < window.end)) ||
      (event.startWindows && !event.startWindows.some((window) => travel.arrivalMinute >= window.start && travel.arrivalMinute < window.end)) ||
      (event.endWindows && !event.endWindows.some((window) => endMinute >= window.start && endMinute <= window.end))) return failure("closed");
  const returnMinute = endMinute + returnRoute.minutes;
  if (returnMinute > DAY_END) return failure("time");
  return { ok: true, arrivalMinute: travel.arrivalMinute, endMinute, returnMinute,
    remainingBudget: travel.remainingBudget - admissionCost, remainingAp: state.ap - event.apCost };
}

/** Pay the available lodging cost without debt; no AP is charged and no budget is granted. */
export function planOvernight(state: TravelSnapshot, returnRoute: Route, lodgingCost: number, allowLateReturn = false): Failure | {
  ok: true; arrivalMinute: number; nextDay: number; nextMinute: number; remainingBudget: number; remainingAp: number; usedAssistance: boolean;
} {
  if (!validSnapshot(state) || !Number.isSafeInteger(lodgingCost) || lodgingCost < 0 || !Number.isSafeInteger(state.day + 1)) return failure("invalid");
  if (!validRoute(returnRoute) || returnRoute.fromPlaceId !== state.currentPlaceId || returnRoute.toPlaceId !== state.hotelPlaceId) return failure("route");
  if (!Number.isSafeInteger(state.minute + returnRoute.minutes)) return failure("invalid");
  // A saved game that can no longer reach the hotel by the new deadline must
  // still be able to return rather than getting stuck overnight.
  if (state.minute < DAY_END && state.minute + returnRoute.minutes > DAY_END && !allowLateReturn) return failure("time");
  // Do not put the next morning before an unexpectedly late arrival.
  if (state.minute + returnRoute.minutes >= 24 * 60 + DAY_START) return failure("time");
  if (returnRoute.cost > state.travelBudget) return failure("budget");
  const available = state.travelBudget - returnRoute.cost;
  return { ok: true, arrivalMinute: state.minute + returnRoute.minutes, nextDay: state.day + 1, nextMinute: DAY_START,
    remainingBudget: Math.max(0, available - lodgingCost), remainingAp: state.ap, usedAssistance: available < lodgingCost };
}

/** Determine whether an affordable return still fits today's normal deadline. */
export function canReturnByDayEnd(state: TravelSnapshot, routes: readonly Route[]): boolean {
  return routes.some((route) => validRoute(route) && route.fromPlaceId === state.currentPlaceId &&
    route.toPlaceId === state.hotelPlaceId && route.cost <= state.travelBudget && state.minute + route.minutes <= DAY_END);
}
