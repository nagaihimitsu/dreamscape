import { describe, expect, it } from "vitest";
import { battleQuizzes, battles, learningTranslations } from "../../content";
import { advanceBattle, answerBattle } from "../../domain/battle";
import { playBattleToResult } from "../../dev/scenario-builders";
import { enterFreeTime, startEpisode } from "../../domain/chapter";
import { createGame, validateGameState, type GameState } from "../../domain/game";
import { startTourismBattle } from "../../domain/tourism";
import { answeredQuestions } from "./EnglishReview";
import type { Learning } from "./useLearning";

function currentBattle(): GameState {
  let state = startEpisode(createGame());
  state = startTourismBattle(state, state.revision);
  for (let i = 0; state.activeBattle?.phase !== "question" && i < 100; i++)
    state = advanceBattle(state, state.revision);
  expect(state.activeBattle?.phase).toBe("question");
  return state;
}

function answer(state: GameState): GameState {
  const active = state.activeBattle!;
  const battle = battles.find((item) => item.id === active.battleId)!;
  const question = battleQuizzes[battle.quizId].questions[active.roundIndex];
  return answerBattle(state, question.correctOptionId, state.revision);
}

const emptyLearning = { data: { records: {} } } as unknown as Learning;

describe("review of current battle answers", () => {
  it("shows the saved answer and translation during feedback and the following dialogue", () => {
    const feedback = answer(currentBattle());
    expect(feedback.activeBattle?.phase).toBe("feedback");
    const dialogue = advanceBattle(feedback, feedback.revision);
    for (const state of [feedback, dialogue]) {
      const restored = validateGameState(JSON.parse(JSON.stringify(state)));
      const answers = answeredQuestions(restored, emptyLearning);
      expect(answers).toHaveLength(1);
      expect(answers[0].question.id).toBe(restored.activeBattle!.answers[0].questionId);
      expect(answers[0].questionNumber).toBe(1);
      expect(learningTranslations[answers[0].question.id]).toBeDefined();
    }
  });

  it("shows recorded current answers after free time but rejects an unknown content hash", () => {
    const state = playBattleToResult(currentBattle());
    const active = state.activeBattle!;
    const game = enterFreeTime(state, state.revision);
    const record = { runId: active.runId, contentHash: active.contentHash, answers: active.answers };
    const learning = { data: { records: { [active.battleId]: record } } } as unknown as Learning;
    expect(answeredQuestions(game, learning)).toHaveLength(3);
    const unknown = { data: { records: { [active.battleId]: { ...record, contentHash: "unknown" } } } } as unknown as Learning;
    expect(answeredQuestions(game, unknown)).toEqual([]);
  });
});
