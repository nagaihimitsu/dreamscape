import { battles, dates, episodes, getCityContent, landmarks } from "../content";
import { landmarkParts } from "../content/tourism-schemas";
import { secureRomanceRoll } from "../random/romance-source";
import { startVisitBattle } from "./battle";
import { battlePlayed } from "./conditions";
import { beginMomentScene, momentSceneEligible, nextObservationScene, sceneSchedule, visitedLandmarkOfEvent } from "./encounter";
import { beginArrival, beginCityEpilogue, canBeginArrival, canStartAuthoredEpilogue, epilogueOpening, startCityEpilogue } from "./epilogue";
import { canDepart, departToNextCity, leaveForNextCity, registerMomentOpeners } from "./city-travel";
import { startDate } from "./game";
import { eventCity, eventPlace, momentHasScenes, momentSchedule, tripMoment, type Moment, type MomentSchedule } from "./moments";
import { DAY_START } from "./travel";
import type { GameState } from "./game-state-schema";
import type { Occasion, OccasionPart, OccasionThen, OccasionTrip } from "./occasion-state";
import { mainPartPayments, mainScene, runningMainPayment } from "./reservations";
import { beginLandmarkGuide, beginLandmarkObservation } from "./tourism";
import { cheapestOnTimeFare, compareRouteCost, findTravelHomeRoutes } from "./travel-routes";
import { getUsableRoutes } from "./transport";
import { getTravelHomeRoutes, isCompletedTravelEvent, isTravelEventVisible } from "./travel-game";
import type { AfterPart, SceneEntry, SceneMain, SceneThen } from "../content/scene-schemas";
import { WALK_MODE_ID } from "../content/transport";
import { registerOccasionHooks } from "./occasion-hooks";

/**
 * The moments of the unified event design (stage 3b, 4.1–4.3): every visit, city finale and date
 * the map opens runs through one record (state.occasion) and one step function. Opening decides
 * the main group and its order once (the landmark's `order`; the guide only on a first visit; the
 * visit is recorded right away); advancing starts the next thing in the order — the inserted
 * scenes before the main group (negative priorities), each main part with its `after <part>`
 * scenes, the observation as the place `after observe` scenes return to, the positive
 * priorities — and closes the occasion (the time window settles) when nothing is left. A scene's
 * `# then:` ends the occasion right after the scene: the move (or the epilogue) opens next.
 *
 * Stage 4 adds the other moments of 2.3, each opened only when a scene runs there (otherwise the
 * game goes on as before): the date's and the finale's scenes around their main part (`after date`,
 * `after battle`; `place <place>` matches them too), a trip's scenes at the place it leaves (the
 * "move" part applies the move afterwards) and the ticket counter's before the entry, the hotel's
 * before and after the night (the "sleep" part; the party is at the hotel at its arrival time first,
 * decision 44), the city's epilogue, its departure (then the next city's arrival) and an arrival
 * (its logo, `after logo`, its conversation).
 * Pure: the random source is passed in.
 */

/** Whether one of the scene fields is open (the occasion itself waits for them). */
const sceneRunning = (state: Readonly<GameState>) =>
  !!(state.activeDate || state.activeBattle || state.activeTourism || state.activeEncounter || state.activeEpilogue);

const withOccasion = (state: GameState, occasion: Occasion | null): GameState => ({ ...state, occasion });

/** The landmark whose visit a map event opens, the date it is or a battle (a finale or a battle without a landmark). */
function occasionOf(state: Readonly<GameState>, eventId: string): Occasion | undefined {
  const base = { eventId, ran: [], at: null, started: [] };
  const date = dates.find((item) => item.id === eventId);
  if (date) return { ...base, kind: "date", landmarkId: null, parts: date.kind === "confession" ? ["date", "ending"] : ["date"] };
  const landmarkId = visitedLandmarkOfEvent(eventId);
  if (landmarkId) return visitOccasion(state, landmarkId, eventId);
  const battleId = episodes.find((item) => item.id === eventId)?.battleId ?? battles.find((item) => item.id === eventId)?.id;
  return battleId ? { ...base, kind: "battle", landmarkId: null, parts: ["battle"] } : undefined;
}

/**
 * A landmark's visit: its main group in its order (the guide on a first visit only; the battle when
 * a map event opened it; a special battle's revisit observes only when an `after observe` scene waits).
 */
function visitOccasion(state: Readonly<GameState>, landmarkId: string, eventId: string | null): Occasion | undefined {
  const landmark = landmarks.find((item) => item.id === landmarkId);
  if (!landmark) return undefined;
  const first = !state.visitedLandmarkIds.includes(landmarkId);
  const special = eventId !== null && !episodes.some((item) => item.id === eventId);
  const parts = eventId === null ? [] : landmarkParts(landmark).filter((part) => part !== "guide" || first);
  return { kind: "visit", eventId, landmarkId, parts, ran: [], at: null, started: [],
    ...(special && battlePlayed(state, landmark.battleId) ? { observeIfWaiting: true as const } : {}) };
}

