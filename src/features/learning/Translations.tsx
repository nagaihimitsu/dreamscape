import type { ReactNode } from "react";
import { learningTranslations } from "../../content";
import type { Learning } from "./useLearning";

/** A quiz's translated parts: the question and its three options. */
export type QuizPart = "question" | "A" | "B" | "C";
/**
 * A part whose translation can be opened: "question" or a choice's mark (choiceMark). Encounter
 * choices continue after C with D, E… (decision 41); quizzes keep their three options.
 */
export type Part = string;
/** The mark of the choice at `ordinal` (0-based): A, B, C, D, … Z, then 27, 28, … */
export const choiceMark = (ordinal: number): string => (ordinal < 26 ? String.fromCharCode(65 + ordinal) : String(ordinal + 1));
export function visible(learning: Learning, id: string, part: Part) {
  return (
    learning.data.alwaysTranslate !==
    (learning.data.revealed[id] ?? []).includes(part)
  );
}
export function toggleTranslation(learning: Learning, id: string, part: Part) {
  learning.update((s) => {
    const entries = s.revealed[id] ?? [];
    return {
      ...s,
      revealed: {
        ...s.revealed,
        [id]: entries.includes(part)
          ? entries.filter((p) => p !== part)
          : [...entries, part],
      },
    };
  });
}
/** Opening by word selection should never hide an already visible translation. */
export function revealTranslation(learning: Learning, id: string, part: Part) {
  learning.update((state) => {
    const entries = state.revealed[id] ?? [];
    const isOpen = state.alwaysTranslate !== entries.includes(part);
    if (isOpen) return state;
    return {
      ...state,
      revealed: {
        ...state.revealed,
        [id]: state.alwaysTranslate
          ? entries.filter((entry) => entry !== part)
          : [...entries, part],
      },
    };
  });
}
export function Translation({
  learning,
  id,
  part,
  children,
}: {
  learning: Learning;
  id: string;
  part: QuizPart;
  children?: ReactNode;
}) {
  const item = learningTranslations[id];
  if (!item) return null;
  const isOpen = visible(learning, id, part);
  const label = part === "question" ? "問題文" : `選択肢${part}`;
  return (
    <div className="translation">
      <div className="translation-actions">
        {children}
        <button
          type="button"
          className="text-button translation-toggle"
          aria-expanded={isOpen}
          aria-label={`${label}の訳を${isOpen ? "閉じる" : "見る"}`}
          onClick={() => toggleTranslation(learning, id, part)}
        >
          {isOpen ? "訳を閉じる" : "訳を見る"}
        </button>
      </div>
      {isOpen && (
        <p lang="ja">
          {part === "question" ? item.questionJa : item.optionsJa[part]}
        </p>
      )}
    </div>
  );
}
export function TranslationAll({
  learning,
  id,
  parts = ["question", "A", "B", "C"],
}: {
  learning: Learning;
  id: string;
  /** The parts the button opens and closes together (a quiz's by default). */
  parts?: readonly Part[];
}) {
  const all = parts.every((p) => visible(learning, id, p));
  return (
    <button
      type="button"
      className="text-button translation-all"
      onClick={() =>
        learning.update((s) => ({
          ...s,
          revealed: {
            ...s.revealed,
            [id]: all
              ? s.alwaysTranslate
                ? [...parts]
                : []
              : s.alwaysTranslate
                ? []
                : [...parts],
          },
        }))
      }
    >
      {all ? "すべての訳を閉じる" : "すべての訳を見る"}
    </button>
  );
}
