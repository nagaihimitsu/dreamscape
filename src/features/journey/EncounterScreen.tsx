import { useEffect, useRef, useState } from "react";
import { CanalScene } from "../../components/CanalScene";
import { SceneHeading } from "../../components/SceneHeading";
import { DIALOGUE_WINDOW_ATTRIBUTE, DialogueText } from "../../components/DialogueText";
import { LineStage, PhotoShowLayer, RecallLayer } from "../../components/LineStage";
import { SceneTint, WeatherLayer } from "../../components/SceneAtmosphere";
import { ItemShowLayer } from "../../components/ItemShow";
import { sceneTimeTint } from "./time-of-day";
import { lineCues, lineSpeed, showsSpeakerPlate, type PhoneNames } from "../../components/line-staging";
import { playSe } from "../../audio/sound-effects";
import { DialogueControls, DialogueWindowHead } from "../../components/DialogueControls";
import { useDialogueLog } from "../../components/DialogueLog";
import { useAutoAdvance } from "../../components/useAutoAdvance";
import { readLineId, type ReadSkip } from "../../components/read-skip";
import { DialogueWindowHide, DialogueWindowRestore, useDialogueWindow } from "../../components/DialogueWindowVisibility";
import { dialogueObstructed } from "../../components/dialogueObstructed";
import { useSceneTap } from "../../components/useSceneTap";
import { CharacterFigure, CharacterPortrait } from "../../components/CharacterPortrait";
import { ChoicePoint } from "../../minigames/host/ChoicePoint";
import { MiniGameSlot } from "../../minigames/host/MiniGameProvider";
import type { MiniGameTag } from "../../minigames/tag";
import { oppositeIsEnemy, type StageLine, type StageScene } from "../../components/scene-stage";
import { useSceneStage } from "../../components/useSceneStage";
import { useNameCutIn } from "../../components/NameCutIn";
import type { NameCutIn } from "../../components/speaker-plate";
import { ComicEffect } from "../../components/ComicEffect";
import type { ReactionMark } from "../../content/dialogue-reactions";
import type { LineDelivery } from "../../content/tags";
import type { FrameStaging, Speaker, StoryFrame } from "../../story/frame-reader";
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
  /** The place's registered photo, shown as the background (⚙設定's 画像の出典 opens its credits). */
  backgroundAsset?: TourismAsset;
  speaker: string;
  /** The line is the narration (「旅の風景」), no one's words. */
  narration: boolean;
  text: string;
  /** The line's `# pause:`, `# shake:` and `# size:`. */
  delivery?: LineDelivery;
  /** The line's `# voice:`: its recording, played as its text starts. */
  voiceId?: string;
  /** The line's `# se:`: its sound, played as its text starts. */
  seId?: string;
  /**
   * The line's scene tags (`# recall:`, `# phone:`, `# letter:`, `# quiet:`, `# stand:`, `# item_show:`), its photo
   * (`# photo_show:`), the scene's weather and tint (`# weather:`, `# tint:`) and who speaks it.
   */
  staging?: FrameStaging & Pick<StoryFrame, "photo" | "weather" | "tint"> & { speaker: Speaker; speakerPersonId?: string };
  /** The game clock (minutes from midnight): the colour of the time of day over the scene's picture. */
  minute: number;
  /** The names a phone's messages show (LineStage). */
  phoneNames?: PhoneNames;
  choices: EncounterChoiceView[];
  /** The line's `# minigame:`: played in place of the choices (ChoicePoint, docs/13 1.5). */
  minigame?: MiniGameTag;
  ended: boolean;
  finishLabel?: string;
  /** The heading's tag (a running tour's 「ツアー・見学」). */
  badgeJa?: string;
  /**
   * Who may stand on the scene's stage (scene-stage.ts): the line as the stage reads it, the scene's figures, and how the
   * heroine and the scene's enemy look on this line (their expression and reaction mark).
   */
  stage: { line: StageLine; scene: StageScene; heroine: { emotion: string; mark?: ReactionMark }; enemy: { emotion: string; mark?: ReactionMark } };
  /** The line's name plate (`# cutin: name`, nameCutIn): shown for a moment (useNameCutIn). */
  cutIn?: NameCutIn;
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
export function EncounterScreen({ view, learning, speed, reduceMotion, autoAdvanceEnabled = false, readSkip, onAdvance, onChoose, onAnswer, onFinish }: {
  view: EncounterScreenView;
  learning: Learning;
  speed: number;
  reduceMotion: boolean;
  onSpeed: (value: number) => void;
  autoAdvanceEnabled?: boolean;
  /** This device's read lines: 高速送り stops at a line not read before (read-skip.ts). */
  readSkip?: ReadSkip;
  onAdvance: () => void;
  onChoose: (index: number) => boolean;
  onAnswer: (index: number) => boolean;
  onFinish: () => void;
}) {
  const { ready, onReady, entries } = useDialogueLog(view.id, view.revision, view.speaker, view.quiz ? "" : view.text, view.delivery);
  const windowVisibility = useDialogueWindow();
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
    else playSe("ui_confirm");
  }
  function advance() {
    if (!ready || view.choices.length || view.quiz || windowVisibility.hidden || dialogueObstructed()) return;
    if (view.ended) onFinish();
    else onAdvance();
  }
  const quiz = view.quiz;
  // The line's name plate for a moment (`# cutin: name`; none over a quiz, which shows no line).
  const nameCut = useNameCutIn(quiz ? undefined : view.cutIn, String(view.revision));
  // The heroine from her first line (or reaction) and the one opposite her, each to the scene's end or until another comes in.
  const { stage, focus } = useSceneStage(view.stage.line, view.stage.scene);
  const enemyLook = oppositeIsEnemy(stage, view.stage.scene) ? view.stage.enemy : undefined;
  // The quiz (its question, its feedback) shows no line: the line's staging waits for the next one.
  const staging = quiz ? undefined : view.staging;
  const autoAdvance = useAutoAdvance({ ready, canAdvance: !view.ended && !quiz && view.choices.length === 0 && !windowVisibility.hidden,
    text: view.text, onAdvance: advance, defaultEnabled: autoAdvanceEnabled,
    readSkip, lineId: !quiz && view.text ? readLineId(view.sceneId ?? view.id, view.text) : null });
  const sceneTap = useSceneTap({ active: true, lineShown: ready, choicesShown: !!quiz || view.choices.length > 0, windowHidden: windowVisibility.hidden });
  return (
    <div className="vn-scene encounter-scene" data-testid="encounter-screen" data-has-choices={!!quiz || view.choices.length > 0} data-dialogue-hidden={windowVisibility.hidden || undefined} data-quiet={staging?.quiet} {...sceneTap.props}>
      <div className="vn-background" data-testid="scene-picture">{view.backgroundAsset ? <img className="encounter-background" src={`${import.meta.env.BASE_URL}${view.backgroundAsset.path}`} alt="" decoding="async" fetchPriority="high" /> : <CanalScene backgroundId={view.background} />}
        <SceneTint color={sceneTimeTint(view.minute, view.staging?.tint === "off")} />
      </div>
      {/* The scene's weather stays over its quiz too. */}
      <WeatherLayer weather={view.staging?.weather} />
      <RecallLayer imageId={staging?.recall} />
      <PhotoShowLayer photo={staging?.photo} />
      <ItemShowLayer itemId={staging?.itemShow} quiet={!!staging?.quiet} />
      <SceneHeading label={view.placeJa} badge={view.badgeJa} />
      {!quiz && (stage.heroine || stage.opposite) && <div className="vn-character-layer encounter-character-layer" data-two-characters={stage.heroine && !!stage.opposite}>
        {stage.heroine && <div className="encounter-character-slot encounter-character-heroine">
          <CharacterPortrait characterId="heroine" cityId={view.cityId} sceneId={view.sceneId} emotion={view.stage.heroine.emotion} focus={focus.heroine}
            stand={view.staging?.stand}>
            {view.stage.heroine.mark && <ComicEffect effect={view.stage.heroine.mark} reduceMotion={reduceMotion} cueKey={String(view.revision)} />}
          </CharacterPortrait>
        </div>}
        {stage.opposite && <div className="encounter-character-slot encounter-character-enemy">
          <CharacterPortrait key={stage.opposite.figure} characterId={stage.opposite.figure} cityId={view.cityId} sceneId={view.sceneId}
            emotion={enemyLook?.emotion ?? "neutral"} focus={focus.opposite}>
            {enemyLook?.mark && <ComicEffect effect={enemyLook.mark} reduceMotion={reduceMotion} cueKey={String(view.revision)} />}
          </CharacterPortrait>
        </div>}
      </div>}
      <section className="vn-dialogue paper story-paper encounter-dialogue" {...{ [DIALOGUE_WINDOW_ATTRIBUTE]: "" }} aria-label="寄り道の会話" data-has-choices={!!quiz || view.choices.length > 0} inert={windowVisibility.hidden} aria-hidden={windowVisibility.hidden || undefined}>
        <DialogueWindowHead
          cutIn={nameCut}
          speaker={showsSpeakerPlate(staging) && view.speaker}
          narration={view.narration}
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
            <LineStage frame={staging ?? { speaker: "narrator" }} names={view.phoneNames ?? {}} compact={view.choices.length > 0}>
              <DialogueText key={view.revision} ref={sceneTap.line} text={view.text} delivery={view.delivery} speed={autoAdvance.fast ? 0 : lineSpeed(speed, staging)}
                voiceId={view.voiceId} seId={view.seId} cues={lineCues(staging, !!nameCut)} voice={autoAdvance.voice} onReady={onReady} onAdvance={advance} />
            </LineStage>
            {view.choices.length ? (
              <ChoicePoint minigame={view.minigame} ready={ready} cast={{
                heroine: <CharacterFigure characterId="heroine" emotion={view.stage.heroine.emotion} cityId={view.cityId} sceneId={view.sceneId} />,
                ...(stage.opposite ? { person: <CharacterFigure characterId={stage.opposite.figure} cityId={view.cityId} sceneId={view.sceneId} /> } : {}),
              }}>
                <EncounterChoices formatMoney={(amount) => formatMoneyForCity(view.cityId, amount)} id={view.id} choices={view.choices} learning={learning} onChoose={(index) => select(index, onChoose)} disabled={!ready || !choiceReady} />
              </ChoicePoint>
            ) : view.ended ? (
              <button type="button" className="next" data-testid="encounter-advance" disabled={!ready} onClick={advance}>{view.ended ? view.finishLabel ?? "自由時間へ" : "続きを読む"} <span aria-hidden="true">→</span></button>
            ) : null}
          </>
        )}
        </div>
      </section>
      <DialogueWindowRestore state={windowVisibility} />
      <MiniGameSlot />
    </div>
  );
}
