import { cueTapEnd, cueTapMoment, cueTapRules, type CueTapTuning } from "../engines/cue_tap/engine";

// The cricket's rules (docs/13 2.4): a cue_tap skin. One ball, one tap: the swing's time against the ball's arrival at the
// bat. Nothing is random (the taped ball's wobble on screen is drawn the same every time and changes nothing). Pure.

export type CricketOutcome = "six" | "over_wall" | "edge" | "bowled" | "no_swing";
/** The cricket has no keys of its own. */
export type CricketParams = object;

/** The field's own moments: her stance before the run-up, the run-up, the bounce (part of the flight) and the bricks behind the bat. */
export const CRICKET_FIELD = {
  /** Before her run-up: the player sees the pitch, the meter and the button. */
  settleMs: 600,
  /** Her short run-up, to the ball leaving her hand. */
  runUpMs: 1100,
  /** The ball's one bounce, at this part of its flight. */
  bounceAt: 0.6,
  /** After the ball's arrival, it reaches the bricks behind the bat (a ball not hit knocks them down then). */
  bricksMs: 260,
} as const;

/**
 * Generous windows: a phone's tap has its own lag, and the game is a moment of the story. Wider after the ball's arrival
 * (a phone lands a tap late; a little early is pulled over the wall, the heavier outcome, so that side stays as it was).
 * The late near window ends before the ball reaches the bricks (a late swing never edges a ball already in them).
 */
export const CRICKET_TUNING: CueTapTuning = {
  leadMs: CRICKET_FIELD.settleMs + CRICKET_FIELD.runUpMs,
  /** From her hand to the bat. */
  approachMs: 1000,
  cleanEarlyMs: 85,
  cleanLateMs: 125,
  nearEarlyMs: 210,
  nearLateMs: 250,
  noneAfterMs: 650,
};

/** When the ball leaves her hand, reaches the bat and the bricks, and when a play without a swing ends. */
export const CRICKET_RELEASE_MS = CRICKET_TUNING.leadMs;
export const CRICKET_CONTACT_MS = cueTapMoment(CRICKET_TUNING);
export const CRICKET_BRICKS_MS = CRICKET_CONTACT_MS + CRICKET_FIELD.bricksMs;
export const CRICKET_END_MS = cueTapEnd(CRICKET_TUNING);

/**
 * Clean: straight back. A little early: pulled over the side. A little late: off the edge. Far off: bowled. No swing (a
 * swing during her run-up, before the ball leaves her hand, does not count: the batter can still swing at it).
 */
export const cricketRules = cueTapRules<CricketParams, CricketOutcome>(CRICKET_TUNING,
  { clean: "six", early: "over_wall", late: "edge", miss: "bowled", none: "no_swing" });
