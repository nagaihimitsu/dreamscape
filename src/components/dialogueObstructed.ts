/**
 * The scene must not advance or reveal text while a reading control is open:
 * a native dialog (log, settings, English note), a compact menu, or a non-native
 * dialog such as the header's held-item detail (`role="dialog"`, rendered only
 * while open).
 */
export function dialogueObstructed(): boolean {
  return (
    document.hidden ||
    !!document.querySelector(
      'dialog[open], [role="dialog"], details.vn-tools-menu[open], details.battle-tool-menu[open]',
    )
  );
}
