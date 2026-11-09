import { encounters } from "../content/encounters";
import type { GameState } from "./game-state-schema";

/**
 * Where an item may be held, given, used and required (the item design §2.4–2.5): its own city, and for an item
 * carried through the journey (`"carry": "journey"`) a later city once its own city is done. Obtaining it stays in
 * its own city (the callers that give items check that themselves).
 */
export const itemDefinition = (itemId: string) => encounters.items.find((item) => item.id === itemId);
export const isCarriedItem = (itemId: string) => itemDefinition(itemId)?.carry === "journey";
export function itemUsableIn(state: Pick<GameState, "completedCityIds">, itemId: string, cityId: string): boolean {
  const item = itemDefinition(itemId);
  return !!item && (item.cityId === cityId || (item.carry === "journey" && state.completedCityIds.includes(item.cityId)));
}
/** A held item carried here from an earlier city (the bag notes where it came from). */
export const carriedFromEarlierCity = (state: Pick<GameState, "currentCityId" | "completedCityIds">, itemId: string) =>
  itemUsableIn(state, itemId, state.currentCityId) && itemDefinition(itemId)?.cityId !== state.currentCityId;
