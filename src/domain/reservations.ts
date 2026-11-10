import { battles, dates, episodes, getTour, landmarks, scenes } from "../content";
import type { SceneEntry, SceneMain } from "../content/scene-schemas";
import type { GameState } from "./game-state-schema";
import { keptByThen } from "./occasion-hooks";

/**
 * What a main part pays when it is first finished (its `# on_done: money -X`, `ap -N`; the unified
 * event design, stage 3a): checked on departing from the map and kept back while its occasion runs,
 * so the occasion's other scenes spend only what is left (A9, A23), and paid when the part is done.
 * The moment record (state.occasion, stage 3b) says which parts are still to come; a date's AP is
 * kept back the same way until the date starts (it is paid then, 2.3). Pure.
 */

const sameMain = (left: SceneMain, right: SceneMain) => JSON.stringify(left) === JSON.stringify(right);
/**
 * A date written with tags in a place file (stage 3a, decision 4): its choices' effects come from the scene table,
 * found by the date's address (a Debug test city's copy of a date shares its story).
 */
export const taggedDateScene = (dateId: string): SceneEntry | undefined => {
  const address = dates.find((item) => item.id === dateId)?.storyId;
  return scenes.find((scene) => scene.origin === "place" && scene.kind === "date" && scene.story.knot !== undefined &&
    `${scene.story.storyId}.${scene.story.knot}` === address);
};

/**
 * A one-scene date's choice tags (stage 3b: a one-scene file takes the tags too): its scene (origin file) when its
 * choices have tags. Its romance choices keep their # effect:; the tags apply beside it.
 */
export const fileDateScene = (dateId: string): SceneEntry | undefined => scenes.find((scene) => scene.origin === "file" && scene.kind === "date" &&
  !!scene.main && "date" in scene.main && scene.main.date === dateId && scene.options.length > 0);

/**
 * The tagged scene a story address starts (a place file's knot, or a one-scene file with a head or choice tags),
 * when there is one: a Debug test city's copy of a main part shares the address of a place file's knot.
 */
export const sceneOfAddress = (address: string | undefined): SceneEntry | undefined => address === undefined ? undefined :
  scenes.find((scene) => scene.origin !== "catalog" && (scene.story.knot === undefined ? scene.story.storyId : `${scene.story.storyId}.${scene.story.knot}`) === address);

/** The scene entry of a main part (a place file's knot or a one-scene file's head), when it has tags. */
export const mainScene = (main: SceneMain): SceneEntry | undefined => scenes.find((scene) => scene.main && sameMain(scene.main, main));

const played = (state: Readonly<GameState>, battleId: string) => state.battleRecords.some((record) => record.battleId === battleId && record.attempts > 0);

/** The main parts a map event opens that are not finished yet (guide on a first visit, battle, date). */
function pendingMainParts(state: Readonly<GameState>, eventId: string): SceneMain[] {
  const episode = episodes.find((item) => item.id === eventId);
  const battle = !episode ? battles.find((item) => item.id === eventId) : undefined;
  const date = dates.find((item) => item.id === eventId);
  const parts: SceneMain[] = [];
  const landmarkId = episode?.landmarkId ?? battle?.landmarkId ?? undefined;
  const landmark = landmarkId ? landmarks.find((item) => item.id === landmarkId) : undefined;
  if (landmark?.guideStoryId && !state.completedGuideIds.includes(landmark.id)) parts.push({ guide: landmark.id });
  const battleId = episode?.battleId ?? battle?.id;
  if (battleId && !played(state, battleId)) parts.push({ battle: battleId });
  if (date && !state.playedDateIds.includes(date.id)) parts.push({ date: date.id });
  return parts;
}

/** The money and AP a map event's main parts will pay when first finished (each part's `# on_done:` that spends). */
export function mainPartPayments(state: Readonly<GameState>, eventId: string): { money: number; ap: number } {
  return pendingMainParts(state, eventId).map(mainScene).reduce((sum, scene) => ({
    money: sum.money + Math.max(0, -(scene?.done.money ?? 0)),
    ap: sum.ap + Math.max(0, -(scene?.done.ap ?? 0)),
  }), { money: 0, ap: 0 });
}

/** A payment of money and AP. */
export type Payment = { money: number; ap: number };
const NONE: Payment = { money: 0, ap: 0 };
const spendOf = (scene: SceneEntry | undefined): Payment => ({ money: Math.max(0, -(scene?.done.money ?? 0)), ap: Math.max(0, -(scene?.done.ap ?? 0)) });
/**
 * The city's epilogue while it is still to be read, in its own moment or open by itself (only an authored city's spends on its
 * first reading: its # on_done:, A21).
 */
