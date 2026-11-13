import { cueTapEnd, cueTapMoment, cueTapRules, type CueTapTuning } from "../engines/cue_tap/engine";

// The cloth flap (docs/13 2.4): a cue_tap skin. Hidden in a niche of the stepwell, the player spreads the cloth once as the
// one coming down the stairs reaches the step in front of it. A far-off tap still tells its side: spread while she is
// still up the stairs (early), or after she has passed (late). Nothing is random. Pure.

export type ClothFlapOutcome = "perfect" | "early" | "late" | "frozen";
/** The flap has no keys of its own. */
export type ClothFlapParams = object;

/** The field's own moments: her steps down the stairs, one at a time. */
export const CLOTH_FIELD = {
  /** She stands at the top of the flight: the player sees the stairs, the meter and the button. */
  settleMs: 900,
  /** One step down (the shared footsteps sound, travel_walk, steps at about this pace). */
  stepMs: 420,
  /** Steps from the top to the one in front of the niche. */
  stepsToNiche: 6,
  /** Steps she goes on down past the niche, when nothing happens. */
  stepsPast: 3,
} as const;

/** Generous windows (a phone's tap has its own lag; the game is a moment of the story), as the cricket's. */
export const CLOTH_TUNING: CueTapTuning = {
  leadMs: CLOTH_FIELD.settleMs,
  /** From her first step to the step in front of the niche. */
  approachMs: CLOTH_FIELD.stepMs * CLOTH_FIELD.stepsToNiche,
  cleanMs: 90,
  nearMs: 220,
  /** She goes on down past the niche (a beat after her last step there, the play ends). */
  noneAfterMs: CLOTH_FIELD.stepMs * CLOTH_FIELD.stepsPast + 40,
};

/** When she starts down, when her foot lands on the step in front of the niche, and when a play without a tap ends. */
export const CLOTH_START_MS = CLOTH_TUNING.leadMs;
export const CLOTH_NICHE_MS = cueTapMoment(CLOTH_TUNING);
export const CLOTH_END_MS = cueTapEnd(CLOTH_TUNING);

/** Clean: right in front of her. Any tap before: early; any after: late (far off too, by its side). No tap: frozen. */
export const clothFlapRules = cueTapRules<ClothFlapParams, ClothFlapOutcome>(CLOTH_TUNING,
  { clean: "perfect", early: "early", late: "late", miss: { early: "early", late: "late" }, none: "frozen" });
