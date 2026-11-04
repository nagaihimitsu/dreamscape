import { describe, expect, it } from "vitest";
import { allRewardRules, balance, battleQuizzes, battles, journeyConfig } from "../content";
import { loadGame, saveGame, SAVE_KEY, type StorageLike } from "../persistence";
import { advanceBattle, answerBattle, leaveBattle, selectReasoningClue, startBattle, submitBattleEvidence } from "./battle";
import { finalizeBattleProgress } from "./chapter";
import { createGame, type GameState } from "./game";
import { installTestCity } from "./multi-city-test-fixture";
import { claimPendingRewards } from "./rewards";
import { beginTravelEvent } from "./travel-game";
import { advanceTourismGuide, openTourism, replayTourismGuide, skipTourismGuide, startTourismBattle } from "./tourism";

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function restore(state: GameState): GameState {
  const storage = new MemoryStorage();
  expect(saveGame(storage, state).ok).toBe(true);
  const loaded = loadGame(storage);
  expect(loaded.status).toBe("loaded");
  if (loaded.status !== "loaded") throw new Error("Expected a readable current save");
  expect(loaded.state).toEqual(state);
  return loaded.state;
}
const totalAp = (state: GameState) => state.ap + state.pendingApRewards.reduce((sum, reward) => sum + reward.remainingAp, 0);
const rulesFor = (battleId: string) => allRewardRules.filter((rule) => rule.battleId === battleId);

function readGuide(initial: GameState): GameState {
  let state = initial;
  for (let count = 0; state.activeTourism?.phase === "guide" && count < 100; count++) {
    state = advanceTourismGuide(restore(state), state.revision);
  }
  expect(state.activeTourism?.phase).toBe("exploring");
  return restore(state);
}

function finishBattle(initial: GameState, score: number): GameState {
  let state = initial;
  const battle = battles.find((item) => item.id === state.activeBattle!.battleId)!;
  const quiz = battleQuizzes[battle.quizId];
  for (let count = 0; state.activeBattle?.phase !== "result" && count < 160; count++) {
    state = restore(state);
    const active = state.activeBattle!;
    if (active.phase === "reasoning") {
      for (const clue of battle.reasoning!.correctClueIds) state = selectReasoningClue(state, clue, state.revision);
      state = submitBattleEvidence(state, state.revision);
    } else if (active.phase === "question") {
      const question = quiz.questions[active.roundIndex];
      const answer = active.roundIndex < score ? question.correctOptionId : question.options.find((option) => option.id !== question.correctOptionId)!.id;
      state = answerBattle(state, answer, state.revision);
    } else state = advanceBattle(state, state.revision);
  }
  expect(state.activeBattle?.phase).toBe("result");
  expect(state.activeBattle?.score).toBe(score);
  return restore(state);
}

