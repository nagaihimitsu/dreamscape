import { battles, dates, episodes, getCityContent, landmarks } from "../content";
import { landmarkParts } from "../content/tourism-schemas";
import { secureRomanceRoll } from "../random/romance-source";
import { startVisitBattle } from "./battle";
import { battlePlayed } from "./conditions";
import { beginMomentScene, momentSceneEligible, nextObservationScene, sceneSchedule, visitedLandmarkOfEvent } from "./encounter";
import { canStartAuthoredEpilogue, startCityArrival, startCityEpilogue } from "./epilogue";
import { departToNextCity } from "./city-travel";
import { startDate } from "./game";
import type { GameState } from "./game-state-schema";
import type { Occasion, OccasionPart, OccasionThen } from "./occasion-state";
import { mainPartPayments, mainScene } from "./reservations";
import { beginLandmarkGuide, beginLandmarkObservation } from "./tourism";
import { compareRouteCost } from "./travel-routes";
import { getUsableRoutes } from "./transport";
import { getTravelHomeRoutes, isCompletedTravelEvent, isTravelEventVisible } from "./travel-game";
import type { SceneEntry, SceneMain, SceneThen } from "../content/scene-schemas";
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
 * Open the occasion of a map event (4.2) after its departure was paid (beginTravelEvent), and run it
 * to its first stop. Returns the state unchanged when nothing could start (the caller then refuses
 * the departure as before).
 */
export function openEventOccasion(state: GameState, eventId: string, nextRoll: () => number = secureRomanceRoll): GameState {
  if (sceneRunning(state) || state.occasion) return state;
  const occasion = occasionOf(state, eventId);
  if (!occasion) return state;
  const opened = advanceOccasion(recordVisit(withOccasion(state, occasion), occasion.landmarkId), nextRoll);
  // Nothing of the occasion started (its main part refused): no departure.
  return opened.occasion?.ran.length || opened.occasion?.started.length || sceneRunning(opened) ? opened : state;
}

/** The sequence of an occasion (4.3): negative scenes, each main part with its `after <part>` scenes (not observe's), positive scenes. */
export type OccasionStep = { scene: string; after?: OccasionPart } | { part: OccasionPart };
type Step = OccasionStep;
/** The occasion's steps in order (also read by Debug's candidate table, src/dev/occasion-candidates.ts). */
export const occasionSteps = (occasion: Occasion): OccasionStep[] => sequence(occasion);
function sequence(occasion: Occasion): Step[] {
  const schedule = occasion.landmarkId ? sceneSchedule(occasion.landmarkId) : { before: [], after: [], afterPart: {} as Record<string, string[]> };
  return [
    ...schedule.before.map((scene) => ({ scene })),
    ...occasion.parts.flatMap((part): Step[] => [{ part },
      ...(part === "observe" ? [] : (schedule.afterPart[part] ?? []).map((scene) => ({ scene, after: part })))]),
    ...schedule.after.map((scene) => ({ scene })),
  ];
}
const keyOf = (step: Step) => ("scene" in step ? step.scene : `main:${step.part}`);
function nextIndex(steps: readonly Step[], at: string | null): number {
  if (at === null) return 0;
  const key = at === "left:observe" ? "main:observe" : at;
  const index = steps.findIndex((step) => keyOf(step) === key);
  return index < 0 ? steps.length : index + 1;
}

/** The main scene (its tags) of a part of the occasion, for its head `# then:`. */
function partScene(occasion: Occasion, part: OccasionPart): SceneEntry | undefined {
  const landmark = landmarks.find((item) => item.id === occasion.landmarkId);
  const main: SceneMain | undefined = part === "guide" && landmark ? { guide: landmark.id }
    : part === "battle" ? { battle: landmark?.battleId ?? episodes.find((item) => item.id === occasion.eventId)?.battleId ?? occasion.eventId ?? "" }
      : part === "date" && occasion.eventId ? { date: occasion.eventId } : undefined;
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
  } else if (part === "date" && occasion.eventId) started = startDate(state, occasion.eventId, nextRoll);
  else if (part === "ending") {
    // 「交際開始」 (3.9 (c)): only when the confession of this date succeeded.
    return state.confessionStatus === "accepted" ? { ...state, occasion: { ...occasion, romanceEnding: true } } : undefined;
  }
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
  if (occasion.then) return runThen(state, nextRoll);
  // The observation is where `after observe` scenes return to: the next waiting one, else the observation again.
  if (occasion.at === "main:observe" && occasion.landmarkId) {
    const waiting = nextObservationScene(state);
    if (waiting) return beginMomentScene(withOccasion(state, { ...occasion, started: [...occasion.started, waiting] }), waiting, nextRoll);
    return beginLandmarkObservation(state, occasion.landmarkId);
  }
  const steps = sequence(occasion);
  for (let index = nextIndex(steps, occasion.at); index < steps.length; index++) {
    const step = steps[index];
    if ("scene" in step) {
      if ((step.after && !occasion.ran.includes(step.after)) || occasion.started.includes(step.scene) || !momentSceneEligible(state, step.scene)) continue;
      return beginMomentScene(withOccasion(state, { ...occasion, at: step.scene, started: [...occasion.started, step.scene] }), step.scene, nextRoll);
    }
    const started = startPart(withOccasion(state, { ...occasion, at: `main:${step.part}`, ran: [...occasion.ran, step.part] }), step.part, nextRoll);
    if (started) return started;
  }
  return closeOccasion(state);
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

