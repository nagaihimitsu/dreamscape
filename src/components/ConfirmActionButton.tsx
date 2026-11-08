import { useEffect, useState, type ButtonHTMLAttributes } from "react";

/**
 * How long a confirmation's action stays disabled after the confirmation appears. The confirmation
 * replaces the button that asked for it (and starts at its top), so the second tap of a double tap
 * on that button, which comes up to about 300 ms after the first, can land on the action itself:
 * the data would go without a deliberate second press (AGENTS.md 「明示確認」「誤タップ防止」).
 * Nobody reads a confirmation this fast, so a press made after reading always counts.
 */
export const CONFIRM_SETTLE_MS = 500;

/**
 * The irreversible action of a confirmation (e.g. 「消去する」): disabled, and shown as such, until
 * the confirmation has been on screen for CONFIRM_SETTLE_MS. Each time the confirmation opens anew
 * the button mounts anew, so the wait starts again.
 */
export function ConfirmActionButton({ disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(true), CONFIRM_SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, []);
  return <button type="button" {...props} disabled={disabled || !settled} />;
}
