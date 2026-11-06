import { unique } from "./content-validation-utils";

/** Check facts contained within one quiz; cross-file references are checked by buildContent (content-pipeline.ts). */
export function validateQuizEntries(quiz: {
  questions: {
    id: string;
    options: { id: string; textEn: string }[];
    correctOptionId: string;
  }[];
}): void {
  unique(
    quiz.questions.map((question) => question.id),
    "quiz question ID",
  );
  for (const question of quiz.questions) {
    unique(
      question.options.map((option) => option.id),
      "quiz option ID",
    );
    unique(
      question.options.map((option) => option.textEn.toLowerCase()),
      "quiz option text",
    );
    if (
      question.options.filter(
        (option) => option.id === question.correctOptionId,
      ).length !== 1
    ) {
      throw new Error(`Invalid correct option: ${question.id}`);
    }
  }
}
