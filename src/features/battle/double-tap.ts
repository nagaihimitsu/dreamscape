/**
 * The second tap of a quick double tap on an answer is ignored (user decision;
 * AGENTS.md 選択肢の誤タップ防止). After the first tap the screen changes under the
 * finger (the verdict and feedback appear, the page may scroll), so the second tap
 * can land on another control: 「訳を見る」, 「英文を確認する」 or even 「敵の反応を見る」,
 * which would skip the feedback. Any tap this soon after an answer is that second tap.
 */

/** The second tap of a double tap arrives within this time after the first. */
export const DOUBLE_TAP_WINDOW_MS = 350;

/** Whether a tap `elapsedMs` after an answer was saved is the second tap of the answering double tap. */
export function isAnswerDoubleTap(elapsedMs: number): boolean {
  return elapsedMs >= 0 && elapsedMs < DOUBLE_TAP_WINDOW_MS;
}
