import { useEffect, useState, type ButtonHTMLAttributes } from "react";

/**
 * How long a confirmation's action stays disabled after the confirmation appears. The second tap of
 * a double tap on the button that asked for the confirmation comes up to about 300 ms after the
 * first, at the same point. Should the action be under that point, the data would go without a
 * deliberate second press (AGENTS.md 「明示確認」「誤タップ防止」): the wait makes such a quick tap do
 * nothing. Screens keep the action away from that point where they can as well: in the old-data
 * cleanup the point holds 「消去せず戻る」 (OldDataCleanup). Nobody reads a confirmation this fast, so
 * a press made after reading always counts.
 */
export const CONFIRM_SETTLE_MS = 500;

/**
 * Whether a step that has just appeared still waits: true from the very render in which `step` takes
 * a new value until CONFIRM_SETTLE_MS later (so no press slips in before the wait starts), false
 * while `step` is null. A step is a value that is new each time the step appears, such as the object
 * of a result just shown. A component that mounts anew waits again, whatever its step.
 */
export function useSettling(step: unknown): boolean {
  const [settled, setSettled] = useState<unknown>(null);
  useEffect(() => {
    if (step === null) return;
    const timer = window.setTimeout(() => setSettled(() => step), CONFIRM_SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [step]);
  return step !== null && settled !== step;
}

/**
 * The irreversible action of a confirmation (e.g. 「消去する」): it ignores presses, and is shown and
 * announced as disabled (aria-disabled; the look: styles.css `[data-settling]`), until the
 * confirmation has been on screen for CONFIRM_SETTLE_MS. It stays in the Tab order meanwhile, so a
 * keyboard user who presses Tab at once still reaches it. Each time the confirmation opens anew the
 * button mounts anew, so the wait starts again.
 */
export function ConfirmActionButton({ disabled, onClick, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const settling = useSettling(true);
  return <button type="button" {...props} disabled={disabled}
    aria-disabled={settling || undefined} data-settling={settling || undefined}
    onClick={(event) => { if (!settling) onClick?.(event); }} />;
}
