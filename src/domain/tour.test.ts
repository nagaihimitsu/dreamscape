import { afterEach, describe, expect, it } from "vitest";
import { cityContents, getTour, scenes, tours } from "../content";
import { journeys } from "../content/journeys";
import { cityStart, completedCity, finishEpisode, newJourney, playBattleToResult } from "../dev/scenario-builders";
import { installTourTestCity, testTour } from "../dev/test-tours";
import { startBattle } from "./battle";
import { leaveBattleResult } from "./chapter";
import { canDepart, getPlayerDeparture } from "./city-travel";
import { validateGameState, type GameState } from "./game";
import { planThen } from "./occasion";
import { applyPlayerAction, listPlayerActions, playerActionChange, type PlayerAction } from "./player-action";
import { tourKeepBack, usableMoney } from "./reservations";
import { resultExitLabel } from "./screen";
import { bookTour, cancelTourBooking, continueTour, getTourOffers, tourFingerprint, tourLegsBetween, tourSchedule } from "./tour";
import { getTravelEventAvailability } from "./travel-game";
import { getRentalOffers } from "./transport";

// Tours (tour design stage 2a) on the sample city with its library made tour-only (src/dev/test-tours.ts): booking and
// cancelling, the next morning's start (at once, or after the hotel's scenes after waking), the legs, the visit without
// admission, the end, and the departure that waits for it. Every action goes through applyPlayerAction, as GameApp commits it.

let cleanup = () => {};
afterEach(() => { cleanup(); cleanup = () => {}; });
const install = (options: Parameters<typeof installTourTestCity>[0] = {}) => { cleanup = installTourTestCity(options); };

const roll = () => 0;
/** One action as the game commits it (applyPlayerAction: the change and the post-steps); it must change the state. */
function act(state: GameState, action: PlayerAction): GameState {
  const next = applyPlayerAction(state, playerActionChange(action, roll), roll);
  expect(next, JSON.stringify(action)).not.toBe(state);
  return validateGameState(next);
}
const offered = (state: GameState, kind: PlayerAction["kind"]) => listPlayerActions(state).filter((action) => action.kind === kind);
const book = (state: GameState, offerId: string = testTour.desk.id) => act(state, { kind: "book_tour", tourId: testTour.tourId, offerId });
const rest = (state: GameState) => act(state, offered(state, "rest")[0]);
/** Play the open scenes until `done` holds: guides closed, observations left, battles won, encounters with their first choice. */
function playUntil(initial: GameState, done: (state: GameState) => boolean): GameState {
  let state = initial;
  for (let step = 0; !done(state); step++) {
    expect(step, "the scene did not reach its end").toBeLessThan(300);
    if (state.activeBattle && state.activeBattle.phase !== "result") { state = playBattleToResult(state); continue; }
    const actions = listPlayerActions(state);
    const first = (...kinds: PlayerAction["kind"][]) => kinds.map((kind) => actions.find((action) => action.kind === kind)).find(Boolean);
    const action = first("guide_choose", "guide_close", "observation_next", "encounter_answer", "encounter_choose", "encounter_finish",
      "encounter_next", "battle_leave", "epilogue_choose", "epilogue_next");
    expect(action, `no action to go on with: ${actions.map((item) => item.kind).join(", ")}`).toBeDefined();
    state = act(state, action!);
  }
  return state;
}
/** The start of the sample city: the arrival read, free time at the hotel at 09:00 on day 1. */
const start = () => validateGameState(newJourney(testTour.journeyId));
/** Visit the clock tower first (its episode played), so the hotel's morning scene (not visited the clock tower) does not run. */
const afterClockTower = () => finishEpisode(start(), "smp_mihon_main_clock_tower");
/**
 * The sample city's finale played without the tour (the clock tower, special B, the finale from the map), up to the scene after its
 * result: `to_epilogue` reads the epilogue (its then:), `stay` stays in the city. `booking` books first, at the hotel desk.
 */
function clearWithoutTour(option: "to_epilogue" | "stay", booking = false): GameState {
  let state = finishEpisode(start(), "smp_mihon_main_clock_tower");
  if (booking) state = book(state);
  state = playUntil(playBattleToResult(validateGameState(startBattle(state, "smp_mihon_special_b_market"))), (current) => !current.activeBattle && !current.occasion);
  state = act(state, offered(state, "travel").find((action) => action.kind === "travel" && action.eventId === "smp_mihon_finale")!);
  state = playUntil(state, (current) => current.activeEncounter?.encounterId === "smp_mihon_after_finale");
  const choice = state.activeEncounter!.frame.choices.find((item) => item.optionId === option)!;
  return playUntil(act(state, { kind: "encounter_choose", index: choice.index }),
    (current) => !current.occasion && !current.activeEpilogue && !current.activeEncounter);
}

