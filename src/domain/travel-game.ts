import { battles, dates, episodes, getCityContent, journeyConfig, landmarks } from "../content";
import { getBattleAvailability, startBattle } from "./battle";
import { getEpisodeAvailability, isEpisodeUnlocked, isStoryBattleUnlocked, startEpisode } from "./chapter";
import { getDateAvailability, isDateUnlockedForTravel, isEventVisible, startDate, type GameState } from "./game";
import { hasPendingPlaceEncounter } from "./encounter";
import { getTourismAvailability, openTourism } from "./tourism";
import { canReturnByDayEnd, DAY_END, getGameWeekday, planOvernight, planTravelEvent } from "./travel";
import { compareRouteCost, findTravelHomeRoutes, type HomeRoute } from "./travel-routes";
import type { TravelEvent, TravelRoute } from "../content/travel-schemas";

/** `walk` or a transport mode ID declared by the journey (src/content/transport.ts). */
export type TravelMode = TravelRoute["mode"];
type Plan = Extract<ReturnType<typeof planTravelEvent>, { ok: true }> & { returnReserve: number };
export type TravelAvailability = { available: boolean; reason: string; plan?: Plan };

function snapshot(state: GameState) {
  return { ...state.travel, weekday: getGameWeekday(state.travel.calendar), ap: state.ap, travelBudget: state.travelBudget };
}
function route(state: GameState, from: string, to: string, mode: TravelMode) {
  return getCityContent(state.currentCityId).travel.routes.find((item) => item.fromPlaceId === from && item.toPlaceId === to && item.mode === mode);
}
/** Return routes consist only of registered directed legs; the second leg is walking. */
export function getTravelHomeRoutes(fromPlaceId: string, hotelPlaceId: string, cityId: string): HomeRoute[] {
  return findTravelHomeRoutes(getCityContent(cityId).travel.routes, fromPlaceId, hotelPlaceId);
}
/** Current event cost and duration, including the retry rule. */
export function getTravelEventDefinition(state: GameState, eventId: string) {
  const { travel, travelSettings } = getCityContent(state.currentCityId);
  const event = travel.events.find((item) => item.id === eventId);
  if (!event) return undefined;
  const episode = episodes.find((item) => item.id === event.id);
  const isRetry = episode
    ? state.battleRecords.some((record) => record.battleId === episode.battleId && record.attempts > 0)
    : event.category === "main" && state.battleRecords.some((record) => record.battleId === event.id && record.attempts > 0);
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
  return !state.battleRecords.some((record) => record.battleId === eventId && record.attempts > 0);
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
  const routes = getTravelHomeRoutes(state.travel.currentPlaceId, state.travel.hotelPlaceId, state.currentCityId);
  const current = snapshot(state);
  const allowLateReturn = !canReturnByDayEnd(current, routes);
  return routes.map((route) => ({ route, plan: planOvernight(current, route, travelSettings.lodgingCost, allowLateReturn) }));
}

function hasActiveTravelScene(state: GameState): boolean {
  return !!(state.travel.activeEvent || state.activeDate || state.activeBattle || state.activeTourism || state.activeEncounter || state.activeEpilogue);
}

