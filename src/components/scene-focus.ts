/**
 * Focus after a screen change (UI redesign §3.7, decisions E and K): when a new
 * screen replaces the one whose control had the focus, the focus would fall to
 * the page body (Tab then starts from wherever the removed control was). The
 * new screen's visible heading takes it instead, so keyboard users see where
 * they are and screen readers read the new screen's name.
 *
 * Only a lost focus moves: one that a screen or a dialog has placed (a battle's
 * feedback, a cut-in's skip button, ⚙設定 after ロード, the journey selector
 * after a switch) stays where it is. A heading that takes the focus has
 * `tabIndex={-1}` (a target, not a stop in the Tab order) and the two-tone ring
 * of styles.css while the focus is visible.
 *
 * After a pointer press the browser would decide on its own whether the ring of
 * a focus moved by the page shows (Safari does not focus a tapped button, so it
 * may show it). The heading is then marked `data-quiet-focus` until it loses the
 * focus, and the ring stays hidden: a finger never brings a ring with it.
 */

const QUIET = "quietFocus";
let pointerLast = false;
if (typeof document !== "undefined") {
  document.addEventListener("pointerdown", () => { pointerLast = true; }, true);
  document.addEventListener("keydown", () => { pointerLast = false; }, true);
}

/** Whether the focus is lost: on nothing, on the page body, or on the screen's own container. */
export function focusIsLost(container: Element | null): boolean {
  const active = document.activeElement;
  return !active || active === document.body || active === container;
}

/** A heading that can take the focus now: rendered, and not inside an inert part (a window under a title card). */
function shownHeading(container: Element): HTMLElement | null {
  for (const heading of container.querySelectorAll<HTMLElement>("h1[tabindex='-1']"))
    if (heading.getClientRects().length > 0 && !heading.closest("[inert]")) return heading;
  return null;
}

/** Give `target` the focus without scrolling; a pointer's focus shows no ring. */
export function focusQuietly(target: HTMLElement) {
  if (pointerLast) {
    target.dataset[QUIET] = "";
    target.addEventListener("blur", () => delete target.dataset[QUIET], { once: true });
  } else delete target.dataset[QUIET];
  target.focus({ preventScroll: true });
}

/**
 * After a screen change inside `container` (the game's `<main>`): when the focus is lost, its
 * visible scene heading takes it, or the container itself when the screen has none (the free
 * observation of a landmark, a title card that keeps the window inert for a moment).
 */
export function focusSceneHeading(container: HTMLElement | null) {
  if (!container || !focusIsLost(container)) return;
  focusQuietly(shownHeading(container) ?? container);
}
