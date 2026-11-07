/**
 * The second tap of a quick double tap is ignored (user decision for answers;
 * AGENTS.md 選択肢の誤タップ防止). The first tap changes the screen under the
 * finger, so the second can land on something else: after an answer another
 * control of the battle (「訳を見る」, 「英文を確認する」 or even 「敵の反応を見る」,
 * which would skip the feedback), after a reply in a story scene the reaction
 * line, after a scene's end a control of the next screen. Any tap this soon
 * after such a tap is that second tap.
 */

/** The second tap of a double tap arrives within this time after the first. */
export const DOUBLE_TAP_WINDOW_MS = 350;

/** Whether a tap `elapsedMs` after a tap that changed the screen is that tap's second tap. */
export function isSecondTap(elapsedMs: number): boolean {
  return elapsedMs >= 0 && elapsedMs < DOUBLE_TAP_WINDOW_MS;
}
