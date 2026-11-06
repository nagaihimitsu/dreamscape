import { seedCurrentFreeTime } from "../../tests/fixtures/current-game";
import { firstCorrect, playBattleToResult } from "../dev/scenario-builders";
import { describe, expect, it } from "vitest";
import {
  battles,
  battleQuizzes,
  rewardRules as allRewardRules,
} from "../content";
import {
  completeChapter,
  createGame,
  setNames,
  startDate,
  validateGameState,
  type GameState,
} from "./game";
import {
  startBattle,
  advanceBattle,
  answerBattle,
  toggleBattleHint,
  leaveBattle,
  getBattleAvailability,
  getBattleOutcome,
} from "./battle";
import { loadGame, saveGame, SAVE_KEY, type StorageLike } from "../persistence";

const rewardRules = allRewardRules.filter(
  (rule) => rule.episodeId === "milano_last_supper_episode",
);
const battleId = () => battles[0].id;
const quiz = () => battleQuizzes[battles[0].quizId];
function romance(state: GameState) {
  return {
    playerName: state.playerName,
    heroineName: state.heroineName,
    affection: state.affection,
    trust: state.trust,
    spark: state.spark,
    lastRejectedDateCount: state.lastRejectedDateCount,
    romanceStage: state.romanceStage,
    memories: state.memories,
    playedDateIds: state.playedDateIds,
    activeDate: state.activeDate,
    unlockedEventIds: state.unlockedEventIds,
    confessionStatus: state.confessionStatus,
    endingReached: state.endingReached,
  };
}
function roundTrip(state: GameState) {
  const result = validateGameState(JSON.parse(JSON.stringify(state)));
  expect(result).toEqual(state);
  return result;
}
function question(initial: GameState): GameState {
  let state = initial;
  for (let i = 0; i < 100 && state.activeBattle?.phase === "dialogue"; i++) {
    state = roundTrip(state);
    const before = state;
    state = advanceBattle(state, state.revision);
    expect(advanceBattle(state, before.revision)).toBe(state);
  }
  expect(state.activeBattle?.phase).toBe("question");
  return state;
}
/** Answer round i with selections[i], saving and restoring every action; a battle never changes the relationship. */
function finish(initial: GameState, selections: string[]): GameState {
  return roundTrip(playBattleToResult(initial, {
    answer: (_question, roundIndex) => selections[roundIndex],
    after: (next, previous) => {
      expect(romance(next)).toEqual(romance(previous));
      return roundTrip(next);
    },
  }));
}
function choicesForScore(score: number) {
  return quiz().questions.map((item, index) =>
    index < score
      ? item.correctOptionId
      : item.options.find((option) => option.id !== item.correctOptionId)!.id,
  );
}

