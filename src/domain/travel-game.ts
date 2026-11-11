import { mainPartPayments, tourKeepBack } from "./reservations";
import { battles, dates, episodes, getCityContent } from "../content";
import { getBattleAvailability, startBattle } from "./battle";
import { getEpisodeAvailability, isEpisodeUnlocked, isStoryBattleUnlocked } from "./chapter";
import { getDateAvailability, isDateUnlockedForTravel, isEventVisible, type GameState } from "./game";
import { eventPrefix, openEventOccasion, openHotel } from "./occasion";
import { canReturnByDayEnd, DAY_END, getGameWeekday, planOvernight, planTravelEvent } from "./travel";
import { compareRouteCost, findTravelHomeRoutes, type HomeRoute } from "./travel-routes";
import type { TravelEvent, TravelRoute } from "../content/travel-schemas";
import { getTransportMode, WALK_MODE_ID } from "../content/transport";
import { getUsableRoutes, isTransportModeUsable, rentalReason } from "./transport";
import { hasActiveScene } from "./game-state-schema";
import { battlePlayed } from "./conditions";

/** `walk` or a transport mode ID declared by the journey (src/content/transport.ts). */
export type TravelMode = TravelRoute["mode"];
type Plan = Extract<ReturnType<typeof planTravelEvent>, { ok: true }> & { returnReserve: number };
export type TravelAvailability = { available: boolean; reason: string; plan?: Plan };

/**
 * The travel plan's view of the state: what a booked tour keeps back for its event steps (tour stage 2a; tourKeepBack) is not spent
 * on fares, admissions, the night or a date's AP, so the plans' remaining budget leaves it out (the callers add it back).
 */
function snapshot(state: GameState) {
  const kept = tourKeepBack(state);
  return { ...state.travel, weekday: getGameWeekday(state.travel.calendar), ap: state.ap - kept.ap, travelBudget: state.travelBudget - kept.money };
}
function route(state: GameState, from: string, to: string, mode: TravelMode) {
  return getCityContent(state.currentCityId).travel.routes.find((item) => item.fromPlaceId === from && item.toPlaceId === to && item.mode === mode);
}
/**
 * The ways from a place of the current city back to the hotel the party may
 * take now (usable routes only: a rental mode once rented). They consist only
 * of registered directed legs; the second leg is walking.
 */
export function getTravelHomeRoutes(state: GameState, fromPlaceId: string): HomeRoute[] {
  return findTravelHomeRoutes(getUsableRoutes(state), fromPlaceId, state.travel.hotelPlaceId);
}
/** Current event cost and duration, including the retry rule. */
export function getTravelEventDefinition(state: GameState, eventId: string) {
  const { travel, travelSettings } = getCityContent(state.currentCityId);
  const event = travel.events.find((item) => item.id === eventId);
  if (!event) return undefined;
  const episode = episodes.find((item) => item.id === event.id);
  const isRetry = episode
    ? battlePlayed(state, episode.battleId)
    : event.category === "main" && battlePlayed(state, event.id);
  return {
    ...event,
    activityMinutes: isRetry ? travelSettings.retryMinutes : event.activityMinutes,
  };
}
function normalAvailability(state: GameState, eventId: string) {
  if (episodes.some((episode) => episode.id === eventId)) return getEpisodeAvailability(state, eventId);
  if (dates.some((date) => date.id === eventId)) return getDateAvailability(state, eventId);
  return getBattleAvailability(state, eventId);
}

/** Only permanent progression gates determine whether a destination is revealed. */
export function isTravelEventUnlocked(state: GameState, eventId: string): boolean {
  const event = getCityContent(state.currentCityId).travel.events.find((item) => item.id === eventId);
  if (!event || event.contentStatus === "pending_content") return false;
  const episode = episodes.find((item) => item.id === eventId);
  if (episode) return isEpisodeUnlocked(state, episode);
  if (dates.some((date) => date.id === eventId)) return isDateUnlockedForTravel(state, eventId);
  return isStoryBattleUnlocked(state, eventId);
}

