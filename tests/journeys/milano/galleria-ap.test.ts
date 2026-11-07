import { describe, expect, it } from "vitest";
import { playBattleToResult } from "../../../src/dev/scenario-builders";
import { leaveBattleResult, startEpisode } from "../../../src/domain/chapter";
import { advanceEncounter, chooseEncounter, encounterCanFinish, finishEncounter, startTourismEncounter } from "../../../src/domain/encounter";
import { createGame, validateGameState, type GameState } from "../../../src/domain/game";
import { earnRewards, settlePendingAp } from "../../../src/domain/rewards";
import { skipTourismGuide, startTourismBattle } from "../../../src/domain/tourism";

const rewardId = "victory_galleria_first";
const restore = (state: GameState) => validateGameState(JSON.parse(JSON.stringify(state)));

/** The battle played to its result with the real rules, then saved and restored. */
const finishBattle = (initial: GameState) => restore(playBattleToResult(initial));

describe("Galleria encounter and battle AP reward", () => {
  it("preserves a pending overflow without granting it twice across both routes", () => {
    let state = startEpisode(createGame(), "milano_duomo_episode");
    state = finishBattle(startTourismBattle(state, state.revision));
    state = leaveBattleResult(state, state.revision);
    state = startEpisode(state, "milano_galleria_episode");
    state = skipTourismGuide(state, state.revision);
    state = restore({ ...state, ap: 12 });
    state = startTourismEncounter(state, "galleria_fortune", state.revision, () => 0);
    for (let i = 0; state.activeEncounter && i < 80; i++) {
      state = restore(state);
      const active = state.activeEncounter!;
      state = active.frame.choices.length ? chooseEncounter(state, 0, state.revision)
        : encounterCanFinish(state) ? finishEncounter(state, state.revision)
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
