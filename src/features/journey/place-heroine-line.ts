import type { TravelPlace } from "../../content/travel-schemas";
import type { GameState } from "../../domain/game";
import { itemLines } from "../../domain/item-lines";
import { withNames } from "../romance/names";

/**
 * The heroine's few words by a chosen place's card in free time (2026-11-11 user decision): the first of the place's
 * `heroineLinesJa` that holds now (a plain line always, a `{ textJa, when }` line while its condition holds), the names
 * set filled in. Null when the place has none or none holds: then nothing shows.
 */
export function placeHeroineLine(game: Readonly<GameState>, place: Pick<TravelPlace, "heroineLinesJa">): string | null {
  const line = itemLines(game, place.heroineLinesJa)?.[0];
  return line === undefined ? null : withNames(line, game);
}
