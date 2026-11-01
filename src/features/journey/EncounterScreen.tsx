import { useCallback, useEffect, useRef, useState } from "react";
import { CanalScene } from "../../components/CanalScene";
import { DialogueText } from "../../components/DialogueText";
import { DialogueToolsMenu } from "../../components/DialogueToolsMenu";
import { InteractiveEnglish } from "../learning/InteractiveEnglish";
import { revealTranslation, toggleTranslation, visible } from "../learning/Translations";
import type { Learning } from "../learning/useLearning";
import { EncounterChoices, type EncounterChoiceView } from "./EncounterChoices";
import "../romance/romance-scene.css";
import "./encounter.css";

export type EncounterScreenView = {
  id: string;
  revision: number;
  background: string;
  backgroundImage?: string;
  balance: number;
  speaker: string;
  text: string;
  choices: EncounterChoiceView[];
  ended: boolean;
  quiz?: {
    id: string;
    questionEn: string;
    questionJa: string;
    options: EncounterChoiceView[];
    result?: string;
  };
};

/** The view contains no game rules: all changes are committed by the caller. */
export function EncounterScreen({ view, learning, speed, onSpeed, onAdvance, onChoose, onAnswer, onFinish }: {
  view: EncounterScreenView;
  learning: Learning;
  speed: number;
  onSpeed: (value: number) => void;
  onAdvance: () => void;
  onChoose: (index: number) => boolean;
  onAnswer: (index: number) => boolean;
  onFinish: () => void;
}) {
  const [ready, setReady] = useState(false);
  const [choiceReady, setChoiceReady] = useState(false);
  const lock = useRef(false);
  const onReady = useCallback((value: boolean) => setReady(value), []);
  useEffect(() => {
    if (view.quiz) setReady(true);
  }, [view.quiz]);
  useEffect(() => {
    lock.current = false;
    setChoiceReady(false);
    if (!ready) return;
    const timer = window.setTimeout(() => setChoiceReady(true), 300);
    return () => window.clearTimeout(timer);
  }, [view.revision, ready]);
  function select(index: number, action: (index: number) => boolean) {
    if (lock.current || !choiceReady) return;
    lock.current = true;
    if (!action(index)) lock.current = false;
  }
  function advance() {
    if (!ready || view.choices.length || view.quiz) return;
    if (view.ended) onFinish();
    else onAdvance();
  }
  const quiz = view.quiz;
  return (
    <div className="vn-scene encounter-scene" data-testid="encounter-screen" data-has-choices={!!quiz || view.choices.length > 0}>
      <div className="vn-background">{view.backgroundImage ? <img className="encounter-background" src={`${import.meta.env.BASE_URL}${view.backgroundImage}`} alt="" /> : <CanalScene backgroundId={view.background} />}</div>
      <section className="vn-dialogue paper story-paper encounter-dialogue" aria-label="寄り道の会話">
        <div className="encounter-scene-heading">
          <div className="speaker">{view.speaker}</div>
          <span aria-label={`旅の予算 ${view.balance}ユーロ`}>€{view.balance}</span>
        </div>
        {quiz ? (
          <>
            <p className="encounter-quiz-prompt">
              <InteractiveEnglish text={quiz.questionEn} vocabulary={[]} label="問題文" onDoubleTap={() => revealTranslation(learning, quiz.id, "question")} />
            </p>
            <button type="button" className="text-button" aria-expanded={visible(learning, quiz.id, "question")} onClick={() => toggleTranslation(learning, quiz.id, "question")}>
              {visible(learning, quiz.id, "question") ? "訳を閉じる" : "訳を見る"}
            </button>
            {visible(learning, quiz.id, "question") && <p>{quiz.questionJa}</p>}
            {quiz.result ? <><p role="status">{quiz.result}</p><button type="button" className="next" onClick={onAdvance}>続きを読む →</button></> : (
              <EncounterChoices id={quiz.id} choices={quiz.options} learning={learning} onChoose={(index) => select(index, onAnswer)} disabled={!choiceReady} />
            )}
          </>
        ) : (
          <>
            <DialogueText key={view.revision} text={view.text} speed={speed} onReady={onReady} onAdvance={advance} />
            {view.choices.length ? (
              <EncounterChoices id={view.id} choices={view.choices} learning={learning} onChoose={(index) => select(index, onChoose)} disabled={!ready || !choiceReady} />
            ) : (
              <button type="button" className="next" disabled={!ready} onClick={advance}>{view.ended ? "自由時間へ" : "続きを読む"} <span aria-hidden="true">→</span></button>
            )}
          </>
        )}
        <div className="story-tools">
          <DialogueToolsMenu>
            <label>文字送り <select aria-label="文字送り" value={speed} onChange={(event) => onSpeed(Number(event.target.value))}>
              <option value={45}>ゆっくり</option><option value={25}>ふつう</option><option value={0}>一括表示</option>
            </select></label>
          </DialogueToolsMenu>
        </div>
      </section>
    </div>
  );
}
