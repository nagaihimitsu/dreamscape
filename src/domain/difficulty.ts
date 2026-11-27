import { z } from "zod";
import { balance, progression } from "../content";
import type { ConfessionThresholds } from "../content/journey-catalog";
import { getJourney, getJourneyForCity } from "../content/journeys";
import {
  ECONOMY_LEVELS, ENGLISH_CHOICES, ENGLISH_LEVELS,
  type EconomyLevel, type EnglishChoice, type EnglishLevel, type RewardApBonusTrigger,
} from "../content/schemas";

/**
 * The difficulty (2026-11-19 user decision; docs/01_GAME_DESIGN.md): the English of the quizzes and how tight money and AP
 * are, chosen apart when a journey starts (romance/balance.json `difficulty` names each level and sets its numbers).
 * How tight money and AP are stays for the journey; the English can be changed in ゲームの設定 (from the next quiz).
 * The English is 「日本語のみ」 (`japanese`, the default) or a level (A2・B1・B2).
 */
export const difficultySchema = z.object({
  english: z.enum(ENGLISH_CHOICES),
  economy: z.enum(ECONOMY_LEVELS),
}).strict();
export type Difficulty = z.infer<typeof difficultySchema>;
export const DEFAULT_DIFFICULTY: Difficulty = { english: "japanese", economy: "standard" };

/** The save's difficulty (a save without one: the default). */
export function difficultyOf(state: { difficulty?: Difficulty }): Difficulty {
  return state.difficulty ?? DEFAULT_DIFFICULTY;
}

/** 「日本語のみ」: a quiz shows its question and options in their Japanese translation only (no English, no reading aloud). */
export function isJapaneseOnly(state: { difficulty?: Difficulty }): boolean {
  return difficultyOf(state).english === "japanese";
}

/** The English level a new quiz asks at (「日本語のみ」: none, the quiz's own English, whose translation is shown). */
export function quizEnglishLevel(state: { difficulty?: Difficulty }): EnglishLevel | undefined {
  const { english } = difficultyOf(state);
  return english === "japanese" ? undefined : english;
}

/** The starting budget at a level: the journey's as written, its share rounded down. */
export function startingBudget(budget: number, economy: EconomyLevel): number {
  return Math.floor(budget * balance.difficulty.economy[economy].budgetPercent / 100);
}

/** The tightest level's share of the starting budget (the build's money checks and the budget tests read the journey at it). */
export const tightestBudgetPercent = Math.min(...ECONOMY_LEVELS.map((level) => balance.difficulty.economy[level].budgetPercent));

/** The level's AP bonus for a kind of reward (none for a kind it leaves out, and for a scene's `ap` tag). */
export function rewardApBonus(economy: EconomyLevel, trigger: string): number {
  const bonus = balance.difficulty.economy[economy].rewardApBonus;
  return trigger in bonus ? bonus[trigger as RewardApBonusTrigger] ?? 0 : 0;
}

/** The AP a reward gives at the save's level: as written, plus the level's bonus for its kind when it gives any. */
export function rewardAp(state: { difficulty?: Difficulty }, rule: { ap: number; trigger: string }): number {
  if (rule.ap <= 0) return rule.ap;
  return rule.ap + rewardApBonus(difficultyOf(state).economy, rule.trigger);
}

/**
 * What a confession needs at the save's level (2026-11-19 user decision): the journey's own thresholds at that level
 * (manifest `economyLevels`), else romance/progression.json's. Still the hidden values only, never chance.
 */
export function confessionThresholds(state: { difficulty?: Difficulty; currentCityId: string }): ConfessionThresholds {
  const journey = getJourneyForCity(state.currentCityId);
  return journey?.economyLevels?.[difficultyOf(state).economy]?.confession ?? progression.confession;
}

export const englishLevelLabel = (level: EnglishChoice) => balance.difficulty.english[level];
/** A level's name and words, with the journey's own words when it has them (manifest `economyLevels`). */
export const economyLevelLabel = (level: EconomyLevel, journeyId?: string) => {
  const own = journeyId === undefined ? undefined : getJourney(journeyId)?.economyLevels?.[level]?.descriptionJa;
  return own ? { ...balance.difficulty.economy[level], descriptionJa: own } : balance.difficulty.economy[level];
};
export { ECONOMY_LEVELS, ENGLISH_CHOICES, ENGLISH_LEVELS, type EconomyLevel, type EnglishChoice, type EnglishLevel };
