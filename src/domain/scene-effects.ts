import { encounters } from "../content/encounters";
import { balance, responseProfiles, scenes } from "../content";
import { INSERTED_KINDS, type SceneDone, type SceneEntry, type SceneOption } from "../content/scene-schemas";
import { responseProfileSchema } from "../content/schemas";
import { secureRomanceRoll } from "../random/romance-source";
import { meets } from "./conditions";
import { itemUsableIn } from "./item-cities";
import type { GameState } from "./game-state-schema";
import { usableAp, usableMoney } from "./reservations";
import { decideThen, thenPlanOf } from "./occasion-hooks";
import { earnRewards, earnSceneTagAp, settlePendingAp } from "./rewards";
import { createRomanceRollPlan, resolveRomanceChoice } from "./romance-random";

/**
 * The tags' effects (the unified event design, stage 3a, 4.4): how a choice shows (hidden, greyed
 * out with the reason, or open; decision 43), what choosing it does, and what a scene does when
 * it is done. Pure (the random roll of a `# profile:` choice is drawn by the given source and
 * returned with the result). The game applies a choice's effects before passing the choice to
 * Ink, in the same action (one save), so the lines after it read the new state, and a reload or a
 * second tap never applies them twice (A24, 4.6).
 */

/** A scene by its ID (scenes.json). */
export const sceneById = (id: string): SceneEntry | undefined => scenes.find((scene) => scene.id === id);
/** A place file's scene (its effects come from its tags; today's catalogs keep their own fields). */
export const placeSceneById = (id: string): SceneEntry | undefined => scenes.find((scene) => scene.id === id && scene.origin === "place");
export const sceneOption = (scene: SceneEntry | undefined, optionId: string | undefined): SceneOption | undefined =>
  optionId === undefined ? undefined : scene?.options.find((option) => option.id === optionId);

/** What a scene keeps back while it runs: its own `# on_done:` that spends (paid when it is done). */
export const doneReserve = (done: SceneDone | undefined) => ({ money: Math.max(0, -(done?.money ?? 0)), ap: Math.max(0, -(done?.ap ?? 0)) });
/** An inserted place scene's reserve (a main part's first payment is the occasion's: reservations.ts runningMainPayment). */
export const insertedDoneReserve = (sceneId: string) => {
  const scene = placeSceneById(sceneId);
  return doneReserve(scene && INSERTED_KINDS.includes(scene.kind) ? scene.done : undefined);
};

export type ChoiceDisplay =
  /** A `# requires:`, `# give:` or `# use:` that does not hold: not shown at all (no reason; decision 43). */
  | { show: "hidden" }
  /** Not affordable: shown greyed out with the reason (money, AP). */
  | { show: "grey"; reason: string }
  | { show: "open" };

// An item of this city, or one carried through the journey from a city it has done (the item design §2.4).
const itemOfCity = (state: Readonly<GameState>, itemId: string) => itemUsableIn(state, itemId, state.currentCityId);
const holds = (state: Readonly<GameState>, itemId: string) => itemOfCity(state, itemId) && state.inventory[itemId] === "held";

/**
 * How a choice shows now. `reserve`: what the running scene keeps back (its `# on_done:` that
 * spends), so the choices leave it payable. Hiding comes first: a hidden choice shows no reason.
 */
export function choiceDisplay(state: Readonly<GameState>, option: SceneOption | undefined, reserve = { money: 0, ap: 0 }): ChoiceDisplay {
  if (!option) return { show: "open" };
  if (option.requires?.some((condition) => !meets(state, condition))) return { show: "hidden" };
  for (const item of [option.give?.item, option.use]) if (item && !holds(state, item)) return { show: "hidden" };
  const money = -(option.money ?? 0);
  const ap = -(option.ap ?? 0);
  // A choice that decides a # then: (2.3, 4.4) is read as it decides it: after its own tags (applyChoiceEffects decides it then),
  // with the scene's # on_done: still to pay as it ends (unless 「また今度」), against what the then: keeps back where it goes
  // (today's fare home and the moment's other parts are not kept back then). Greyed when that cannot be paid.
  if (option.then && state.occasion && !state.occasion.then) {
    if (money > 0 && state.travelBudget < money) return { show: "grey", reason: "旅行予算が足りません。" };
    if (ap > 0 && state.ap < ap) return { show: "grey", reason: `APが足りません（AP ${ap}）。` };
    const after = applyChoiceTags(state as GameState, option, (current, gain) => ({ ...current, ap: current.ap + Math.min(gain, Math.max(0, balance.apCap - current.ap)) }));
    const plan = thenPlanOf(after, option.then, option.later ? undefined : reserve);
    if (plan.ok === false) return { show: "grey", reason: plan.reason };
    if (plan.ok === true) return { show: "open" };
    // (A then: that does nothing now, an epilogue read already: the choice is read as any other.)
  }
  if (money > 0 && usableMoney(state) - reserve.money < money)
    return { show: "grey", reason: state.travelBudget - reserve.money >= money ? "帰りの交通費を確保しているため、今は使えません。" : "旅行予算が足りません。" };
  if (ap > 0 && usableAp(state) - reserve.ap < ap) return { show: "grey", reason: `APが足りません（AP ${ap}）。` };
  return { show: "open" };
}

/** The romance result of a `# profile:` choice (decision 39), with the roll it drew. */
export type ProfileResult = { profileId: string; result: "positive" | "negative"; roll: number };

