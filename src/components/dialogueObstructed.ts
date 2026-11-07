/** The scene must not advance or reveal text while a reading control is open. */
export function dialogueObstructed(): boolean {
  return (
    document.hidden ||
    !!document.querySelector(
      "dialog[open], details.vn-tools-menu[open], details.battle-tool-menu[open]",
    )
  );
}

/**
 * A pointer tap on a story scene must not read on while something lies over it:
 * all that dialogueObstructed counts, a non-modal dialog such as the header's
 * held-item detail (`role="dialog"`, rendered only while open; a tap beside it
 * closes it), and the travel transition (TravelTransition's overlay, which lets
 * taps through to the scene that has just started under it). Taps only
 * (useSceneTap): the detail and the transition leave the keyboard, the
 * typewriter and the auto-advance as they are.
 */
export function tapsObstructed(): boolean {
  return dialogueObstructed() || !!document.querySelector('[role="dialog"], .travel-transition');
}
