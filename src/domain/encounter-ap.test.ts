import { describe, expect, it } from "vitest";
import { battleQuizzes, battles } from "../content";
import { advanceBattle, answerBattle, leaveBattle } from "./battle";
import { startEpisode } from "./chapter";
import { advanceEncounter, chooseEncounter, finishEncounter, startTourismEncounter } from "./encounter";
import { createGame, validateGameState, type GameState } from "./game";
import { earnRewards, settlePendingAp } from "./rewards";
import { skipTourismGuide, startTourismBattle } from "./tourism";

const rewardId = "victory_galleria_first";
const restore = (state: GameState) => validateGameState(JSON.parse(JSON.stringify(state)));

function finishBattle(initial: GameState): GameState {
  let state = initial;
  const battle = battles.find((entry) => entry.id === state.activeBattle?.battleId)!;
  const quiz = battleQuizzes[battle.quizId];
  for (let i = 0; state.activeBattle?.phase !== "result" && i < 160; i++) {
    const active = state.activeBattle!;
    state = active.phase === "question"
      ? answerBattle(state, quiz.questions[active.roundIndex].correctOptionId, state.revision)
      : advanceBattle(state, state.revision);
  }
  expect(state.activeBattle?.phase).toBe("result");
  return restore(state);
}

describe("Galleria encounter and battle AP reward", () => {
  it("preserves a pending overflow without granting it twice across both routes", () => {
    let state = startEpisode(createGame(), "milano_duomo_episode");
    state = finishBattle(startTourismBattle(state, state.revision));
    state = leaveBattle(state, state.revision);
    state = startEpisode(state, "milano_galleria_episode");
    state = skipTourismGuide(state, state.revision);
    state = restore({ ...state, ap: 12 });
    state = startTourismEncounter(state, "galleria_fortune", state.revision, () => 0);
    for (let i = 0; state.activeEncounter && i < 80; i++) {
      state = restore(state);
      const active = state.activeEncounter!;
      state = active.frame.choices.length ? chooseEncounter(state, 0, state.revision)
        : active.frame.ended ? finishEncounter(state, state.revision)
          : advanceEncounter(state, state.revision);
    }
    expect(state.activeEncounter).toBeNull();
    expect(state.completedEncounterIds).toContain("galleria_fortune");
    expect(state.ap).toBe(12);
    expect(state.pendingApRewards).toContainEqual({ rewardId, earnedAp: 1, remainingAp: 1 });
    state = finishBattle(startTourismBattle(state, state.revision));
    expect(state.claimedRewardIds.filter((id) => id === rewardId)).toHaveLength(1);
    expect(state.pendingApRewards.filter((reward) => reward.rewardId === rewardId)).toHaveLength(1);
    state = settlePendingAp({ ...state, ap: 11 });
    expect(state.ap).toBe(12);
    expect(state.pendingApRewards.filter((reward) => reward.rewardId === rewardId)).toHaveLength(0);
    expect(earnRewards(state, [rewardId]).state).toEqual(state);
  });
});
