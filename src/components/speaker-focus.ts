import type { Speaker } from "../story/frame-reader";

/** How a shown character stands while a line is read (CharacterPortrait's `focus`). */
export type PortraitFocus = "speaking" | "listening";

/**
 * The line's speaker comes slightly forward and the other shown characters listen, slightly
 * dimmed (the player has no portrait: at their lines both listen; a named person, `# speaker:
 * <person ID>`, comes forward in the slot opposite the heroine when they have a portrait, which
 * each screen decides with speakingPerson). Narration, and a screen without a line, leave every
 * portrait as it is.
 */
export function portraitFocus(speaker: Speaker | undefined, role: "heroine" | "enemy"): PortraitFocus | undefined {
  if (!speaker || speaker === "narrator") return undefined;
  return speaker === role ? "speaking" : "listening";
}
