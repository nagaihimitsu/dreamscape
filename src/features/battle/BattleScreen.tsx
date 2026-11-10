import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { tourSceneBadge } from "../../domain/tour";
import { dialogueExpressions, dialogueReactions, landmarks, learningTranslations, presentation, reasoningIntroductions, tourismAssets } from "../../content";
import { resolveDialogueExpression } from "../../content/dialogue-expressions";
import { resolveDialogueReaction } from "../../content/dialogue-reactions";
import type { GameState } from "../../domain/game";
import { battleChrome, getActiveBattleContent, getBattleOutcome, isFlowBattle } from "../../domain/battle";
import { SceneChoices, type SceneChoiceView } from "../../components/SceneChoices";
import { beginStory, continueStory, type StoryStep } from "../../story/runtime";
import { DialogueText } from "../../components/DialogueText";
import { DialogueWindowHide, DialogueWindowRestore, useDialogueWindow } from "../../components/DialogueWindowVisibility";
import { useAutoAdvance } from "../../components/useAutoAdvance";
import { DialogueControls, DialogueWindowHead } from "../../components/DialogueControls";
import { useSceneTap } from "../../components/useSceneTap";
import { holdTaps } from "../../components/tap-hold";
import { dialogueObstructed } from "../../components/dialogueObstructed";
import { CanalScene } from "../../components/CanalScene";
import { BackgroundCredits } from "../../components/BackgroundCredits";
import { SceneCreditButton, SceneLabelLine, SceneNotebookTab } from "../../components/SceneLabelLine";
import { CharacterPortrait, characterForBattle } from "../../components/CharacterPortrait";
import { ComicEffect } from "../../components/ComicEffect";
import { useDialogueLog } from "../../components/DialogueLog";
import { EnemyPortrait } from "./EnemyPortrait";
import { BattleRewards } from "../journey/BattleRewards";
import { ReasoningPanel } from "./ReasoningPanel";
import { ReasoningCutIn } from "./ReasoningCutIn";
import { OutcomeHeading } from "./OutcomeHeading";
import { DOUBLE_TAP_WINDOW_MS, isSecondTap } from "../../components/double-tap";
import {
  Translation,
  TranslationAll,
  revealTranslation,
} from "../learning/Translations";
import { InteractiveEnglish } from "../learning/InteractiveEnglish";
import type { Learning } from "../learning/useLearning";
import "./battle.css";

/** Room left between the round bar and the first line of a feedback below it. */
const FEEDBACK_GAP_PX = 8;

/**
 * How far below the top of the screen the sticky boxes held there reach once
 * `line` is scrolled up to them: the round bar, and a header held above it
 * (the journey bar where :has() is missing, styles.css). Those are the sticky
 * boxes before `line` beside it or beside one of its ancestors; one held at the
 * top sits at its `top`. Read from styles and boxes, not by hit-testing, which
 * misses boxes without pointer events (all of them while taps are held after a
 * load: tap-hold.ts), and the same before and after a scroll.
 */
function heldDepth(line: Element) {
  let depth = 0;
  for (let node: Element = line; node.parentElement; node = node.parentElement) {
    for (let box = node.previousElementSibling; box; box = box.previousElementSibling) {
      const style = getComputedStyle(box);
      const top = parseFloat(style.top);
      const height = box.getBoundingClientRect().height;
      if (style.position === "sticky" && Number.isFinite(top) && height > 0) depth = Math.max(depth, top + height);
    }
  }
  return depth;
}

/**
 * Focuses the answer's feedback (screen readers read on from there) and shows
 * its start: its first line (「正しい答え：…」 after a wrong answer, else the
 * explanation) just below the sticky round bar. The box's top padding may sit
 * under the bar, so that as much of the rest shows as can.
 *
 * The browser's own focus scroll does most of it: the scroll-margin-top set
 * here from what is held at the top of the view (the bar, and a header held
 * above it) keeps that line clear of it, and a feedback that fits below it then
 * shows whole (one that nearly fills that room may keep some of its top
 * padding under it). One taller than that room may still be left with its start
 * under the bar (a hidden one is centred, for example), so it is scrolled back
 * until the first line shows; the rest and 「敵の反応を見る」 are read by
 * scrolling on. Both jumps are instant, as the browser's own.
 */
