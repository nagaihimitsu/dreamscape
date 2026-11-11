// The day's end (21:00; docs/02 「一日の終わり」): dayEndRest picks the way home 「休む」 would take, getDayEnd the night actions
// open (with none the game rests by itself; with some the night screen shows them and 「ホテルで休む」), and listPlayerActions
// offers the same. The rest is sleepAtHotel (the same action as 「休む」), and the same night never rests twice.
import { afterEach, describe, expect, it } from "vitest";
import { getCityContent } from "../content";
import { completedCity, newJourney } from "../dev/scenario-builders";
import { installTourTestCity, testTour } from "../dev/test-tours";
import { leaveForNextCity } from "./city-travel";
import { dayEndRest, getDayEnd, nightLineJa, todayRoute } from "./day-end";
import { createGame, type GameState } from "./game";
import { listPlayerActions } from "./player-action";
import { bookTour } from "./tour";
import { DAY_END, DAY_START, moveToPlace, TODAY_PLACES_MAX } from "./travel";
import { beginTravelEvent, getTravelSleepOptions, sleepAtHotel } from "./travel-game";

/** A new Milan game (free time at the hotel, 9:00 of day 1) with the party moved to a place and a time in memory. */
function at(placeId: string, minute: number): GameState {
  const game = createGame(undefined, undefined, { journeyId: "milano" });
  return { ...game, travel: { ...game.travel, currentPlaceId: placeId, minute } };
}
const kinds = (state: GameState) => listPlayerActions(state).map((action) => action.kind);

describe("the rest at the day's end", () => {
  const { hotelPlaceId: hotel, lodgingCost } = getCityContent("milano").travelSettings;

  it("is not taken before 21:00", () => {
    expect(dayEndRest(at(hotel, DAY_START))).toBeNull();
    expect(dayEndRest(at(hotel, DAY_END - 1))).toBeNull();
    expect(getDayEnd(at(hotel, DAY_END - 1))).toBeNull();
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
    // The player's actions there are that one rest only (no other way home, no travel, waiting or renting).
    expect(listPlayerActions(late)).toEqual([{ kind: "rest", mode: way!.mode, viaPlaceId: way!.viaPlaceId ?? null }]);
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
    expect(getDayEnd(latest)).toBeNull();
  });
});

describe("the night actions at the day's end", () => {
  let cleanup = () => {};
  afterEach(() => { cleanup(); cleanup = () => {}; });
  const { hotelPlaceId: hotel } = getCityContent("milano").travelSettings;

  it("are none on an ordinary night: the game rests by itself, and the player's only action is that rest", () => {
    const late = at(hotel, DAY_END);
    expect(getDayEnd(late)?.actions).toEqual([]);
    expect(kinds(late)).toEqual(["rest"]);
  });

  it("offer the stored AP, then the rest", () => {
    const late = { ...at(hotel, DAY_END), pendingApRewards: [{ rewardId: "test_reward", earnedAp: 2, remainingAp: 2 }] };
    expect(getDayEnd(late)?.actions).toEqual(["claim_ap"]);
    expect(kinds(late)).toEqual(["claim_ap", "rest"]);
  });

  it("offer a tour's booking, and once it is booked its cancel (no departure while it is booked)", () => {
    cleanup = installTourTestCity();
    const start = newJourney(testTour.journeyId);
    const night = { ...start, travel: { ...start.travel, currentPlaceId: testTour.hotelPlaceId, minute: DAY_END } };
    const open = getDayEnd(night);
    expect(open?.actions).toContain("book_tour");
    expect(kinds(night).filter((kind) => kind === "book_tour").length).toBeGreaterThan(0);
    expect(kinds(night).at(-1)).toBe("rest");
    const booked = bookTour(night, testTour.tourId, testTour.desk.id, night.revision);
    expect(booked.tour?.status).toBe("booked");
    const after = getDayEnd(booked);
    expect(after?.actions).toContain("cancel_tour");
    expect(after?.actions).not.toContain("book_tour");
    expect(after?.actions).not.toContain("depart");
    expect(kinds(booked).filter((kind) => kind === "rest")).toHaveLength(1);
  });
});

