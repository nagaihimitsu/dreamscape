import { cueTapEnd, cueTapMoment, cueTapRules, type CueTapTuning } from "../engines/cue_tap/engine";
import type { MONKEY_THINGS } from "./definition";

// The monkey's catch (docs/13 2.4): a cue_tap skin. The monkey on the wall lets go of what it took; one tap closes the
// hands as it reaches them. Nothing is random (the bottle's tumble on screen is drawn the same every time). Pure.

export type MonkeyCatchOutcome = "caught" | "fumbled" | "missed";
/** The tag's keys: what the monkey drops (the picture only; the timing is the same). */
export type MonkeyCatchParams = { thing: (typeof MONKEY_THINGS)[number] };

/** The field's own moments. */
export const MONKEY_FIELD = {
  /** The monkey holds it out over the wall's edge: the player sees the wall, the meter and the button. */
  holdMs: 1200,
  /** After it reaches the hands, a bottle not caught is out of the field below them by then. */
  goneMs: 340,
} as const;

/** Generous windows (a phone's tap has its own lag; the game is a moment of the story), as the cricket's. */
export const MONKEY_TUNING: CueTapTuning = {
  leadMs: MONKEY_FIELD.holdMs,
  /** Its fall from the monkey's hand to the player's. */
  approachMs: 950,
  cleanMs: 90,
  nearMs: 220,
  noneAfterMs: 600,
};

/** When the monkey lets go, when the bottle reaches the hands, and when a play without a tap ends. */
export const MONKEY_RELEASE_MS = MONKEY_TUNING.leadMs;
export const MONKEY_HANDS_MS = cueTapMoment(MONKEY_TUNING);
export const MONKEY_END_MS = cueTapEnd(MONKEY_TUNING);

/** Clean: caught. A little early or late: it bounces off the fingers. Far off, or no tap: it falls past the hands. */
export const monkeyCatchRules = cueTapRules<MonkeyCatchParams, MonkeyCatchOutcome>(MONKEY_TUNING,
  { clean: "caught", early: "fumbled", late: "fumbled", miss: "missed", none: "missed" });
