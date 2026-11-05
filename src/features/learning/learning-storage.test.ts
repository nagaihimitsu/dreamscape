import { describe, expect, it } from "vitest";
import { battleQuizzes, battles } from "../../content";
import { battleFingerprint } from "../../domain/battle";
import { LEARNING_KEY, type StorageLike } from "../../persistence";
import { commitLearning, loadLearning, type LearningState } from "./learning-storage";

function memoryStorage(initial?: string): StorageLike & { writes: number } {
  const values = new Map<string, string>(initial === undefined ? [] : [[LEARNING_KEY, initial]]);
  return {
    writes: 0,
    getItem: (key) => values.get(key) ?? null,
    setItem(key, value) { this.writes++; values.set(key, value); },
  };
}

const battle = battles[0];
const question = battleQuizzes[battle.quizId].questions[0];
const notebook = (answers: unknown[]) => JSON.stringify({
  schemaVersion: 1, revision: 1, alwaysTranslate: false, revealed: {}, marks: {},
  records: { [battle.id]: { runId: "run-1", contentHash: battleFingerprint(battle.id), answers } },
  openQuestion: null, openTopic: null,
});
const reveal = (state: LearningState): LearningState => ({ ...state, revealed: { [question.id]: ["question"] } });

describe("English notebook storage", () => {
  it("loads a current notebook with a valid answer record", () => {
    const raw = notebook([{ questionId: question.id, optionId: question.correctOptionId, correct: true, hintUsed: false }]);
    const loaded = loadLearning(memoryStorage(raw));
    expect(loaded.error).toBe("");
    expect(loaded.raw).toBe(raw);
    expect(loaded.data.records[battle.id].answers).toHaveLength(1);
  });

  it.each([
    ["broken JSON", "{broken"],
    ["an unknown version", JSON.stringify({ schemaVersion: 999, payload: "keep" })],
    ["an answer that does not match the recorded quiz",
      notebook([{ questionId: "wrong_question", optionId: "A", correct: true, hintUsed: false }])],
  ])("reports %s as unreadable without writing", (_, raw) => {
    const storage = memoryStorage(raw);
    const loaded = loadLearning(storage);
    expect(loaded.error).toContain("上書きせず保護");
    expect(loaded.raw).toBeNull();
    expect(storage.getItem(LEARNING_KEY)).toBe(raw);
    expect(storage.writes).toBe(0);
  });

  it("saves a change with the next revision only while the stored notebook is unchanged", () => {
    const storage = memoryStorage();
    const first = loadLearning(storage);
    const saved = commitLearning(storage, first.raw, first.data, reveal);
    expect(saved.status).toBe("saved");
    if (saved.status !== "saved") return;
    expect(saved.data.revision).toBe(1);
    expect(storage.getItem(LEARNING_KEY)).toBe(saved.raw);
    expect(commitLearning(storage, saved.raw, saved.data, (state) => state)).toEqual({ status: "unchanged" });

    // A tab that still holds the empty notebook must not replace the newer one.
    expect(commitLearning(storage, first.raw, first.data, reveal)).toEqual({ status: "stale" });
    expect(storage.getItem(LEARNING_KEY)).toBe(saved.raw);
    expect(storage.writes).toBe(1);
  });

  it("rejects an invalid change without writing", () => {
    const storage = memoryStorage();
    const { raw, data } = loadLearning(storage);
    const invalid = commitLearning(storage, raw, data, (state) => ({
      ...state, records: { unknown_battle: { runId: "run", contentHash: "hash", answers: [] } },
    }));
    expect(invalid).toEqual({ status: "failed" });
    expect(storage.getItem(LEARNING_KEY)).toBeNull();
    expect(storage.writes).toBe(0);
  });
});
