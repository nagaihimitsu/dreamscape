import "./ignored-tap.css";

// 押したのに何も起きない、をなくす (2026-11-13 user decision): where the game ignores a tap on purpose for a moment (the
// taps held as a scene starts, ends or is loaded and as the journey is switched: tap-hold.ts; the second tap of a double
// tap on a scene: useSceneTap; on an answer: BattleScreen), the ignored tap answers with a faint ring at its point.
// Presentation only: never a control, never the focus, never the game. Read aloud by nothing (aria-hidden).

/** How long the ring shows (ignored-tap.css runs its animation as long). */
export const IGNORED_TAP_MS = 420;
/** Taps closer together than this make one ring (a pointer's burst, two fingers). */
const REPEAT_MS = 120;

/** Whether a ring at `now` follows one at `last` too closely to show (pure; ms). */
export function ringRepeats(last: number | null, now: number): boolean {
  return last !== null && now - last >= 0 && now - last < REPEAT_MS;
}

let lastRing: number | null = null;

/** Show the faint ring of an ignored tap at the screen point `x`, `y` (px). Reduced motion: a brief fade in place. */
export function showIgnoredTap(x: number, y: number): void {
  if (typeof document === "undefined" || !document.body || !Number.isFinite(x) || !Number.isFinite(y)) return;
  const now = performance.now();
  if (ringRepeats(lastRing, now)) return;
  lastRing = now;
  const still = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || !!document.querySelector(".app-shell.reduce-motion");
  const ring = document.createElement("span");
  ring.className = still ? "ignored-tap is-still" : "ignored-tap";
  ring.setAttribute("aria-hidden", "true");
  ring.dataset.testid = "ignored-tap";
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  document.body.append(ring);
  window.setTimeout(() => ring.remove(), IGNORED_TAP_MS);
}
