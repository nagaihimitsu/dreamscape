import { describe, expect, it } from "vitest";
import { battleQuizzes, battles, learningTranslations } from "../../content";
import { advanceBattle, answerBattle, battleFingerprint } from "../../domain/battle";
import { playBattleToResult } from "../../dev/scenario-builders";
import { enterFreeTime, startEpisode } from "../../domain/chapter";
import { createGame, validateGameState, type GameState } from "../../domain/game";
import { startTourismBattle } from "../../domain/tourism";
import { answeredQuestions, metQuestions } from "./EnglishReview";
import { metWordKey, metWordKeys } from "./met-words";
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

describe("the questions whose words were met before (前に出た単語)", () => {
  it("are those of this save's battles in the notes and of the run on screen, the question on screen giving none", () => {
    const feedback = answer(currentBattle());
    const active = feedback.activeBattle!;
    const shownId = active.answers[0].questionId;
    // An earlier battle's answered question with words (another quiz than the one on screen).
    const current = battles.find((item) => item.id === active.battleId)!;
    const other = battles.find((item) => item.quizId !== current.quizId && battleQuizzes[item.quizId].questions[0].vocabularyJa.length > 0)!;
    const otherQuestion = battleQuizzes[other.quizId].questions[0];
    const record = { runId: "earlier", contentHash: battleFingerprint(other.id),
      answers: [{ questionId: otherQuestion.id, optionId: otherQuestion.correctOptionId, correct: true, hintUsed: false }] };
    const learning = { data: { records: { [other.id]: record } } } as unknown as Learning;
    // Notes of a battle this save has not fought (an older save's) hold no word of this save.
    expect(metQuestions(feedback, learning).map((entry) => entry.question.id)).toEqual([shownId]);
    const fought: GameState = { ...feedback, battleRecords: [{ battleId: other.id, attempts: 1, firstScore: 1, bestScore: 1, lastScore: 1 }] };
    expect(metQuestions(fought, learning).map((entry) => entry.question.id)).toEqual([otherQuestion.id, shownId]);
    // The notes on screen still list the battle's run only.
    expect(answeredQuestions(fought, learning).map((entry) => entry.question.id)).toEqual([shownId]);
    // The question on screen has just been answered: its own words are not "again".
    expect(metWordKeys(metQuestions(fought, learning).map((entry) => entry.question), shownId))
      .toEqual(new Set(otherQuestion.vocabularyJa.map((item) => metWordKey(item.word))));
    // A record of other content than today's (its hash) gives none.
    const stale = { data: { records: { [other.id]: { ...record, contentHash: "unknown" } } } } as unknown as Learning;
    expect(metQuestions(fought, stale).map((entry) => entry.question.id)).toEqual([shownId]);
  });
});
