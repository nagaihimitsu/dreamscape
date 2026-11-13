import { stepPickRules, type StepPickMap, type StepPickTuning } from "../engines/step_pick/engine";

// Raju's haggle (docs/13 2.4): a step_pick skin. His three prices one after another; the one on show when the player says
// 「この値段で」 is the deal, 「やめておく」 or holding out past the last is no deal. Nothing is random. Pure.

export type RajuHaggleOutcome = "buy_map" | "fair_map" | "haggle_map" | "decline_map";
/** The haggle has no keys of its own. */
export type RajuHaggleParams = object;

/**
 * Each outcome's price in rupees as the field shows it (null: no deal). The scene's choices pay the same (`# money:`;
 * tests/journeys/golden_triangle/raju-haggle.test.ts keeps them together).
 */
export const RAJU_PRICES: Readonly<Record<RajuHaggleOutcome, number | null>> = { buy_map: 50, fair_map: 40, haggle_map: 30, decline_map: null };

/** His prices in order, and the outcome each one is. */
export const RAJU_MAP: StepPickMap<RajuHaggleOutcome> = { steps: ["buy_map", "fair_map", "haggle_map"], leave: "decline_map", none: "decline_map" };

/** How long each price is on show: the asking price a little longer (the start's guard), the last one longest (his last stand). */
export const RAJU_TUNING: StepPickTuning = { stepsMs: [1600, 1400, 2400] };

export const rajuHaggleRules = stepPickRules<RajuHaggleParams, RajuHaggleOutcome>(RAJU_TUNING, RAJU_MAP);
