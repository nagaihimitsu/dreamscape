import { REACTION_MARKS, type ReactionMark } from "./dialogue-reactions";

// Served files (URL paths below the game's base) that the game's code names
// itself. Every other image path comes from content data, which content:build
// checks. The dev server answers a missing file with its HTML page, so the
// browser would not show the loss: code-images.test.ts checks these files and
// that no other code names a served path.

/** The icon of a held item whose catalog entry has no `iconPath`. */
export const DEFAULT_ITEM_ICON = "assets/items/item.svg";

/** The decorative artwork of a reaction mark. */
export function reactionMarkImage(mark: ReactionMark): string {
  return `assets/effects/${mark}.svg`;
}

/** The reduced copies of tourism photos that content:build writes (scripts/derived-images.ts). */
export type DerivedImageKind = "card" | "backdrop" | "recap";

/**
 * The served file of a tourism photo's reduced copy, written by content:build
 * into the generated public folder only (never into a public/ folder). The game
 * names it through derivedImagePath (derived-images.ts).
 */
export function derivedImageFile(journeyId: string, assetId: string, kind: DerivedImageKind): string {
  return `assets/derived/${journeyId}/${assetId}.${kind}.webp`;
}

/** Every served file the code uses; they belong to the root public/ (shared by every journey). */
export const CODE_IMAGE_FILES: readonly string[] = [...REACTION_MARKS.map(reactionMarkImage), DEFAULT_ITEM_ICON];
