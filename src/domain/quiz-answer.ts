import type { QuizQuestion } from "../content/schemas";

/** Quiz answers are graded identically in battles and cultural encounters. */
export function scoreQuizAnswer(question: QuizQuestion, optionId: string): boolean | null {
  return question.options.some((option) => option.id === optionId)
    ? question.correctOptionId === optionId
    : null;
}
