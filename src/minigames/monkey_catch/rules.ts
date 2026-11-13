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
  holdMs: 500,
  /** Then its grip gives: the thing slips in its fingers (the cue that it is about to fall), until it lets go. */
  slipMs: 550,
  /** After it reaches the hands, a thing not caught slides down through them (the fingers brush it) this long… */
  throughMs: 320,
  /** …and by then plus this, it is out of the field below them. */
  goneMs: 200,
} as const;

/**
 * Generous windows (a phone's tap has its own lag; the game is a moment of the story), wider after the thing reaches the
 * hands: a phone lands a tap late, and a thing a little past the fingertips is still inside the cupped hands.
 */
export const MONKEY_TUNING: CueTapTuning = {
  leadMs: MONKEY_FIELD.holdMs + MONKEY_FIELD.slipMs,
  /** Its fall from the monkey's hand to the player's. */
  approachMs: 950,
  cleanEarlyMs: 90,
  cleanLateMs: 150,
  nearEarlyMs: 220,
  nearLateMs: 300,
  noneAfterMs: 650,
};

/** When the monkey's grip starts to give, when it lets go, when the thing reaches the hands, and when a play without a tap ends. */
export const MONKEY_SLIP_MS = MONKEY_FIELD.holdMs;
export const MONKEY_RELEASE_MS = MONKEY_TUNING.leadMs;
export const MONKEY_HANDS_MS = cueTapMoment(MONKEY_TUNING);
export const MONKEY_END_MS = cueTapEnd(MONKEY_TUNING);

/** Clean: caught. A little early or late: it bounces off the fingers. Far off, or no tap: it falls past the hands. */
export const monkeyCatchRules = cueTapRules<MonkeyCatchParams, MonkeyCatchOutcome>(MONKEY_TUNING,
  { clean: "caught", early: "fumbled", late: "fumbled", miss: "missed", none: "missed" });