function focusFeedbackStart(feedback: HTMLElement, area: HTMLElement | null, bar: HTMLElement | null) {
  if (!area || !bar) {
    feedback.focus();
    return;
  }
  const line = feedback.querySelector(":scope > p") ?? feedback;
  // Below 500 px of portrait height the reading area grows with its content and the
  // page scrolls instead (battle.css): the bar then sticks to the top of the screen,
  // and the journey bar above the battle scrolls away with the page (styles.css), or
  // is held there too where :has() is missing. Otherwise the reading area scrolls and
  // holds the bar just below its top padding, where the bar is laid out.
  const pageScrolls = getComputedStyle(area).overflowY === "visible";
  const viewTop = pageScrolls ? 0 : area.getBoundingClientRect().top;
  const held = pageScrolls ? heldDepth(line) : bar.getBoundingClientRect().bottom - viewTop;
  const lineOffset = line.getBoundingClientRect().top - feedback.getBoundingClientRect().top;
  feedback.style.scrollMarginTop = `${Math.max(0, held + FEEDBACK_GAP_PX - lineOffset)}px`;
  feedback.focus();
  const clear = Math.max(viewTop + held, bar.getBoundingClientRect().bottom);
  const covered = clear + FEEDBACK_GAP_PX - line.getBoundingClientRect().top;
  if (covered <= 0) return;
  if (pageScrolls) window.scrollBy(0, -covered);
  else area.scrollTop -= covered;
}

interface Props {
  learning: Learning;
  onEnglish: (questionId?: string) => void;
  game: GameState;
  speed: number;
  autoAdvanceEnabled?: boolean;
  reduceMotion: boolean;
  onSpeed: (speed: number) => void;
  onAdvance: () => void;
  /** The shown choices of a battle's conversation (the one-flow form, stage 5), and choosing one. */
  choices?: SceneChoiceView[];
  onChoose?: (index: number) => void;
  onAnswer: (id: string) => boolean;
  onHint: () => void;
  onLeave?: () => void;
  /** The leave button's words when it leads somewhere else than free time (a battle whose head says then: epilogue: 「エピローグへ進む」). */
  leaveLabel?: string;
  onNotebook?: () => void;
  onClaimRewards: () => void;
  onPress: () => void;
  onSubmitEvidence: () => void;
  onNextEpisode?: () => void;
  nextIsFinale?: boolean;
  onEpilogue?: () => void;
  nextStoryBattle?: { battleId: string; descriptionJa: string; actionLabelJa: string };
  onNextStoryBattle?: () => void;
}

