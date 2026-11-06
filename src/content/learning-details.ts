import { z } from "zod";
import { japaneseText, englishText, type QuizDefinition } from "./schemas";
const text = z.string().trim().min(1);
// English-note details, keyed by question ID and merged across the journey
// folders like the translations. Each question names the learning story its
// topics open (with the topic ID in the Ink variable `topic`); a journey set
// without details has `questions: {}`.
export const learningDetailsSchema = z
  .object({
    schemaVersion: z.literal(1),
    questions: z.record(
      z.string(),
      z
        .object({
          storyId: text,
          summaryJa: japaneseText,
          segments: z
            .array(
              z
                .object({ textEn: englishText, meaningJa: japaneseText })
                .strict(),
            )
            .min(1),
          topics: z
            .array(
              z
                .object({
                  id: text,
                  category: z.enum(["grammar", "expression"]),
                  titleJa: japaneseText,
                  explanationJa: japaneseText,
                  targetEn: englishText,
                  exampleEn: englishText,
                  exampleJa: japaneseText,
                  sourceUrl: z.url({ protocol: /^https$/ }),
                  checkedAt: z.iso.date(),
                })
                .strict(),
            )
            .min(1)
            .max(2),
        })
        .strict(),
    ),
  })
  .strict();
export function validateLearningDetails(
  details: z.infer<typeof learningDetailsSchema>,
  quizzes: Record<string, QuizDefinition>,
) {
  const questions = Object.values(quizzes).flatMap((q) => q.questions);
  const topicIds = new Set<string>();
  for (const [id, detail] of Object.entries(details.questions)) {
    const question = questions.find((q) => q.id === id);
    if (!question) throw new Error(`Unknown learning question: ${id}`);
    for (const segment of detail.segments)
      if (!question.questionEn.includes(segment.textEn))
        throw new Error(`Learning segment missing from question: ${id}`);
    for (const topic of detail.topics) {
      if (!question.questionEn.includes(topic.targetEn))
        throw new Error(`Learning target missing from question: ${id}`);
      if (topicIds.has(topic.id))
        throw new Error(`Duplicate learning topic: ${topic.id}`);
      topicIds.add(topic.id);
    }
  }
}