/** Record the visit (any order, 3.9 (b)): after the group was decided, so the guide's first-visit rule read the record before it. */
const recordVisit = (state: GameState, landmarkId: string | null): GameState => !landmarkId || state.visitedLandmarkIds.includes(landmarkId)
  ? state : { ...state, visitedLandmarkIds: [...state.visitedLandmarkIds, landmarkId] };

/**
 * The trip and ticket steps before a map event's moment (stage 4): the trip's scenes run at the place it
 * leaves when any runs at that trip (the move waits for them), the ticket counter's when the event charges
 * admission and any runs there. Otherwise none: the caller has moved already, as before.
 */
export type OccasionPrefix = { trip?: OccasionTrip; ticket?: string };
export function eventPrefix(state: Readonly<GameState>, eventId: string, trip: OccasionTrip | undefined): OccasionPrefix {
  const event = getCityContent(state.currentCityId).travel.events.find((item) => item.id === eventId);
  const tripRuns = !!trip && trip.from !== trip.to && momentHasScenes(tripMoment(state.currentCityId, trip.modeId, trip.from, trip.to));
  const ticketRuns = !!event && (event.admissionCost ?? 0) > 0 && momentHasScenes({ kind: "ticket", cityId: state.currentCityId, placeId: event.placeId });
  return { ...(tripRuns ? { trip } : {}), ...(ticketRuns && event ? { ticket: event.placeId } : {}) };
}
/** An occasion with its prefix: the "move" and "ticket" parts before its own. */
const withPrefix = (occasion: Occasion, prefix: OccasionPrefix): Occasion => ({ ...occasion,
  ...(prefix.trip ? { trip: prefix.trip } : {}), ...(prefix.ticket ? { ticket: prefix.ticket } : {}),
  parts: [...(prefix.trip ? ["move" as const] : []), ...(prefix.ticket ? ["ticket" as const] : []), ...occasion.parts] });

/**
 * Open the occasion of a map event (4.2) after its departure was paid (beginTravelEvent), and run it
 * to its first stop. Returns the state unchanged when nothing could start (the caller then refuses
 * the departure as before). `prefix` (stage 4): a trip still to make (the state has not moved yet) and
 * the ticket counter.
 */
export function openEventOccasion(state: GameState, eventId: string, nextRoll: () => number = secureRomanceRoll, prefix: OccasionPrefix = {}): GameState {
  if (sceneRunning(state) || state.occasion) return state;
  const own = occasionOf(state, eventId);
  if (!own) return state;
  const occasion = withPrefix(own, prefix);
  // The visit is recorded as it opens (3.9 (b)), or on arriving when the trip's move waits.
  const opened = advanceOccasion(prefix.trip ? withOccasion(state, occasion) : recordVisit(withOccasion(state, occasion), occasion.landmarkId), nextRoll);
  // Nothing of the occasion started (its main part refused): no departure.
  return opened.occasion?.ran.some((part) => part !== "move" && part !== "ticket") || opened.occasion?.started.length || sceneRunning(opened) ? opened : state;
}

/** The sequence of an occasion (4.3): negative scenes, each main part with its `after <part>` scenes (not observe's), positive scenes. */
export type OccasionStep = { scene: string; after?: OccasionPart } | { part: OccasionPart };
type Step = OccasionStep;
/** The occasion's steps in order (also read by Debug's candidate table, src/dev/occasion-candidates.ts). */
export const occasionSteps = (occasion: Occasion): OccasionStep[] => sequence(occasion);
function sequence(occasion: Occasion): Step[] {
  const schedule = ownSchedule(occasion);
  const prefix: Step[] = [];
  const city = occasionCity(occasion);
  if (occasion.parts.includes("move") && occasion.trip && city)
    // (A rest at the hotel itself makes no trip: its move part only reads the time.)
    prefix.push(...(occasion.trip.from === occasion.trip.to ? [] : momentSchedule(tripMoment(city, occasion.trip.modeId, occasion.trip.from, occasion.trip.to)).before.map((scene) => ({ scene }))),
      { part: "move" });
  if (occasion.parts.includes("ticket") && occasion.ticket && city)
    prefix.push(...momentSchedule({ kind: "ticket", cityId: city, placeId: occasion.ticket }).before.map((scene) => ({ scene })), { part: "ticket" });
  return [
    ...prefix,
    ...schedule.before.map((scene) => ({ scene })),
    ...occasion.parts.filter((part) => part !== "move" && part !== "ticket").flatMap((part): Step[] => [{ part },
      ...(part === "observe" ? [] : (schedule.afterPart[part as AfterPart] ?? []).map((scene) => ({ scene, after: part })))]),
    ...schedule.after.map((scene) => ({ scene })),
  ];
}