export function BattleScreen({
  learning,
  onEnglish,
  game,
  speed,
  reduceMotion,
  autoAdvanceEnabled = false,
  onAdvance,
  choices = [],
  onChoose,
  onAnswer,
  onHint,
  onLeave,
  leaveLabel,
  onNotebook,
  onClaimRewards,
  onPress,
  onSubmitEvidence,
  onNextEpisode,
  nextIsFinale,
  onEpilogue,
  nextStoryBattle,
  onNextStoryBattle,
}: Props) {
  const active = game.activeBattle!;
  const { battle, quiz } = getActiveBattleContent(active);
  const question = quiz.questions[active.roundIndex];
  const answer = active.answers[active.roundIndex];
  const outcome = getBattleOutcome(active.score, quiz.questions.length);
  // The same translation as the option's 「訳を見る」 (shown after a wrong answer whatever the translation settings).
  const correctTranslation = question && learningTranslations[question.id]?.optionsJa[question.correctOptionId];
  const perfectAnswer = active.phase === "feedback" && !!answer?.correct &&
    active.answers.length === quiz.questions.length && active.score === quiz.questions.length;
  const record = game.battleRecords.find((item) => item.battleId === battle.id);
  // The claim transition is already saved before these presentation-only
  // frames appear. Mounting directly in reasoning (reload or old save) never
  // replays them, and a different run cannot inherit the prior transition.
  const flow = isFlowBattle(battle);
  const previousBattle = useRef({
    runId: active.runId, phase: active.phase, scene: active.dialogueScene,
    ended: active.frame?.ended ?? false, proof: !!active.reasoning,
  });
  const [rebuttal, setRebuttal] = useState<{ storyId: string; step: StoryStep; index: number } | null>(null);
  const [cutIn, setCutIn] = useState<"contradiction" | "connection" | null>(null);
  useLayoutEffect(() => {
    const previous = previousBattle.current;
    previousBattle.current = {
      runId: active.runId, phase: active.phase, scene: active.dialogueScene,
      ended: active.frame?.ended ?? false, proof: !!active.reasoning,
    };
    if (previous.runId !== active.runId || active.phase !== "reasoning") {
      setRebuttal(null);
      setCutIn(null);
    }
    const config = battle.reasoning;
    // The one-flow form (stage 5): its rebuttal is lines of its flow (saved, decision 1); the cut-in plays as the flow first
    // reaches its stop point in this mounted screen (a reload there never replays it).
    if (flow) {
      if (config && previous.runId === active.runId && previous.phase === "dialogue" && !previous.proof && active.phase === "reasoning" && active.reasoning)
        setCutIn(config.kind);
      return;
    }
    if (!config || previous.runId !== active.runId || previous.phase !== "dialogue" ||
        previous.scene !== config.claimScene || !previous.ended || active.phase !== "reasoning") return;
    const storyId = reasoningIntroductions[battle.id];
    if (!storyId) {
      // New special battles can still use the common transition before an
      // optional presentation-only rebuttal has been authored.
      setCutIn(config.kind);
      return;
    }
    const step = beginStory(storyId, game.playerName, game.heroineName);
    setRebuttal({ storyId, step, index: 0 });
  }, [active.runId, active.phase, active.dialogueScene, active.frame?.ended, active.reasoning, battle, flow, game.playerName, game.heroineName]);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const windowVisibility = useDialogueWindow();
  const readingArea = useRef<HTMLElement>(null);
  const roundBar = useRef<HTMLDivElement>(null);
  const displayedStoryState = rebuttal?.step.storyState ?? (active.phase === "dialogue" ? active.storyState : null);
  // Start each new scene at the top of its own reading area, without moving
  // the page or disturbing a question when a notebook or translation opens.
  useLayoutEffect(() => {
    if (active.phase !== "feedback") readingArea.current?.scrollTo({ top: 0 });
  }, [active.phase, active.roundIndex, displayedStoryState]);
  // Only animate an answer saved in this mounted screen. A restored feedback
  // frame is already final and must never be scored or animated again.
  const [animatedAnswer, setAnimatedAnswer] = useState<string | null>(null);
  // When this screen last saved an answer; a tap right after it is the answer's double tap.
  const answeredAt = useRef<number | null>(null);
  // Shown as data-answer-settling while such taps are ignored (tests wait for it to end).
  const [answerSettling, setAnswerSettling] = useState(false);
  useEffect(() => {
    if (!answerSettling) return;
    const timer = window.setTimeout(() => setAnswerSettling(false), DOUBLE_TAP_WINDOW_MS);
    return () => window.clearTimeout(timer);
  }, [answerSettling]);
  const [effectAnswer, setEffectAnswer] = useState<string | null>(null);
  const answerKey = `${battle.id}:${active.roundIndex}:${answer?.optionId}`;
  useEffect(() => {
    if (!effectAnswer) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (active.phase !== "feedback" || effectAnswer !== answerKey || reduceMotion || document.hidden || media.matches) {
      setEffectAnswer(null);
      return;
    }
    const dismiss = () => setEffectAnswer(null);
    const timer = window.setTimeout(dismiss, perfectAnswer ? 1300 : 900);
    const onVisibility = () => { if (document.hidden) dismiss(); };
    const onMotionChange = () => { if (media.matches) dismiss(); };
    document.addEventListener("pointerdown", dismiss, true);
    document.addEventListener("keydown", dismiss, true);
    document.addEventListener("visibilitychange", onVisibility);
    if (media.addEventListener) media.addEventListener("change", onMotionChange);
    else media.addListener(onMotionChange);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", dismiss, true);
      document.removeEventListener("keydown", dismiss, true);
      document.removeEventListener("visibilitychange", onVisibility);
      if (media.removeEventListener) media.removeEventListener("change", onMotionChange);
      else media.removeListener(onMotionChange);
    };
  }, [active.phase, answerKey, effectAnswer, perfectAnswer, reduceMotion]);
  useEffect(() => {
    if (active.phase !== "feedback") return;
    const focusFeedback = () => {
      const feedback = document.getElementById("battle-feedback");
      if (feedback) focusFeedbackStart(feedback, readingArea.current, roundBar.current);
    };
    // A newly saved answer gets a short, optional visual beat. Restored frames,
    // hidden tabs and reduced-motion preferences never wait for an animation.
    if (animatedAnswer !== answerKey || reduceMotion || document.hidden ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      focusFeedback();
      return;
    }
    const timer = window.setTimeout(focusFeedback, 420);
    const cancel = () => window.clearTimeout(timer);
    const onVisibility = () => {
      if (document.hidden) {
        cancel();
        focusFeedback();
      }
    };
    // A player who starts interacting should keep their chosen focus.
    document.addEventListener("pointerdown", cancel, true);
    document.addEventListener("keydown", cancel, true);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancel();
      document.removeEventListener("pointerdown", cancel, true);
      document.removeEventListener("keydown", cancel, true);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active.phase, active.roundIndex, animatedAnswer, answerKey, reduceMotion]);
  const frame = rebuttal?.step.frame ?? active.frame;
  const isDialogue = active.phase === "dialogue" || !!rebuttal;
  // What the line's screen shows (one rule for both forms: a flow battle looks as the scene form did, stage 5): the next
  // button at the end of a part, the conversation's choices, and what a rebuttal line hides.
  const chrome = battleChrome(active, battle, rebuttal?.step.frame);
  const choosing = chrome.choosing;
  const partEnd = !!chrome.advance;
  const backgroundId = frame?.background ?? battle.backgroundId;
  const landmark = landmarks.find((item) => item.id === battle.landmarkId);
  // Keep the same registered location photograph across dialogue, questions
  // and results. A city-wide finale has no landmark and keeps its own scene.
  const landmarkAsset = tourismAssets.find((asset) => asset.id === landmark?.imageAssetId);
  const backgroundAsset = landmarkAsset ?? tourismAssets.find(
    (asset) => asset.id === presentation.backgrounds[backgroundId]?.imageAssetId,
  );
  const storyId = rebuttal?.storyId ?? battle.storyId;
  // Reactions belong to their target, independently of the current speaker.
  // Unannotated frames retain the existing Ink and expression behavior.
  const heroineReaction = isDialogue && frame
    ? resolveDialogueReaction(dialogueReactions, storyId, frame, "heroine")
    : undefined;
  const enemyReaction = isDialogue && frame
    ? resolveDialogueReaction(dialogueReactions, storyId, frame, "enemy")
    : undefined;
  const heroineEmotion = heroineReaction?.expression ?? (frame && frame.speaker !== "enemy"
    ? resolveDialogueExpression(dialogueExpressions, storyId, frame)
    : "neutral");
  const enemyEmotion = enemyReaction?.expression ?? (frame?.speaker === "enemy" ? frame.emotion : "neutral");
  const speaker = frame?.speaker === "enemy"
    ? battle.enemyNameJa
    : frame?.speaker === "heroine"
      ? game.heroineName
      : frame?.speaker === "player"
        ? game.playerName
        : "旅の風景";
  const { ready, onReady, entries } = useDialogueLog(
    `${battle.id}:${record?.attempts ?? 0}`,
    rebuttal ? -rebuttal.index - 1 : game.revision,
    speaker,
    frame?.text ?? "",
  );
  const advanceSafely = () => {
    if (cutIn || (isDialogue && !ready) || windowVisibility.hidden || dialogueObstructed() || choosing) return;
    if (rebuttal) {
      if (rebuttal.step.frame.ended) {
        // A presentation-only scene end: the cut-in's skip must not take the double tap's second tap.
        holdTaps();
        setRebuttal(null);
        setCutIn(battle.reasoning!.kind);
      } else {
        const step = continueStory(rebuttal.storyId, rebuttal.step.storyState, rebuttal.step.frame);
        setRebuttal({ ...rebuttal, step, index: rebuttal.index + 1 });
      }
      return;
    }
    onAdvance();
  };
  const { show } = windowVisibility;
  useEffect(() => {
    if (!isDialogue) show();
  }, [isDialogue, show]);
  const auto = useAutoAdvance({
    ready,
    canAdvance: isDialogue && !creditsOpen && !windowVisibility.hidden && !!frame && !partEnd && !choosing,
    text: frame?.text ?? "",
    onAdvance: advanceSafely,
    defaultEnabled: autoAdvanceEnabled,
  });
  const sceneTap = useSceneTap({ active: isDialogue, lineShown: ready, choicesShown: choosing, windowHidden: windowVisibility.hidden });
  const isResult = active.phase === "result";
  const isSpecial = !!battle.reasoning;
  const showReasoning =
    !!battle.reasoning && battle.reasoning.roundIndex === active.roundIndex;

  return (
    <div
      className={`battle-screen ${answer && animatedAnswer === answerKey ? "answer-animating" : ""}`}
      onClickCapture={(event) => {
        // The second tap of a double tap on an answer is ignored, whatever moved under it.
        if (answeredAt.current !== null && isSecondTap(performance.now() - answeredAt.current)) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      data-phase={isDialogue ? "dialogue" : active.phase}
      data-answer-settling={answerSettling || undefined}
      data-effect-active={active.phase === "feedback" && effectAnswer === answerKey || undefined}
      data-reduce-motion={reduceMotion || undefined}
      data-dialogue-hidden={isDialogue && windowVisibility.hidden || undefined}
      {...sceneTap.props}
    >
      {active.phase === "feedback" && answer && effectAnswer === answerKey && (
        <div
          className={`answer-effect ${answer.correct ? "answer-effect-correct" : "answer-effect-incorrect"}${perfectAnswer ? " answer-effect-perfect" : !isSpecial ? " answer-effect-subtle" : ""}`}
          data-testid="answer-effect"
          data-result={answer.correct ? "correct" : "incorrect"}
          data-perfect={perfectAnswer || undefined}
          aria-hidden="true"
        >
          <div className="answer-effect-rays">
            {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
          </div>
          <div className="answer-effect-stamp">
            {perfectAnswer ? <><span className="answer-effect-perfect-title">Perfect</span><strong>全問正解</strong></> : <>
              <span className="answer-effect-symbol">{answer.correct ? "○" : "×"}</span>
              <strong>{answer.correct ? "正解！" : "不正解"}</strong>
            </>}
          </div>
        </div>
      )}
      <div className="battle-backdrop">
        <CanalScene backgroundId={backgroundId} imageAssetId={landmarkAsset?.id} />
      </div>
      {/* The battle's heading in every phase (S5): its landmark, or the battle's title for a city
          finale; 手がかり帳 joins it while the battle talks (the round bar holds its own). */}
      <SceneLabelLine
        label={landmark?.nameJa ?? battle.titleJa}
        badge={tourSceneBadge(game)}
        labelProps={landmark ? { "data-testid": "battle-location", "aria-label": `現在の場所: ${landmark.nameJa}` } : undefined}
      >
        {backgroundAsset && <SceneCreditButton onClick={() => setCreditsOpen(true)} />}
        {chrome.notebookTab && onNotebook && <SceneNotebookTab onClick={onNotebook} />}
      </SceneLabelLine>
      <div
        className={`battle-stage ${isDialogue ? "" : "battle-stage-compact"} ${battle.scope === "city_finale" ? "finale-stage" : ""}`}
        data-testid={isDialogue ? "scene-picture" : undefined}
      >
        <div className="battle-enemy-info">
          <p className="eyebrow">{battle.titleJa}</p>
          <p className="enemy-title">{battle.enemyTitleJa}</p>
          <h2>{battle.enemyNameJa}</h2>
          <p className="enemy-detail">{battle.enemyDescriptionJa}</p>
        </div>
        <div className="battle-characters">
          {isDialogue && (
            <div className="battle-character-slot battle-heroine">
              <CharacterPortrait
                characterId="heroine"
                sceneId={battle.id}
                cityId={battle.cityId ?? landmarks.find((item) => item.id === battle.landmarkId)?.cityId}
                emotion={heroineEmotion}
                active={frame?.speaker === "heroine"}
              >
                {heroineReaction?.mark && <ComicEffect effect={heroineReaction.mark} reduceMotion={reduceMotion} cueKey={displayedStoryState ?? ""} />}
              </CharacterPortrait>
            </div>
          )}
          <div className="battle-character-slot battle-enemy">
            <CharacterPortrait
              characterId={characterForBattle(battle.id)}
              emotion={enemyEmotion}
              active={frame?.speaker === "enemy"}
              fallback={battle.portrait === "abstract" ? undefined :
                <EnemyPortrait
                  emotion={enemyEmotion}
                  variant={battle.format}
                  portrait={battle.portrait}
                />
              }
            >
              {enemyReaction?.mark && <ComicEffect effect={enemyReaction.mark} reduceMotion={reduceMotion} cueKey={displayedStoryState ?? ""} />}
            </CharacterPortrait>
          </div>
        </div>
      </div>
      <div className="battle-paper-shell" aria-hidden={(isDialogue && windowVisibility.hidden) || !!cutIn || undefined} inert={(isDialogue && windowVisibility.hidden) || !!cutIn || undefined}>
      {isDialogue && <DialogueWindowHead
        plateClassName="battle-nameplate"
        narration={!!frame && frame.speaker !== "enemy" && frame.speaker !== "heroine" && frame.speaker !== "player"}
        speaker={frame && <>
          {speaker}
          {frame.emotion !== "neutral" && (
            <span className="emotion">{presentation.emotions[frame.emotion]}</span>
          )}
        </>}
        controls={<DialogueControls close={<DialogueWindowHide state={windowVisibility} />} entries={entries} auto={auto} />}
      />}
      <section
        ref={readingArea}
        className={`paper battle-paper${isDialogue ? " battle-dialogue" : ""}`}
        id="battle-content"
        aria-label="クイズバトル"
        data-testid={chrome.rebuttal ? "reasoning-rebuttal" : undefined}
      >
        {!isDialogue && <div className="battle-roundbar" data-testid="battle-roundbar" ref={roundBar}>
          <span>
            {isResult
              ? "決着"
              : `第${active.roundIndex + 1}問 / 全${quiz.questions.length}問`}
          </span>
          {active.phase === "feedback" && answer ? (
            <span
              className={`answer-verdict ${answer.correct ? "answer-verdict-correct" : "answer-verdict-incorrect"}`}
              data-testid="answer-verdict"
              aria-hidden="true"
            >
              <b>{answer.correct ? "○" : "×"}</b> {answer.correct ? "正解" : "不正解"}
            </span>
          ) : <span>英語 {quiz.englishLevel}</span>}
          {onNotebook && active.phase !== "reasoning" && (
            <button className="notebook-button" onClick={onNotebook}>
              手がかり帳
            </button>
          )}
        </div>}
        {chrome.reviewAnswers && (
          <button className="text-button" onClick={() => onEnglish()}>
            回答した問題を振り返る
          </button>
        )}
        {isResult ? (
          <div className="battle-result" data-testid="battle-result">
            <p className="eyebrow">今回の結果</p>
            <div className="battle-result-heading">
              <OutcomeHeading outcome={outcome} />
              <p className="battle-score">
                <strong>{active.score}</strong>
                <span> / {quiz.questions.length} 問正解</span>
              </p>
            </div>
            <BattleRewards game={game} onClaim={onClaimRewards} />
            {nextStoryBattle && onNextStoryBattle && (
              <p className="next-story-battle-note">{nextStoryBattle.descriptionJa}</p>
            )}
            <div className="battle-result-actions">
              {nextStoryBattle && onNextStoryBattle && (
                <button
                  className="primary"
                  data-testid={`next-story-battle-${nextStoryBattle.battleId}`}
                  onClick={onNextStoryBattle}
                >
                  {nextStoryBattle.actionLabelJa} <span aria-hidden="true">→</span>
                </button>
              )}
              {onEpilogue && (
                <button
                  className="primary"
                  data-testid="city-epilogue-start"
                  onClick={onEpilogue}
                >
                  エピローグへ進む <span aria-hidden="true">→</span>
                </button>
              )}
              {onLeave && <button
                className={onEpilogue || onNextStoryBattle ? "secondary" : "primary"}
                onClick={onLeave}
              >
                {leaveLabel ?? (isSpecial ? "自由時間へ戻る" : "自由時間へ進む")}{" "}
                <span aria-hidden="true">→</span>
              </button>}
              {onNextEpisode && (
                <button
                  className="secondary"
                  data-testid="next-tourism"
                  onClick={onNextEpisode}
                >
                  {nextIsFinale ? "都市ボスに挑む" : "次の観光地へ進む"}{" "}
                  <span aria-hidden="true">→</span>
                </button>
              )}
              <button className="secondary" onClick={() => onEnglish()}>
                回答した問題を振り返る
              </button>
            </div>
            <details className="battle-result-history">
              <summary>今回の正誤と戦績</summary>
              <ol className="answer-history">
                {active.answers.map((item, index) => (
                  <li key={item.questionId}>
                    <span>第{index + 1}問</span>
                    <span className={item.correct ? "correct-label" : "incorrect-label"}>
                      {item.correct ? "正解" : "不正解"}
                    </span>
                    {item.hintUsed && <span className="fine-print">ヒント使用</span>}
                  </li>
                ))}
              </ol>
              {record && (
                <p className="record-summary">
                  挑戦 {record.attempts}回 · 初回 {record.firstScore}問 · 最高{" "}
                  {record.bestScore}問正解
                </p>
              )}
            </details>
          </div>
        ) : isDialogue && frame ? (
          <>
            <DialogueText
              key={rebuttal ? `rebuttal-${rebuttal.index}` : game.revision}
              ref={sceneTap.line}
              text={frame.text}
              speed={auto.fast ? 0 : speed}
              onReady={onReady}
              onAdvance={advanceSafely}
            />
            {choosing && onChoose && <SceneChoices choices={choices} disabled={!ready} onChoose={onChoose} testId="battle-choice" />}
            {chrome.advance && <button
              className="next"
              data-testid={chrome.advance.testId}
              disabled={!ready}
              onClick={advanceSafely}
            >
              {chrome.advance.label}{" "}
              <span aria-hidden="true">→</span>
            </button>}
          </>
        ) : active.phase === "reasoning" ? (
          <>
            <ReasoningPanel
              game={game}
              onPress={onPress}
              onSubmit={onSubmitEvidence}
              onNotebook={onNotebook}
            />
            {active.answers.length > 0 && (
              <button className="text-button" onClick={() => onEnglish()}>
                回答した問題を振り返る
              </button>
            )}
          </>
        ) : (
          <div className="question-area" data-testid="battle-question">
            {showReasoning && (
              <ReasoningPanel
                game={game}
                onPress={onPress}
                onSubmit={onSubmitEvidence}
              />
            )}
            <p className="english-instructions">
              単語を押すと意味、同じ単語をもう一度押すと文の訳。回答はA・B・Cを押します。
            </p>
            <h2 className="question-en">
              <InteractiveEnglish
                key={question.id}
                text={question.questionEn}
                vocabulary={question.vocabularyJa}
                label="問題文"
                onDoubleTap={() =>
                  revealTranslation(learning, question.id, "question")
                }
              />
            </h2>
            <div className="question-translation-tools">
              <Translation learning={learning} id={question.id} part="question" />
              <TranslationAll learning={learning} id={question.id} />
            </div>
            <div className="quiz-choices" aria-label="英語の3択">
              {question.options.map((option) => {
                const selected = answer?.optionId === option.id;
                const correct =
                  answer && option.id === question.correctOptionId;
                return (
                  <div
                    key={`${question.id}:${option.id}`}
                    className={`quiz-option-wrap ${selected ? "selected-panel" : ""} ${answer && !selected ? "other-panel" : ""}`}
                  >
                    <div
                      data-testid={`option-text-${option.id}`}
                      className={`quiz-choice ${selected ? "chosen" : ""} ${correct ? "correct" : ""}`}
                    >
                      <button
                        type="button"
                        data-testid={`answer-${option.id}`}
                        className="option-id answer-submit"
                        aria-label={`選択肢${option.id}「${option.textEn}」を答える`}
                        disabled={active.phase !== "question"}
                        onClick={() => {
                          if (onAnswer(option.id)) {
                            answeredAt.current = performance.now();
                            setAnswerSettling(true);
                            const key = `${battle.id}:${active.roundIndex}:${option.id}`;
                            setAnimatedAnswer(key);
                            if ((isSpecial || option.id === question.correctOptionId) && !reduceMotion && !document.hidden &&
                                !window.matchMedia("(prefers-reduced-motion: reduce)").matches)
                              setEffectAnswer(key);
                          }
                        }}
                      >
                        {option.id}
                      </button>
                      <div className="option-body">
                        <InteractiveEnglish
                          text={option.textEn}
                          vocabulary={question.vocabularyJa}
                          label={`選択肢${option.id}`}
                          onDoubleTap={() =>
                            revealTranslation(learning, question.id, option.id)
                          }
                        />
                        {answer && (
                          <span className="option-mark">
                            {selected ? "選んだ答え" : ""}
                            {correct ? " ✓ 正解" : ""}
                          </span>
                        )}
                      </div>
                      <Translation
                        learning={learning}
                        id={question.id}
                        part={option.id}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {active.phase === "feedback" && answer && (
              <div
                className={`quiz-feedback ${answer.correct ? "correct-feedback" : ""}`}
                data-testid="battle-feedback"
                id="battle-feedback"
                tabIndex={-1}
              >
                <h3 className="sr-only" role="status">{answer.correct ? "正解" : "不正解"}</h3>
                {!answer.correct && (
                  <p className="correct-answer" data-testid="correct-answer">
                    正しい答え：
                    <span lang="en">
                      {
                        question.options.find(
                          (option) => option.id === question.correctOptionId,
                        )?.textEn
                      }
                    </span>
                    {correctTranslation && <span>（{correctTranslation}）</span>}
                  </p>
                )}
                <p>
                  {answer.correct
                    ? question.correctExplanationJa
                    : question.incorrectExplanationJa}
                </p>
                <button
                  className="secondary"
                  onClick={() => onEnglish(question.id)}
                >
                  英文を確認する
                </button>
                <details className="quiz-sources">
                  <summary>解説の根拠を読む</summary>
                  <ul>
                    {question.sources.map((source, index) => (
                      <li key={`${source.url}:${index}`}>
                        <a href={source.url} target="_blank" rel="noreferrer">
                          {source.publisher}
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
                <button
                  className="primary"
                  data-testid="battle-advance"
                  onClick={advanceSafely}
                >
                  敵の反応を見る <span aria-hidden="true">→</span>
                </button>
              </div>
            )}
            <div className="vocabulary" aria-label="難単語の補足">
              <h3>ことばの補足</h3>
              <dl>
                {question.vocabularyJa.map((word) => (
                  <div key={word.word}>
                    <dt lang="en">{word.word}</dt>
                    <dd>{word.meaning}</dd>
                  </div>
                ))}
              </dl>
            </div>
            {active.phase === "question" && (
              <button
                className="hint-button"
                aria-expanded={active.hintOpen}
                aria-controls="question-hint"
                onClick={onHint}
              >
                {active.hintOpen ? "ヒントを閉じる" : "ヒントを見る"}
              </button>
            )}
            {active.hintOpen && (
              <p id="question-hint" className="hint-text">
                {question.hintJa}
              </p>
            )}

          </div>
        )}
      </section>
      </div>
      {creditsOpen && backgroundAsset && (
        <BackgroundCredits asset={backgroundAsset} onClose={() => setCreditsOpen(false)} />
      )}
      {isDialogue && <DialogueWindowRestore state={windowVisibility} />}
      {cutIn && <ReasoningCutIn kind={cutIn} reduceMotion={reduceMotion} onComplete={() => {
        setCutIn(null);
        window.requestAnimationFrame(() =>
          readingArea.current?.querySelector<HTMLButtonElement>('[data-testid="reasoning-notebook"]')?.focus({ preventScroll: true }),
        );
      }} />}
    </div>
  );
}
