import type { SceneThen } from "../content/scene-schemas";
import type { GameState } from "./game-state-schema";
import type { Payment } from "./reservations";

/**
 * The moment's rules that light modules call (the guide's close advances its occasion, a choice's
 * `# then:` is checked and decided with its other tags): occasion.ts registers them when it loads.
 * The hook keeps those modules (imported by the save schema) out of the moment's import cycle.
 */
export type OccasionHooks = {
  advance: (state: GameState, nextRoll?: () => number) => GameState;
  thenPlan: (state: Readonly<GameState>, then: SceneThen, spend?: Payment) => ThenVerdict;
  commitThen: (state: GameState, then: SceneThen, sceneId: string, spend?: Payment) => GameState;
  keepBack: (state: Readonly<GameState>) => Payment | undefined;
};
let hooks: OccasionHooks | undefined;
export function registerOccasionHooks(next: OccasionHooks): void { hooks = next; }
/** Advance the running occasion (unchanged until occasion.ts has loaded). */
export const advanceRunningOccasion = (state: GameState, nextRoll?: () => number): GameState => hooks?.advance(state, nextRoll) ?? state;
/** Whether a then: would be decided now (true), does nothing now ("still"), or cannot be paid (false, with the reason). */
export type ThenVerdict = { ok: true } | { ok: "still" } | { ok: false; reason: string };
/** Whether a then: would be decided now. `spend`: the money and AP its scene still pays before the then: runs (its # on_done:). */
export const thenPlanOf = (state: Readonly<GameState>, then: SceneThen, spend?: Payment): ThenVerdict => hooks?.thenPlan(state, then, spend) ?? { ok: "still" };
/** Decide a then: with its choice or scene start. `spend`: the money and AP its scene still pays before the then: runs (its # on_done:). */
export const decideThen = (state: GameState, then: SceneThen, sceneId: string, spend?: Payment): GameState => hooks?.commitThen(state, then, sceneId, spend) ?? state;
/** What a decided `# then:` keeps back until it runs (none before occasion.ts has loaded, or without one). */
export const keptByThen = (state: Readonly<GameState>): Payment | undefined => hooks?.keepBack(state);
