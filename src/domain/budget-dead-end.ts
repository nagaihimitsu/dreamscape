import { encounters, getCityContent, scenes } from "../content";
import type { TravelEvent } from "../content/travel-schemas";
import { getPlayerDeparture } from "./city-travel";
import { canReadCityEpilogue } from "./epilogue";
import { hasActiveScene, type GameState } from "./game-state-schema";
import { mainPartPayments } from "./reservations";
import { getTourOffers } from "./tour";
import { DAY_START, NIGHT_START } from "./travel";
import { getTravelSleepOptions, isTravelEventVisible } from "./travel-game";
import { findTravelHomeRoutes } from "./travel-routes";

/**
 * Whether the trip has run out of money in this city (B1, user decision 2026-11-13): free time then says so and points to
 * ロード. Running short is part of play (AGENTS.md 「お金を使いすぎて旅を続けられなくなるのは、壊れているのではなく遊びの結果とする」), so this only names the
 * state, when waiting and resting cannot change it:
 * - something is still open in the city (a map event shown now, tonight or tomorrow morning, or a tour on offer), and the
 *   money pays for none of it at its cheapest: from here, or from the inn after resting by the cheapest way home (the night's
 *   lodging paid): the cheapest fare there, its admission, the cheapest way back and its main parts' payments (rental routes
 *   counted as if rented); a tour at its price, the lodging and its steps' payments;
 * - nothing else is left to do: no scene open, no tour booked or running, no departure to the next city, no epilogue to read;
 * - no scene or encounter of the city that can still run would pay the party money.
 * Time, opening hours and AP are left out: they change by waiting or resting (or by a reward), money does not. Pure.
 */
export function isBudgetDeadEnd(state: GameState): boolean {
  if (hasActiveScene(state) || state.tour !== null || getPlayerDeparture(state) || canReadCityEpilogue(state) || moneyMayCome(state)) return false;
  const { travel } = getCityContent(state.currentCityId);
  const later = laterStates(state);
  const spots = [{ state, money: state.travelBudget }, ...afterRest(state, later.at(-1)!)];
  const cost = (event: TravelEvent, from: string) => leastCost(state, event, from);
  const open = travel.events.filter((event) => later.some((time) => isTravelEventVisible(time, event)))
    .filter((event) => spots.some((spot) => Number.isFinite(cost(event, spot.state.travel.currentPlaceId))));
  const offers = spots.flatMap((spot) => getTourOffers(spot.state));
  return open.length + offers.length > 0 && offers.every((offer) => offer.shortOfMoney) &&
    open.every((event) => spots.every((spot) => cost(event, spot.state.travel.currentPlaceId) > spot.money));
}

/** Now, tonight (18:00, while it is still day) and tomorrow morning (9:00, a day on): the times a wait or a rest reaches. */
function laterStates(state: GameState): GameState[] {
  const { travel } = state;
  const tonight = travel.minute < NIGHT_START ? [{ ...state, travel: { ...travel, minute: NIGHT_START } }] : [];
  const calendar = travel.calendar && { ...travel.calendar, journeyDay: travel.calendar.journeyDay + 1 };
  return [state, ...tonight, { ...state, travel: { ...travel, day: travel.day + 1, minute: DAY_START, ...(calendar ? { calendar } : {}) } }];
}

/** The party at the inn tomorrow morning with the money left after resting by the cheapest way home (none: no way home now). */
function afterRest(state: GameState, tomorrow: GameState): { state: GameState; money: number }[] {
  const left = getTravelSleepOptions(state).flatMap((option) => (option.plan.ok ? [option.plan.remainingBudget] : []));
  if (!left.length) return [];
  const money = Math.max(...left);
  return [{ state: { ...tomorrow, travelBudget: money, travel: { ...tomorrow.travel, currentPlaceId: state.travel.hotelPlaceId } }, money }];
}

/** The least money the event costs from `from`: the cheapest fare there and back to the inn, its admission and its main parts' payments. */
function leastCost(state: GameState, event: TravelEvent, from: string): number {
  const { routes } = getCityContent(state.currentCityId).travel;
  const there = routes.filter((route) => route.fromPlaceId === from && route.toPlaceId === event.placeId).map((route) => route.cost);
  const back = findTravelHomeRoutes(routes, event.placeId, state.travel.hotelPlaceId).map((route) => route.cost);
  if (!there.length || !back.length) return Infinity;
  return Math.min(...there) + (event.admissionCost ?? 0) + Math.min(...back) + mainPartPayments(state, event.id).money;
}

/** Whether a scene (`# money: +N`, `# on_done: money +N`) or an encounter (its completion money) of the city may still pay the party. */
function moneyMayCome(state: GameState): boolean {
  const city = state.currentCityId;
  return scenes.some((scene) => scene.cityId === city && (scene.repeat === "always" || !state.seenEncounterIds.includes(scene.id)) &&
      ((scene.done.money ?? 0) > 0 || scene.options.some((option) => (option.money ?? 0) > 0))) ||
    encounters.encounters.some((item) => item.cityId === city && (item.completionMoney ?? 0) > 0 &&
      (!!item.repeatable || !state.completedEncounterIds.includes(item.id)));
}
