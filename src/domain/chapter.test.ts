import { describe, expect, it } from "vitest";
import {
  balance,
  battleQuizzes,
  battles,
  episodes,
  rewardRules,
} from "../content";
import {
  advanceBattle,
  answerBattle,
  startBattle,
  advanceTourismGuide,
  createGame,
  startTourismBattle,
  skipTourismGuide,
  replayTourismGuide,
  validateGameState,
  startDate,
  advanceDate,
  chooseDate,
  finishDate,
  claimTrialMilestone,
  type GameState,
} from "./index";
import {
  canAccessFreeTime,
  enterFreeTime,
  getCurrentEpisode,
  startEpisode,
} from "./chapter";
import { claimPendingRewards } from "./rewards";
import { loadGame, SAVE_KEY, saveGame, type StorageLike } from "../persistence";

const episode = episodes[0];
const rule = (trigger: (typeof rewardRules)[number]["trigger"]) =>
  rewardRules.find(
    (item) => item.trigger === trigger && item.episodeId === episode.id,
  )!;
const pendingTotal = (state: GameState) =>
  state.pendingApRewards.reduce((sum, item) => sum + item.remainingAp, 0);
function reload(state: GameState): GameState {
  const next = validateGameState(JSON.parse(JSON.stringify(state)));
  expect(next).toEqual(state);
  return next;
}
function readGuide(state: GameState): GameState {
  for (
    let count = 0;
    state.activeTourism?.phase === "guide" && count < 30;
    count++
  ) {
    state = reload(state);
    state = advanceTourismGuide(state, state.revision);
  }
  expect(state.activeTourism?.phase).toBe("exploring");
  return reload(state);
}
function finishBattle(state: GameState, score: number): GameState {
  const quiz =
    battleQuizzes[
      battles.find((item) => item.id === state.activeBattle!.battleId)!.quizId
    ];
  for (
    let count = 0;
    state.activeBattle?.phase !== "result" && count < 150;
    count++
  ) {
    state = reload(state);
    const active = state.activeBattle!;
    state =
      active.phase === "question"
        ? answerBattle(
            state,
            active.roundIndex < score
              ? quiz.questions[active.roundIndex].correctOptionId
              : quiz.questions[active.roundIndex].options.find(
                  (option) =>
                    option.id !==
                    quiz.questions[active.roundIndex].correctOptionId,
                )!.id,
            state.revision,
          )
        : advanceBattle(state, state.revision);
  }
  expect(state.activeBattle?.phase).toBe("result");
  return reload(state);
}
function playDate(
  initial: GameState,
  id: string,
  choices: number[],
  nextRoll: () => number = stableRolls(),
): GameState {
  let state = startDate(initial, id, nextRoll);
  expect(state.activeDate?.dateId).toBe(id);
  for (let count = 0; state.activeDate && count < 100; count++) {
    state = reload(state);
    const active = state.activeDate!;
    state = active.frame.ended
      ? finishDate(state, state.revision)
      : active.frame.choices.length
        ? chooseDate(state, choices[active.choiceCount], state.revision)
        : advanceDate(state, state.revision);
  }
  expect(state.activeDate).toBeNull();
  return reload(state);
}