const reasonJa: Record<string, string> = {
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
  const returns = getTravelHomeRoutes(event.placeId, state.travel.hotelPlaceId, state.currentCityId)
    .sort(compareRouteCost);
  let reason = reasonJa.route;
  for (const returnRoute of returns) {
    const plan = planTravelEvent(snapshot(state), event, outbound, returnRoute, place);
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
  const moved = { ...state, travelBudget: availability.plan.remainingBudget,
    travel: { ...state.travel, currentPlaceId: event.placeId, minute: availability.plan.arrivalMinute, returnReserve: availability.plan.returnReserve, returnDeadline: DAY_END } };
  const episode = episodes.find((item) => item.id === eventId);
  if (replayBattleId && (!episode || episode.battleId !== replayBattleId || !state.battleRecords.some((record) => record.battleId === replayBattleId && record.attempts > 0))) return state;
  const isDate = dates.some((date) => date.id === eventId);
  const special = !episode && !isDate ? battles.find((battle) => battle.id === eventId && battle.landmarkId) : undefined;
  // First visits include the same optional guide/observation as normal tourism.
  // Later visits may still open observation for an eligible local encounter.
  const sceneState = special && moved.activeBattle?.phase === "result"
    ? { ...moved, activeBattle: null, battleRewardReceipt: null }
    : moved;
  const observeFirst = !!special?.landmarkId &&
    (!state.battleRecords.some((record) => record.battleId === special.id && record.attempts > 0) ||
      hasPendingPlaceEncounter(sceneState, special.landmarkId));
  const started = replayBattleId ? startBattle(moved, replayBattleId)
    : episode ? startEpisode(moved, eventId)
    : isDate ? startDate(moved, eventId, nextRoll)
      : observeFirst ? openTourism(sceneState, special!.landmarkId!) : startBattle(moved, eventId);
  if (started === (observeFirst ? sceneState : moved)) return state;
  return { ...started, travel: { ...started.travel,
    activeEvent: { eventId, placeId: event.placeId, endMinute: availability.plan.endMinute } } };
}

/**
 * Free time's 「…を観察する」 (FreeTimeHub): the visited landmarks of the open main events at the
 * player's place that can be visited now, in landmark order.
 */
export function getLocalObservationLandmarkIds(state: GameState): string[] {
  const local = new Set(getCityContent(state.currentCityId).travel.events
    .filter((event) => event.placeId === state.travel.currentPlaceId && event.category === "main" && isTravelEventVisible(state, event))
    .flatMap((event) => {
      const landmarkId = episodes.find((episode) => episode.id === event.id)?.landmarkId ?? battles.find((battle) => battle.id === event.id)?.landmarkId;
      return landmarkId ? [landmarkId] : [];
    }));
  return landmarks.filter((landmark) => local.has(landmark.id) && state.visitedLandmarkIds.includes(landmark.id) &&
    getTourismAvailability(state, landmark.id).available).map((landmark) => landmark.id);
}

/** Observe a landmark at the player's place again: its episode or special battle, started on foot from here. */
export function observeLocalLandmark(state: GameState, landmarkId: string, expectedRevision: number, nextRoll?: () => number): GameState {
  const episode = episodes.find((item) => item.landmarkId === landmarkId);
  const storyBattle = journeyConfig.storyBattles.find((entry) => battles.find((battle) => battle.id === entry.battleId)?.landmarkId === landmarkId);
  const eventId = episode?.id ?? storyBattle?.battleId;
  return eventId ? beginTravelEvent(state, eventId, "walk", expectedRevision, nextRoll) : state;
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
    : (next.activeBattle?.battleId === active.eventId && next.activeBattle.phase === "result") ||
      (!next.activeBattle && !next.activeTourism && !next.activeEncounter);
  if (!finished) return next;
  return { ...next, travel: { ...next.travel, minute: active.endMinute, activeEvent: null } };
}

export function waitForTravel(state: GameState, minutes: number, expectedRevision: number): GameState {
  if (state.revision !== expectedRevision || hasActiveTravelScene(state) ||
      !Number.isSafeInteger(minutes) || minutes <= 0 || state.travel.minute + minutes > DAY_END) return state;
  const home = getTravelHomeRoutes(state.travel.currentPlaceId, state.travel.hotelPlaceId, state.currentCityId)
    .filter((item) => item.cost <= state.travelBudget && state.travel.minute + minutes + item.minutes <= DAY_END)
    .sort(compareRouteCost)[0];
  if (!home) return state;
  return { ...state, revision: state.revision + 1, travel: { ...state.travel, minute: state.travel.minute + minutes, returnReserve: home.cost, returnDeadline: DAY_END } };
}

/** `viaPlaceId`: undefined selects a feasible route for legacy callers; null
 * selects the direct route; a place ID selects that exact connection. */
export function sleepAtHotel(state: GameState, mode: TravelMode, expectedRevision: number, viaPlaceId?: string | null): GameState {
  if (state.revision !== expectedRevision || hasActiveTravelScene(state)) return state;
  const plan = getTravelSleepOptions(state)
    .filter(({ route }) => route.mode === mode && (viaPlaceId === undefined || (route.viaPlaceId ?? null) === viaPlaceId))
    .map((option) => option.plan).find((item) => item.ok);
  if (!plan || !plan.ok) return state;
  if (state.travel.calendar && !Number.isSafeInteger(state.travel.calendar.journeyDay + 1)) return state;
  return { ...state, revision: state.revision + 1, travelBudget: plan.remainingBudget,
    travel: { ...state.travel, currentPlaceId: state.travel.hotelPlaceId, day: plan.nextDay, minute: plan.nextMinute, returnReserve: 0, returnDeadline: DAY_END,
      ...(state.travel.calendar ? { calendar: { ...state.travel.calendar, journeyDay: state.travel.calendar.journeyDay + 1 } } : {}) } };
}
