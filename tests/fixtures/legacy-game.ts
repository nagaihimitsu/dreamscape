import { city } from "../../src/content";
import {
  createGame,
  validateGameState,
  type GameState,
} from "../../src/domain/game";

/** Valid current-schema test state retaining the original optional trial. */
export function seedLegacyChapter(
  initial: GameState = createGame(),
): GameState {
  return validateGameState({
    ...initial,
    revision: initial.revision + 1,
    ap: city.firstClearReward.ap,
    completedChapters: [city.id],
    claimedRewardIds: [city.firstClearReward.rewardSourceId],
    legacyTrialAvailable: true,
  });
}

/** Current-schema test state with access to the original Last Supper trial. */
export function createLegacyJourneyGame(
  playerName?: string,
  heroineName?: string,
): GameState {
  const fresh = createGame(playerName, heroineName);
  return validateGameState({ ...fresh, legacyTrialAvailable: true });
}