const unreadEpilogue = (state: Readonly<GameState>): SceneMain | undefined => {
  const occasion = state.occasion;
  const cityId = occasion ? (occasion.kind === "epilogue" ? occasion.cityId : undefined)
    : state.activeEpilogue && state.activeEpilogue.kind !== "arrival" ? state.currentCityId : undefined;
  return cityId && !state.viewedEpilogueCityIds.includes(cityId) ? { epilogue: cityId } : undefined;
};

/**
 * What a booked or running tour keeps back (tour stage 2a): the payments of its event steps still to come (a running tour's own
 * visit is kept back by its occasion), from the booking until each step runs, so the morning's visit can always pay them.
 */
export function tourKeepBack(state: Readonly<GameState>): Payment {
  const record = state.tour;
  const tour = record && getTour(record.tourId);
  if (!record || !tour) return NONE;
  return tour.steps.slice(record.status === "running" ? record.step + 1 : 0).reduce((sum, step) => {
    if (step.kind !== "event") return sum;
    const payment = mainPartPayments(state, step.eventId);
    return { money: sum.money + payment.money, ap: sum.ap + payment.ap };
  }, NONE);
}

/**
 * What the running occasion keeps back for its main parts still to come (and a date's AP until it starts); the epilogue's moment
 * keeps back its epilogue's first payment (a then: epilogue's, kept from its choice until the epilogue is read; 2.3). A booked or
 * running tour's later event steps are kept back too (tourKeepBack).
 */
export function reservedPayments(state: Readonly<GameState>): Payment {
  const own = occasionPayments(state);
  const tour = tourKeepBack(state);
  return { money: own.money + tour.money, ap: own.ap + tour.ap };
}
function occasionPayments(state: Readonly<GameState>): Payment {
  const occasion = state.occasion;
  const epilogue = unreadEpilogue(state);
  if (epilogue) return spendOf(mainScene(epilogue));
  if (!occasion?.eventId) return NONE;
  const pending = new Set(pendingMainParts(state, occasion.eventId).map((main) => Object.keys(main)[0]));
  const parts = occasion.parts.filter((part) => (part === "guide" || part === "battle" || part === "date") && pending.has(part));
  const kept = pendingMainParts(state, occasion.eventId).filter((main) => parts.includes(Object.keys(main)[0] as never)).map(mainScene)
    .reduce((sum, scene) => ({ money: sum.money + spendOf(scene).money, ap: sum.ap + spendOf(scene).ap }), NONE);
  const dateAp = occasion.kind === "date" && !occasion.ran.includes("date") ? dates.find((item) => item.id === occasion.eventId)?.apCost ?? 0 : 0;
  return { money: kept.money, ap: kept.ap + dateAp };
}

/**
 * What the main part running now (the occasion's step) pays when it is first finished, before a then: of it runs (4.1 step 1):
 * its `# on_done: money -X` and `ap -N` while they are still to be paid (a guide, a battle, a date; an authored epilogue not read yet).
 */
export function runningMainPayment(state: Readonly<GameState>): Payment {
  const occasion = state.occasion;
  const part = occasion?.at?.startsWith("main:") ? occasion.at.slice("main:".length) : undefined;
  if (!occasion || !part) return NONE;
  const main = part === "epilogue" ? unreadEpilogue(state)
    : occasion.eventId ? pendingMainParts(state, occasion.eventId).find((item) => Object.keys(item)[0] === part) : undefined;
  return main ? spendOf(mainScene(main)) : NONE;
}

/**
 * The money that can be spent now: the budget less the fare home and the main parts' payments kept back (A9). Once a `# then:`
 * is decided, less what the main part running now still pays (the occasion's other parts will not run) and the larger of
 * today's fare home (kept until the then: runs) and what the then: keeps back.
 */
export function usableMoney(state: Readonly<GameState>): number {
  const keep = keptByThen(state);
  return keep ? state.travelBudget - runningMainPayment(state).money - Math.max(state.travel.returnReserve, keep.money) - tourKeepBack(state).money
    : state.travelBudget - state.travel.returnReserve - reservedPayments(state).money;
}
/** The AP that can be spent now: stored AP is not counted, the main parts' AP is kept back (A23), and a decided then:'s. */
export function usableAp(state: Readonly<GameState>): number {
  const keep = keptByThen(state);
  return keep ? state.ap - keep.ap - runningMainPayment(state).ap - tourKeepBack(state).ap : state.ap - reservedPayments(state).ap;
}
