// The rest the game takes by itself at the day's end (21:00; docs/02 「休む」): dayEndRest picks the way home 「休む」 would take,
// GameApp rests by it through sleepAtHotel (the same action as 「休む」), and the same night never rests twice.
import { describe, expect, it } from "vitest";
import { getCityContent } from "../content";
import { createGame, type GameState } from "./game";
import { DAY_END, DAY_START } from "./travel";
import { dayEndRest, getTravelSleepOptions, sleepAtHotel } from "./travel-game";

/** A new Milan game (free time at the hotel, 9:00 of day 1) with the party moved to a place and a time in memory. */
function at(placeId: string, minute: number): GameState {
  const game = createGame(undefined, undefined, { journeyId: "milano" });
  return { ...game, travel: { ...game.travel, currentPlaceId: placeId, minute } };
}

describe("the rest at the day's end", () => {
  const { hotelPlaceId: hotel, lodgingCost } = getCityContent("milano").travelSettings;

  it("is not taken before 21:00", () => {
    expect(dayEndRest(at(hotel, DAY_START))).toBeNull();
    expect(dayEndRest(at(hotel, DAY_END - 1))).toBeNull();
  });

  it("at 21:00 rests as 「休む」 does (the next day's 9:00 at the hotel, the lodging paid), and never twice for the same night", () => {
    const late = at(hotel, DAY_END);
    const way = dayEndRest(late);
    expect(way).not.toBeNull();
    const morning = sleepAtHotel(late, way!.mode, late.revision, way!.viaPlaceId ?? null);
    expect(morning.travel).toMatchObject({ currentPlaceId: hotel, day: 2, minute: DAY_START, returnReserve: 0 });
    expect(morning.travelBudget).toBe(Math.max(0, late.travelBudget - lodgingCost));
    expect(morning.revision).toBe(late.revision + 1);
    // The next morning is not the day's end, and the night's rest asked again (StrictMode, a re-render) finds the revision moved on.
    expect(dayEndRest(morning)).toBeNull();
    expect(sleepAtHotel(morning, way!.mode, late.revision, way!.viaPlaceId ?? null)).toBe(morning);
  });

  it("away from the hotel after 21:00 takes the cheapest way home 「休む」 offers (then the quickest), not a quicker paid one", () => {
    const late = at("p_supper", DAY_END + 30);
    const offered = getTravelSleepOptions(late).flatMap((option) => (option.plan.ok ? [option.route] : []));
    const way = dayEndRest(late);
    expect(way).not.toBeNull();
    const cheapest = Math.min(...offered.map((route) => route.cost));
    expect(way!.cost).toBe(cheapest);
    expect(way!.minutes).toBe(Math.min(...offered.filter((route) => route.cost === cheapest).map((route) => route.minutes)));
    expect(offered.some((route) => route.cost > cheapest && route.minutes < way!.minutes), "a quicker paid way home is offered too").toBe(true);
    const morning = sleepAtHotel(late, way!.mode, late.revision, way!.viaPlaceId ?? null);
    expect(morning.travel).toMatchObject({ currentPlaceId: hotel, day: 2, minute: DAY_START });
  });

  it("is not taken while a trip's scene is open", () => {
    const late = at(hotel, DAY_END);
    expect(dayEndRest({ ...late, travel: { ...late.travel, activeEvent: { eventId: "milano_cafe_01", placeId: hotel, endMinute: DAY_END } } })).toBeNull();
  });

  it("is not taken when 「休む」 offers no way it can take: free time shows as before", () => {
    // 9:00 of the next morning (the latest saved minute): no way home arrives before the morning.
    const latest = at(hotel, 24 * 60 + DAY_START);
    expect(getTravelSleepOptions(latest).some((option) => option.plan.ok)).toBe(false);
    expect(dayEndRest(latest)).toBeNull();
  });
});
