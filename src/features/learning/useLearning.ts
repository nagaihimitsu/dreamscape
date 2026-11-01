import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import type { GameState } from "../../domain/game";
import { battleAnswerSchema, getBattleContentByHash } from "../../domain/battle";
import { battles, learningTranslations } from "../../content";

import { LEARNING_KEY as key, SAVE_KEY } from "../../persistence";
const schema = z
  .object({
    schemaVersion: z.literal(1),
    revision: z.number().int().nonnegative(),
    alwaysTranslate: z.boolean(),
    revealed: z.record(
      z.string(),
      z.array(z.enum(["question", "A", "B", "C"])),
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
type LearningState = z.infer<typeof schema>;
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
function validateRecords(state: LearningState) {
  for (const [id, record] of Object.entries(state.records)) {
    const battle = battles.find((item) => item.id === id);
    if (!battle) throw new Error("Unknown battle in learning record");
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
function load() {
  try {
    const raw = localStorage.getItem(key);
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
export function useLearning(game: GameState | null) {
  const [initial] = useState(load);
  const [data, setData] = useState(initial.data);
  const [error, setError] = useState(initial.error);
  const rawRef = useRef(initial.raw);
  const dataRef = useRef(initial.data);
  const blocked = useRef(!!initial.error);
  const update = useCallback(
    (change: (state: LearningState) => LearningState) => {
      if (blocked.current) return false;
      try {
        if (localStorage.getItem(key) !== rawRef.current) {
          setError(
            "別の画面で英語ノートが更新されました。この画面を再読み込みしてください。",
          );
          blocked.current = true;
          return false;
        }
        const next = change(dataRef.current);
        if (next === dataRef.current) return true;
        const valid = validateRecords(
          schema.parse({
            ...next,
            revision: dataRef.current.revision + 1,
          }),
        );
        const raw = JSON.stringify(valid);
        localStorage.setItem(key, raw);
        rawRef.current = raw;
        dataRef.current = valid;
        setData(valid);
        return true;
      } catch {
        setError(
          "英語ノートを保存できませんでした。保存データは変更していません。",
        );
        return false;
      }
    },
    [],
  );
  useEffect(() => {
    const active = game?.activeBattle;
    if (!active?.answers.length) return;
    update((s) => {
      const old = s.records[active.battleId];
      if (
        old?.runId === active.runId &&
        old.contentHash === active.contentHash &&
        JSON.stringify(old.answers) === JSON.stringify(active.answers)
      )
        return s;
      return {
        ...s,
        records: {
          ...s.records,
          [active.battleId]: {
            runId: active.runId,
            contentHash: active.contentHash,
            answers: active.answers,
          },
        },
      };
    });
  }, [game?.activeBattle, update]);
  useEffect(() => {
    function changed(e: StorageEvent) {
      if (
        (e.key === key && e.newValue !== rawRef.current) ||
        (e.key === SAVE_KEY && e.newValue === null)
      ) {
        setError(
          "別の画面で英語ノートが更新されました。この画面を再読み込みしてください。",
        );
        blocked.current = true;
      }
    }
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, []);
  const isMarked = (id: string) =>
    !!learningTranslations[id] &&
    data.marks[id] === JSON.stringify(learningTranslations[id].source);
  return { data, error, update, isMarked };
}
export type Learning = ReturnType<typeof useLearning>;
