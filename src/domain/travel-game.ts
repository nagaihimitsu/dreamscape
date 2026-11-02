import { dates, episodes, milanoTravelCatalog, milanoTravelSettings } from "../content";
import { getBattleAvailability, startBattle } from "./battle";
import { getEpisodeAvailability, startEpisode } from "./chapter";
import { getDateAvailability, isUpdatedDateReplay, startDate, type GameState } from "./game";
import { planOvernight, planTravelEvent } from "./travel";
import { findTravelHomeRoutes } from "./travel-routes";
import type { TravelRoute } from "../content/travel-schemas";

export type TravelMode = TravelRoute["mode"];
type Plan = Extract<ReturnType<typeof planTravelEvent>, { ok: true }> & { returnReserve: number };
export type TravelAvailability = { available: boolean; reason: string; plan?: Plan };

function snapshot(state: GameState) {
  return { ...state.travel, ap: state.ap, travelBudget: state.travelBudget };
}
function route(from: string, to: string, mode: TravelMode) {
  return milanoTravelCatalog.routes.find((item) => item.fromPlaceId === from && item.toPlaceId === to && item.mode === mode);
}
/** Return routes consist only of registered directed legs; the second leg is walking. */
export function getTravelHomeRoutes(fromPlaceId: string, hotelPlaceId: string): Array<Pick<TravelRoute, "fromPlaceId" | "toPlaceId" | "mode" | "minutes" | "cost"> & { viaPlaceId?: string }> {
  return findTravelHomeRoutes(milanoTravelCatalog.routes, fromPlaceId, hotelPlaceId);
}
function eventDefinition(state: GameState, eventId: string) {
  const event = milanoTravelCatalog.events.find((item) => item.id === eventId);
  if (!event) return undefined;
  const episode = episodes.find((item) => item.id === event.id);
  const isRetry = episode
    ? state.battleRecords.some((record) => record.battleId === episode.battleId && record.attempts > 0)
    : event.category === "main" && state.battleRecords.some((record) => record.battleId === event.id && record.attempts > 0);
  return {
    ...event,
    activityMinutes: isRetry ? milanoTravelSettings.retryMinutes : event.activityMinutes,
    apCost: event.category === "date" && isUpdatedDateReplay(state, event.id) ? 0 : event.apCost,
  };
}
function normalAvailability(state: GameState, eventId: string) {
  if (episodes.some((episode) => episode.id === eventId)) return getEpisodeAvailability(state, eventId);
  if (dates.some((date) => date.id === eventId)) return getDateAvailability(state, eventId);
  return getBattleAvailability(state, eventId);
}
const reasonJa: Record<string, string> = {
  invalid: "旅行の状態を確認できません。", closed: "到着する時間には、この出来事を始められません。",
  time: "今日はホテルへの帰路を含めると時間が足りません。", budget: "移動や帰りのための予算が足りません。",
  ap: "APが足りません。", route: "この移動経路はまだ利用できません。",
};

/** Existing availability, confirmed directed routes and return feasibility are all checked before spending. */
export function getTravelEventAvailability(state: GameState, eventId: string, mode: TravelMode): TravelAvailability {
  const event = eventDefinition(state, eventId);
  if (!event) return { available: false, reason: "行き先が見つかりません。" };
  if (state.travel.activeEvent) return { available: false, reason: "途中の場面を終えてから出発できます。" };
  const existing = normalAvailability(state, eventId);
  if (!existing.available) return existing;
  const outbound = route(state.travel.currentPlaceId, event.placeId, mode);
  const place = milanoTravelCatalog.places.find((item) => item.id === event.placeId);
  if (!outbound || !place) return { available: false, reason: reasonJa.route };
  const returns = getTravelHomeRoutes(event.placeId, state.travel.hotelPlaceId)
    .sort((a, b) => a.cost - b.cost || a.minutes - b.minutes);
  let reason = reasonJa.route;
  for (const returnRoute of returns) {
    const plan = planTravelEvent(snapshot(state), event, outbound, returnRoute, place);
    if (plan.ok) return { available: true, reason: "", plan: { ...plan, returnReserve: returnRoute.cost } };
    reason = reasonJa[plan.reason];
  }
  return { available: false, reason };
}

