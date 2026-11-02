import { describe, expect, it } from "vitest";
import phase6 from "../../../tests/fixtures/phase6-saves.json";
import previousDuomo from "../../../qa/old-saves/duomo-round-two.json";
import { learningTranslations } from "../../content";
import { validateGameState } from "../../domain/game";
import { enterFreeTime } from "../../domain/chapter";
import { answeredQuestions } from "./EnglishReview";
import type { Learning } from "./useLearning";

describe("review of published battle answers", () => {
  it("retains the old quiz while the player is in feedback or dialogue", () => {
    for (const raw of [phase6.battleFeedback, phase6.battleReaction]) {
      const game = validateGameState(raw);
      const learning = { data: { records: {} } } as unknown as Learning;
      const answers = answeredQuestions(game, learning);
      expect(answers).toHaveLength(1);
      expect(answers[0].question.id).toBe(game.activeBattle!.answers[0].questionId);
      expect(answers[0].questionNumber).toBe(1);
    }
  });

  it("reads the exact saved version after free time, but never guesses an unknown hash", () => {
    const result = validateGameState(phase6.result);
    const active = result.activeBattle!;
    const game = enterFreeTime(result, result.revision);
    const record = { runId: active.runId, contentHash: active.contentHash, answers: active.answers };
    const learning = { data: { records: { [active.battleId]: record } } } as unknown as Learning;
    expect(answeredQuestions(game, learning)).toHaveLength(3);
    const unknown = { data: { records: { [active.battleId]: { ...record, contentHash: "unknown" } } } } as unknown as Learning;
    expect(answeredQuestions(game, unknown)).toEqual([]);
  });

  it("keeps a pre-rewrite Duomo answer and its translation available", () => {
    const game = validateGameState(previousDuomo);
    const learning = { data: { records: {} } } as unknown as Learning;
    const answers = answeredQuestions(game, learning);
    expect(answers.map(({ question }) => question.id)).toEqual(["duomo_candoglia_marble"]);
    expect(learningTranslations.duomo_candoglia_marble).toBeDefined();
  });
});
