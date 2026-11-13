import { useEffect } from "react";

// A tiny vibration for a few moments of play (2026-11-13 user decision), through the browser's Vibration API where it has
// one (Android's Chrome; iOS Safari has none, and there nothing happens). ⚙設定's 「振動する」 (the display setting
// `vibration`, on by default, offered only where the browser can vibrate) turns it off. Vibration is no motion on screen:
// 「演出を短縮する」 and the system's reduced motion leave it as it is. Presentation only: nothing of the relationship
// ever vibrates, and a browser that refuses is left in silence.

/** What vibrates: a held item gained, a clue recorded, a scene's shake (another effect's). */
export type VibrationKind = "item" | "clue" | "shake";

/** Each kind's pattern (milliseconds): a short tap, never a long buzz. */
const PATTERNS: Readonly<Record<VibrationKind, number>> = { item: 15, clue: 10, shake: 40 };

export const vibrationPattern = (kind: VibrationKind): number => PATTERNS[kind];

/** Whether this browser has the Vibration API (GameApp shows 「振動する」 only then). */
export const canVibrate = (navigator: { vibrate?: unknown } | undefined): boolean => typeof navigator?.vibrate === "function";

/** ⚙設定's 「振動する」 (useVibrationSetting). Off until the settings are read. */
let enabled = false;

/** Vibrates once for `kind`, when the setting is on, the browser can and the page is shown. */
export function vibrate(kind: VibrationKind): void {
  if (!enabled || typeof navigator === "undefined" || !canVibrate(navigator) || document.hidden) return;
  try {
    navigator.vibrate(vibrationPattern(kind));
  } catch {
    // A browser may refuse (no user gesture yet, a frame without permission): the game goes on.
  }
}

/** Applies ⚙設定's 「振動する」 (GameApp). */
export function useVibrationSetting(on: boolean): void {
  useEffect(() => {
    enabled = on;
  }, [on]);
}
