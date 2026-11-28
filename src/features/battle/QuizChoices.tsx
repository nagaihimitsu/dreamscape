import type { AskedQuestion } from "../../content/english-levels";
import { InteractiveEnglish } from "../learning/InteractiveEnglish";
import { ReadAloudButton, type ReadAloud } from "../learning/ReadAloud";
import { revealTranslation, toggleTranslation, visible } from "../learning/Translations";
import type { Learning } from "../learning/useLearning";
import { quizChoiceMark, type QuizChoiceMark } from "./quiz-choice-mark";
import "../journey/encounter.css";

const MARK_WORDS: Record<QuizChoiceMark, { symbol: string; word: string }> = {
  right: { symbol: "○", word: "正解！" },
  missed: { symbol: "×", word: "不正解" },
  answer: { symbol: "○", word: "正解" },
};

/**
 * A battle question's three options, floating above the talk's window as the talk's choices do (2026-11-28 user decision;
 * battle.css): a row per option in the window's glass, the whole row its press (no A·B·C letter, 2026-11-26), its words
 * opening their meanings, its 「訳を見る」 and (with 「英語を読み上げるボタンを出す」) its speaker on the row. Once the answer
 * shows, the options stay with their marks: 「○ 正解！」 on a right answer (it pops as the answer is given in this screen),
 * 「× 不正解」 on a wrong one and 「○ 正解」 on the right one, whose translation then shows under its words whatever the
 * translation settings (UI_REDESIGN_GUIDE J). Display only: the answer is scored by the caller.
 */
export function QuizChoices({ question, optionsJa, learning, reader, japaneseOnly, metWords, answer, disabled, chosenId, glowing, popping, onAnswer }: {
  question: AskedQuestion;
  /** The options' translations (learning/translations.json), when the question has them. */
  optionsJa?: Record<string, string>;
  learning: Learning;
  reader: ReadAloud;
  /** 「英語オフ」: each option in its translation only, with no 「訳を見る」 or speaker. */
  japaneseOnly: boolean;
  metWords: ReadonlySet<string>;
  /** The answer whose marks show (none while a right one is held still). */
  answer?: { optionId: string; correct: boolean };
  disabled: boolean;
  /** The option answered, from the answer's press (it stays pressed while a right answer is held still). */
  chosenId?: string;
  /** The chosen option's gold pulse. */
  glowing: boolean;
  /** Its mark pops (an answer given in this screen, not a restored one). */
  popping: boolean;
  onAnswer: (optionId: string) => void;
}) {
  return (
    <div className="encounter-choices quiz-choices" aria-label={japaneseOnly ? "3択" : "英語の3択"}>
      {question.options.map((option) => {
        const mark = quizChoiceMark(option.id, question.correctOptionId, answer);
        const ja = optionsJa?.[option.id];
        const jaOnly = japaneseOnly && !!ja;
        // The right one's translation after a wrong answer, whatever the settings (its 「訳を見る」 goes meanwhile).
        const shownAnyway = mark === "answer" && !jaOnly && !!ja;
        const toggle = !!ja && !jaOnly && !shownAnyway;
        const open = shownAnyway || (toggle && visible(learning, question.textKey, option.id));
        return (
          <div
            key={`${question.id}:${option.id}`}
            className={`encounter-choice quiz-choice-row${glowing && option.id === chosenId ? " answer-glow" : ""}`}
            data-testid={`option-text-${option.id}`}
            data-choice={option.id}
            data-translated={toggle || undefined}
            data-chosen={option.id === chosenId || undefined}
            data-mark={mark}
            data-faded={answer && !mark || undefined}
          >
            <button
              type="button"
              className="encounter-choice-select"
              data-testid={`answer-${option.id}`}
              aria-label={`「${jaOnly ? ja : option.textEn}」を答える`}
              disabled={disabled}
              onClick={() => onAnswer(option.id)}
            />
            <div className="encounter-choice-content">
              {jaOnly ? <span lang="ja">{ja}</span> : <>
                {/* At the right of the option's text, before its 「訳を見る」 and away from the rest of its press. */}
                <ReadAloudButton reader={reader} part={option.id} text={option.textEn} />
                <InteractiveEnglish
                  text={option.textEn}
                  vocabulary={question.vocabularyJa}
                  metWords={metWords}
                  label={`選択肢${option.id}`}
                  onDoubleTap={() => revealTranslation(learning, question.textKey, option.id)}
                />
              </>}
              {mark && <span className="quiz-choice-mark" data-mark={mark} data-pop={mark === "right" && popping || undefined}>
                <b aria-hidden="true">{MARK_WORDS[mark].symbol}</b>{MARK_WORDS[mark].word}
              </span>}
            </div>
            {toggle && (() => {
              const isOpen = visible(learning, question.textKey, option.id);
              return <button
                type="button"
                className="text-button encounter-choice-translate"
                aria-expanded={isOpen}
                aria-label={`選択肢${option.id}の訳を${isOpen ? "閉じる" : "見る"}`}
                onClick={() => toggleTranslation(learning, question.textKey, option.id)}
              >
                {isOpen ? "訳を閉じる" : "訳を見る"}
              </button>;
            })()}
            {open && ja && <p className="encounter-choice-translation" lang="ja">{ja}</p>}
          </div>
        );
      })}
    </div>
  );
}
