import { getCityContent, getCityTours, getTour, type Tour, type TourLeg, type TourOffer, type TourStep } from "../content";
import { fnvHash } from "../content/fingerprint";
import { getJourneyForCity } from "../content/journeys";
import { meets } from "./conditions";
import { hasActiveScene, type GameState } from "./game-state-schema";
import { openEventOccasion, openTourLeg } from "./occasion";
import { mainPartPayments, usableAp, usableMoney, type Payment } from "./reservations";
import { DAY_START, getGameWeekday, moveToPlace } from "./travel";
import { isCompletedTravelEvent, isTravelEventUnlocked, isTravelEventVisible } from "./travel-game";
import { minimumHomeFare } from "./travel-routes";
import { getUsableRoutes } from "./transport";

/**
 * Tours (tour design stage 2a): a fixed itinerary of the city, booked in free time (paid once) and
 * joined the next morning. The night's action starts it at 09:00 at the hotel (after the hotel's
 * scenes after waking, unified design 2.3): each leg moves the party and passes its time (no fare,
 * no ride counted), each event step opens its map event's visit without fare or admission, and the
 * action that ends the visit runs the next legs; after the last step the tour is finished. A cancel
 * refunds the price once; no departure happens while a tour is booked or running. A leg with scenes
 * (tour stages 2b, 3: `# at: tour <tour> <leg>`, its narration, the in-car encounter) runs through its
 * own moment (occasion.ts openTourLeg), which moves the party after its narration and encounter; the
 * action that ends that moment goes on to the next step. Pure: the random source is passed in.
 */

/** A step of a tour with its times from 09:00 at the hotel, and the place the party is at when it ends. */
export type TourScheduleStep = { step: TourStep; index: number; start: number; end: number; placeId: string };

/** The tour's steps with their times (the card's itinerary, the start, the load checks). */
export function tourSchedule(tour: Tour): TourScheduleStep[] {
  const { travel, travelSettings } = getCityContent(tour.cityId);
  let placeId = travelSettings.hotelPlaceId;
  let minute = DAY_START;
  return tour.steps.map((step, index) => {
    const start = minute;
    if (step.kind === "leg") {
      placeId = step.toPlaceId;
      minute += step.minutes;
    } else minute += travel.events.find((event) => event.id === step.eventId)?.activityMinutes ?? 0;
    return { step, index, start, end: minute, placeId };
  });
}

/** Where a leg of the tour starts: the place the step before it left the party at (the hotel for the first step); undefined for another step. */
export function tourLegStart(tour: Tour, legId: string): string | undefined {
  const schedule = tourSchedule(tour);
  const index = schedule.findIndex((item) => item.step.kind === "leg" && item.step.id === legId);
  if (index < 0) return undefined;
  return index === 0 ? getCityContent(tour.cityId).travelSettings.hotelPlaceId : schedule[index - 1].placeId;
}

/**
 * The saved fingerprint of a running tour: its steps' structure and each event's place and time. Labels, sources, offers and
 * prices are left out (changing them keeps a running tour); a changed step refuses the save (「ツアーの内容が更新されています。」).
 */
export function tourFingerprint(tour: Tour): string {
  const { travel } = getCityContent(tour.cityId);
  return fnvHash(JSON.stringify(tour.steps.map((step) => {
    if (step.kind === "leg") return [step.id, step.kind, step.toPlaceId, step.minutes];
    const event = travel.events.find((item) => item.id === step.eventId);
    return [step.id, step.kind, step.eventId, event?.placeId ?? null, event?.activityMinutes ?? null];
  })));
}

const eventSteps = (tour: Tour) => tour.steps.filter((step): step is Extract<TourStep, { kind: "event" }> => step.kind === "event");
const isLeg = (step: TourStep): step is TourLeg => step.kind === "leg";

/** What the tour's event steps from `from` on pay when their main parts are first finished (their `# on_done:`; kept back while booked). */
export function tourPayments(state: Readonly<GameState>, tour: Tour, from = 0): Payment {
  return eventSteps({ ...tour, steps: tour.steps.slice(from) }).reduce((sum, step) => {
    const payment = mainPartPayments(state, step.eventId);
    return { money: sum.money + payment.money, ap: sum.ap + payment.ap };
  }, { money: 0, ap: 0 });
}

/** A tour offered at the party's place now, with whether it can be booked and why not. */
export type TourOfferChoice = { tour: Tour; offer: TourOffer; available: boolean; reason: string };

