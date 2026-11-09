import { z } from "zod";
import { battleAnswerSchema, getBattleContentByHash } from "../../domain/battle";
import { battles } from "../../content";
import { LEARNING_KEY as key, type StorageLike } from "../../persistence";

const schema = z
  .object({
    schemaVersion: z.literal(1),
    revision: z.number().int().nonnegative(),
    alwaysTranslate: z.boolean(),
    revealed: z.record(
      z.string(),
      // "question" or a choice's mark: A, B, C, then D, E… (choiceMark in Translations.tsx).
      z.array(z.union([z.literal("question"), z.string().regex(/^(?:[A-Z]|[1-9][0-9]*)$/u)])),
    ),
    marks: z.record(z.string(), z.string()),
    records: z.record(
      z.string(),
      z
        .object({
          runId: z.string().min(1),
          contentHash: z.string().min(1),
          answers: z.array(battleAnswerSchema).max(5),
        })
        .strict(),
    ),
    openQuestion: z.string().nullable(),
    openTopic: z.string().nullable(),
  })
  .strict();
export type LearningState = z.infer<typeof schema>;
const fresh = (): LearningState => ({
  schemaVersion: 1,
  revision: 0,
  alwaysTranslate: false,
  revealed: {},
  marks: {},
  records: {},
  openQuestion: null,
  openTopic: null,
});
/**
 * Check the answer records against the battles they name. A record of a
 * battle that no longer exists (a battle removed or renamed by a content
 * update, e.g. the v14 ID renames) stays in the notebook as it was read and
 * is never shown, like a record of an outdated run (another content hash),
 * which stays unchecked. `stored` holds the records read from storage: a
 * change may keep such a record unchanged but never add or alter one.
 */
function validateRecords(state: LearningState, stored: LearningState["records"] = state.records) {
  for (const [id, record] of Object.entries(state.records)) {
    const battle = battles.find((item) => item.id === id);
    if (!battle) {
      if (JSON.stringify(stored[id]) !== JSON.stringify(record)) throw new Error("Unknown battle in learning record");
      continue;
    }
    const content = getBattleContentByHash(id, record.contentHash);
    if (!content) continue;
    const questions = content.quiz.questions;
    if (
      record.answers.length > questions.length ||
      record.answers.some((answer, index) => {
        const question = questions[index];
        return (
          !question ||
          answer.questionId !== question.id ||
          !question.options.some((option) => option.id === answer.optionId) ||
          answer.correct !== (answer.optionId === question.correctOptionId)
        );
      })
    )
      throw new Error("Invalid learning answers");
  }
  return state;
}

/** Read the English notebook. Unreadable, unknown or inconsistent data is
 * reported with an error and must not be overwritten by the caller. */
export function loadLearning(storage: StorageLike) {
  try {
    const raw = storage.getItem(key);
    return {
      raw,
      data:
        raw === null ? fresh() : validateRecords(schema.parse(JSON.parse(raw))),
      error: "",
    };
  } catch {
    return {
      raw: null,
      data: fresh(),
      error:
        "英語ノートの保存データを確認できないため、上書きせず保護しています。",
    };
  }
}

export type LearningCommit =
  | { status: "saved"; raw: string; data: LearningState }
  | { status: "unchanged" }
  | { status: "stale" }
  | { status: "failed" };

/** Write a change only while storage still holds the notebook this screen read,
 * so an older tab cannot overwrite newer notes. Nothing is written on failure. */
export function commitLearning(
  storage: StorageLike,
  expectedRaw: string | null,
  current: LearningState,
  change: (state: LearningState) => LearningState,
): LearningCommit {
  try {
    if (storage.getItem(key) !== expectedRaw) return { status: "stale" };
    const next = change(current);
    if (next === current) return { status: "unchanged" };
    const data = validateRecords(
      schema.parse({ ...next, revision: current.revision + 1 }),
      current.records,
    );
    const raw = JSON.stringify(data);
    storage.setItem(key, raw);
    return { status: "saved", raw, data };
  } catch {
    return { status: "failed" };
  }
}