/** Match the existing progression rules for episodes, finale and special battles. */
export function isUnclearedMainTravelEvent(state: GameState, eventId: string): boolean {
  const event = getCityContent(state.currentCityId).travel.events.find((item) => item.id === eventId);
  if (!event || event.category !== "main") return false;
  if (episodes.some((episode) => episode.id === eventId))
    return !state.completedEpisodeIds.includes(eventId);
  return !battlePlayed(state, eventId);
}

/** Ordinary dates and completed main events are not offered for replay.
 * Retryable confession/recovery conversations retain their existing rules. */
export function isCompletedTravelEvent(state: GameState, eventId: string): boolean {
  const event = getCityContent(state.currentCityId).travel.events.find((item) => item.id === eventId);
  if (!event) return false;
  if (event.category === "main") return !isUnclearedMainTravelEvent(state, eventId);
  const date = dates.find((item) => item.id === eventId);
  return !!date && (date.kind === "normal" || !date.repeatable) && state.playedDateIds.includes(eventId);
}
/** Visibility is shared by destination selection, map markers and wait shortcuts. */
export function isTravelEventVisible(state: GameState, event: TravelEvent): boolean {
  if (isCompletedTravelEvent(state, event.id) || !isTravelEventUnlocked(state, event.id)) return false;
  const date = dates.find((item) => item.id === event.id);
  if (!date) return true;
  return date.kind === "normal" ? !state.playedDateIds.includes(date.id) || isEventVisible(state, date.id) : isEventVisible(state, date.id);
}

/** Preview and commit use the same return candidates and late-return policy. */
export function getTravelSleepOptions(state: GameState) {
  const { travelSettings } = getCityContent(state.currentCityId);
  const routes = getTravelHomeRoutes(state, state.travel.currentPlaceId);
  const current = snapshot(state);
  const allowLateReturn = !canReturnByDayEnd(current, routes);
  return routes.map((route) => ({ route, plan: planOvernight(current, route, travelSettings.lodgingCost, allowLateReturn) }));
}

/** Why a departure cannot be made (the map's reasons; a `# then: move` reads the same). */
export const reasonJa: Record<string, string> = {
  invalid: "旅行の状態を確認できません。", closed: "到着する時間には、この出来事を始められません。",
  closed_day: "今日は休館日です。",
  time: "今日はホテルへの帰路を含めると時間が足りません。", budget: "移動や帰りのための予算が足りません。",
  ap: "APが足りません。", route: "この移動経路はまだ利用できません。",
};

/** Existing availability, confirmed directed routes and return feasibility are all checked before spending. */
export function getTravelEventAvailability(state: GameState, eventId: string, mode: TravelMode): TravelAvailability {
  const event = getTravelEventDefinition(state, eventId);
  if (!event) return { available: false, reason: "行き先が見つかりません。" };
  if (event.contentStatus === "pending_content") return { available: false, reason: "この出来事は制作中です。" };
  if (isCompletedTravelEvent(state, eventId)) return { available: false, reason: "この出来事は終えています。" };
  if (state.travel.activeEvent) return { available: false, reason: "途中の場面を終えてから出発できます。" };
  const existing = normalAvailability(state, eventId);
  if (!existing.available) return existing;
  const outbound = route(state, state.travel.currentPlaceId, event.placeId, mode);
  const place = getCityContent(state.currentCityId).travel.places.find((item) => item.id === event.placeId);
  if (!outbound || !place) return { available: false, reason: reasonJa.route };
  if (!isTransportModeUsable(state, mode))
    return { available: false, reason: getTransportMode(state.currentCityId, mode)?.rental ? rentalReason(state.currentCityId, mode) : reasonJa.route };
  const returns = getTravelHomeRoutes(state, event.placeId)
    .sort(compareRouteCost);
  let reason = reasonJa.route;
  // The main parts' payments (their # on_done: money -X, ap -N; stage 3a) are checked now and kept back during the trip.
  const payments = mainPartPayments(state, eventId);
  const dateAp = dates.find((item) => item.id === eventId)?.apCost ?? 0;
  if (payments.ap && state.ap - tourKeepBack(state).ap - dateAp < payments.ap) return { available: false, reason: reasonJa.ap };
  for (const returnRoute of returns) {
    const plan = planTravelEvent(snapshot(state), event, outbound, returnRoute, place);
    if (plan.ok && plan.remainingBudget - returnRoute.cost < payments.money) { reason = reasonJa.budget; continue; }
    if (plan.ok) return { available: true, reason: "", plan: { ...plan, returnReserve: returnRoute.cost } };
    reason = plan.reason === "budget" && (event.admissionCost ?? 0) > 0
      ? "移動・入場や帰りのための予算が足りません。"
      : reasonJa[plan.reason];
  }
  return { available: false, reason };
}

