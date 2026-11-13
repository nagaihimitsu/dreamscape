import type { MiniGameRating, MiniGameRules } from "../contract";
import { cueTapEnd, cueTapMoment, cueTapOutcome, cueTapRules, type CueTapRecord, type CueTapTuning } from "../engines/cue_tap/engine";

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

/** Generous windows: a phone's tap has its own lag, and the game is a moment of the story. */
export const CRICKET_TUNING: CueTapTuning = {
  leadMs: CRICKET_FIELD.settleMs + CRICKET_FIELD.runUpMs,
  /** From her hand to the bat. */
  approachMs: 1000,
  cleanMs: 85,
  nearMs: 210,
  noneAfterMs: 650,
};

/** When the ball leaves her hand, reaches the bat and the bricks, and when a play without a swing ends. */
export const CRICKET_RELEASE_MS = CRICKET_TUNING.leadMs;
export const CRICKET_CONTACT_MS = cueTapMoment(CRICKET_TUNING);
export const CRICKET_BRICKS_MS = CRICKET_CONTACT_MS + CRICKET_FIELD.bricksMs;
export const CRICKET_END_MS = cueTapEnd(CRICKET_TUNING);

/**
 * The result card's ★ (display only: never saved, never in Ink; docs/13 4.1), in step with the outcome: a clean hit ★3,
 * a little early or late ★2, a miss ★1, no swing not rated. The score says how far off the swing was, so practice shows
 * which way to move (「0.12秒早い」).
 */
export function cricketRating(record: CueTapRecord, tuning: CueTapTuning = CRICKET_TUNING): MiniGameRating | null {
  const engine = cueTapOutcome(record, tuning);
  if (engine === "none" || record === null) return null;
  const off = record - cueTapMoment(tuning);
  const seconds = (Math.abs(off) / 1000).toFixed(2);
  return {
    stars: engine === "clean" ? 3 : engine === "miss" ? 1 : 2,
    scoreJa: engine === "clean" ? `ずれ ${seconds}秒` : `${seconds}秒${off < 0 ? "早い" : "遅い"}`,
  };
}

/** The cricket's rules with a tuning (the story's, or Debug's room's edited one). */
export function cricketRulesFor(tuning: CueTapTuning): MiniGameRules<CricketParams, CricketOutcome, CueTapRecord> {
  // Clean: straight back. A little early: pulled over the side. A little late: off the edge. Far off: bowled. No swing.
  const rules = cueTapRules<CricketParams, CricketOutcome>(tuning, { clean: "six", early: "over_wall", late: "edge", miss: "bowled", none: "no_swing" });
  return { ...rules, rate: (record) => cricketRating(record, tuning) };
}

export const cricketRules = cricketRulesFor(CRICKET_TUNING);
