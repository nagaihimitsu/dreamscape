import type { GameState } from "./game-state-schema";

type Inventory = GameState["inventory"];

/**
 * How the held items changed between two states (the header's cues, 2026-11-13 user decision; display only). An item's
 * status is `held` while it is carried, `gifted` or `used` once a scene gave it away or used it, and `left_behind` when a
 * departure for the next city dropped it (city-travel.ts): only the first two are the player's doing.
 */

/** The items held now, in the inventory's order. */
export const heldItemIds = (inventory: Inventory): string[] => Object.keys(inventory).filter((id) => inventory[id] === "held");

/** The items held in `after` that were not held in `before` (a scene, a reward or a quiz gave them). */
export const gainedItemIds = (before: Inventory, after: Inventory): string[] =>
  heldItemIds(after).filter((id) => before[id] !== "held");

/** The items held in `before` that `after` has given away or used (not those a departure left behind). */
export const spentItemIds = (before: Inventory, after: Inventory): string[] =>
  heldItemIds(before).filter((id) => after[id] === "gifted" || after[id] === "used");
