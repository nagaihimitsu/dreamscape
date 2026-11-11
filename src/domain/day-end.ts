import { getPlayerDeparture } from "./city-travel";
import { canReadCityEpilogue } from "./epilogue";
import type { GameState } from "./game";
import { hasActiveScene } from "./game-state-schema";
import { canClaimPendingRewards } from "./rewards";
import { getTourOffers } from "./tour";
import { DAY_END } from "./travel";
import { getTravelSleepOptions } from "./travel-game";
import { compareRouteCost, type HomeRoute } from "./travel-routes";

/**
 * The day's end (21:00; docs/02 「一日の終わり」). Free time at DAY_END or later offers nothing but these and the rest: travel,
 * waiting and renting end at 21:00 (planTravel, waitForTravel, getRentalOffers). In the night screen's order.
 */
export type NightAction = "read_epilogue" | "depart" | "book_tour" | "cancel_tour" | "claim_ap";

/**
 * The rest at the day's end: in free time at DAY_END (21:00) or later, with no scene, moment or trip open, the way home that
 * 「休む」 would take: the cheapest of the ways it offers now (then the quickest; the list's order on a tie). The game rests by it
 * through the same action as 「休む」 (sleepAtHotel). Null before 21:00, while something is open, or when 「休む」 offers no way it
 * can take (no way home, its fare, an arrival past the next morning): free time then shows as before. Once the rest is made it
 * is the next morning (or the hotel's scenes), so a night never rests twice.
 */
export function dayEndRest(state: GameState): HomeRoute | null {
  if (state.travel.minute < DAY_END || hasActiveScene(state)) return null;
  const ways = getTravelSleepOptions(state).flatMap((option) => (option.plan.ok ? [option.route] : []));
  return ways.sort(compareRouteCost)[0] ?? null;
}

/** The day's end now: its rest's way home and the night actions open now (none: the game rests by itself). */
export type DayEnd = { way: HomeRoute; actions: NightAction[] };

/**
 * What the day's end offers now, or null when it is not the day's end (dayEndRest: before 21:00, something open, no rest that
 * can be taken). With night actions the night screen shows them and 「ホテルで休む」; without any the game rests by itself.
 * Derived from the game alone (no saved mark), so a save loaded at night comes back to the same choice.
 */
export function getDayEnd(state: GameState): DayEnd | null {
  const way = dayEndRest(state);
  if (!way) return null;
  const open: Record<NightAction, boolean> = {
    read_epilogue: canReadCityEpilogue(state),
    depart: !!getPlayerDeparture(state),
    book_tour: getTourOffers(state).some((choice) => choice.available),
    cancel_tour: state.tour?.status === "booked",
    claim_ap: canClaimPendingRewards(state),
  };
  const order: NightAction[] = ["read_epilogue", "depart", "book_tour", "cancel_tour", "claim_ap"];
  return { way, actions: order.filter((action) => open[action]) };
}
