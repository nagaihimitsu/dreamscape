import type { EnglishLevel, QuizDefinition } from "./schemas";

type Question = QuizDefinition["questions"][number];
/**
 * A question as asked at a level of the difficulty (2026-11-19): its English (the question, the options and their words) at
 * that level when the question has it, else as written. The marks, the answer, the hint and the explanations are the same.
 * `textKey` names its translation and English-note details: the question's ID, or `<ID>@<level>` for another level's English.
 */
export type AskedQuestion = Question & { textKey: string; askedLevel: EnglishLevel };

/** The key of a question's translation and details at another level (learning/translations.json). */
export const levelTextKey = (questionId: string, level: EnglishLevel) => `${questionId}@${level}`;

export function questionAtLevel(question: Question, quizLevel: EnglishLevel, level: EnglishLevel | undefined): AskedQuestion {
  const written = level && level !== quizLevel ? question.levels?.[level] : undefined;
  if (!written) return { ...question, textKey: question.id, askedLevel: quizLevel };
  return {
    ...question,
    questionEn: written.questionEn,
    options: written.options,
    vocabularyJa: written.vocabularyJa ?? question.vocabularyJa,
    textKey: levelTextKey(question.id, level!),
    askedLevel: level!,
  };
}

/** The quiz with each question at the level (questionAtLevel). */
export function quizAtLevel(quiz: QuizDefinition, level: EnglishLevel | undefined): Omit<QuizDefinition, "questions"> & { questions: AskedQuestion[] } {
  return { ...quiz, questions: quiz.questions.map((question) => questionAtLevel(question, quiz.englishLevel, level)) };
}
