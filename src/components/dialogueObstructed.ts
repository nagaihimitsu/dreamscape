/** The scene must not advance or reveal text while a reading control is open. */
export function dialogueObstructed(): boolean {
  return (
    document.hidden ||
    !!document.querySelector(
      "dialog[open], details.vn-tools-menu[open], details.battle-tool-menu[open]",
    )
  );
}
