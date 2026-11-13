import { useEffect } from "react";

// A tiny vibration for a few moments of play (2026-11-13 user decision), through the browser's Vibration API where it has
// one (Android's Chrome; iOS Safari has none, and there nothing happens). ⚙設定's 「振動する」 (the display setting
// `vibration`, on by default, offered only where the browser can vibrate) turns it off. Vibration is no motion on screen:
// 「演出を短縮する」 and the system's reduced motion leave it as it is. Presentation only: nothing of the relationship
// ever vibrates, and a browser that refuses is left in silence.

/**
 * What vibrates: a held item gained, a clue recorded, a scene's shake (another effect's); and a mini-game's moments
 * (docs/13 2.6): a press (`tap`), a contact (`hit`), a good finish (`success`), a finish that went wrong (`fail`).
 */
export type VibrationKind = "item" | "clue" | "shake" | "tap" | "hit" | "success" | "fail";

/** Each kind's pattern (milliseconds, or on-off-on): a short tap, never a long buzz. */
const PATTERNS: Readonly<Record<VibrationKind, number | readonly number[]>> = {
  item: 15, clue: 10, shake: 40, tap: 10, hit: 25, success: [15, 40, 15], fail: 40,
};

export const vibrationPattern = (kind: VibrationKind): number | readonly number[] => PATTERNS[kind];

/** Whether this browser has the Vibration API (GameApp shows 「振動する」 only then). */
export const canVibrate = (navigator: { vibrate?: unknown } | undefined): boolean => typeof navigator?.vibrate === "function";

/** ⚙設定's 「振動する」 (useVibrationSetting). Off until the settings are read. */
let enabled = false;

/** Vibrates once for `kind`, when the setting is on, the browser can and the page is shown. */
export function vibrate(kind: VibrationKind): void {
  if (!enabled || typeof navigator === "undefined" || !canVibrate(navigator) || document.hidden) return;
  try {
    const pattern = vibrationPattern(kind);
    navigator.vibrate(typeof pattern === "number" ? pattern : [...pattern]);
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
