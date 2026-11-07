import { describe, expect, it } from "vitest";
import { battles, battleQuizzes, episodes } from "../../../src/content";
import { playBattleToResult, wrongAnswer } from "../../../src/dev/scenario-builders";
import { createGame, validateGameState, type GameState } from "../../../src/domain/game";
import { enterFreeTime, getEpisodeAvailability, getNextStoryBattle, startEpisode } from "../../../src/domain/chapter";
import { skipTourismGuide, startTourismBattle } from "../../../src/domain/tourism";
import { advanceBattle, answerBattle, selectReasoningClue, startBattle } from "../../../src/domain/battle";

const roundTrip = (state: GameState) => validateGameState(JSON.parse(JSON.stringify(state)));

/** Correct evidence, wrong answers, then a save/restore round trip. */
const finish = (state: GameState) => roundTrip(playBattleToResult(state, { answer: wrongAnswer }));

function completeEpisode(state: GameState, episodeId: string): GameState {
  state = startEpisode(state, episodeId);
  expect(state.activeTourism).not.toBeNull();
  state = skipTourismGuide(state, state.revision);
  state = startTourismBattle(state, state.revision);
  state = finish(state);
  return enterFreeTime(state, state.revision);
}

function beforeSpecial(kind: "contradiction" | "connection"): GameState {
  let state = createGame();
  for (const episode of episodes.slice(0, 3)) state = completeEpisode(state, episode.id);
  expect(getNextStoryBattle(state)?.battleId).toBe("milano_la_scala_b01");
  if (kind === "connection") {
    state = finish(startBattle(state, "milano_la_scala_b01"));
    state = enterFreeTime(state, state.revision);
    state = completeEpisode(state, "milano_castello_episode");
    expect(getNextStoryBattle(state)?.battleId).toBe("milano_brera_c01");
  }
  return roundTrip(state);
}

describe("current journey special battles", () => {
  it("makes the Scala and Brera encounters available without blocking other sightseeing", () => {
    let state = beforeSpecial("contradiction");
    expect(getEpisodeAvailability(state, "milano_castello_episode").available).toBe(true);
    state = finish(startBattle(state, "milano_la_scala_b01"));
    state = enterFreeTime(state, state.revision);
    state = completeEpisode(state, "milano_castello_episode");
    expect(getNextStoryBattle(state)?.battleId).toBe("milano_brera_c01");
    state = finish(startBattle(state, "milano_brera_c01"));
    expect(state.battleRecords.find((record) => record.battleId === "milano_la_scala_b01")?.attempts).toBe(1);
    expect(state.battleRecords.find((record) => record.battleId === "milano_brera_c01")?.attempts).toBe(1);
    expect(roundTrip(state)).toEqual(state);
  });

  it.each(["contradiction", "connection"] as const)("resumes %s evidence from the same version and rejects a mismatched battle", (kind) => {
    const initial = beforeSpecial(kind);
    const battleId = kind === "contradiction" ? "milano_la_scala_b01" : "milano_brera_c01";
    const battle = battles.find((item) => item.id === battleId)!;
    let state = startBattle(initial, battleId);
    for (let step = 0; state.activeBattle?.phase !== "reasoning"; step++) {
      expect(step).toBeLessThan(200);
      const active = state.activeBattle!;
      state = active.phase === "question"
        ? answerBattle(state, battleQuizzes[battle.quizId].questions[active.roundIndex].correctOptionId, state.revision)
        : advanceBattle(state, state.revision);
    }
    state = selectReasoningClue(state, battle.reasoning!.correctClueIds[0], state.revision);
    const selected = state.activeBattle!.reasoning!.selectedClueIds;
    const restored = roundTrip(state);
    expect(restored.activeBattle!.reasoning!.selectedClueIds).toEqual(selected);
    expect(() => roundTrip({ ...restored, activeBattle: { ...restored.activeBattle!, contentHash: "changed-content" } })).toThrow("バトルが更新されています。以前の途中データは保管されています。");
    const completed = finish(restored);
    const suffix = kind === "contradiction" ? "scala" : "brera";
    const rewardIds = [
      `battle_${suffix}_first`,
      ...(completed.activeBattle!.score >= 2 ? [`victory_${suffix}_first`] : []),
      `episode_${suffix}_first`,
    ];
    expect(completed.claimedRewardIds).toEqual([...initial.claimedRewardIds, ...rewardIds]);
    const total = (game: GameState) => game.ap + game.pendingApRewards.reduce((sum, reward) => sum + reward.remainingAp, 0);
    expect(total(completed)).toBe(total(initial) + rewardIds.length);
  });
});