/** The city of an occasion (its moments' scenes are of that city). */
function occasionCity(occasion: Occasion): string | undefined {
  return occasion.cityId ?? landmarks.find((item) => item.id === occasion.landmarkId)?.cityId ?? eventCity(occasion.eventId) ??
    battles.find((item) => item.id === occasion.eventId)?.cityId ?? undefined;
}

/** The moment of an occasion other than a visit (stage 4), for its scenes. */
export function occasionMoment(occasion: Occasion): Moment | undefined {
  const city = occasionCity(occasion);
  if (!city) return undefined;
  switch (occasion.kind) {
    case "visit": return undefined;
    case "date": return occasion.eventId ? { kind: "date", dateId: occasion.eventId, placeId: eventPlace(city, occasion.eventId) } : undefined;
    case "battle": return { kind: "finale", cityId: city, placeId: eventPlace(city, occasion.eventId) };
    case "hotel": return { kind: "hotel", cityId: city, placeId: getCityContent(city).travelSettings.hotelPlaceId };
    case "epilogue": case "depart": case "arrive": return { kind: occasion.kind, cityId: city };
  }
}

/** The scenes of the occasion's own moment: a visit's (encounter.ts places today's catalogs too), or a stage-4 moment's. */
function ownSchedule(occasion: Occasion): MomentSchedule {
  if (occasion.kind === "visit") {
    if (!occasion.landmarkId) return { before: [], after: [], afterPart: {} };
    const visit = sceneSchedule(occasion.landmarkId);
    return { before: visit.before, after: visit.after, afterPart: visit.afterPart };
  }
  // A finale or a battle without a landmark: a special battle's (no city finale) has no moment of its own.
  if (occasion.kind === "battle" && !episodes.some((item) => item.id === occasion.eventId && item.kind === "city_finale")) return { before: [], after: [], afterPart: {} };
  const moment = occasionMoment(occasion);
  return moment ? momentSchedule(moment) : { before: [], after: [], afterPart: {} };
}
const keyOf = (step: Step) => ("scene" in step ? step.scene : `main:${step.part}`);
function nextIndex(steps: readonly Step[], at: string | null, ran: readonly OccasionPart[]): number {
  if (at === null) return 0;
  const key = at === "left:observe" ? "main:observe" : at;
  // A scene listed at two moments of the occasion (a trip's and the visit's): it ran at its first slot after the furthest main part that ran.
  const furthest = steps.reduce((last, step, index) => ("part" in step && ran.includes(step.part) ? index : last), -1);
  const slot = steps.findIndex((step, index) => keyOf(step) === key && ("part" in step || index > furthest));
  const index = slot < 0 ? steps.findIndex((step) => keyOf(step) === key) : slot;
  return index < 0 ? steps.length : index + 1;
}

/** The main scene (its tags) of a part of the occasion, for its head `# then:`. */
function partScene(occasion: Occasion, part: OccasionPart): SceneEntry | undefined {
  const landmark = landmarks.find((item) => item.id === occasion.landmarkId);
  const main: SceneMain | undefined = part === "guide" && landmark ? { guide: landmark.id }
    : part === "battle" ? { battle: landmark?.battleId ?? episodes.find((item) => item.id === occasion.eventId)?.battleId ?? occasion.eventId ?? "" }
      : part === "date" && occasion.eventId ? { date: occasion.eventId }
        : part === "arrival" && occasion.cityId ? { arrival: occasion.cityId }
          : part === "epilogue" && occasion.cityId ? { epilogue: occasion.cityId } : undefined;
  return main && mainScene(main);
}

/** Start a main part; undefined when it does not start (the next step is tried). */
function startPart(state: GameState, part: OccasionPart, nextRoll: () => number): GameState | undefined {
  const occasion = state.occasion!;
  const landmark = landmarks.find((item) => item.id === occasion.landmarkId);
  let started: GameState | undefined;
  if (part === "guide" && landmark) started = beginLandmarkGuide(state, landmark.id);
  else if (part === "observe" && landmark) {
    if (occasion.observeIfWaiting && !nextObservationScene(state)) return undefined;
    started = beginLandmarkObservation(state, landmark.id);
  } else if (part === "battle") {
    const battleId = landmark?.battleId ?? episodes.find((item) => item.id === occasion.eventId)?.battleId ?? occasion.eventId;
    if (battleId) started = startVisitBattle(state, battleId, true);
  } else if (part === "date" && occasion.eventId) started = startDate(state, occasion.eventId, nextRoll, true);
  else if (part === "ending") {
    // 「交際開始」 (3.9 (c)): only when the confession of this date succeeded.
    return state.confessionStatus === "accepted" ? { ...state, occasion: { ...occasion, romanceEnding: true } } : undefined;
  }
  // Stage 4: the steps that change the state and go on (no stop): the trip's move, the ticket counter's entry
  // (admission was paid on departing), the night, the departure (then the next city's arrival opens).
  else if (part === "move") return applyTrip(state);
  else if (part === "ticket") return state;
  else if (part === "sleep") return sleep(state);
  else if (part === "depart") return openArrival(leaveForNextCity({ ...state, occasion: null }));
  else if (part === "epilogue" && occasion.cityId) started = beginCityEpilogue(state, occasion.cityId);
  else if (part === "logo") started = beginArrival(state, false);
  else if (part === "arrival") started = beginArrival(state, true);
  if (!started || started === state) return undefined;
  const scene = partScene(occasion, part);
  return scene?.then ? commitThen(started, scene.then, scene.id) : started;
}

