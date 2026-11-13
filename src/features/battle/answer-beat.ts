// What a quiz answer saved in this screen plays (2026-11-13 user decision, ためと決め). Presentation only: the answer is
// saved and scored before any of it, and a restored feedback plays nothing.

/**
 * How long a right answer is held still before its pulse, its sound and its feedback: inside the double tap's moment
 * (DOUBLE_TAP_WINDOW_MS, src/components/double-tap.ts), whose taps are ignored anyway, so the hold delays no tap.
 */
export const CORRECT_HOLD_MS = 150;

/**
 * `hold`: held still, then its gold pulse, quiz_correct, the stamp and the feedback; `glow`: under reduced motion, its
 * gold glow and quiz_correct at once, nothing moving; `stamp`: a special battle's wrong answer (its existing stamp);
 * `none`: an ordinary quiz's wrong answer (quiet: its sound and its card's small shake only).
 */
export type AnswerBeat = "hold" | "glow" | "stamp" | "none";

export function answerBeat({ right, moving, special }: { right: boolean; moving: boolean; special: boolean }): AnswerBeat {
  if (right) return moving ? "hold" : "glow";
  return special && moving ? "stamp" : "none";
}
