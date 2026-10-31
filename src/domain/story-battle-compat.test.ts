import { describe, expect, it } from "vitest";
import phase6 from "../../tests/fixtures/phase6-saves.json";
import phase7 from "../../tests/fixtures/phase7-free-time.json";
import { battles, battleQuizzes, episodes } from "../content";
import { createGame, validateGameState, type GameState } from "./game";
import { enterFreeTime, getNextStoryBattle, startEpisode } from "./chapter";
import { skipTourismGuide, startTourismBattle } from "./tourism";
import { advanceBattle, answerBattle, leaveBattle, selectReasoningClue, startBattle, submitBattleEvidence } from "./battle";

function finish(state: GameState): GameState {
  for (let step = 0; state.activeBattle?.phase !== "result" && step < 200; step++) {
    const active = state.activeBattle!;
    const battle = battles.find((item) => item.id === active.battleId)!;
    if (active.phase === "reasoning") {
      for (const clueId of battle.reasoning!.correctClueIds) {
        if (!state.activeBattle!.reasoning!.selectedClueIds.includes(clueId))
          state = selectReasoningClue(state, clueId, state.revision);
      }
      state = submitBattleEvidence(state, state.revision);
    } else if (active.phase === "question") {
      const question = battleQuizzes[battle.quizId].questions[active.roundIndex];
      state = answerBattle(state, question.options.find((option) => option.id !== question.correctOptionId)!.id, state.revision);
    } else state = advanceBattle(state, state.revision);
  }
  expect(state.activeBattle?.phase).toBe("result");
  return validateGameState(JSON.parse(JSON.stringify(state)));
}

function beforeCastle(): GameState {
  let state = createGame();
  for (const episode of episodes.slice(0, 3)) {
    state = startEpisode(state, episode.id);
    state = skipTourismGuide(state, state.revision);
    state = startTourismBattle(state, state.revision);
    state = finish(state);
    state = enterFreeTime(state, state.revision);
  }
  return state;
}

describe("story encounters and existing saves", () => {
  it("continues old sightseeing in progress even if its battle is beyond a new encounter", () => {
    const before = beforeCastle();
    expect(getNextStoryBattle(before)?.battleId).toBe("milano_last_supper_b01");
    // Simulate the former release, which could start the castle before B existed
    // in the journey, then load that already-running guide in the new release.
    const old = { ...before, battleRecords: [...before.battleRecords, { battleId: "milano_last_supper_b01", attempts: 1, firstScore: 0, bestScore: 0, lastScore: 0 }] };
    let state = startEpisode(old, "milano_castello_episode");
    state = { ...state, battleRecords: state.battleRecords.filter((record) => record.battleId !== "milano_last_supper_b01") };
    state = validateGameState(JSON.parse(JSON.stringify(state)));
    expect(state.activeTourism?.landmarkId).toBe("castello_sforzesco");
    state = skipTourismGuide(state, state.revision);
    state = startTourismBattle(state, state.revision);
    expect(state.activeBattle?.battleId).toBe("milano_castello_01");
    state = finish(state);
    expect(state.completedEpisodeIds).toContain("milano_castello_episode");
    expect(getNextStoryBattle(state)?.battleId).toBe("milano_last_supper_b01");
  });

  it("recognizes historic zero-score B/C records without undoing an old city ending", () => {
    const records = ["milano_last_supper_b01", "milano_last_supper_c01"].map((battleId) => ({ battleId, attempts: 1, firstScore: 0, bestScore: 0, lastScore: 0 }));
    const old = { ...phase7.cityClearViewed, battleRecords: [...phase7.cityClearViewed.battleRecords, ...records] };
    const state = validateGameState(old);
    expect(getNextStoryBattle(state)).toBeNull();
    expect(state.completedCityIds).toEqual(["milano"]);
    expect(state.endingReached).toBe(true);
    expect(state.battleRecords.filter((record) => records.some((item) => item.battleId === record.battleId))).toEqual(records);
  });

  it.each(["B_selected", "C_selected"] as const)("resumes a former %s proof before its new journey prerequisite", (key) => {
    const old = phase6[key];
    let state = validateGameState(old);
    expect(state.completedEpisodeIds).toEqual([]);
    expect(state.activeBattle?.reasoning?.selectedClueIds).toEqual(old.activeBattle.reasoning.selectedClueIds);
    const before = { ap: state.ap, affection: state.affection, trust: state.trust, spark: state.spark, memories: state.memories, pending: state.pendingApRewards, rewards: state.claimedRewardIds };
    state = finish(state);
    expect(state.activeBattle?.score).toBeLessThanOrEqual(2);
    expect({ ap: state.ap, affection: state.affection, trust: state.trust, spark: state.spark, memories: state.memories, pending: state.pendingApRewards, rewards: state.claimedRewardIds }).toEqual(before);
  });

  it.each(["milano_last_supper_b01", "milano_last_supper_c01"])("never awards AP or consumes pending AP on %s and its replay", (battleId) => {
    let state = validateGameState(phase7.cityClearViewed);
    expect(state.pendingApRewards.length).toBeGreaterThan(0);
    const before = { ap: state.ap, affection: state.affection, trust: state.trust, spark: state.spark, memories: state.memories, pending: state.pendingApRewards, rewards: state.claimedRewardIds, city: state.completedCityIds };
    for (let count = 0; count < 2; count++) {
      state = finish(startBattle(state, battleId));
      expect({ ap: state.ap, affection: state.affection, trust: state.trust, spark: state.spark, memories: state.memories, pending: state.pendingApRewards, rewards: state.claimedRewardIds, city: state.completedCityIds }).toEqual(before);
      state = leaveBattle(state, state.revision);
    }
    expect(state.battleRecords.find((record) => record.battleId === battleId)?.attempts).toBe(2);
  });
});
