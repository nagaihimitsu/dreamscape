import { useLayoutEffect, useRef, useState } from "react";
import { MOTION } from "../../components/motion";
import type { AskedQuestion } from "../../content/english-levels";
import { InteractiveEnglish } from "../learning/InteractiveEnglish";
import { ReadAloudButton, type ReadAloud } from "../learning/ReadAloud";
import { revealTranslation, toggleTranslation, visible } from "../learning/Translations";
import type { Learning } from "../learning/useLearning";
import { quizChoiceMark, quizChoiceStays, type QuizChoiceMark } from "./quiz-choice-mark";
import "../journey/encounter.css";

/** How long a leaving option takes (MOTION, docs/14): it fades out, then the rows close up over its place. */
export const QUIZ_CHOICE_LEAVE_MS = MOTION.scene;
/** The way it moves: going away (styles.css --ease-in-out, a place given up; docs/14 「動き方」). */
const LEAVE_EASING = "cubic-bezier(0.45, 0, 0.3, 1)";

const MARK_WORDS: Record<QuizChoiceMark, { symbol: string; word: string }> = {
  right: { symbol: "○", word: "正解！" },
  missed: { symbol: "×", word: "不正解" },
  answer: { symbol: "○", word: "正解" },
};

/**
 * A battle question's three options, floating above the talk's window as the talk's choices do (2026-11-28 user decision;
 * battle.css): a row per option in the window's glass, the whole row its press (no A·B·C letter, 2026-11-26), its words
 * opening their meanings, its 「訳を見る」 and (with 「英語を読み上げるボタンを出す」) its speaker on the row. Once the answer
 * shows, only the right one stays, and the one chosen when it was wrong (quizChoiceStays; 2026-11-28 user decision), with
 * their marks: 「○ 正解！」 on a right answer (it pops as the answer is given in this screen), 「× 不正解」 on a wrong one and
 * 「○ 正解」 on the right one, whose translation then shows under its words whatever the translation settings
 * (UI_REDESIGN_GUIDE J). The other wrong ones leave: given in this screen with motion allowed (`animateLeaving`), they fade
 * and the rows close up over them (QUIZ_CHOICE_LEAVE_MS); else (a restored answer, reduced motion, a hidden page) they are
 * simply gone. Leaving, they are hidden from screen readers and take no press. Display only: the answer is scored by the caller.
 */
export function QuizChoices({ question, optionsJa, learning, reader, japaneseOnly, metWords, answer, disabled, chosenId, glowing, popping, animateLeaving,
  onAnswer }: {
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
  /** The answer was given in this screen with motion allowed: the options that do not stay leave by moving, not at once. */
  animateLeaving: boolean;
  onAnswer: (optionId: string) => void;
}) {
  const answerKey = answer ? `${question.id}:${answer.optionId}` : "";
  // The answer whose leaving options have gone (their move ended or was cut short).
  const [gone, setGone] = useState("");
  const rows = useRef(new Map<string, HTMLDivElement>());
  const leavingIds = question.options.filter((option) => !quizChoiceStays(option.id, question.correctOptionId, answer)).map((option) => option.id);
  const moving = animateLeaving && gone !== answerKey;
  useLayoutEffect(() => {
    if (!answerKey || !animateLeaving || gone === answerKey) return;
    const elements = leavingIds.flatMap((id) => rows.current.get(id) ?? []);
    if (!elements.length || document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !elements.every((element) => typeof element.animate === "function")) {
      setGone(answerKey);
      return;
    }
    // Faded first, then closed up: its height, its padding and the gap after it (a negative margin as large) go to none.
    const gap = parseFloat(getComputedStyle(elements[0].parentElement!).rowGap) || 0;
    const animations = elements.map((element) => {
      const style = getComputedStyle(element);
      const height = `${element.getBoundingClientRect().height}px`;
      const whole = { height, minHeight: "0px", paddingTop: style.paddingTop, paddingBottom: style.paddingBottom, marginBottom: "0px" };
      return element.animate([
        { ...whole, opacity: 1, transform: "translateX(0)" },
        { ...whole, opacity: 0, transform: "translateX(12px)", offset: 0.45 },
        { height: "0px", minHeight: "0px", paddingTop: "0px", paddingBottom: "0px", marginBottom: `${-gap}px`, opacity: 0,
          transform: "translateX(12px)" },
      ], { duration: QUIZ_CHOICE_LEAVE_MS, easing: LEAVE_EASING, fill: "forwards" });
    });
    let current = true;
    Promise.all(animations.map((animation) => animation.finished)).then(() => {
      if (current) setGone(answerKey);
    }, () => undefined);
    return () => {
      current = false;
      setGone(answerKey);
    };
  }, [answerKey, animateLeaving]);
  return (
    <div className="encounter-choices quiz-choices" aria-label={japaneseOnly ? "3択" : "英語の3択"}>
      {question.options.map((option) => {
        const leaving = leavingIds.includes(option.id);
        if (leaving && !moving) return null;
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
            ref={(element) => {
              if (element) rows.current.set(option.id, element);
              else rows.current.delete(option.id);
            }}
            className={`encounter-choice quiz-choice-row${glowing && option.id === chosenId ? " answer-glow" : ""}`}
            data-testid={`option-text-${option.id}`}
            data-choice={option.id}
            data-translated={toggle || undefined}
            data-chosen={option.id === chosenId || undefined}
            data-mark={mark}
            data-leaving={leaving || undefined}
            aria-hidden={leaving || undefined}
            inert={leaving || undefined}
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