describe("tour offers and booking (tour stage 2a)", () => {
  it("offers the desk at the hotel and the website anywhere, each at its price for the whole party", () => {
    install();
    const state = start();
    expect(getTourOffers(state).map(({ tour, offer, available, reason }) => ({ tour: tour.id, offer: offer.id, price: offer.price, available, reason })))
      .toEqual([{ tour: testTour.tourId, offer: "hotel_desk", price: 10, available: true, reason: "" },
        { tour: testTour.tourId, offer: "web", price: 12, available: true, reason: "" }]);
    expect(offered(state, "book_tour")).toEqual([{ kind: "book_tour", tourId: testTour.tourId, offerId: "hotel_desk" },
      { kind: "book_tour", tourId: testTour.tourId, offerId: "web" }]);
    // Away from the hotel only the website sells it.
    const away = act(state, { kind: "travel", eventId: "smp_mihon_special_b_market", mode: "walk" });
    const atMarket = playUntil(away, (current) => !current.activeTourism && !current.activeBattle && !current.activeEncounter && !current.occasion);
    expect(atMarket.travel.currentPlaceId).toBe("mihon_market");
    expect(getTourOffers(atMarket).map((choice) => choice.offer.id)).toEqual(["web"]);
  });

  it("lists nothing during a scene, with a tour booked, after it is finished, or while its event is locked or done", () => {
    install();
    const state = start();
    expect(getTourOffers(validateGameState(startBattle(state, "smp_mihon_special_b_market")))).toEqual([]);
    expect(getTourOffers(book(state))).toEqual([]);
    expect(getTourOffers({ ...state, completedTourIds: [testTour.tourId] })).toEqual([]);
    // The event step's battle played outside a tour (a builder or Debug state): the tour is not offered.
    const played = playBattleToResult(validateGameState(startBattle(state, testTour.eventId)));
    expect(getTourOffers(leaveBattleResult(played, played.revision))).toEqual([]);
    // A condition of the tour or of an offer.
    const tour = getTour(testTour.tourId)!;
    tour.when = { cityCompleted: testTour.cityId };
    expect(getTourOffers(state)).toEqual([]);
    delete tour.when;
    tour.offers[1].when = { cityCompleted: testTour.cityId };
    expect(getTourOffers(state).map((choice) => choice.offer.id)).toEqual(["hotel_desk"]);
  });

  it("greys an offer the budget or the money kept back does not cover, and one whose place is closed tomorrow", () => {
    install();
    const state = start();
    const reasons = (current: GameState) => getTourOffers(current).map((choice) => choice.reason);
    expect(reasons({ ...state, travelBudget: 11 })).toEqual(["", "旅行予算が足りません。"]);
    expect(reasons({ ...state, travelBudget: 13, travel: { ...state.travel, returnReserve: 3 } }))
      .toEqual(["", "帰りの交通費を確保しているため、今は予約できません。"]);
    const content = cityContents[testTour.cityId];
    const travel = content.travel;
    content.travel = { ...travel, places: travel.places.map((place) => (place.id === testTour.placeId ? { ...place, closedWeekdays: [1] } : place)) };
    try {
      const calendar = { journeyDay: 1, cityStartJourneyDay: 1, startWeekday: 0 };
      const name = travel.places.find((place) => place.id === testTour.placeId)!.nameJa;
      // Day 1 is weekday 0, so tomorrow is weekday 1.
      expect(reasons({ ...state, travel: { ...state.travel, calendar } })).toEqual(Array(2).fill(`明日は${name}が休みのため、このツアーは催行されません。`));
      expect(reasons({ ...state, travel: { ...state.travel, calendar: { ...calendar, startWeekday: 1 } } })).toEqual(["", ""]);
    } finally { content.travel = travel; }
  });

  it("pays once on booking and refunds exactly that once on cancelling; a stale revision does neither", () => {
    install();
    const state = start();
    const booked = book(state);
    expect(booked.tour).toEqual({ status: "booked", tourId: testTour.tourId, offerId: "hotel_desk", pricePaid: 10, bookedDay: 1 });
    expect(booked.travelBudget).toBe(state.travelBudget - 10);
    expect(bookTour(booked, testTour.tourId, "web", booked.revision)).toBe(booked);
    expect(bookTour(state, testTour.tourId, "hotel_desk", state.revision - 1)).toBe(state);
    expect(offered(booked, "cancel_tour")).toEqual([{ kind: "cancel_tour" }]);
    const cancelled = act(booked, { kind: "cancel_tour" });
    expect(cancelled.tour).toBeNull();
    expect(cancelled.travelBudget).toBe(state.travelBudget);
    expect(cancelTourBooking(cancelled, cancelled.revision)).toBe(cancelled);
    expect(cancelTourBooking(booked, booked.revision - 1)).toBe(booked);
    // A web booking pays the web price.
    expect(book(state, "web")).toMatchObject({ travelBudget: state.travelBudget - 12, tour: { offerId: "web", pricePaid: 12 } });
  });

  it("keeps back the event steps' main-part payments from the booking on (the morning's visit can always pay them)", () => {
    install();
    // The library battle pays 30 when first finished (a head # on_done: money -30, patched in).
    const index = scenes.findIndex((scene) => scene.id === "smp_mihon_main_clock_tower");
    const patched = { ...structuredClone(scenes[index]), id: "smp_mihon_special_c_library_head", main: { battle: testTour.eventId }, done: { money: -30 } };
    (scenes as typeof scenes[number][]).push(patched);
    try {
      const state = start();
      expect(getTourOffers({ ...state, travelBudget: 39 }).map((choice) => choice.reason)[0]).toBe("帰りの交通費を確保しているため、今は予約できません。");
      const booked = book({ ...state, travelBudget: 40 });
      expect(tourKeepBack(booked)).toEqual({ money: 30, ap: 0 });
      expect(usableMoney(booked)).toBe(0);
      // Free time's other payments do not spend it either: the bicycle (6) is rented only with 6 beyond it.
      expect(getRentalOffers({ ...booked, travelBudget: 35 })[0].reason).toBe("旅行予算が足りません。");
      expect(getRentalOffers({ ...booked, travelBudget: 36 })[0].available).toBe(true);
      expect(getTravelEventAvailability({ ...booked, travelBudget: 30 }, "smp_mihon_special_b_market", "walk").available).toBe(true);
      expect(tourKeepBack(start())).toEqual({ money: 0, ap: 0 });
    } finally { (scenes as typeof scenes[number][]).splice((scenes as typeof scenes[number][]).indexOf(patched), 1); }
  });
});

