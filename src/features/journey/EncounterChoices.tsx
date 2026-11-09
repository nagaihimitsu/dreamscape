import { InteractiveEnglish } from "../learning/InteractiveEnglish";
import { choiceMark, revealTranslation, toggleTranslation, visible, TranslationAll } from "../learning/Translations";
import type { Learning } from "../learning/useLearning";
import "./encounter.css";

/** Display-only information; eligibility and payment are decided by the domain. */
export type EncounterChoiceView = {
  index: number;
  textEn: string;
  translationJa: string;
  cost?: number;
  /** The AP the choice spends (`# ap: -N`; stage 3a), shown like its price. */
  apCost?: number;
  unavailableReason?: string;
};

export function EncounterChoices({
  id,
  choices,
  learning,
  formatMoney,
  disabled,
  onChoose,
}: {
  id: string;
  choices: EncounterChoiceView[];
  learning: Learning;
  /** The journey's money format (formatMoneyForCity). */
  formatMoney: (amount: number) => string;
  disabled?: boolean;
  onChoose: (index: number) => void;
}) {
  const hasPrices = choices.some((choice) => (choice.cost ?? 0) > 0);
  return (
    <div className="encounter-choices" aria-label="返答を選ぶ">
      {choices.some((choice) => choice.translationJa) && <TranslationAll learning={learning} id={id} parts={["question", ...choices.map((_, ordinal) => choiceMark(ordinal))]} />}
      {choices.map((choice, ordinal) => {
        const part = choiceMark(ordinal);
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
                {hasPrices && <span>{choice.cost ? formatMoney(choice.cost) : "無料"}</span>}
                {choice.apCost ? <span>AP {choice.apCost}</span> : null}
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