/**
 * Run the occasion to its next stop (4.1): a scene's line, choice or quiz, the observation, a
 * result screen, the 「交際開始」 screen, or free time. A stopped state is returned unchanged, so
 * this is safe to call after any action (and on a loaded state).
 */
export function advanceOccasion(state: GameState, nextRoll: () => number = secureRomanceRoll): GameState {
  let current = state;
  for (let guard = 0; guard < 200; guard++) {
    const next = stepOccasion(current, nextRoll);
    if (next === current) return current;
    current = next;
  }
  throw new Error("時点が終わりません。");
}

function stepOccasion(state: GameState, nextRoll: () => number): GameState {
  const occasion = state.occasion;
  if (!occasion || sceneRunning(state) || occasion.romanceEnding) return state;
  if (occasion.then) {
    // A then: of the confession date itself goes on after its 「交際開始」 screen (2.3, 3.9 (c)): the screen is the date's result.
    if (occasion.at === "main:date" && occasion.parts.includes("ending") && !occasion.ran.includes("ending") && state.confessionStatus === "accepted")
      return withOccasion(state, { ...occasion, at: "main:ending", ran: [...occasion.ran, "ending"], romanceEnding: true });
    return runThen(state, nextRoll);
  }
  // The observation is where `after observe` scenes return to: the next waiting one, else the observation again.
  if (occasion.at === "main:observe" && occasion.landmarkId) {
    const waiting = nextObservationScene(state);
    if (waiting) return beginMomentScene(withOccasion(state, { ...occasion, started: [...occasion.started, waiting] }), waiting, nextRoll);
    return beginLandmarkObservation(state, occasion.landmarkId);
  }
  const steps = sequence(occasion);
  for (let index = nextIndex(steps, occasion.at, occasion.ran); index < steps.length; index++) {
    const step = steps[index];
    if ("scene" in step) {
      if ((step.after && !occasion.ran.includes(step.after)) || occasion.started.includes(step.scene) || !momentSceneEligible(state, step.scene)) continue;
      return beginMomentScene(withOccasion(state, { ...occasion, at: step.scene, started: [...occasion.started, step.scene] }), step.scene, nextRoll);
    }
    // Each main part runs once (a scene listed at two moments of the occasion resumes the walk after its first slot).
    if (occasion.ran.includes(step.part)) continue;
    const started = startPart(withOccasion(state, { ...occasion, at: `main:${step.part}`, ran: [...occasion.ran, step.part] }), step.part, nextRoll);
    if (started) return started;
  }
  // The finale result's 「エピローグへ」: the epilogue follows its moment's end.
  return occasion.onClose === "epilogue" ? openEpilogue(closeOccasion(state), false, nextRoll) : closeOccasion(state);
}

/** The trip's move (stage 4): the place, the arrival time and a ride (a rest's walk home counts none, as before); the visit is recorded on arriving. */
function applyTrip(state: GameState): GameState {
  const occasion = state.occasion!;
  const trip = occasion.trip;
  if (!trip) return state;
  const moved = trip.to !== trip.from;
  const ride = moved && trip.modeId !== WALK_MODE_ID && occasion.kind !== "hotel";
  const next: GameState = { ...state, travel: { ...state.travel, currentPlaceId: trip.to, minute: trip.arrivalMinute,
    rideCounts: ride ? { ...state.travel.rideCounts, [trip.modeId]: (state.travel.rideCounts[trip.modeId] ?? 0) + 1 } : state.travel.rideCounts },
    occasion: { ...occasion, ...(moved ? { moved: trip.modeId } : {}) } };
  return recordVisit(next, occasion.kind === "visit" ? occasion.landmarkId : null);
}

/** The night (the hotel's main part): the next day's morning (decision 44: night until waking). */
function sleep(state: GameState): GameState {
  const calendar = state.travel.calendar;
  return { ...state, travel: { ...state.travel, day: state.travel.day + 1, minute: DAY_START,
    ...(calendar ? { calendar: { ...calendar, journeyDay: calendar.journeyDay + 1 } } : {}) } };
}

