import { z } from "zod";
import {
  japaneseText,
  englishText,
  type QuizDefinition,
  type QuizQuestion,
} from "./schemas";

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
    for (const q of quiz.questions) {
      const entry = catalog.questions[q.id];
      if (!entry) throw new Error(`Missing translation: ${q.id}`);
      if (JSON.stringify(entry.source) !== JSON.stringify(questionSource(q)))
        throw new Error(`Translation source changed: ${q.id}`);
    }
  }
  const known = new Set(
    Object.values(quizzes).flatMap((quiz) =>
      quiz.questions.map((question) => question.id),
    ),
  );
  for (const id of Object.keys(catalog.questions))
    if (!known.has(id)) throw new Error(`Unknown translation question: ${id}`);
}
