// A line's `# item_show: <item ID>` (2026-11-13 user decision): the item's card over the scene while its line is on
// screen (ItemShow.tsx), and, as the line goes, the card's way into the header's bag. Pure rules, apart from the
// components. Presentation only: the card never gives the item (the scene's own `# give:` / `# on_done:` do).

/** How long the card's leaving plays (milliseconds; item-show.css): its flight into the bag, or its fading. */
export const ITEM_LEAVE_MS = 650;

/** Whether an item's picture is drawn as vector art (an SVG: sharp at any size), else a picture of its own pixels. */
export const isVectorIcon = (iconPath: string): boolean => /\.svg$/iu.test(iconPath);

/**
 * The card whose line has just gone: `before`, the item the line on screen showed, `now` the one it shows now (a line
 * with the same item keeps its card); none when a load or Debug's return put another game in place (`replaced`).
 */
export function itemShowLeaving(before: string | undefined, now: string | undefined, replaced: boolean): string | undefined {
  return before && before !== now && !replaced ? before : undefined;
}

export type Box = { left: number; top: number; width: number; height: number };

/**
 * The card's flight from where it was (`card`) into the bag (`bag`): how far its middle moves (dx, dy) and how small it
 * gets (it ends a little smaller than the bag's button).
 */
export function itemFlight(card: Box, bag: Box): { dx: number; dy: number; scale: number } {
  const dx = bag.left + bag.width / 2 - (card.left + card.width / 2);
  const dy = bag.top + bag.height / 2 - (card.top + card.height / 2);
  const scale = card.width > 0 && card.height > 0 ? Math.min(1, (0.8 * Math.min(bag.width, bag.height)) / Math.max(card.width, card.height)) : 0.2;
  return { dx: Math.round(dx), dy: Math.round(dy), scale: Math.round(scale * 1000) / 1000 };
}