/** Close the occasion: the trip's time window settles here (4.2), at the end of the connected occasion. */
export function closeOccasion(state: GameState): GameState {
  const trip = state.travel.activeEvent;
  return { ...state, occasion: null, travel: trip ? { ...state.travel, minute: trip.endMinute, activeEvent: null } : state.travel };
}

/** Leave the observation for good (its 「進む」 with no `after observe` scene waiting): the next part follows. */
export function leaveObservation(state: GameState, nextRoll: () => number = secureRomanceRoll): GameState {
  const occasion = state.occasion;
  if (!occasion || occasion.at !== "main:observe" || state.activeTourism?.phase !== "exploring" || state.activeBattle) return state;
  return advanceOccasion({ ...state, revision: state.revision + 1, activeTourism: null, occasion: { ...occasion, at: "left:observe" } }, nextRoll);
}

/** The 「交際開始」 screen's 「自由時間へ」 (an action now; the occasion goes on, 3.9 (c)). */
export function closeRomanceEnding(state: GameState, expectedRevision: number, nextRoll: () => number = secureRomanceRoll): GameState {
  const occasion = state.occasion;
  if (state.revision !== expectedRevision || !occasion?.romanceEnding) return state;
  const { romanceEnding: _shown, ...rest } = occasion;
  return advanceOccasion({ ...state, revision: state.revision + 1, occasion: rest }, nextRoll);
}

// ── # then: (2.3, 4.4) ──────────────────────────────────────────────────────────────────────────

/** Why a then: cannot be paid (the choice greys out, the inserted scene does not show, a main head does not move). */
export type ThenPlan = { ok: true; plan: OccasionThen; cost: number } | { ok: "still" } | { ok: false; reason: string };

/** A map event at a place whose main part shows there now (its visit opens with it), if any. */
function mainEventAt(state: Readonly<GameState>, placeId: string) {
  return getCityContent(state.currentCityId).travel.events.find((event) => event.placeId === placeId && visitedLandmarkOfEvent(event.id) &&
    event.contentStatus !== "pending_content" && isTravelEventVisible(state as GameState, event) && !isCompletedTravelEvent(state as GameState, event.id));
}
/** The landmark visited at a place (a then: move's visit), if any. */
function landmarkAt(state: Readonly<GameState>, placeId: string): string | undefined {
  return getCityContent(state.currentCityId).travel.events.filter((event) => event.placeId === placeId)
    .map((event) => visitedLandmarkOfEvent(event.id)).find((id) => !!id);
}

/**
 * The fare home a then: epilogue keeps back: a trip whose move has not run is dropped (4.1), so the party stays where it
 * is; the cheapest way home from there that arrives in time, at the minute the occasion settles ("none": no way home from
 * there; "late": none arrives in time).
 */
function epilogueReturnFare(state: Readonly<GameState>): number | "none" | "late" {
  const occasion = state.occasion;
  if (!occasion?.trip || occasion.ran.includes("move")) return state.travel.returnReserve;
  const homes = findTravelHomeRoutes(getUsableRoutes(state as GameState), state.travel.currentPlaceId, state.travel.hotelPlaceId);
  if (!homes.length) return "none";
  return cheapestOnTimeFare(homes, state.travel.activeEvent?.endMinute ?? state.travel.minute) ?? "late";
}

/**
 * The plan of a then: now: the move's fare and the main part's admission and payments there, checked against what is usable
 * after this occasion. `spend`: the money its scene still pays before the then: runs (the choice's own `# money:`, an inserted
 * scene's `# on_done:`); the main part running now adds its first payment (4.1 step 1).
 */
