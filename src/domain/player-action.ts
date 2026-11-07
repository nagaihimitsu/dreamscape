import { advanceCompletedJourneyCity } from "./city-travel";
import type { GameState } from "./game";
import { finishTravelEventIfComplete } from "./travel-game";

/**
 * One player action as the game applies it: the change, the map event it completes, and the
 * automatic departure of a completed city, as one snapshot (the one that is saved). Returns
 * `previous` itself when the action changed nothing.
 */
export function applyPlayerAction(previous: GameState, change: (state: GameState) => GameState): GameState {
  const changed = finishTravelEventIfComplete(previous, change(previous));
  if (changed === previous) return previous;
  return advanceCompletedJourneyCity(changed, changed.revision);
}
