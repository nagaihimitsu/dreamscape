import { DOUBLE_TAP_WINDOW_MS } from "./double-tap";
import { showIgnoredTap } from "./ignored-tap";

const HOLD_ATTRIBUTE = "data-tap-hold";
let holdTimer: number | undefined;

/** A tap while taps are held presses nothing: it shows the faint ring of an ignored tap at its point (ignored-tap.ts). */
function answerHeldTap(event: PointerEvent) {
  if (document.documentElement.hasAttribute(HOLD_ATTRIBUTE)) showIgnoredTap(event.clientX, event.clientY);
}

/**
 * Let no tap reach the page for DOUBLE_TAP_WINDOW_MS, after a story scene starts
 * or ends (src/app/story-scene-change.ts), a load brings back a saved scene, a
 * journey switch or the lock's 再試行 rebuilds the screen (App.tsx), or ⚙設定's
 * panel closes after セーブ (JourneyHud), and a new screen appears under the
 * finger, or the page that lay under the panel: the root carries `data-tap-hold`,
 * and styles.css takes pointer events off every element meanwhile. A tap meanwhile
 * shows a faint ring where it landed (2026-11-13), so it does not seem lost. Keyboards
 * are not held. Tests wait for the mark to go.
 */
export function holdTaps() {
  const root = document.documentElement;
  root.setAttribute(HOLD_ATTRIBUTE, "");
  // Heard from the next press on (the press that held them has gone down already).
  document.addEventListener("pointerdown", answerHeldTap, true);
  window.clearTimeout(holdTimer);
  holdTimer = window.setTimeout(() => {
    root.removeAttribute(HOLD_ATTRIBUTE);
    document.removeEventListener("pointerdown", answerHeldTap, true);
  }, DOUBLE_TAP_WINDOW_MS);
}
