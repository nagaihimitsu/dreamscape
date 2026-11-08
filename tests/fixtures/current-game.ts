import { createGame, type GameState } from "../../src/domain/game";
import { finishEpisode } from "../../src/dev/scenario-builders";

/**
 * Milan free time reached with the real rules: read the Duomo guide and win
 * its battle. This completes the Duomo episode (which completes the Milan
 * chapter that ordinary dates require) and earns its four first-time rewards (4 AP).
 */
export function seedCurrentFreeTime(initial: GameState = createGame()): GameState {
  return finishEpisode(initial, "milano_duomo_episode", { guide: "read" });
}