export function planThen(state: Readonly<GameState>, then: SceneThen, sceneId: string, spend = 0): ThenPlan {
  const paying = spend + runningMainPayment(state);
  if ("epilogue" in then) {
    if (!canStartAuthoredEpilogue(state as GameState, state.currentCityId)) return { ok: "still" };
    const epilogue = mainScene({ epilogue: state.currentCityId });
    const money = Math.max(0, -(epilogue?.done.money ?? 0));
    const ap = Math.max(0, -(epilogue?.done.ap ?? 0));
    const reserve = epilogueReturnFare(state);
    if (reserve === "none") return { ok: false, reason: "ここからホテルへ帰る経路がありません。" };
    if (reserve === "late") return { ok: false, reason: "今日はホテルへの帰路を含めると時間が足りません。" };
    if (state.travelBudget - paying - reserve < money) return { ok: false, reason: "エピローグでの支払いや帰りのための予算が足りません。" };
    if (state.ap < ap) return { ok: false, reason: `APが足りません（AP ${ap}）。` };
    return { ok: true, plan: { epilogue: true, sceneId }, cost: 0 };
  }
  const from = state.travel.currentPlaceId;
  const routes = getUsableRoutes(state as GameState).filter((route) => route.fromPlaceId === from && route.toPlaceId === then.move &&
    (!then.by || route.mode === then.by)).sort((left, right) => (left.mode === WALK_MODE_ID ? -1 : 0) - (right.mode === WALK_MODE_ID ? -1 : 0) || left.cost - right.cost);
  const route = from === then.move ? { mode: then.by ?? WALK_MODE_ID, cost: 0, minutes: 0 } : routes[0];
  if (!route) return { ok: false, reason: "この移動経路はまだ利用できません。" };
  const event = mainEventAt(state, then.move);
  const admission = event?.admissionCost ?? 0;
  const payments = event ? mainPartPayments(state, event.id) : { money: 0, ap: 0 };
  const home = getTravelHomeRoutes(state as GameState, then.move).sort(compareRouteCost)[0];
  const cost = route.cost + admission;
  if (!home || state.travelBudget - paying - cost < home.cost + payments.money) return { ok: false, reason: "移動・入場や帰りのための予算が足りません。" };
  if (state.ap < payments.ap) return { ok: false, reason: "APが足りません。" };
  return { ok: true, plan: { move: then.move, modeId: route.mode, minutes: route.minutes, eventId: event?.id ?? null, sceneId }, cost };
}

/** Decide a then: (chosen, or the head of a scene that starts): its move is paid now; it runs when its scene ends. Nothing without an occasion, or when it cannot move. */
export function commitThen(state: GameState, then: SceneThen, sceneId: string, spend = 0): GameState {
  const occasion = state.occasion;
  if (!occasion || occasion.then) return state;
  const plan = planThen(state, then, sceneId, spend);
  if (plan.ok !== true) return state;
  return { ...state, travelBudget: state.travelBudget - plan.cost, occasion: { ...occasion, then: plan.plan } };
}

/** The then: of a scene that has ended: the occasion closes (its other steps do not run) and the next one opens. */
function runThen(state: GameState, nextRoll: () => number): GameState {
  const then = state.occasion!.then!;
  const closed = closeOccasion(state);
  // The move still to make is dropped (4.1): the fare home is kept back from where the party is.
  if ("epilogue" in then) {
    const reserve = epilogueReturnFare(state);
    return openEpilogue(typeof reserve !== "number" ? closed : { ...closed, travel: { ...closed.travel, returnReserve: reserve } }, true, nextRoll);
  }
  const cityId = closed.currentCityId;
  const arrival = closed.travel.minute + then.minutes;
  const home = getTravelHomeRoutes(closed, then.move).sort(compareRouteCost)[0];
  const event = then.eventId ? getCityContent(cityId).travel.events.find((item) => item.id === then.eventId) : undefined;
  const landmarkId = event ? visitedLandmarkOfEvent(event.id) : landmarkAt(closed, then.move);
  const trip: OccasionTrip = { from: closed.travel.currentPlaceId, to: then.move, modeId: then.modeId, arrivalMinute: arrival };
  // The trip's and the ticket counter's scenes (stage 4) run first when any runs there: the move waits for them.
  const prefix = eventPrefix(closed, event?.id ?? "", trip);
  const paid: GameState = { ...closed, travel: { ...closed.travel, returnReserve: home?.cost ?? closed.travel.returnReserve,
    activeEvent: event ? { eventId: event.id, placeId: event.placeId, endMinute: arrival + event.activityMinutes } : null } };
  const rides = then.modeId !== WALK_MODE_ID && then.move !== closed.travel.currentPlaceId
    ? { ...closed.travel.rideCounts, [then.modeId]: (closed.travel.rideCounts[then.modeId] ?? 0) + 1 } : closed.travel.rideCounts;
  const moved: GameState = prefix.trip ? paid : { ...paid, travel: { ...paid.travel, currentPlaceId: then.move, minute: arrival, rideCounts: rides } };
  // A place with no landmark (a date's or a finale's only): free time there (decision 20), after the trip's scenes when any runs.
  const occasion: Occasion | undefined = landmarkId ? visitOccasion(moved, landmarkId, event?.id ?? null)
    : prefix.trip ? { kind: "visit", cityId, eventId: null, landmarkId: null, parts: [], ran: [], at: null, started: [] } : undefined;
  if (!occasion) return { ...moved, travel: { ...moved.travel, activeEvent: null } };
  if (prefix.trip) return advanceOccasion(withOccasion(moved, withPrefix(occasion, prefix)), nextRoll);
  return advanceOccasion(recordVisit(withOccasion(moved, { ...withPrefix(occasion, prefix), moved: then.modeId }), occasion.landmarkId), nextRoll);
}

