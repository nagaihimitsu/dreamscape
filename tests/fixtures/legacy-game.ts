import phase1 from "./phase1-saves.json";
import { city } from "../../src/content";
import {
  createGame,
  validateGameState,
  type GameState,
} from "../../src/domain/game";

/** Published Phase 1 chapter reward, used only to isolate legacy romance tests. */
export function seedLegacyChapter(
  initial: GameState = createGame(),
): GameState {
  return validateGameState({
    ...phase1.empty,
    revision: initial.revision + 1,
    playerName: initial.playerName,
    heroineName: initial.heroineName,
    ap: city.firstClearReward.ap,
    completedChapters: phase1.started.completedChapters,
    claimedRewardIds: phase1.started.claimedRewardIds,
  });
}
