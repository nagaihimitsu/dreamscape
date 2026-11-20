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

/**
 * An encounter's English replies, laid out as a quiz's three options (2026-11-14, the phone UI audit): 「すべての訳を見る」
 * at the top right, then a row per reply with its letter (the press that chooses it) on the left, its words, and its
 * 「訳を見る」 on the right, 44 px high; the translation opens under the words.
 */
export function EncounterChoices({
  id,
  choices,
  learning,
  formatMoney,
  disabled,
  japaneseOnly = false,
  onChoose,
}: {
  id: string;
  choices: EncounterChoiceView[];
  learning: Learning;
  /** The journey's money format (formatMoneyForCity). */
  formatMoney: (amount: number) => string;
  disabled?: boolean;
  /** 「日本語のみ」 (a quiz's options and an encounter's replies): each option's translation in its English's place, with no 「訳を見る」. */
  japaneseOnly?: boolean;
  onChoose: (index: number) => void;
}) {
  const hasPrices = choices.some((choice) => (choice.cost ?? 0) > 0);
  return (
    <div className="encounter-choices" aria-label="返答を選ぶ">
      {!japaneseOnly && choices.some((choice) => choice.translationJa) && <div className="encounter-translation-tools">
        <TranslationAll learning={learning} id={id} parts={["question", ...choices.map((_, ordinal) => choiceMark(ordinal))]} />
      </div>}
      {choices.map((choice, ordinal) => {
        const part = choiceMark(ordinal);
        const isOpen = visible(learning, id, part);
        const jaOnly = japaneseOnly && !!choice.translationJa;
        return (
          <div className="encounter-choice" key={choice.index} data-translated={choice.translationJa ? true : undefined}>
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
              {jaOnly ? <span lang="ja">{choice.translationJa}</span> : <InteractiveEnglish
                text={choice.textEn}
                vocabulary={[]}
                label={`選択肢${part}`}
                onDoubleTap={() => { if (choice.translationJa) revealTranslation(learning, id, part); }}
              />}
              {(hasPrices || !!choice.apCost) && <div className="encounter-choice-meta">
                {hasPrices && <span>{choice.cost ? formatMoney(choice.cost) : "無料"}</span>}
                {choice.apCost ? <span>AP {choice.apCost}</span> : null}
              </div>}
            </div>
            {choice.translationJa && !jaOnly && <button
              type="button"
              className="text-button encounter-choice-translate"
              aria-expanded={isOpen}
              aria-label={`選択肢${part}の訳を${isOpen ? "閉じる" : "見る"}`}
              onClick={() => toggleTranslation(learning, id, part)}
            >
              {isOpen ? "訳を閉じる" : "訳を見る"}
            </button>}
            {isOpen && choice.translationJa && !jaOnly && <p className="encounter-choice-translation" lang="ja">{choice.translationJa}</p>}
            {choice.unavailableReason && <p id={`${id}-${part}-reason`} className="encounter-choice-reason">{choice.unavailableReason}</p>}
          </div>
        );
      })}
    </div>
  );
}