// Today's route (save v21; 2026-11-11 user decision): the night's map shows the places the party went today in order,
// joined by a dotted line, and the heroine's line of the night from the city's optional nightLinesJa.
describe("today's route and the night's line", () => {
  const { hotelPlaceId: hotel } = getCityContent("milano").travelSettings;
  const today = (state: GameState, todayPlaceIds: string[]): GameState => ({ ...state, travel: { ...state.travel, todayPlaceIds } });

  it("records a move to another place, once, and keeps the latest places within its size", () => {
    const start = { currentPlaceId: hotel, todayPlaceIds: [] };
    expect(moveToPlace(start, "p_duomo")).toEqual({ currentPlaceId: "p_duomo", todayPlaceIds: ["p_duomo"] });
    // Staying where the party is (an event at its place) is no move.
    expect(moveToPlace(start, hotel)).toEqual({ currentPlaceId: hotel, todayPlaceIds: [] });
    expect(moveToPlace({ currentPlaceId: "p_duomo", todayPlaceIds: ["p_duomo"] }, "p_galleria").todayPlaceIds).toEqual(["p_duomo", "p_galleria"]);
    // Back to a place met earlier is a stop again; never the same place twice in a row (the party placed elsewhere by Debug).
    expect(moveToPlace({ currentPlaceId: "p_galleria", todayPlaceIds: ["p_duomo", "p_galleria"] }, "p_duomo").todayPlaceIds)
      .toEqual(["p_duomo", "p_galleria", "p_duomo"]);
    expect(moveToPlace({ currentPlaceId: "p_scala", todayPlaceIds: ["p_duomo"] }, "p_duomo").todayPlaceIds).toEqual(["p_duomo"]);
    const full = Array.from({ length: TODAY_PLACES_MAX }, (_, index) => (index % 2 ? "p_duomo" : "p_galleria"));
    const next = moveToPlace({ currentPlaceId: "p_duomo", todayPlaceIds: full }, "p_scala").todayPlaceIds;
    expect(next).toHaveLength(TODAY_PLACES_MAX);
    expect(next.at(-1)).toBe("p_scala");
    expect(next[0]).toBe(full[1]);
  });

  it("is written by the map's departures and emptied by the night", () => {
    const game = createGame(undefined, undefined, { journeyId: "milano" });
    const there = beginTravelEvent(game, "milano_duomo_episode", "walk", game.revision);
    expect(there.travel.todayPlaceIds).toEqual([there.travel.currentPlaceId]);
    const late = today(at("p_supper", DAY_END), ["p_duomo", "p_supper"]);
    const way = dayEndRest(late)!;
    const morning = sleepAtHotel(late, way.mode, late.revision, way.viaPlaceId ?? null);
    expect(morning.travel).toMatchObject({ day: 2, currentPlaceId: hotel, todayPlaceIds: [] });
  });

  it("starts empty in the next city", () => {
    const cleared = completedCity("delhi");
    const place = getCityContent("delhi").travel.places.find((item) => item.id !== cleared.travel.hotelPlaceId)!;
    const arrived = leaveForNextCity(today(cleared, [place.id]));
    expect(arrived.currentCityId).toBe("agra");
    expect(arrived.travel.todayPlaceIds).toEqual([]);
  });

  it("starts at the hotel, then the places in order, a place twice in a row once; none when the party stayed in", () => {
    const game = createGame(undefined, undefined, { journeyId: "milano" });
    expect(todayRoute(game)).toEqual([]);
    expect(todayRoute(today(game, ["p_duomo", "p_galleria"]))).toEqual([hotel, "p_duomo", "p_galleria"]);
    expect(todayRoute(today(game, ["p_duomo", hotel]))).toEqual([hotel, "p_duomo", hotel]);
    expect(todayRoute(today(game, [hotel]))).toEqual([]);
  });

  it("shows the city's night lines by the day, in turn, and none without them", () => {
    const lines = ["一つ目", "二つ目", "三つ目"];
    expect([1, 2, 3, 4, 7].map((day) => nightLineJa(lines, day))).toEqual(["一つ目", "二つ目", "三つ目", "一つ目", "一つ目"]);
    expect(nightLineJa(undefined, 1)).toBeNull();
    expect(nightLineJa([], 3)).toBeNull();
  });
});
