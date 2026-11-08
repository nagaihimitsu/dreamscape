/** The scene must not advance or reveal text while a reading control is open. */
export function dialogueObstructed(): boolean {
  return (
    document.hidden ||
    !!document.querySelector("dialog[open]")
  );
}

/**
 * A pointer that goes down at `point` on a story scene must not read on while
 * something lies over the scene there: all that dialogueObstructed counts, a
 * non-modal dialog such as the header's held-item detail (`role="dialog"`,
 * rendered only while open; a tap anywhere beside it closes it), and the travel
 * transition's card in the middle of the screen (TravelTransition: its overlay
 * lets taps through to the scene that has just started under it, so a tap on the
 * picture of the move would read that scene on; the rest of the scene stays in
 * view and takes taps as usual). Pointer taps only (useSceneTap): the detail and
 * the transition leave the keyboard, the typewriter and the auto-advance as they are.
 */
export function tapsObstructed(point: { x: number; y: number }): boolean {
  if (dialogueObstructed() || document.querySelector('[role="dialog"]')) return true;
  const card = document.querySelector(".travel-transition-scene")?.getBoundingClientRect();
  return !!card && point.x >= card.left && point.x <= card.right && point.y >= card.top && point.y <= card.bottom;
}