/** Commit the departure and scene start together; the existing scene starter charges AP. */
export function beginTravelEvent(state: GameState, eventId: string, mode: TravelMode, expectedRevision: number, nextRoll?: () => number, replayBattleId?: string): GameState {
  if (state.revision !== expectedRevision) return state;
  const availability = getTravelEventAvailability(state, eventId, mode);
  const event = eventDefinition(state, eventId);
  if (!availability.available || !availability.plan || !event) return state;
  const moved = { ...state, travelBudget: availability.plan.remainingBudget,
    travel: { ...state.travel, currentPlaceId: event.placeId, minute: availability.plan.arrivalMinute, returnReserve: availability.plan.returnReserve } };
  const episode = episodes.find((item) => item.id === eventId);
  if (replayBattleId && (!episode || episode.battleId !== replayBattleId || !state.battleRecords.some((record) => record.battleId === replayBattleId && record.attempts > 0))) return state;
  const started = replayBattleId ? startBattle(moved, replayBattleId)
    : episode ? startEpisode(moved, eventId)
    : dates.some((date) => date.id === eventId) ? startDate(moved, eventId, nextRoll)
      : startBattle(moved, eventId);
  if (started === moved) return state;
  return { ...started, travel: { ...started.travel,
    activeEvent: { eventId, placeId: event.placeId, endMinute: availability.plan.endMinute } } };
}

/** Settle the saved time reservation once the current scene completes or is left. */
export function finishTravelEventIfComplete(previous: GameState, next: GameState): GameState {
  const active = previous.travel.activeEvent;
  if (!active || next.travel.activeEvent?.eventId !== active.eventId) return next;
  const episode = episodes.find((entry) => entry.id === active.eventId);
  const isDate = dates.some((entry) => entry.id === active.eventId);
  const finished = isDate ? !next.activeDate
    : episode ? (next.activeBattle?.battleId === episode.battleId && next.activeBattle.phase === "result") ||
      (!next.activeTourism && !next.activeBattle && !next.activeEncounter)
    : (next.activeBattle?.battleId === active.eventId && next.activeBattle.phase === "result") || !next.activeBattle;
  if (!finished) return next;
  return { ...next, travel: { ...next.travel, minute: active.endMinute, activeEvent: null } };
}

export function waitForTravel(state: GameState, minutes: number, expectedRevision: number): GameState {
  if (state.revision !== expectedRevision || state.travel.activeEvent || state.activeDate || state.activeBattle || state.activeTourism || state.activeEncounter || state.activeEpilogue ||
      !Number.isSafeInteger(minutes) || minutes <= 0 || state.travel.minute + minutes > 1320) return state;
  const home = getTravelHomeRoutes(state.travel.currentPlaceId, state.travel.hotelPlaceId)
    .filter((item) => item.cost <= state.travelBudget && state.travel.minute + minutes + item.minutes <= 1320)
    .sort((a, b) => a.cost - b.cost || a.minutes - b.minutes)[0];
  if (!home) return state;
  return { ...state, revision: state.revision + 1, travel: { ...state.travel, minute: state.travel.minute + minutes, returnReserve: home.cost } };
}

export function sleepAtHotel(state: GameState, mode: TravelMode, expectedRevision: number): GameState {
  if (state.revision !== expectedRevision || state.travel.activeEvent || state.activeDate || state.activeBattle || state.activeTourism || state.activeEncounter || state.activeEpilogue) return state;
  const home = getTravelHomeRoutes(state.travel.currentPlaceId, state.travel.hotelPlaceId).find((item) => item.mode === mode);
  if (!home) return state;
  const plan = planOvernight(snapshot(state), home, milanoTravelSettings.lodgingCost);
  if (!plan.ok) return state;
  return { ...state, revision: state.revision + 1, travelBudget: plan.remainingBudget,
    travel: { ...state.travel, currentPlaceId: state.travel.hotelPlaceId, day: plan.nextDay, minute: plan.nextMinute, returnReserve: 0 } };
}