/** Commit the departure and scene start together; the existing scene starter charges AP. */
export function beginTravelEvent(state: GameState, eventId: string, mode: TravelMode, expectedRevision: number, nextRoll?: () => number, replayBattleId?: string): GameState {
  if (state.revision !== expectedRevision) return state;
  const availability = getTravelEventAvailability(state, eventId, mode);
  const event = getTravelEventDefinition(state, eventId);
  if (!availability.available || !availability.plan || !event) return state;
  // A ride by vehicle counts once the trip changes place (walking and starting an event here do not).
  const rides = mode !== WALK_MODE_ID && event.placeId !== state.travel.currentPlaceId
    ? { ...state.travel.rideCounts, [mode]: (state.travel.rideCounts[mode] ?? 0) + 1 } : state.travel.rideCounts;
  // The trip's and the ticket counter's scenes (stage 4) run first when any runs there: the trip's at the place it
  // leaves, so the party moves after them (the occasion's "move" part); fare and admission are paid now either way.
  const prefix = replayBattleId ? {} : eventPrefix(state, eventId, { from: state.travel.currentPlaceId, to: event.placeId, modeId: mode, arrivalMinute: availability.plan.arrivalMinute });
  const moved = { ...state, travelBudget: availability.plan.remainingBudget + tourKeepBack(state).money,
    travel: { ...state.travel, returnReserve: availability.plan.returnReserve, returnDeadline: DAY_END,
      ...(prefix.trip ? {} : { currentPlaceId: event.placeId, minute: availability.plan.arrivalMinute, rideCounts: rides }) } };
  const episode = episodes.find((item) => item.id === eventId);
  if (replayBattleId && (!episode || episode.battleId !== replayBattleId || !battlePlayed(state, replayBattleId))) return state;
  const reserved = { ...moved, travel: { ...moved.travel,
    activeEvent: { eventId, placeId: event.placeId, endMinute: availability.plan.endMinute } } };
  // A replayed battle starts by itself (no occasion; its time window settles at its result as before).
  if (replayBattleId) {
    const started = startBattle(reserved, replayBattleId);
    return started === reserved ? state : started;
  }
  // The map event's occasion (stage 3b, 4.2): its main group decided now, run to its first stop (an inserted scene before
  // the main part, the guide, the observation, the battle or the date).
  const cleared = reserved.activeBattle?.phase === "result" ? { ...reserved, activeBattle: null, battleRewardReceipt: null } : reserved;
  const opened = openEventOccasion(cleared, eventId, nextRoll, prefix);
  return opened === cleared ? state : opened;
}

/**
 * Open the main part of a map event at its place (the fare and time are settled by the caller),
 * through its occasion (stage 3b; occasion.ts). Returns the state unchanged when nothing can start.
 */
export function startTravelEventScene(state: GameState, eventId: string, nextRoll?: () => number): GameState {
  return openEventOccasion(state, eventId, nextRoll);
}

