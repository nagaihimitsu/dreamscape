import type { MiniGameRules } from "../contract";
import { cueTapEnd, cueTapMoment, cueTapRules, type CueTapRecord, type CueTapTuning } from "../engines/cue_tap/engine";

// The cloth flap (docs/13 2.4): a cue_tap skin. Hidden in a niche of the stepwell, the player spreads the cloth once as the
// one coming down the stairs reaches the step in front of it. A far-off tap still tells its side: spread while she is
// still up the stairs (early), or after she has passed (late). Nothing is random. Pure.

export type ClothFlapOutcome = "perfect" | "early" | "late" | "frozen";
/** The flap has no keys of its own. */
export type ClothFlapParams = object;

/** The field's own moments: her steps down the stairs, one at a time. */
export const CLOTH_FIELD = {
  /** She stands at the top of the flight: the player sees the stairs, the steps' marks and the button. */
  settleMs: 900,
  /** One step down: she stands on a step, then steps down to the next (the shared footsteps sound keeps about this pace). */
  stepMs: 440,
  /** Steps from the top to the one in front of the niche (the gold one). */
  stepsToNiche: 5,
  /** Steps she goes on down past the niche, when nothing happens. */
  stepsPast: 3,
} as const;

/**
 * The flap's tuning (E1; Debug's room edits these numbers): generous windows (a phone's tap has its own lag; the game is a
 * moment of the story), wider after the moment (a phone lands a tap late). She stands on each step from cleanEarlyMs
 * before its beat to cleanLateMs after it (Skin.tsx), so a clean tap always finds her on the gold step, an early one on
 * her way down to it, a late one stepping off it. Her pace is the approach over her steps to the niche.
 */
export const CLOTH_TUNING: CueTapTuning = {
  leadMs: CLOTH_FIELD.settleMs,
  /** From the beat she starts down to the beat of the step in front of the niche. */
  approachMs: CLOTH_FIELD.stepMs * CLOTH_FIELD.stepsToNiche,
  cleanEarlyMs: 90,
  cleanLateMs: 150,
  nearEarlyMs: 220,
  nearLateMs: 300,
  /** She goes on down past the niche (a beat after her last step there, the play ends). */
  noneAfterMs: CLOTH_FIELD.stepMs * CLOTH_FIELD.stepsPast + 40,
};

/** When she starts down, the beat of the step in front of the niche (she stands on it around it), and when a play without a tap ends. */
export const CLOTH_START_MS = CLOTH_TUNING.leadMs;
export const CLOTH_NICHE_MS = cueTapMoment(CLOTH_TUNING);
export const CLOTH_END_MS = cueTapEnd(CLOTH_TUNING);

/**
 * The flap's rules with a tuning (the story's, or Debug's room's edited one). Clean: right in front of her. Any tap
 * before: early; any after: late (far off too, by its side). No tap: frozen. ★ from the engine: clean ★3, a little off
 * ★2, far off ★1 (its outcome is early or late all the same), no tap none.
 */
export function clothFlapRulesFor(tuning: CueTapTuning): MiniGameRules<ClothFlapParams, ClothFlapOutcome, CueTapRecord> {
  return cueTapRules<ClothFlapParams, ClothFlapOutcome>(tuning,
    { clean: "perfect", early: "early", late: "late", miss: { early: "early", late: "late" }, none: "frozen" });
}

export const clothFlapRules = clothFlapRulesFor(CLOTH_TUNING);