describe("the tour day (tour stage 2a)", () => {
  it("starts in the night's action, moves by its legs without fare or ride, and opens the visit without admission", () => {
    install();
    const booked = book(afterClockTower());
    const morning = rest(booked);
    expect(morning.travel).toMatchObject({ day: booked.travel.day + 1, currentPlaceId: testTour.placeId, minute: 600, returnReserve: 0,
      rideCounts: booked.travel.rideCounts, activeEvent: { eventId: testTour.eventId, placeId: testTour.placeId, endMinute: 640 } });
    expect(morning.travelBudget).toBe(booked.travelBudget);
    expect(morning.tour).toEqual({ status: "running", tourId: testTour.tourId, offerId: "hotel_desk", pricePaid: 10, bookedDay: booked.travel.day,
      contentHash: tourFingerprint(getTour(testTour.tourId)!), step: 1 });
    expect(morning.occasion).toMatchObject({ kind: "visit", eventId: testTour.eventId, landmarkId: testTour.placeId });
    expect(morning.visitedLandmarkIds).toContain(testTour.placeId);
    expect(tourLegsBetween(booked, morning).map((leg) => leg.id)).toEqual(["out"]);
    expect(morning.activeTourism?.phase).toBe("guide");
  });

  it("goes back to the hotel after the visit: 「ツアーを続ける」, the back leg, the end at the schedule's last minute", () => {
    install();
    const morning = rest(book(afterClockTower()));
    const result = playUntil(morning, (state) => state.activeBattle?.phase === "result");
    expect(resultExitLabel(result)).toBe("ツアーを続ける");
    const back = act(result, offered(result, "battle_leave")[0]);
    expect(back.tour).toBeNull();
    expect(back.completedTourIds).toEqual([testTour.tourId]);
    expect(back.travel).toMatchObject({ currentPlaceId: testTour.hotelPlaceId, minute: tourSchedule(getTour(testTour.tourId)!).at(-1)!.end, returnReserve: 0, activeEvent: null });
    expect(back.occasion).toBeNull();
    expect(tourLegsBetween(result, back).map((leg) => leg.id)).toEqual(["back"]);
    // The tour is not offered again.
    expect(getTourOffers(back)).toEqual([]);
  });

  it("waits for the hotel's scenes after waking, then starts as they end; a load never starts it", () => {
    install();
    const booked = book(start());
    const morning = rest(booked);
    // 見本の街's morning scene (not visited the clock tower yet) runs first: the tour is still booked, the day is the next one.
    expect(morning.activeEncounter?.encounterId).toBe("smp_mihon_hotel_morning");
    expect(morning.tour).toMatchObject({ status: "booked", bookedDay: booked.travel.day });
    expect(morning.travel.day).toBe(booked.travel.day + 1);
    expect(continueTour(morning, roll)).toBe(morning);
    expect(applyPlayerAction(morning, (state) => state, roll)).toBe(morning);
    const started = playUntil(morning, (state) => state.tour?.status === "running");
    expect(started.travel).toMatchObject({ currentPlaceId: testTour.placeId, minute: 600 });
    expect(started.occasion?.eventId).toBe(testTour.eventId);
  });

  it("does not run a then: of the hotel's scenes on the booked morning (A20) and refuses both then: forms during the tour", () => {
    install({ required: false });
    // The city cleared without the tour, its epilogue still to come: the last morning's scene (+2, then: epilogue) waits for the night.
    const state = clearWithoutTour("stay");
    expect(state.completedCityIds).toContain(testTour.cityId);
    // At the clock tower after the finale: the website sells it (the desk is at the hotel).
    const morning = rest(book(state, "web"));
    expect(morning.activeEncounter?.encounterId).toBe("smp_mihon_last_morning");
    expect(planThen(morning, { epilogue: true }, "smp_mihon_last_morning")).toEqual({ ok: "still" });
    const toured = playUntil(morning, (current) => current.tour?.status === "running");
    expect(toured.activeEpilogue).toBeNull();
    expect(planThen(toured, { epilogue: true }, "x")).toEqual({ ok: false, reason: "ツアーの途中ではエピローグに進めません。" });
    expect(planThen(toured, { move: testTour.hotelPlaceId }, "x")).toEqual({ ok: false, reason: "ツアーの途中では移動できません。" });
  });

  it("throws when the event step cannot open (a broken tour never leaves a half-started state)", () => {
    install();
    const booked = book(afterClockTower());
    const tour = getTour(testTour.tourId)!;
    const step = tour.steps[1] as { eventId: string };
    step.eventId = "smp_mihon_nowhere";
    try {
      expect(() => applyPlayerAction(booked, playerActionChange(offered(booked, "rest")[0], roll), roll)).toThrow("ツアーの観光地イベントを始められません: smp_mihon_nowhere");
    } finally { step.eventId = testTour.eventId; }
  });

  it("is a fixed point on states without a tour to advance", () => {
    install();
    for (const state of [start(), afterClockTower(), book(start()), cityStart("delhi"), completedCity("milano")])
      expect(continueTour(state, roll)).toBe(state);
  });

  it("leaves the tour-only place out of the map", () => {
    install();
    const state = start();
    expect(listPlayerActions(state).some((action) => action.kind === "travel" && action.eventId === testTour.eventId)).toBe(false);
  });
});