describe("integrated tourism, battle, and free time", () => {
  it.each([0, 1, 2, 3])(
    "completes an actual episode with %i correct, without a mock chapter button",
    (score) => {
      let state = createGame("航", "澪");
      expect(getCurrentEpisode(state)).toEqual(episode);
      expect(canAccessFreeTime(state)).toBe(false);
      state = readGuide(startEpisode(state));
      expect(state.ap).toBe(rule("guide_read").ap);
      expect(state.completedGuideIds).toEqual([episode.landmarkId]);
      expect(state.discoveredClueIds).toEqual([]);
      state = startTourismBattle(state, state.revision);
      const beforeAffection = state.affection;
      state = finishBattle(state, score);
      const battleAP =
        rule("battle_complete").ap +
        rule("episode_clear").ap +
        (score >= rule("battle_score").minScore! ? rule("battle_score").ap : 0);
      expect(state.ap).toBe(rule("guide_read").ap + battleAP);
      expect(state.affection).toBe(beforeAffection);
      expect(state.completedEpisodeIds).toEqual([episode.id]);
      expect(state.completedChapters).toEqual([episode.legacyChapterId]);
      expect(state.completedCityIds).toEqual([]);
      expect(
        state.battleRewardReceipt?.entries.reduce(
          (sum, item) => sum + item.creditedAp,
          0,
        ),
      ).toBe(battleAP);
      expect(canAccessFreeTime(state)).toBe(true);
      const result = state;
      expect(advanceBattle(state, state.revision)).toBe(state);
      state = enterFreeTime(state, state.revision);
      expect(state.activeBattle).toBeNull();
      expect(enterFreeTime(state, result.revision)).toBe(state);
      state = startDate(state, "milano_cafe_01");
      expect(state.activeDate?.dateId).toBe("milano_cafe_01");
      expect(state.ap).toBe(result.ap - 2);
      reload(state);
    },
  );

  it("skips guide rewards, then permits an actual later read exactly once", () => {
    let state = startEpisode({ ...createGame(), legacyTrialAvailable: true });
    state = skipTourismGuide(state, state.revision);
    expect(state.ap).toBe(0);
    expect(state.completedGuideIds).toEqual([]);
    state = readGuide(replayTourismGuide(state, state.revision));
    expect(state.ap).toBe(1);
    state = readGuide(replayTourismGuide(state, state.revision));
    expect(state.ap).toBe(1);
    expect(
      state.claimedRewardIds.filter((id) => id === rule("guide_read").id),
    ).toHaveLength(1);
  });

  it("grants a later first high score once and cannot re-earn initial battle or chapter AP", () => {
    let state = startEpisode(createGame());
    state = finishBattle(startTourismBattle(state, state.revision), 0);
    expect(state.ap).toBe(
      rule("battle_complete").ap + rule("episode_clear").ap,
    );
    expect(state.completedGuideIds).toEqual([]);
    const firstReceipt = structuredClone(state.battleRewardReceipt);
    expect(reload(state).battleRewardReceipt).toEqual(firstReceipt);
    state = finishBattle(startBattle(state, episode.battleId), 2);
    expect(state.ap).toBe(
      rule("battle_complete").ap +
        rule("episode_clear").ap +
        rule("battle_score").ap,
    );
    expect(
      state.battleRewardReceipt?.entries.map((entry) => entry.rewardId),
    ).toEqual([rule("battle_score").id]);
    state = finishBattle(startBattle(state, episode.battleId), 3);
    expect(state.ap).toBe(
      rule("battle_complete").ap +
        rule("episode_clear").ap +
        rule("battle_score").ap,
    );
    expect(state.battleRewardReceipt?.entries).toEqual([]);
    expect(state.battleRecords[0]).toMatchObject({
      attempts: 3,
      firstScore: 0,
      bestScore: 3,
      lastScore: 3,
    });
  });

  it("retains AP above the wallet cap and pays it once when a date makes room", () => {
    let state = startEpisode({ ...createGame(), ap: 11 });
    state = finishBattle(startTourismBattle(state, state.revision), 2);
    expect(state.ap).toBe(balance.apCap);
    expect(pendingTotal(state)).toBe(
      rule("battle_complete").ap +
        rule("episode_clear").ap +
        rule("battle_score").ap -
        1,
    );
    expect(
      state.battleRewardReceipt?.entries.reduce(
        (sum, item) => sum + item.creditedAp,
        0,
      ),
    ).toBe(1);
    const before = state.ap + pendingTotal(state);
    expect(claimPendingRewards(state, state.revision)).toBe(state);
    state = enterFreeTime(state, state.revision);
    state = startDate(state, "milano_cafe_01");
    expect(state.ap).toBe(balance.apCap);
    expect(pendingTotal(state)).toBe(Math.max(0, before - 2 - balance.apCap));
    expect(state.ap + pendingTotal(state)).toBe(before - 2);
    expect(claimPendingRewards(state, state.revision)).toBe(state);
    reload(state);
  });

  it("continues the legacy zero-score journey after rejection, deferral and eventual acceptance", () => {
    let state = startEpisode(
      { ...createGame(), legacyTrialAvailable: true },
      "milano_last_supper_episode",
    );
    state = finishBattle(startTourismBattle(state, state.revision), 0);
    state = enterFreeTime(state, state.revision);
    // One date opens the conversation, not a guaranteed success.
    state = playDate(state, "milano_cafe_01", [0, 2], lowAffectionRolls());
    state = playDate(state, "milano_confession_01", [0]);
    expect(state.confessionStatus).toBe("rejected");
    expect(state.endingReached).toBe(false);
    expect(startDate(state, "milano_confession_01")).toBe(state);
    expect(canAccessFreeTime(state)).toBe(true);

    // Another independently chosen date permits a retry. A stronger bond can
    // still require more time: the second attempt is deferred, not accepted.
    state = playDate(state, "milano_brera_date_01", [0, 0], lowAffectionRolls());
    state = playDate(state, "milano_confession_01", [0]);
    expect(state.confessionStatus).toBe("deferred");

    // The old optional trial credit is still redeemable exactly once.
    const beforeReward = state.ap;
    state = claimTrialMilestone(state, "trial_after_cafe");
    expect(state.ap).toBe(beforeReward + 4);
    expect(claimTrialMilestone(state, "trial_after_cafe")).toBe(state);
    state = playDate(state, "milano_walk_01", [0, 0]);
    state = playDate(state, "milano_confession_01", [0]);
    expect(state.confessionStatus).toBe("accepted");
    expect(state.endingReached).toBe(true);
    expect(state.completedCityIds).toEqual([]);
    expect(state.playedDateIds).not.toContain("milano_invitation_01");
    expect(state.playedDateIds).not.toContain("milano_night_01");
    const ended = state;
    state = finishBattle(startBattle(state, episode.battleId), 2);
    expect(state.endingReached).toBe(true);
    expect(state.affection).toBe(ended.affection);
    expect(state.trust).toBe(ended.trust);
    expect(state.spark).toBe(ended.spark);
    expect(state.memories).toEqual(ended.memories);
  });
});

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  fail = false;
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.fail) throw new Error("quota");
    this.values.set(key, value);
  }
}