/** Whether the tour is offered at all: not finished, its condition met, every event step's event open, shown and not done. */
function tourListed(state: GameState, tour: Tour): boolean {
  const { travel } = getCityContent(state.currentCityId);
  return !state.completedTourIds.includes(tour.id) && meets(state, tour.when) && eventSteps(tour).every((step) => {
    const event = travel.events.find((item) => item.id === step.eventId);
    return !!event && isTravelEventUnlocked(state, event.id) && isTravelEventVisible(state, event) && !isCompletedTravelEvent(state, event.id);
  });
}

/**
 * The tours of the city the party can book here now (free time, no tour booked or running): each offer whose condition holds, a
 * desk's at its places (a website's anywhere), greyed with its reason when tomorrow a step's place is closed, the budget is short,
 * the money kept back (the fare home, the steps' payments) does not leave the price, or the steps' AP is not there.
 */
export function getTourOffers(state: GameState): TourOfferChoice[] {
  if (state.tour !== null || hasActiveScene(state)) return [];
  const { travel, travelSettings } = getCityContent(state.currentCityId);
  const calendar = state.travel.calendar;
  const tomorrow = calendar ? getGameWeekday({ ...calendar, journeyDay: calendar.journeyDay + 1 }) : undefined;
  return getCityTours(state.currentCityId).filter((tour) => tourListed(state, tour)).flatMap((tour) => {
    const payments = tourPayments(state, tour);
    // The night before the tour pays the lodging out of what is left: it may not eat the steps' payments.
    const lodging = payments.money > 0 ? travelSettings.lodgingCost : 0;
    const closed = tomorrow === undefined ? undefined : eventSteps(tour).map((step) => travel.places.find((place) =>
      place.id === travel.events.find((event) => event.id === step.eventId)?.placeId)).find((place) => place?.closedWeekdays?.includes(tomorrow));
    return tour.offers.filter((offer) => meets(state, offer.when) && (!offer.placeIds || offer.placeIds.includes(state.travel.currentPlaceId)))
      .map((offer) => {
        const reason = closed ? `明日は${closed.nameJa}が休みのため、このツアーは催行されません。`
          : state.travelBudget < offer.price ? "旅行予算が足りません。"
          : usableMoney(state) - offer.price - lodging < payments.money ? "帰りの交通費を確保しているため、今は予約できません。"
          : usableAp(state) < payments.ap ? "APが足りません。" : "";
        return { tour, offer, available: !reason, reason };
      });
  });
}

/** Book a tour through one of its offers here: its price is paid once now; the tour starts the next morning. No game time passes. */
export function bookTour(state: GameState, tourId: string, offerId: string, expectedRevision: number): GameState {
  if (state.revision !== expectedRevision) return state;
  const choice = getTourOffers(state).find((item) => item.tour.id === tourId && item.offer.id === offerId);
  if (!choice?.available) return state;
  return { ...state, revision: state.revision + 1, travelBudget: state.travelBudget - choice.offer.price,
    tour: { status: "booked", tourId, offerId, pricePaid: choice.offer.price, bookedDay: state.travel.day } };
}

/** Cancel the booked tour (free time): its price comes back once, and the booking is gone. */
export function cancelTourBooking(state: GameState, expectedRevision: number): GameState {
  const record = state.tour;
  if (state.revision !== expectedRevision || record?.status !== "booked" || hasActiveScene(state)) return state;
  return { ...state, revision: state.revision + 1, travelBudget: state.travelBudget + record.pricePaid, tour: null };
}

/** The scene label's tag while a tour runs: 「ツアー・見学」 at its visit (guide, battle, scenes), 「ツアー」 at a leg's scenes (tour stage 3). */
export const tourSceneBadge = (state: Pick<GameState, "tour" | "occasion">): string | undefined =>
  (state.tour?.status !== "running" ? undefined : state.occasion?.kind === "tour" ? "ツアー" : "ツアー・見学");

/**
 * The leg the party is riding (tour stages 2b, 3): its narration has begun and its move has not happened yet (the narration and the
 * in-car encounter); its label names the screen there.
 */
export function tourLegUnderway(state: Pick<GameState, "occasion">): TourLeg | undefined {
  const occasion = state.occasion;
  if (occasion?.kind !== "tour" || !occasion.tour || !occasion.ran.includes("leg") || occasion.ran.includes("leg_move")) return undefined;
  const tour = occasion.tour;
  const step = getTour(tour.id)?.steps.find((item) => item.id === tour.step);
  return step?.kind === "leg" ? step : undefined;
}