/**
 * The moment record of a loaded save (4.5): its shape against the content (its event, landmark,
 * parts and scenes), its trip window, and that it is at a stop (advancing it changes nothing).
 * Conditions are not checked again (decision 21).
 */
export function validateOccasionState(state: GameState): void {
  const occasion = state.occasion;
  if (!occasion) return;
  const fail = (): never => { throw new Error("時点の記録が一致しません。元のデータは保管されています。"); };
  const prefix = occasion.parts.filter((part) => part === "move" || part === "ticket");
  const own = occasion.parts.filter((part) => part !== "move" && part !== "ticket");
  if ((occasion.parts.includes("move") !== !!occasion.trip) || (occasion.parts.includes("ticket") !== !!occasion.ticket) ||
      prefix.some((part, index) => occasion.parts[index] !== part) ||
      (occasion.trip && !getCityContent(state.currentCityId).travel.places.some((place) => place.id === occasion.trip!.to)) ||
      (occasion.trip && !occasion.ran.includes("move") && state.travel.currentPlaceId !== occasion.trip.from)) fail();
  if (occasion.kind === "hotel" || occasion.kind === "epilogue" || occasion.kind === "depart" || occasion.kind === "arrive") {
    // A stage-4 moment of its own: its city (the current one), its fixed main parts, no map event nor landmark.
    const parts = { hotel: ["move", "sleep"], epilogue: ["epilogue"], depart: ["depart"], arrive: ["logo", "arrival"] }[occasion.kind];
    if (occasion.cityId !== state.currentCityId || occasion.eventId !== null || occasion.landmarkId !== null || state.travel.activeEvent ||
        occasion.parts.join() !== parts.join() || occasion.ticket || (occasion.kind === "hotel") !== !!occasion.trip ||
        (occasion.kind === "hotel" && occasion.trip!.to !== state.travel.hotelPlaceId)) fail();
  } else {
    const expected = occasion.eventId === null ? undefined : occasionOf({ ...state, visitedLandmarkIds: [] }, occasion.eventId);
    // A then: move's trip to a place with no landmark (its trip's scenes, then free time there) names its city.
    const placeOnly = occasion.kind === "visit" && occasion.eventId === null && occasion.landmarkId === null;
    if ((placeOnly ? occasion.cityId !== state.currentCityId || !occasion.trip || own.length > 0 : occasion.cityId !== undefined) ||
        occasion.eventId !== (state.travel.activeEvent?.eventId ?? null) || (occasion.eventId !== null && expected?.kind !== occasion.kind) ||
        (occasion.eventId !== null && expected?.landmarkId !== occasion.landmarkId) || (occasion.eventId === null && own.some((part) => part !== "guide" && part !== "observe" && part !== "battle")) ||
        (occasion.landmarkId !== null && !landmarks.some((landmark) => landmark.id === occasion.landmarkId && landmark.cityId === state.currentCityId)) ||
        (occasion.landmarkId !== null && !state.visitedLandmarkIds.includes(occasion.landmarkId) && !(occasion.trip && !occasion.ran.includes("move"))))
      fail();
  }
  if (occasion.ran.some((part) => !occasion.parts.includes(part)) || new Set(occasion.started).size !== occasion.started.length ||
      (occasion.onClose && (occasion.kind !== "battle" || !occasion.ran.includes("battle"))) ||
      (occasion.romanceEnding && !occasion.ran.includes("ending"))) fail();
  const steps = sequence(occasion);
  if (occasion.at !== null && occasion.at !== "left:observe" && occasion.at !== "main:observe" && !steps.some((step) => keyOf(step) === occasion.at) &&
      !occasion.started.includes(occasion.at)) fail();
  if (!occasion.romanceEnding && !sceneRunning(state)) fail();
}

/**
 * The entries that open something besides the map's departure (4.2): every one goes through here,
 * then the occasion advances in the same action. The new journey's arrival, the city's epilogue
 * (free time's or the finale result's 「エピローグへ」), and the departure to the next city. (The
 * map's departure opens its occasion in beginTravelEvent; a then: in runThen.)
 */
export type OccasionEntry = { kind: "arrive" } | { kind: "epilogue" } | { kind: "depart" };
export function openOccasion(state: GameState, entry: OccasionEntry, expectedRevision: number, nextRoll: () => number = secureRomanceRoll): GameState {
  if (state.revision !== expectedRevision) return state;
  if (entry.kind === "arrive") return advanceOccasion(openArrival(state, nextRoll), nextRoll);
  if (entry.kind === "depart") return advanceOccasion(departToNextCity(state, expectedRevision), nextRoll);
  // (The finale result's 「エピローグへ」 leaves the result and closes its occasion first: epilogueOpening.)
  const opened = openEpilogue(state, false, nextRoll);
  return opened === state ? state : advanceOccasion(opened, nextRoll);
}

