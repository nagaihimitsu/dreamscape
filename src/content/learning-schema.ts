import { z } from "zod";
import {
  japaneseText,
  englishText,
  type QuizDefinition,
  type QuizQuestion,
  ENGLISH_LEVELS,
} from "./schemas";
import { questionAtLevel } from "./english-levels";

export const translationSchema = z
  .object({
    source: z
      .object({
        questionEn: englishText,
        options: z
          .array(
            z
              .object({ id: z.enum(["A", "B", "C"]), textEn: englishText })
              .strict(),
          )
          .length(3),
        correctOptionId: z.enum(["A", "B", "C"]),
      })
      .strict(),
    questionJa: japaneseText,
    optionsJa: z
      .object({ A: japaneseText, B: japaneseText, C: japaneseText })
      .strict(),
  })
  .strict();
export const learningCatalogSchema = z
  .object({
    schemaVersion: z.literal(1),
    questions: z.record(z.string(), translationSchema),
  })
  .strict();
export type Translation = z.infer<typeof translationSchema>;
export function questionSource(question: QuizQuestion) {
  return {
    questionEn: question.questionEn,
    options: question.options,
    correctOptionId: question.correctOptionId,
  };
}
export function validateLearning(
  catalog: z.infer<typeof learningCatalogSchema>,
  quizzes: Record<string, QuizDefinition>,
  quizIds: string[],
) {
  for (const id of quizIds) {
    const quiz = quizzes[id];
    if (!quiz) throw new Error(`Unknown quiz: ${id}`);
    for (const q of quiz.questions)
      for (const asked of askedLevels(quiz, q)) {
        const entry = catalog.questions[asked.textKey];
        if (!entry) throw new Error(`Missing translation: ${asked.textKey}`);
        if (JSON.stringify(entry.source) !== JSON.stringify(questionSource(asked)))
          throw new Error(`Translation source changed: ${asked.textKey}`);
      }
  }
  const known = new Set(
    Object.values(quizzes).flatMap((quiz) =>
      quiz.questions.flatMap((question) => askedLevels(quiz, question).map((asked) => asked.textKey)),
    ),
  );
  for (const id of Object.keys(catalog.questions))
    if (!known.has(id)) throw new Error(`Unknown translation question: ${id}`);
}

/** The question as written and at each other level it has (english-levels.ts). */
export function askedLevels(quiz: QuizDefinition, question: QuizDefinition["questions"][number]) {
  return [quiz.englishLevel, ...ENGLISH_LEVELS.filter((level) => level !== quiz.englishLevel && question.levels?.[level])]
    .map((level) => questionAtLevel(question, quiz.englishLevel, level));
}
