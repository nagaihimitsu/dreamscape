// The marks a battle question's options carry once the answer shows (2026-11-28 user decision: the quiz's three options are
// choices of the talk, the right-or-wrong on the options themselves; QuizChoices.tsx). Presentation only.

/** `right`: the one chosen, when it was right; `missed`: the one chosen, when it was wrong; `answer`: the right one after a wrong answer. */
export type QuizChoiceMark = "right" | "missed" | "answer";

/** The mark of option `optionId`: none before the answer shows (`answer` undefined, also while a right one is held still) or on the others. */
export function quizChoiceMark(optionId: string, correctOptionId: string, answer: { optionId: string; correct: boolean } | undefined):
  QuizChoiceMark | undefined {
  if (!answer) return undefined;
  if (optionId === answer.optionId) return answer.correct ? "right" : "missed";
  return !answer.correct && optionId === correctOptionId ? "answer" : undefined;
}