/** The plan of a then: now: the move's fare and the main part's admission and payments there, checked against what is usable after this occasion. */
export function planThen(state: Readonly<GameState>, then: SceneThen, sceneId: string): ThenPlan {
  if ("epilogue" in then) {
    if (!canStartAuthoredEpilogue(state as GameState, state.currentCityId)) return { ok: "still" };
    const epilogue = mainScene({ epilogue: state.currentCityId });
    const money = Math.max(0, -(epilogue?.done.money ?? 0));
    const ap = Math.max(0, -(epilogue?.done.ap ?? 0));
    if (state.travelBudget - state.travel.returnReserve < money) return { ok: false, reason: "エピローグでの支払いができません。" };
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
  if (!home || state.travelBudget - cost < home.cost + payments.money) return { ok: false, reason: "移動・入場や帰りのための予算が足りません。" };
  if (state.ap < payments.ap) return { ok: false, reason: "APが足りません。" };
  return { ok: true, plan: { move: then.move, modeId: route.mode, minutes: route.minutes, eventId: event?.id ?? null, sceneId }, cost };
}

/** Decide a then: (chosen, or the head of a scene that starts): its move is paid now; it runs when its scene ends. Nothing without an occasion, or when it cannot move. */
export function commitThen(state: GameState, then: SceneThen, sceneId: string): GameState {
  const occasion = state.occasion;
  if (!occasion || occasion.then) return state;
  const plan = planThen(state, then, sceneId);
  if (plan.ok !== true) return state;
  return { ...state, travelBudget: state.travelBudget - plan.cost, occasion: { ...occasion, then: plan.plan } };
}

/** The then: of a scene that has ended: the occasion closes (its other steps do not run) and the next one opens. */
function runThen(state: GameState, nextRoll: () => number): GameState {
  const then = state.occasion!.then!;
  const closed = closeOccasion(state);
  if ("epilogue" in then) {
    const opened = startCityEpilogue(closed, closed.currentCityId, closed.revision, true);
    return opened === closed ? closed : opened;
  }
  const cityId = closed.currentCityId;
  const rides = then.modeId !== WALK_MODE_ID && then.move !== closed.travel.currentPlaceId
    ? { ...closed.travel.rideCounts, [then.modeId]: (closed.travel.rideCounts[then.modeId] ?? 0) + 1 } : closed.travel.rideCounts;
  const arrival = closed.travel.minute + then.minutes;
  const home = getTravelHomeRoutes(closed, then.move).sort(compareRouteCost)[0];
  const event = then.eventId ? getCityContent(cityId).travel.events.find((item) => item.id === then.eventId) : undefined;
  const moved: GameState = { ...closed, travel: { ...closed.travel, currentPlaceId: then.move, minute: arrival, rideCounts: rides,
    returnReserve: home?.cost ?? closed.travel.returnReserve,
    activeEvent: event ? { eventId: event.id, placeId: event.placeId, endMinute: arrival + event.activityMinutes } : null } };
  const landmarkId = event ? visitedLandmarkOfEvent(event.id) : landmarkAt(closed, then.move);
  const occasion = landmarkId && visitOccasion(moved, landmarkId, event?.id ?? null);
  // A place with no landmark (a date's or a finale's only): free time there (decision 20).
  if (!occasion) return { ...moved, travel: { ...moved.travel, activeEvent: null } };
  return advanceOccasion(recordVisit(withOccasion(moved, { ...occasion, moved: then.modeId }), landmarkId), nextRoll);
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
  const expected = occasion.eventId === null ? undefined : occasionOf({ ...state, visitedLandmarkIds: [] }, occasion.eventId);
  if (occasion.eventId !== (state.travel.activeEvent?.eventId ?? null) || (occasion.eventId !== null && expected?.kind !== occasion.kind) ||
      (occasion.eventId !== null && expected?.landmarkId !== occasion.landmarkId) || (occasion.eventId === null && occasion.parts.some((part) => part !== "guide" && part !== "observe" && part !== "battle")) ||
      (occasion.landmarkId !== null && !landmarks.some((landmark) => landmark.id === occasion.landmarkId && landmark.cityId === state.currentCityId)) ||
      occasion.ran.some((part) => !occasion.parts.includes(part)) || new Set(occasion.started).size !== occasion.started.length ||
      (occasion.romanceEnding && !occasion.ran.includes("ending")) || (occasion.landmarkId !== null && !state.visitedLandmarkIds.includes(occasion.landmarkId)))
    fail();
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
  if (entry.kind === "arrive") return advanceOccasion(startCityArrival(state, expectedRevision), nextRoll);
  if (entry.kind === "depart") return advanceOccasion(departToNextCity(state, expectedRevision), nextRoll);
  // (The finale result's 「エピローグへ」 leaves the result and closes its occasion first: startCityEpilogue.)
  const opened = startCityEpilogue(state, state.currentCityId, expectedRevision);
  return opened === state ? state : advanceOccasion(opened, nextRoll);
}

registerOccasionHooks({
  advance: (state, nextRoll) => advanceOccasion(state, nextRoll),
  thenProblem: (state, then) => { const plan = planThen(state, then, ""); return plan.ok === false ? plan.reason : undefined; },
  commitThen,
});
