import { InteractiveEnglish } from "../learning/InteractiveEnglish";
import { revealTranslation, toggleTranslation, visible, TranslationAll, type Part } from "../learning/Translations";
import type { Learning } from "../learning/useLearning";
import "./encounter.css";

/** Display-only information; eligibility and payment are decided by the domain. */
export type EncounterChoiceView = {
  index: number;
  textEn: string;
  translationJa: string;
  costEuro?: number;
  unavailableReason?: string;
};

export function EncounterChoices({
  id,
  choices,
  learning,
  disabled,
  onChoose,
}: {
  id: string;
  choices: EncounterChoiceView[];
  learning: Learning;
  disabled?: boolean;
  onChoose: (index: number) => void;
}) {
  const hasPrices = choices.some((choice) => (choice.costEuro ?? 0) > 0);
  return (
    <div className="encounter-choices" aria-label="返答を選ぶ">
      {choices.some((choice) => choice.translationJa) && <TranslationAll learning={learning} id={id} />}
      {choices.map((choice, ordinal) => {
        const part = (["A", "B", "C"] as const)[ordinal] as Part;
        const isOpen = visible(learning, id, part);
        return (
          <div className="encounter-choice" key={choice.index}>
            <button
              type="button"
              className="encounter-choice-select"
              aria-label={`${part}を選ぶ`}
              aria-describedby={choice.unavailableReason ? `${id}-${part}-reason` : undefined}
              disabled={disabled || !!choice.unavailableReason}
              onClick={() => onChoose(choice.index)}
            >
              {part}
            </button>
            <div className="encounter-choice-content">
              <InteractiveEnglish
                text={choice.textEn}
                vocabulary={[]}
                label={`選択肢${part}`}
                onDoubleTap={() => { if (choice.translationJa) revealTranslation(learning, id, part); }}
              />
              <div className="encounter-choice-meta">
                {hasPrices && <span>{choice.costEuro ? `€${choice.costEuro}` : "無料"}</span>}
                {choice.translationJa && <button
                  type="button"
                  className="text-button"
                  aria-expanded={isOpen}
                  onClick={() => toggleTranslation(learning, id, part)}
                >
                  {isOpen ? "訳を閉じる" : "訳を見る"}
                </button>}
              </div>
              {isOpen && choice.translationJa && <p lang="ja">{choice.translationJa}</p>}
              {choice.unavailableReason && <p id={`${id}-${part}-reason`} className="encounter-choice-reason">{choice.unavailableReason}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
