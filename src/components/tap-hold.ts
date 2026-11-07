import { DOUBLE_TAP_WINDOW_MS } from "./double-tap";

const HOLD_ATTRIBUTE = "data-tap-hold";
let holdTimer: number | undefined;

/**
 * Let no tap reach the page for DOUBLE_TAP_WINDOW_MS, after a story scene starts
 * or ends and a new screen appears under the finger (src/app/scene-exit.ts): the
 * root carries `data-tap-hold`, and styles.css takes pointer events off every
 * element meanwhile. Keyboards are not held. Tests wait for the mark to go.
 */
export function holdTaps() {
  const root = document.documentElement;
  root.setAttribute(HOLD_ATTRIBUTE, "");
  window.clearTimeout(holdTimer);
  holdTimer = window.setTimeout(() => root.removeAttribute(HOLD_ATTRIBUTE), DOUBLE_TAP_WINDOW_MS);
}
