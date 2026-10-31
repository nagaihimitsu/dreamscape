import type { ReactNode } from "react";
import { learningTranslations } from "../../content";
import type { Learning } from "./useLearning";

export type Part = "question" | "A" | "B" | "C";
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
export function Translation({
  learning,
  id,
  part,
  children,
}: {
  learning: Learning;
  id: string;
  part: Part;
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
}: {
  learning: Learning;
  id: string;
}) {
  const parts: Part[] = ["question", "A", "B", "C"];
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
                ? parts
                : []
              : s.alwaysTranslate
                ? []
                : parts,
          },
        }))
      }
    >
      {all ? "すべての訳を閉じる" : "すべての訳を見る"}
    </button>
  );
}
