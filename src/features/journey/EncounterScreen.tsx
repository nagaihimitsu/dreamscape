import { useEffect, useRef, useState } from "react";
import { CanalScene } from "../../components/CanalScene";
import { BackgroundCredits } from "../../components/BackgroundCredits";
import { SceneCreditButton, SceneLabelLine } from "../../components/SceneLabelLine";
import { DialogueText } from "../../components/DialogueText";
import { DialogueControls, DialogueWindowHead } from "../../components/DialogueControls";
import { useDialogueLog } from "../../components/DialogueLog";
import { useAutoAdvance } from "../../components/useAutoAdvance";
import { DialogueWindowHide, DialogueWindowRestore, useDialogueWindow } from "../../components/DialogueWindowVisibility";
import { dialogueObstructed } from "../../components/dialogueObstructed";
import { useSceneTap } from "../../components/useSceneTap";
import { CharacterPortrait } from "../../components/CharacterPortrait";
import { ComicEffect } from "../../components/ComicEffect";
import type { ReactionMark } from "../../content/dialogue-reactions";
import type { TourismAsset } from "../../content/tourism-schemas";
import { formatMoneyForCity } from "../../content/currency";
import { InteractiveEnglish } from "../learning/InteractiveEnglish";
import { revealTranslation, toggleTranslation, visible } from "../learning/Translations";
import type { Learning } from "../learning/useLearning";
import { EncounterChoices, type EncounterChoiceView } from "./EncounterChoices";
import "../romance/romance-scene.css";
import "./encounter.css";

export type EncounterScreenView = {
  id: string;
  revision: number;
  /** The scene's heading: the name of the place where it happens (unified event design, decision 1). */
  placeJa: string;
  background: string;
  /** The place's registered photo, shown as the background with its credits. */
  backgroundAsset?: TourismAsset;
  speaker: string;
  text: string;
  choices: EncounterChoiceView[];
  ended: boolean;
  finishLabel?: string;
  portraits?: Partial<Record<"heroine" | "enemy", { emotion: string; mark?: ReactionMark; active: boolean }>>;
  cityId: string;
  sceneId?: string;
  quiz?: {
    id: string;
    questionEn: string;
    questionJa: string;
    options: EncounterChoiceView[];
    result?: string;
  };
};

/** The view contains no game rules: all changes are committed by the caller. */
export function EncounterScreen({ view, learning, speed, reduceMotion, autoAdvanceEnabled = false, onAdvance, onChoose, onAnswer, onFinish }: {
  view: EncounterScreenView;
  learning: Learning;
  speed: number;
  reduceMotion: boolean;
  onSpeed: (value: number) => void;
  autoAdvanceEnabled?: boolean;
  onAdvance: () => void;
  onChoose: (index: number) => boolean;
  onAnswer: (index: number) => boolean;
  onFinish: () => void;
}) {
  const { ready, onReady, entries } = useDialogueLog(view.id, view.revision, view.speaker, view.quiz ? "" : view.text);
  const windowVisibility = useDialogueWindow();
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [choiceReady, setChoiceReady] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    if (view.quiz) onReady(true);
  }, [view.quiz, onReady]);
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
    if (!ready || view.choices.length || view.quiz || windowVisibility.hidden || dialogueObstructed()) return;
    if (view.ended) onFinish();
    else onAdvance();
  }
  const quiz = view.quiz;
  const autoAdvance = useAutoAdvance({ ready, canAdvance: !view.ended && !quiz && view.choices.length === 0 && !windowVisibility.hidden,
    text: view.text, onAdvance: advance, defaultEnabled: autoAdvanceEnabled });
  const sceneTap = useSceneTap({ active: true, lineShown: ready, choicesShown: !!quiz || view.choices.length > 0, windowHidden: windowVisibility.hidden });
  return (
    <div className="vn-scene encounter-scene" data-testid="encounter-screen" data-has-choices={!!quiz || view.choices.length > 0} data-dialogue-hidden={windowVisibility.hidden || undefined} {...sceneTap.props}>
      <div className="vn-background" data-testid="scene-picture">{view.backgroundAsset ? <img className="encounter-background" src={`${import.meta.env.BASE_URL}${view.backgroundAsset.path}`} alt="" /> : <CanalScene backgroundId={view.background} />}</div>
      <SceneLabelLine label={view.placeJa}>
        {view.backgroundAsset && <SceneCreditButton onClick={() => setCreditsOpen(true)} />}
      </SceneLabelLine>
      {!quiz && view.portraits && <div className="vn-character-layer encounter-character-layer" data-two-characters={!!view.portraits.heroine && !!view.portraits.enemy}>
        {(["heroine", "enemy"] as const).map((id) => {
          const portrait = view.portraits?.[id];
          return portrait && <div className={`encounter-character-slot encounter-character-${id}`} key={id}>
            <CharacterPortrait characterId={id} cityId={view.cityId} sceneId={view.sceneId} emotion={portrait.emotion} active={portrait.active}>
              {portrait.mark && <ComicEffect effect={portrait.mark} reduceMotion={reduceMotion} cueKey={String(view.revision)} />}
            </CharacterPortrait>
          </div>;
        })}
      </div>}
      <section className="vn-dialogue paper story-paper encounter-dialogue" aria-label="寄り道の会話" inert={windowVisibility.hidden} aria-hidden={windowVisibility.hidden || undefined}>
        <DialogueWindowHead
          speaker={view.speaker}
          controls={<DialogueControls close={<DialogueWindowHide state={windowVisibility} />} entries={entries} auto={autoAdvance} />}
        />
        <div className="vn-window-body">
        {quiz ? (
          <>
            <p className="encounter-quiz-prompt">
              <InteractiveEnglish text={quiz.questionEn} vocabulary={[]} label="問題文" onDoubleTap={() => revealTranslation(learning, quiz.id, "question")} />
            </p>
            <button type="button" className="text-button" aria-expanded={visible(learning, quiz.id, "question")} onClick={() => toggleTranslation(learning, quiz.id, "question")}>
              {visible(learning, quiz.id, "question") ? "訳を閉じる" : "訳を見る"}
            </button>
            {visible(learning, quiz.id, "question") && <p>{quiz.questionJa}</p>}
            {quiz.result ? <><p role="status">{quiz.result}</p><button type="button" className="next" data-testid="encounter-advance" onClick={onAdvance}>続きを読む →</button></> : (
              <EncounterChoices formatMoney={(amount) => formatMoneyForCity(view.cityId, amount)} id={quiz.id} choices={quiz.options} learning={learning} onChoose={(index) => select(index, onAnswer)} disabled={!choiceReady} />
            )}
          </>
        ) : (
          <>
            <DialogueText key={view.revision} ref={sceneTap.line} text={view.text} speed={autoAdvance.fast ? 0 : speed} onReady={onReady} onAdvance={advance} />
            {view.choices.length ? (
              <EncounterChoices formatMoney={(amount) => formatMoneyForCity(view.cityId, amount)} id={view.id} choices={view.choices} learning={learning} onChoose={(index) => select(index, onChoose)} disabled={!ready || !choiceReady} />
            ) : view.ended ? (
              <button type="button" className="next" data-testid="encounter-advance" disabled={!ready} onClick={advance}>{view.ended ? view.finishLabel ?? "自由時間へ" : "続きを読む"} <span aria-hidden="true">→</span></button>
            ) : null}
          </>
        )}
        </div>
      </section>
      {creditsOpen && view.backgroundAsset && <BackgroundCredits asset={view.backgroundAsset} onClose={() => setCreditsOpen(false)} />}
      <DialogueWindowRestore state={windowVisibility} />
    </div>
  );
}
