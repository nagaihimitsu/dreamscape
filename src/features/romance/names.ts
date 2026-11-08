import type { GameState } from "../../domain/game";

/** Fill the player's and heroine's chosen names into a display text. */
export function withNames(text: string, game: Pick<GameState, "playerName" | "heroineName">) {
  return text
    .replaceAll("{player_name}", game.playerName)
    .replaceAll("{heroine_name}", game.heroineName);
}
