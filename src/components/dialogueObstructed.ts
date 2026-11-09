/**
 * The scene must not advance or reveal text while a reading control is open: a
 * modal `dialog`, or a popover of the header (the ⚙設定 panel, the held items'
 * detail) while its dismiss layer marks the page with `data-obstructs-dialogue`
 * (DismissLayer).
 */
export function dialogueObstructed(): boolean {
  return (
    document.hidden ||
    !!document.querySelector("dialog[open], [data-obstructs-dialogue]")
  );
}

/**
 * A pointer that goes down at `point` on a story scene must not read on while
 * something lies over the scene there: all that dialogueObstructed counts, a
 * non-modal dialog such as the header's held-item detail (`role="dialog"`,
 * rendered only while open; a tap anywhere beside it closes it), and the travel
 * transition's card in the middle of the screen (TravelTransition). The transition's
 * and the time passage's overlays take every pointer tap while they show (UI redesign
 * H22: a double tap on a destination ends on them and reads nothing on); the card
 * check stays for a tap that went down on the card as the overlay went away. Pointer taps only (useSceneTap): the detail and
 * the transition leave the keyboard, the typewriter and the auto-advance as they are.
 */
export function tapsObstructed(point: { x: number; y: number }): boolean {
  if (dialogueObstructed() || document.querySelector('[role="dialog"]')) return true;
  const card = document.querySelector(".travel-transition-scene")?.getBoundingClientRect();
  return !!card && point.x >= card.left && point.x <= card.right && point.y >= card.top && point.y <= card.bottom;
}