const addRelationship = (state: GameState, rel: SceneOption["rel"]): GameState =>
  rel ? { ...state, affection: state.affection + (rel.affection ?? 0), trust: state.trust + (rel.trust ?? 0), spark: state.spark + (rel.spark ?? 0) } : state;

/** Spend or give AP: spending pays from the wallet and then takes the stored AP into the freed room (settlePendingAp); giving goes by the tag's rule. */
function applyAp(state: GameState, amount: number | undefined, ruleId: string, revision: number): GameState {
  if (!amount) return state;
  if (amount < 0) {
    if (state.ap + amount < 0) throw new Error("APが足りません。");
    return settlePendingAp({ ...state, ap: state.ap + amount });
  }
  return earnSceneTagAp(state, ruleId, revision);
}

function applyMoney(state: GameState, amount: number | undefined): GameState {
  if (!amount) return state;
  const total = state.travelBudget + amount;
  if (!Number.isSafeInteger(total) || total < 0) throw new Error("旅行予算の記録が一致しません。");
  return { ...state, travelBudget: total };
}

const addFlags = (state: GameState, flags: readonly string[] | undefined): GameState => {
  const added = (flags ?? []).filter((flag) => !state.storyProgress.flags.includes(flag));
  return added.length ? { ...state, storyProgress: { ...state.storyProgress, flags: [...state.storyProgress.flags, ...added] } } : state;
};

/**
 * A choice's own tags before its then: and its reaction profile: money, AP (`earn` gives a gain), relationship, flags, memories,
 * the item given or used. The choice's display reads the then: on this state too, so it shows as the choice decides it.
 */
function applyChoiceTags(state: GameState, option: SceneOption, earn: (state: GameState, gain: number) => GameState, sceneId = ""): GameState {
  let next = applyMoney(state, option.money);
  next = (option.ap ?? 0) > 0 ? earn(next, option.ap!) : applyAp(next, option.ap, "", 0);
  next = addRelationship(next, option.rel);
  next = addFlags(next, option.set);
  const memories = (option.memory ?? []).filter((id) => !next.memories.includes(id));
  if (memories.length) next = { ...next, memories: [...next.memories, ...memories] };
  for (const [item, status] of [[option.give?.item, "gifted"], [option.use, "used"]] as const) {
    if (!item) continue;
    if (next.inventory[item] !== "held") throw new Error("必要な品物を持っていません。");
    next = { ...next, inventory: { ...next.inventory, [item]: status }, itemUses: { ...next.itemUses, [item]: { encounterId: sceneId, optionId: option.id } } };
  }
  return next;
}

/**
 * Apply a choice's tags, before the choice is passed to Ink: money, AP (giving by the rule
 * "<scene>__<option>", stored as "…@<revision>"), relationship, flags, memories, the item given or
 * used (recorded in itemUses with the scene and option), and the reaction profile (one roll
 * drawn now; decision 39). `revision`: the revision the action saves.
 */
export function applyChoiceEffects(state: GameState, sceneId: string, option: SceneOption, revision: number,
  nextRoll: () => number = secureRomanceRoll): { state: GameState; profile?: ProfileResult } {
  let next = applyChoiceTags(state, option, (current) => earnSceneTagAp(current, `${sceneId}__${option.id}`, revision), sceneId);
  // A # then: is decided (its move paid) with the choice; it runs when the scene ends (stage 3b, 4.1), after an inserted
  // scene's # on_done: is paid (unless 「また今度」).
  if (option.then) next = decideThen(next, option.then, sceneId, option.later ? undefined : insertedDoneReserve(sceneId));
  if (!option.profile) return { state: next };
  const found = responseProfiles.find((profile) => profile.id === option.profile);
  if (!found) throw new Error("交流のリアクション設定が見つかりません。");
  const [ticket] = createRomanceRollPlan(1, nextRoll);
  const resolution = resolveRomanceChoice(responseProfileSchema.parse(found), next, ticket);
  next = addRelationship(next, resolution.deltas);
  return { state: next, profile: { profileId: found.id, result: resolution.result, roll: ticket.reaction } };
}

/**
 * Apply what a scene does when it is done (`# on_done:`): the items it gives (an item already
 * recorded is left as it is: a repeated scene gives it once), the items it uses (when held;
 * recorded with the scene and no option), flags, relationship, money and AP ("<scene>__on_done").
 */
export function applyDoneEffects(state: GameState, sceneId: string, done: SceneDone, revision: number): GameState {
  let next = state;
  for (const item of done.items ?? []) if (!(item in next.inventory)) next = { ...next, inventory: { ...next.inventory, [item]: "held" } };
  for (const item of done.use ?? []) if (next.inventory[item] === "held")
    next = { ...next, inventory: { ...next.inventory, [item]: "used" }, itemUses: { ...next.itemUses, [item]: { encounterId: sceneId } } };
  next = addFlags(next, done.set);
  next = addRelationship(next, done.rel);
  next = applyMoney(next, done.money);
  next = applyAp(next, done.ap, `${sceneId}__on_done`, revision);
  // `# on_done: reward` (an inserted scene): the one-off reward, claimed once whichever way earns it first (the battle's score, or this scene).
  return done.reward ? earnRewards(next, [done.reward]).state : next;
}

/** Whether a scene's done effects change the relationship (the romance progress is evaluated again then). */
export const changesRelationship = (done: SceneDone, options: readonly SceneOption[] = []) =>
  !!done.rel || options.some((option) => option.rel || option.profile);
