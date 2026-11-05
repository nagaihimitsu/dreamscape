import { useCallback, useEffect, useRef, useState } from "react";
import type { GameState } from "../../domain/game";
import { learningTranslations } from "../../content";

import { LEARNING_KEY as key, SAVE_KEY, type StorageLike } from "../../persistence";
import { storagePhysicalKey } from "../../persistence/journey-storage";
import { commitLearning, loadLearning, type LearningState } from "./learning-storage";
export function useLearning(game: GameState | null, storage: StorageLike = window.localStorage, listenToStorage = true) {
  const [initial] = useState(() => loadLearning(storage));
  const [data, setData] = useState(initial.data);
  const [error, setError] = useState(initial.error);
  const rawRef = useRef(initial.raw);
  const dataRef = useRef(initial.data);
  const blocked = useRef(!!initial.error);
  const update = useCallback(
    (change: (state: LearningState) => LearningState) => {
      if (blocked.current) return false;
      const result = commitLearning(storage, rawRef.current, dataRef.current, change);
      if (result.status === "stale") {
        setError(
          "別の画面で英語ノートが更新されました。この画面を再読み込みしてください。",
        );
        blocked.current = true;
        return false;
      }
      if (result.status === "failed") {
        setError(
          "英語ノートを保存できませんでした。保存データは変更していません。",
        );
        return false;
      }
      if (result.status === "saved") {
        rawRef.current = result.raw;
        dataRef.current = result.data;
        setData(result.data);
      }
      return true;
    },
    [storage],
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
    if (!listenToStorage) return;
    function changed(e: StorageEvent) {
      if (
        (e.key === storagePhysicalKey(storage, key) && e.newValue !== rawRef.current) ||
        (e.key === storagePhysicalKey(storage, SAVE_KEY) && e.newValue === null)
      ) {
        setError(
          "別の画面で英語ノートが更新されました。この画面を再読み込みしてください。",
        );
        blocked.current = true;
      }
    }
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, [listenToStorage, storage]);
  const isMarked = (id: string) =>
    !!learningTranslations[id] &&
    data.marks[id] === JSON.stringify(learningTranslations[id].source);
  return { data, error, update, isMarked };
}
export type Learning = ReturnType<typeof useLearning>;