// ── Stage 4's moments that open by themselves (2.3): the epilogue, the departure, the arrival, the hotel ───────────

/** A moment's occasion with no map event (the hotel's, the epilogue's, the departure's, an arrival's). */
const momentOccasion = (kind: "hotel" | "epilogue" | "depart" | "arrive", cityId: string, parts: OccasionPart[], trip?: OccasionTrip): Occasion =>
  ({ kind, cityId, eventId: null, landmarkId: null, parts, ran: [], at: null, started: [], ...(trip ? { trip } : {}) });

/** Whether a main part's scene has a `# then:` (its head or a choice; an arrival's or an epilogue's runs only inside its moment). */
const hasThen = (scene: SceneEntry | undefined) => !!scene && (!!scene.then || scene.options.some((option) => !!option.then));

/**
 * The city's epilogue (free time's or the finale result's 「エピローグへ」, the automatic one, or a `then: epilogue`):
 * through its moment when scenes run there or the epilogue has a then: (stage 4), else at once as before.
 */
export function openEpilogue(state: GameState, authored: boolean, nextRoll: () => number = secureRomanceRoll): GameState {
  const cityId = state.currentCityId;
  const finale = state.occasion;
  // The finale result's 「エピローグへ」 (stage 4): the rest of the finale's moment runs first (after battle, +N); the epilogue opens as it ends.
  if (!authored && state.activeBattle?.phase === "result" && finale?.kind === "battle" && !finale.then && !finale.onClose) {
    if (!epilogueOpening(state, cityId)) return state;
    return advanceOccasion({ ...state, revision: state.revision + 1, activeBattle: null, battleRewardReceipt: null, occasion: { ...finale, onClose: "epilogue" } }, nextRoll);
  }
  const opening = epilogueOpening(state, cityId, authored);
  if (!opening) return state;
  if (!momentHasScenes({ kind: "epilogue", cityId }) && !hasThen(mainScene({ epilogue: cityId }))) return beginCityEpilogue(opening, cityId);
  return advanceOccasion({ ...opening, revision: opening.revision + 1, occasion: momentOccasion("epilogue", cityId, ["epilogue"]) }, nextRoll);
}

/** The next city's arrival (a new journey's first city: its opening): through its moment when scenes run there or the arrival has a then:. */
export function openArrival(state: GameState, nextRoll: () => number = secureRomanceRoll): GameState {
  const cityId = state.currentCityId;
  if (!canBeginArrival(state) || state.occasion) return state;
  if (!momentHasScenes({ kind: "arrive", cityId }) && !hasThen(mainScene({ arrival: cityId }))) return beginArrival(state);
  return advanceOccasion({ ...state, revision: state.revision + 1, occasion: momentOccasion("arrive", cityId, ["logo", "arrival"]) }, nextRoll);
}

/** The departure to the next city: through its moment when scenes run there (they come before the items are left behind). */
function openDeparture(state: GameState, nextRoll: () => number = secureRomanceRoll): GameState {
  if (!canDepart(state)) return state;
  const cityId = state.currentCityId;
  if (!momentHasScenes({ kind: "depart", cityId })) {
    const arrived = leaveForNextCity(state);
    return arrived === state ? state : openArrival(arrived, nextRoll);
  }
  return advanceOccasion({ ...state, revision: state.revision + 1, occasion: momentOccasion("depart", cityId, ["depart"]) }, nextRoll);
}

/**
 * A rest (「休む」, paid by the caller) through the hotel's moment when scenes run there or on the trip home (stage 4):
 * the trip's scenes at the place it leaves (the time 「休む」 was pressed), the move (the party at the hotel at its
 * arrival time, which may pass 21:00; decision 44), the hotel's negative scenes, the night, the positive ones.
 * Undefined when no scene runs there (the caller sleeps at once, as before).
 */
export function openHotel(state: GameState, trip: OccasionTrip, nextRoll: () => number = secureRomanceRoll): GameState | undefined {
  const cityId = state.currentCityId;
  const moving = trip.from !== trip.to;
  if (!momentHasScenes({ kind: "hotel", cityId, placeId: trip.to }) && !(moving && momentHasScenes(tripMoment(cityId, trip.modeId, trip.from, trip.to)))) return undefined;
  return advanceOccasion({ ...state, occasion: momentOccasion("hotel", cityId, ["move", "sleep"], trip) }, nextRoll);
}

registerMomentOpeners({ depart: (state) => openDeparture(state), epilogue: (state) => openEpilogue(state, false) });

registerOccasionHooks({
  advance: (state, nextRoll) => advanceOccasion(state, nextRoll),
  thenProblem: (state, then, spend) => { const plan = planThen(state, then, "", spend); return plan.ok === false ? plan.reason : undefined; },
  commitThen,
});
