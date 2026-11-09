import type { SceneThen } from "../content/scene-schemas";
import type { GameState } from "./game-state-schema";

/**
 * The moment's rules that light modules call (the guide's close advances its occasion, a choice's
 * `# then:` is checked and decided with its other tags): occasion.ts registers them when it loads.
 * The hook keeps those modules (imported by the save schema) out of the moment's import cycle.
 */
export type OccasionHooks = {
  advance: (state: GameState, nextRoll?: () => number) => GameState;
  thenProblem: (state: Readonly<GameState>, then: SceneThen) => string | undefined;
  commitThen: (state: GameState, then: SceneThen, sceneId: string) => GameState;
};
let hooks: OccasionHooks | undefined;
export function registerOccasionHooks(next: OccasionHooks): void { hooks = next; }
/** Advance the running occasion (unchanged until occasion.ts has loaded). */
export const advanceRunningOccasion = (state: GameState, nextRoll?: () => number): GameState => hooks?.advance(state, nextRoll) ?? state;
/** Why a then: cannot be paid now, if it cannot. */
export const thenProblem = (state: Readonly<GameState>, then: SceneThen): string | undefined => hooks?.thenProblem(state, then);
/** Decide a then: with its choice or scene start. */
export const decideThen = (state: GameState, then: SceneThen, sceneId: string): GameState => hooks?.commitThen(state, then, sceneId) ?? state;