describe("the departure waits for a booked or running tour (tour stage 2a)", () => {
  /** The sample city cleared without the tour, booked at the start, and its epilogue read (the after-finale scene's then: epilogue). */
  const clearedWithBooking = () => clearWithoutTour("to_epilogue", true);

  it("a journey that moves on after the epilogue waits in free time and departs in the action that ends the tour", () => {
    install({ required: false, nextCity: true, cityTransition: "after_epilogue" });
    const waiting = clearedWithBooking();
    expect(waiting.viewedEpilogueCityIds).toContain(testTour.cityId);
    expect(waiting.currentCityId).toBe(testTour.cityId);
    expect(canDepart(waiting)).toBe(false);
    const morning = rest(waiting);
    expect(morning.tour?.status).toBe("running");
    const result = playUntil(morning, (state) => state.activeBattle?.phase === "result");
    const left = act(result, offered(result, "battle_leave")[0]);
    expect(left.currentCityId).toBe("test_city");
    expect(left.completedTourIds).toEqual([testTour.tourId]);
    expect(left.tour).toBeNull();
  });

  it("a journey left by 「…へ出発」 offers it only once the booking is cancelled (or the tour is over)", () => {
    install({ required: false, nextCity: true, cityTransition: "manual" });
    const waiting = clearedWithBooking();
    expect(getPlayerDeparture(waiting)).toBeUndefined();
    expect(offered(waiting, "depart")).toEqual([]);
    const cancelled = act(waiting, { kind: "cancel_tour" });
    expect(getPlayerDeparture(cancelled)?.city.id).toBe("test_city");
    expect(offered(cancelled, "depart")).toEqual([{ kind: "depart" }]);
  });

  it("keeps the departure's journey setting restored after the fixture", () => {
    expect(journeys.find((journey) => journey.id === testTour.journeyId)?.cityTransition).toBeUndefined();
    expect(tours.some((tour) => tour.id === testTour.tourId)).toBe(false);
  });
});
