import type { AnyMiniGameDefinition } from "./contract";
import * as registered from "./registry-list";

// The registry of the mini-games (docs/13 2.1), built from registry-list.ts: the definitions by ID. Light: the
// definitions only (a game's play, rules and CSS load later through its `load()`).

const list: readonly AnyMiniGameDefinition[] = Object.values(registered);

/** Every registered game by its ID. */
export const MINI_GAMES: Readonly<Record<string, AnyMiniGameDefinition>> = Object.fromEntries(list.map((definition) => [definition.id, definition]));
/** The registered games' IDs, in the list's order. */
export const MINI_GAME_IDS: readonly string[] = list.map((definition) => definition.id);
/** Every engine some game is a skin of. */
export const MINI_GAME_ENGINES: readonly string[] = [...new Set(list.map((definition) => definition.engine))];

/** The definition of a registered game; undefined for any other ID. */
export function miniGameDefinition(id: string): AnyMiniGameDefinition | undefined {
  return Object.hasOwn(MINI_GAMES, id) ? MINI_GAMES[id] : undefined;
}
