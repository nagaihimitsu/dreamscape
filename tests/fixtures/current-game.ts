import { createGame, validateGameState, type GameState } from "../../src/domain/game";
import { startEpisode } from "../../src/domain/chapter";
import { advanceTourismGuide, startTourismBattle } from "../../src/domain/tourism";
import { advanceBattle, answerBattle, getActiveBattleContent, leaveBattle } from "../../src/domain/battle";

/**
 * Milan free time reached with the real rules: read the Duomo guide and win
 * its battle. This records the Milan chapter and earns its four first-time
 * rewards (4 AP), so ordinary dates can start.
 */
export function seedCurrentFreeTime(initial: GameState = createGame()): GameState {
  let state = startEpisode(initial, "milano_duomo_episode");
  for (let line = 0; state.activeTourism?.phase === "guide"; line++) {
    if (line > 200) throw new Error("Could not finish the Duomo guide");
    state = advanceTourismGuide(state, state.revision);
  }
  state = startTourismBattle(state, state.revision);
  for (let step = 0; state.activeBattle?.phase !== "result"; step++) {
    if (!state.activeBattle || step > 250) throw new Error("Could not finish the Duomo battle");
    const active = state.activeBattle;
    const { quiz } = getActiveBattleContent(active);
    state = active.phase === "question"
      ? answerBattle(state, quiz.questions[active.roundIndex].correctOptionId, state.revision)
      : advanceBattle(state, state.revision);
  }
  return validateGameState(leaveBattle(state, state.revision));
}
