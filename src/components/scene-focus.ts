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
 * The ring of a focus moved by the page shows only once a key has been pressed
 * (`:focus-visible` as for the keyboard; 2026-11-13). Before any key (a page
 * just loaded, which the browser may count as keyboard use) and after a pointer
 * press (Safari does not focus a tapped button, so it may show it), the target
 * is marked `data-quiet-focus` until it loses the focus, and the ring stays
 * hidden: neither a finger nor a page load brings a ring with it. The focus still
 * moves, for keyboards and screen readers; a key pressed while it is there shows
 * its ring.
 */

const QUIET = "quietFocus";
let keyLast = false;
if (typeof document !== "undefined") {
  document.addEventListener("pointerdown", () => { keyLast = false; }, true);
  document.addEventListener("keydown", (event) => {
    // A shortcut (Ctrl, ⌘ or Alt with a key) is not moving about the page.
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    keyLast = true;
    const active = document.activeElement;
    if (active instanceof HTMLElement) delete active.dataset[QUIET];
  }, true);
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

/** Give `target` the focus without scrolling; its ring shows only after a key (none after a pointer or before any input). */
export function focusQuietly(target: HTMLElement) {
  if (!keyLast) {
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