describe.each([
  ["B", "milano_la_scala_b01", "la_scala_case"],
  ["C", "milano_brera_c01", "brera_case"],
])("special battle %s AP rewards", (_mode, battleId, landmarkId) => {
  it.each([0, 1, 2, 3])("earns ordinary sightseeing rewards at score %i, once across save/load", (score) => {
    const rules = rulesFor(battleId);
    expect(rules.map((rule) => rule.trigger).sort()).toEqual(["battle_complete", "battle_score", "episode_clear", "guide_read"]);
    expect(rules.every((rule) => rule.ap === 1)).toBe(true);
    let state = readGuide(openTourism(createGame(), landmarkId));
    expect(totalAp(state)).toBe(1);
    const guideId = rules.find((rule) => rule.trigger === "guide_read")!.id;
    expect(state.claimedRewardIds).toEqual([guideId]);
    state = readGuide(replayTourismGuide(state, state.revision));
    expect(totalAp(state)).toBe(1);
    state = finishBattle(startTourismBattle(state, state.revision), score);
    expect(totalAp(state)).toBe(score >= 2 ? 4 : 3);
    expect(state.battleRewardReceipt?.entries.reduce((sum, entry) => sum + entry.earnedAp, 0)).toBe(score >= 2 ? 3 : 2);
    expect(state.completedEpisodeIds).toEqual([]);
    expect(state.completedCityIds).toEqual([]);
    const claimed = [...state.claimedRewardIds];
    const total = totalAp(state);
    state = restore(finalizeBattleProgress(state));
    expect(state.claimedRewardIds).toEqual(claimed);
    expect(totalAp(state)).toBe(total);
    state = restore(leaveBattle(state, state.revision));
    expect(beginTravelEvent(state, battleId, "walk", state.revision)).toBe(state);
  });

  it("does not give the guide bonus for skipping and preserves all overflow AP", () => {
    let state = openTourism({ ...createGame(), ap: balance.apCap }, landmarkId);
    state = skipTourismGuide(state, state.revision);
    expect(state.completedGuideIds).not.toContain(landmarkId);
    expect(state.claimedRewardIds).toEqual([]);
    state = finishBattle(startTourismBattle(state, state.revision), 2);
    expect(state.ap).toBe(balance.apCap);
    expect(state.pendingApRewards).toHaveLength(3);
    expect(state.pendingApRewards.every((reward) => reward.earnedAp === 1 && reward.remainingAp === 1)).toBe(true);
    const original = totalAp(state);
    state = restore(finalizeBattleProgress(state));
    expect(totalAp(state)).toBe(original);
    state = restore({ ...state, ap: balance.apCap - 3 });
    state = restore(claimPendingRewards(state, state.revision));
    expect(state.ap).toBe(balance.apCap);
    expect(state.pendingApRewards).toEqual([]);
    expect(claimPendingRewards(state, state.revision)).toBe(state);
  });

  it("keeps an existing current-version completion save readable without retroactive AP", () => {
    const result = finishBattle(startBattle(createGame(), battleId), 3);
    const legacyId = journeyConfig.storyBattles.find((battle) => battle.battleId === battleId)!.completionReward!.id;
    const prior: GameState = { ...result, ap: 1, claimedRewardIds: [legacyId],
      battleRewardReceipt: { ...result.battleRewardReceipt!, entries: result.battleRewardReceipt!.entries.filter((entry) => entry.rewardId === legacyId) } };
    expect(restore(prior)).toEqual(prior);
  });

  it("rejects fabricated guide, clear and high-score claims while preserving stored bytes", () => {
    const completed = finishBattle(startBattle(createGame(), battleId), 0);
    for (const trigger of ["guide_read", "episode_clear", "battle_score"] as const) {
      const state = trigger === "episode_clear" ? createGame() : completed;
      const rewardId = rulesFor(battleId).find((rule) => rule.trigger === trigger)!.id;
      const corrupted = { ...state, claimedRewardIds: [...state.claimedRewardIds, rewardId] };
      const raw = JSON.stringify(corrupted);
      const storage = new MemoryStorage();
      storage.setItem(SAVE_KEY, raw);
      expect(loadGame(storage)).toMatchObject({ status: "invalid", raw });
      expect(saveGame(storage, createGame()).ok).toBe(false);
      expect(storage.getItem(SAVE_KEY)).toBe(raw);
    }
  });
});

it("keeps special rewards and guide records independent between cities", () => {
  const cleanup = installTestCity();
  try {
    let milan = readGuide(openTourism(createGame(), "la_scala_case"));
    milan = finishBattle(startTourismBattle(milan, milan.revision), 3);
    milan = leaveBattle(milan, milan.revision);
    const milanIds = [...milan.claimedRewardIds];
    expect(rulesFor("test_special")).toHaveLength(4);
    expect(milanIds.some((id) => rulesFor("test_special").some((rule) => rule.id === id))).toBe(false);
    let second: GameState = { ...milan, currentCityId: "test_city",
      travel: { ...milan.travel, currentPlaceId: "test_hotel", hotelPlaceId: "test_hotel" } };
    second = readGuide(openTourism(restore(second), "test_special_landmark"));
    second = finishBattle(startTourismBattle(second, second.revision), 3);
    expect(totalAp(second)).toBe(totalAp(milan) + 4);
    expect(second.claimedRewardIds).toEqual(expect.arrayContaining(milanIds));
    expect(second.claimedRewardIds).toEqual(expect.arrayContaining(rulesFor("test_special").map((rule) => rule.id)));
    expect(second.completedEpisodeIds).toEqual([]);
    expect(second.completedCityIds).toEqual([]);
  } finally { cleanup(); }
});