/** The tour the party is on now, if any (running: always inside a step's moment, an event step's visit or a leg's own). */
export const runningTour = (state: Pick<GameState, "tour">): Tour | undefined =>
  state.tour?.status === "running" ? getTour(state.tour.tourId) : undefined;

/**
 * The tour's post-step (unified design 4.1; applyPlayerAction runs it after an action that changed something): a booked tour starts
 * on the morning after its night once no scene is open (the party at the hotel at 09:00), and a running tour goes on once its step's
 * moment has closed (an event step's visit, a leg's own moment). It runs the legs (a leg with scenes through its moment, which stops
 * at its first scene), opens the next event step's visit (whose scenes before the main part may draw tickets), or finishes the tour.
 * Returns `state` itself when nothing applies (so a loaded save is never changed).
 */
export function continueTour(state: GameState, nextRoll: () => number): GameState {
  const record = state.tour;
  if (!record || hasActiveScene(state)) return state;
  if (record.status === "booked" && state.travel.day !== record.bookedDay + 1) return state;
  const tour = getTour(record.tourId);
  if (!tour) throw new Error(`ツアーが見つかりません: ${record.tourId}`);
  if (record.status === "booked") {
    if (state.travel.currentPlaceId !== state.travel.hotelPlaceId || state.travel.minute !== DAY_START)
      throw new Error("予約したツアーの朝に、宿の9:00にいません。");
    const { status: _booked, ...booking } = record;
    return enterStep({ ...state, tour: { ...booking, status: "running", contentHash: tourFingerprint(tour), step: 0 } }, tour, 0, nextRoll);
  }
  return enterStep(state, tour, record.step + 1, nextRoll);
}

/** Run the tour from step `from`: its legs, then the next event step's visit, or the end; a leg with scenes stops at its first one. */
function enterStep(state: GameState, tour: Tour, from: number, nextRoll: () => number): GameState {
  const schedule = tourSchedule(tour);
  let current = state;
  for (const item of schedule.slice(from)) {
    const record = current.tour!;
    if (record.status !== "running") throw new Error("ツアーの記録が一致しません。");
    if (item.step.kind === "leg") {
      const at: GameState = { ...current, tour: { ...record, step: item.index } };
      // A leg with scenes (tour stages 2b, 3) moves the party inside its moment; a moment whose scenes all passed goes on at once.
      const opened = openTourLeg(at, tour.id, item.step.id, nextRoll);
      if (opened && hasActiveScene(opened)) return opened;
      current = opened ?? { ...at, travel: { ...at.travel, ...moveToPlace(at.travel, item.placeId), minute: item.end } };
      continue;
    }
    const step = item.step;
    const event = getCityContent(tour.cityId).travel.events.find((entry) => entry.id === step.eventId);
    if (!event) throw new Error(`ツアーの観光地イベントを始められません: ${step.eventId}`);
    // The visit of a map event without its fare or admission (the tour's price includes them): no trip and no ticket counter.
    const prepared: GameState = { ...current, tour: { ...record, step: item.index },
      travel: { ...current.travel, minute: item.start, activeEvent: { eventId: event.id, placeId: event.placeId, endMinute: item.end } } };
    const opened = openEventOccasion(prepared, event.id, nextRoll);
    if (opened === prepared) throw new Error(`ツアーの観光地イベントを始められません: ${event.id}`);
    return opened;
  }
  // The end: the tour is finished; the fare home is kept from where the last leg left the party (0 at the hotel).
  const fare = minimumHomeFare(getUsableRoutes(current), current.travel.currentPlaceId, current.travel.hotelPlaceId, current.travel.minute) ?? 0;
  return { ...current, tour: null, completedTourIds: [...current.completedTourIds, tour.id], travel: { ...current.travel, returnReserve: fare } };
}

type TourProgress = Pick<GameState, "tour" | "completedTourIds" | "occasion">;
/** How many of the tour's steps the party has gone through (a running leg once its moment has moved the party; all once finished). */
function stepsGone(state: TourProgress, tour: Tour): number {
  const record = state.tour;
  if (!record || record.tourId !== tour.id) return state.completedTourIds.includes(tour.id) ? tour.steps.length : 0;
  if (record.status === "booked") return 0;
  const occasion = state.occasion;
  const moved = occasion?.kind === "tour" && occasion.tour?.step === tour.steps[record.step]?.id && occasion.ran.includes("leg_move");
  return record.step + (moved ? 1 : 0);
}