describe("three-round quiz battle", () => {
  it.each(
    Array.from({ length: 27 }, (_, index) => [
      Math.floor(index / 9),
      Math.floor(index / 3) % 3,
      index % 3,
    ]),
  )(
    "scores exact choices %i/%i/%i with reload at every boundary",
    (a, b, c) => {
      const before = createGame("なお", "りえ");
      const selections = [a, b, c].map(
        (value, index) => quiz().questions[index].options[value].id,
      );
      const expected = selections.filter(
        (id, index) => id === quiz().questions[index].correctOptionId,
      ).length;
      const state = finish(startBattle(before, battleId()), selections);
      expect(state.activeBattle!.score).toBe(expected);
      expect(
        state.activeBattle!.answers.map((answer) => answer.optionId),
      ).toEqual(selections);
      expect(state.battleRecords).toEqual([
        {
          battleId: battleId(),
          attempts: 1,
          firstScore: expected,
          bestScore: expected,
          lastScore: expected,
        },
      ]);
      expect(getBattleOutcome(expected)).toBe(
        expected === 3 ? "perfect" : expected === 2 ? "victory" : "defeat",
      );
      expect(romance(state)).toEqual(romance(before));
      // The first battle also clears its episode, whatever the score.
      const battleAP = rewardRules
        .filter(
          (rule) =>
            rule.trigger === "battle_complete" || rule.trigger === "episode_clear" ||
            (rule.trigger === "battle_score" && expected >= rule.minScore!),
        )
        .reduce((total, rule) => total + rule.ap, 0);
      expect(state.ap).toBe(before.ap + battleAP);
      expect(advanceBattle(state, state.revision)).toBe(state);
    },
  );
  it("locks grading after one answer and rejects unknown/stale inputs", () => {
    let state = question(startBattle(createGame(), battleId()));
    const before = state;
    expect(answerBattle(state, "missing", state.revision)).toBe(state);
    state = answerBattle(
      state,
      quiz().questions[0].correctOptionId,
      state.revision,
    );
    expect(
      answerBattle(state, quiz().questions[0].options[0].id, state.revision),
    ).toBe(state);
    expect(
      answerBattle(state, quiz().questions[0].options[0].id, before.revision),
    ).toBe(state);
    expect(state.activeBattle!.answers).toHaveLength(1);
    expect(state.activeBattle!.score).toBe(1);
    expect(advanceBattle(state, before.revision)).toBe(state);
  });
  it("remembers an opened and closed hint without affecting grading", () => {
    let state = question(startBattle(createGame(), battleId()));
    state = toggleBattleHint(state, state.revision);
    expect(state.activeBattle).toMatchObject({
      hintOpen: true,
      hintUsed: true,
    });
    state = roundTrip(state);
    state = toggleBattleHint(state, state.revision);
    expect(state.activeBattle).toMatchObject({
      hintOpen: false,
      hintUsed: true,
    });
    state = answerBattle(
      state,
      quiz().questions[0].correctOptionId,
      state.revision,
    );
    expect(state.activeBattle!.answers[0]).toMatchObject({
      correct: true,
      hintUsed: true,
    });
    expect(toggleBattleHint(state, state.revision)).toBe(state);
    state = advanceBattle(state, state.revision);
    state = question(state);
    expect(state.activeBattle).toMatchObject({
      hintOpen: false,
      hintUsed: false,
      roundIndex: 1,
    });
  });
  it("branches enemy reactions and endings by answers and score", () => {
    // Every line shown before each action, played with the first `score` answers correct.
    const transcript = (score: number) => {
      const text: string[] = [];
      playBattleToResult(startBattle(createGame(), battleId()), {
        answer: firstCorrect(score),
        after: (next, previous) => {
          if (previous.activeBattle?.frame) text.push(previous.activeBattle.frame.text);
          return next;
        },
      });
      return text.join("\n");
    };
    const defeat = transcript(0),
      victory = transcript(2),
      perfect = transcript(3);
    expect(defeat).not.toBe(victory);
    expect(victory).not.toBe(perfect);
    expect(defeat).toMatch(/[ぁ-んァ-ヶ一-龠]/);
    expect(perfect).toMatch(/[ぁ-んァ-ヶ一-龠]/);
  });
  it("records first and best scores across direct replay without duplicate completion", () => {
    const before = createGame();
    let state = finish(startBattle(before, battleId()), choicesForScore(1));
    state = finish(startBattle(state, battleId()), choicesForScore(3));
    state = finish(startBattle(state, battleId()), choicesForScore(0));
    expect(state.battleRecords[0]).toEqual({
      battleId: battleId(),
      attempts: 3,
      firstScore: 1,
      bestScore: 3,
      lastScore: 0,
    });
    const allBattleAP = rewardRules
      .filter(
        (rule) =>
          rule.trigger === "battle_complete" || rule.trigger === "battle_score" || rule.trigger === "episode_clear",
      )
      .reduce((total, rule) => total + rule.ap, 0);
    expect(state.ap).toBe(before.ap + allBattleAP);
    expect(advanceBattle(state, state.revision)).toBe(state);
    const revision = state.revision;
    state = leaveBattle(state, revision);
    expect(state.activeBattle).toBeNull();
    expect(leaveBattle(state, revision)).toBe(state);
    expect(romance(state)).toEqual(romance(before));
  });
  it("blocks overlapping romance, rewards, names, and battle runs", () => {
    const before = seedCurrentFreeTime(createGame());
    const dating = startDate(before, "milano_cafe_01");
    expect(getBattleAvailability(dating, battleId()).available).toBe(false);
    expect(startBattle(dating, battleId())).toBe(dating);
    const state = startBattle(before, battleId());
    expect(startBattle(state, battleId())).toBe(state);
    expect(startDate(state, "milano_cafe_01")).toBe(state);
    expect(setNames(state, "変更", "変更")).toBe(state);
    expect(leaveBattle(state, state.revision)).toBe(state);
    const noChapter = startBattle(createGame(), battleId());
    expect(completeChapter(noChapter)).toBe(noChapter);
  });
});

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}
describe("battle save integrity", () => {
  it("saves immediately after selection and resumes that locked answer", () => {
    const storage = new MemoryStorage();
    const initial = question(startBattle(createGame(), battleId()));
    expect(saveGame(storage, initial)).toEqual({ ok: true });
    const selected = answerBattle(
      initial,
      quiz().questions[0].correctOptionId,
      initial.revision,
    );
    expect(saveGame(storage, selected, initial)).toEqual({ ok: true });
    const loaded = loadGame(storage);
    expect(loaded).toEqual({ status: "loaded", state: selected });
    expect(saveGame(storage, initial).ok).toBe(false);
    expect(loadGame(storage)).toEqual({ status: "loaded", state: selected });
  });
  it.each(["score", "option", "question", "phase", "snapshot", "hash", "hint"])(
    "protects corrupt %s data",
    (kind) => {
      let state = question(startBattle(createGame(), battleId()));
      state = answerBattle(
        state,
        quiz().questions[0].correctOptionId,
        state.revision,
      );
      if (kind === "snapshot") state = advanceBattle(state, state.revision);
      const corrupted = structuredClone(state),
        active = corrupted.activeBattle!;
      if (kind === "score") active.score = 0;
      if (kind === "option") active.answers[0].optionId = "missing";
      if (kind === "question") active.answers[0].questionId = "missing";
      if (kind === "phase") active.phase = "result";
      if (kind === "snapshot") active.storyState = "{}";
      if (kind === "hash") active.contentHash = "outdated";
      if (kind === "hint") active.hintUsed = true;
      const raw = JSON.stringify(corrupted),
        storage = new MemoryStorage();
      storage.setItem(SAVE_KEY, raw);
      storage.setItem("other", "keep");
      expect(loadGame(storage)).toMatchObject({ status: "invalid", raw });
      expect(saveGame(storage, state).ok).toBe(false);
      expect(storage.getItem(SAVE_KEY)).toBe(raw);
      expect(storage.getItem("other")).toBe("keep");
    },
  );
});