it("retries a failed final save without dropping or duplicating the first rewards", () => {
  let state = startBattle(createGame(), episode.battleId);
  for (let n = 0; n < 100; n++) {
    const active = state.activeBattle!;
    if (
      active.phase === "dialogue" &&
      active.answers.length === 3 &&
      active.frame?.ended
    )
      break;
    state =
      active.phase === "question"
        ? answerBattle(state, "A", state.revision)
        : advanceBattle(state, state.revision);
  }
  const storage = new MemoryStorage();
  expect(saveGame(storage, state).ok).toBe(true);
  const completed = advanceBattle(state, state.revision);
  storage.fail = true;
  expect(saveGame(storage, completed, state).ok).toBe(false);
  expect(loadGame(storage)).toEqual({ status: "loaded", state });
  storage.fail = false;
  const retry = advanceBattle(state, state.revision);
  expect(retry).toEqual(completed);
  expect(saveGame(storage, retry, state).ok).toBe(true);
  expect(saveGame(storage, retry).ok).toBe(true);
  expect(JSON.parse(storage.getItem(SAVE_KEY)!).battleRecords[0].attempts).toBe(
    1,
  );
  expect(retry.claimedRewardIds).toEqual([...new Set(retry.claimedRewardIds)]);
});

/** Reproducible positive outcomes with varied delta tickets for these progression tests. */
function stableRolls() {
  let index = 0;
  const tickets = [0, 5000, 5000, 0];
  return () => tickets[index++ % tickets.length];
}

/** Keep affection below the confession threshold while retaining trust. */
function lowAffectionRolls() {
  let index = 0;
  const tickets = [0, 0, 5000, 0];
  return () => tickets[index++ % tickets.length];
}