/** The legs a change passed through (the transition art after it): the steps gone through since the previous state. */
export function tourLegsBetween(previous: TourProgress, next: TourProgress): TourLeg[] {
  const tour = previous.tour && getTour(previous.tour.tourId);
  if (!tour) return [];
  return tour.steps.slice(stepsGone(previous, tour), stepsGone(next, tour)).filter(isLeg);
}

/**
 * The next city free time would leave for once the booked tour is finished or cancelled (none without a tour or a next city):
 * `automatic` when the journey moves on by itself after the epilogue (it departs in the same action), else by 「…へ出発」.
 */
export function departureAfterTour(state: GameState, nextCityNameJa: string | undefined): { cityNameJa: string; automatic: boolean } | undefined {
  if (state.tour === null || !nextCityNameJa) return undefined;
  return { cityNameJa: nextCityNameJa, automatic: getJourneyForCity(state.currentCityId)?.cityTransition === "after_epilogue" };
}

/**
 * The tour records of a loaded save (tour design App. D, as corrected for stage 2a): finished tours of this
 * journey's cities up to the current one; a tour booked or running of the current city, not finished. Booked: on its day, or on the
 * next morning while the hotel's scenes after waking run (the night has run). Running: the next day, its fingerprint, no fare home
 * kept, and either at an event step with its visit open at its place and time window and no epilogue, or at a leg with its own moment
 * open (tour stages 2b, 3), where the leg starts before its move and where it ends after it. A state the post-step would still advance
 * (a booked morning with no scene open, a running tour with its step's moment closed) is refused: the post-step never changes a
 * loaded save.
 */
export function validateTourState(state: GameState): void {
  const fail = (): never => { throw new Error("ツアーの記録が一致しません。元のデータは保管されています。"); };
  const journey = getJourneyForCity(state.currentCityId);
  const order = (cityId: string) => journey?.cities.findIndex((city) => city.id === cityId) ?? -1;
  const here = order(state.currentCityId);
  for (const id of state.completedTourIds) {
    const tour = getTour(id);
    if (!tour || order(tour.cityId) < 0 || order(tour.cityId) > here) fail();
  }
  const record = state.tour;
  if (!record) return;
  const tour = getTour(record.tourId);
  if (!tour || tour.cityId !== state.currentCityId || state.completedTourIds.includes(tour.id)) return fail();
  if (record.status === "booked") {
    const morning = state.travel.day === record.bookedDay + 1 && state.occasion?.kind === "hotel" && state.occasion.ran.includes("sleep");
    if (state.travel.day !== record.bookedDay && !morning) fail();
    return;
  }
  if (record.contentHash !== tourFingerprint(tour)) throw new Error("ツアーの内容が更新されています。元のデータは保管されています。");
  const schedule = tourSchedule(tour);
  const item = schedule[record.step];
  const travel = state.travel;
  if (item?.step.kind === "leg") {
    // A leg's own moment (its scenes, narration, in-car encounter): from where it starts until its move, then where it ends.
    const occasion = state.occasion;
    const moved = !!occasion?.ran.includes("leg_move");
    const from = record.step > 0 ? schedule[record.step - 1].placeId : travel.hotelPlaceId;
    if (travel.day !== record.bookedDay + 1 || occasion?.kind !== "tour" || occasion.tour?.step !== item.step.id ||
        travel.currentPlaceId !== (moved ? item.placeId : from) || travel.minute !== (moved ? item.end : item.start) ||
        travel.activeEvent || travel.returnReserve !== 0 || (state.activeEpilogue && state.activeEpilogue.kind !== "tour_leg")) fail();
    return;
  }
  if (travel.day !== record.bookedDay + 1 || !item || item.step.kind !== "event" || travel.currentPlaceId !== item.placeId ||
      state.occasion?.eventId !== item.step.eventId || state.occasion.trip || state.occasion.ticket ||
      travel.activeEvent?.eventId !== item.step.eventId || travel.activeEvent.placeId !== item.placeId || travel.activeEvent.endMinute !== item.end ||
      travel.minute < item.start || travel.minute > item.end || travel.returnReserve !== 0 || state.activeEpilogue) fail();
}