/** Settle the saved time reservation once the current scene completes or is left. */
export function finishTravelEventIfComplete(previous: GameState, next: GameState): GameState {
  // An occasion settles its window when it closes (stage 3b, 4.2).
  if (previous.occasion || next.occasion) return next;
  const active = previous.travel.activeEvent;
  if (!active || next.travel.activeEvent?.eventId !== active.eventId) return next;
  const episode = episodes.find((entry) => entry.id === active.eventId);
  const isDate = dates.some((entry) => entry.id === active.eventId);
  const finished = isDate ? !next.activeDate
    : episode ? (next.activeBattle?.battleId === episode.battleId && next.activeBattle.phase === "result") ||
      (!next.activeTourism && !next.activeBattle && !next.activeEncounter)
    : (next.activeBattle?.battleId === active.eventId && next.activeBattle.phase === "result") ||
      (!next.activeBattle && !next.activeTourism && !next.activeEncounter);
  if (!finished) return next;
  return { ...next, travel: { ...next.travel, minute: active.endMinute, activeEvent: null } };
}

export function waitForTravel(state: GameState, minutes: number, expectedRevision: number): GameState {
  if (state.revision !== expectedRevision || hasActiveScene(state) ||
      !Number.isSafeInteger(minutes) || minutes <= 0 || state.travel.minute + minutes > DAY_END) return state;
  const home = getTravelHomeRoutes(state, state.travel.currentPlaceId)
    .filter((item) => item.cost <= state.travelBudget - tourKeepBack(state).money && state.travel.minute + minutes + item.minutes <= DAY_END)
    .sort(compareRouteCost)[0];
  if (!home) return state;
  return { ...state, revision: state.revision + 1, travel: { ...state.travel, minute: state.travel.minute + minutes, returnReserve: home.cost, returnDeadline: DAY_END } };
}

/** `viaPlaceId`: undefined selects a feasible route for legacy callers; null
 * selects the direct route; a place ID selects that exact connection. */
export function sleepAtHotel(state: GameState, mode: TravelMode, expectedRevision: number, viaPlaceId?: string | null, nextRoll?: () => number): GameState {
  if (state.revision !== expectedRevision || hasActiveScene(state)) return state;
  const plan = getTravelSleepOptions(state)
    .filter(({ route }) => route.mode === mode && (viaPlaceId === undefined || (route.viaPlaceId ?? null) === viaPlaceId))
    .map((option) => option.plan).find((item) => item.ok);
  if (!plan || !plan.ok) return state;
  if (state.travel.calendar && !Number.isSafeInteger(state.travel.calendar.journeyDay + 1)) return state;
  // The hotel's moment (stage 4) when scenes run there or on the way: paid now, the night comes after its scenes.
  const budget = plan.remainingBudget + tourKeepBack(state).money;
  const paid: GameState = { ...state, revision: state.revision + 1, travelBudget: budget, travel: { ...state.travel, returnReserve: 0, returnDeadline: DAY_END } };
  const hotel = openHotel(paid, { from: state.travel.currentPlaceId, to: state.travel.hotelPlaceId, modeId: mode, arrivalMinute: plan.arrivalMinute }, nextRoll);
  if (hotel) return hotel;
  return { ...state, revision: state.revision + 1, travelBudget: budget,
    travel: { ...state.travel, currentPlaceId: state.travel.hotelPlaceId, day: plan.nextDay, minute: plan.nextMinute, returnReserve: 0, returnDeadline: DAY_END,
      ...(state.travel.calendar ? { calendar: { ...state.travel.calendar, journeyDay: state.travel.calendar.journeyDay + 1 } } : {}) } };
}

/**
 * The rest the game takes by itself at the day's end (docs/02 「休む」): in free time at DAY_END (21:00) or later, with no scene,
 * moment or trip open, the way home that 「休む」 would take: the cheapest of the ways it offers now (then the quickest; the
 * list's order on a tie). GameApp rests by it through the same action as 「休む」 (sleepAtHotel). Null before 21:00, while
 * something is open, or when 「休む」 offers no way it can take (no way home, its fare, an arrival past the next morning): free
 * time then shows as before. Once the rest is made it is the next morning (or the hotel's scenes), so a night never rests twice.
 */
export function dayEndRest(state: GameState): HomeRoute | null {
  if (state.travel.minute < DAY_END || hasActiveScene(state)) return null;
  const ways = getTravelSleepOptions(state).flatMap((option) => (option.plan.ok ? [option.route] : []));
  return ways.sort(compareRouteCost)[0] ?? null;
}
