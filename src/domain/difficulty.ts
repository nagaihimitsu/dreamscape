import { z } from "zod";
import { balance } from "../content";
import { ECONOMY_LEVELS, ENGLISH_LEVELS, type EconomyLevel, type EnglishLevel } from "../content/schemas";

/**
 * The difficulty (2026-11-19 user decision; docs/01_GAME_DESIGN.md): the English of the quizzes and how tight money and AP
 * are, chosen apart when a journey starts (romance/balance.json `difficulty` names each level and sets its numbers).
 * How tight money and AP are stays for the journey; the English can be changed in ゲームの設定 (from the next quiz).
 */
export const difficultySchema = z.object({
  english: z.enum(ENGLISH_LEVELS),
  economy: z.enum(ECONOMY_LEVELS),
}).strict();
export type Difficulty = z.infer<typeof difficultySchema>;
export const DEFAULT_DIFFICULTY: Difficulty = { english: "B1", economy: "standard" };

/** The save's difficulty (a save without one: the default). */
export function difficultyOf(state: { difficulty?: Difficulty }): Difficulty {
  return state.difficulty ?? DEFAULT_DIFFICULTY;
}

/** The starting budget at a level: the journey's as written, its share rounded down. */
export function startingBudget(budget: number, economy: EconomyLevel): number {
  return Math.floor(budget * balance.difficulty.economy[economy].budgetPercent / 100);
}

/** The tightest level's share of the starting budget (the build's money checks and the budget tests read the journey at it). */
export const tightestBudgetPercent = Math.min(...ECONOMY_LEVELS.map((level) => balance.difficulty.economy[level].budgetPercent));

/** The AP a reward gives at the save's level: as written, plus the level's bonus when it gives any, up to the AP cap. */
export function rewardAp(state: { difficulty?: Difficulty }, ap: number): number {
  if (ap <= 0) return ap;
  return Math.min(balance.apCap, ap + balance.difficulty.economy[difficultyOf(state).economy].rewardApBonus);
}

export const englishLevelLabel = (level: EnglishLevel) => balance.difficulty.english[level];
export const economyLevelLabel = (level: EconomyLevel) => balance.difficulty.economy[level];
export { ECONOMY_LEVELS, ENGLISH_LEVELS, type EconomyLevel, type EnglishLevel };
