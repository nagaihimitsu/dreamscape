import { stepPickRules, type StepPickMap, type StepPickTuning } from "../engines/step_pick/engine";

// Raju's haggle (docs/13 2.4): a step_pick skin, the staring contest Raju's own line sets up (「じっと見られると、ぼく、
// ちょっとずつ負けちゃう」, 2026-11-13 playtest). Each stare (「じっと見る」) costs him patience; two stares bring his
// price down a step (₹50 → ₹40 → ₹30). The price on show when the player says 「この値段で」 is the deal; 「やめておく」,
// staring once too often (he gives up and keeps the map) or doing nothing for a long while is no deal. Time alone never
// lowers the price. How far to push is an attitude, not a skill: no rating. Nothing is random. Pure.

export type RajuHaggleOutcome = "buy_map" | "fair_map" | "haggle_map" | "decline_map";
/** The haggle has no keys of its own. */
export type RajuHaggleParams = object;

/**
 * Each outcome's price in rupees as the field shows it (null: no deal). The scene's choices pay the same (`# money:`;
 * tests/journeys/golden_triangle/raju-haggle.test.ts keeps them together).
 */
export const RAJU_PRICES: Readonly<Record<RajuHaggleOutcome, number | null>> = { buy_map: 50, fair_map: 40, haggle_map: 30, decline_map: null };

/** His prices in order, and the outcome each one is; no deal however the play ends without one. */
export const RAJU_MAP: StepPickMap<RajuHaggleOutcome> = {
  steps: ["buy_map", "fair_map", "haggle_map"], leave: "decline_map", out: "decline_map", none: "decline_map",
};

/** The staring contest's numbers (E1; Debug's room may change them for its next play). */
export type RajuTuning = {
  /** The stares that bring his price down a step. */
  staresPerPrice: number;
  /** His patience: the stare that loses the map (two prices down and one more). */
  patience: number;
  /** Stares closer together than this count once (a stare, not a mash). */
  stareGapMs: number;
  /** Doing nothing this long (since the start or the last stare) and he asks no more: no deal. */
  idleMs: number;
};
export const RAJU_HAGGLE_TUNING: RajuTuning = { staresPerPrice: 2, patience: 5, stareGapMs: 350, idleMs: 12000 };

/** The engine's steps for a tuning: three prices, each a few stares apart, his patience the push limit. */
export function rajuStepTuning(tuning: RajuTuning): StepPickTuning {
  const per = Math.max(1, Math.round(tuning.staresPerPrice));
  return { pushesPerStep: [per, per], pushLimit: Math.max(1, Math.round(tuning.patience)), pushGapMs: Math.max(0, Math.round(tuning.stareGapMs)), idleMs: Math.max(1, Math.round(tuning.idleMs)) };
}
export const RAJU_TUNING: StepPickTuning = rajuStepTuning(RAJU_HAGGLE_TUNING);
/** His patience at the start: the stares he takes before he gives up (the dots the field shows). */
export const RAJU_PATIENCE = RAJU_TUNING.pushLimit ?? 0;
/** He asks once more this long before doing nothing ends the haggle. */
export const RAJU_NUDGE_BEFORE_MS = 4000;

export const rajuHaggleRulesFor = (tuning: StepPickTuning) => stepPickRules<RajuHaggleParams, RajuHaggleOutcome>(tuning, RAJU_MAP);
export const rajuHaggleRules = rajuHaggleRulesFor(RAJU_TUNING);
