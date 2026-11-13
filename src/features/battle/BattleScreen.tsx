import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { tourSceneBadge } from "../../domain/tour";
import { dialogueExpressions, dialogueReactions, episodes, landmarks, learningTranslations, storyState, tourismAssets } from "../../content";
import { resolveDialogueExpression } from "../../content/dialogue-expressions";
import { resolveDialogueReaction } from "../../content/dialogue-reactions";
import type { GameState } from "../../domain/game";
import { battleChrome, getActiveBattleContent, getBattleOutcome } from "../../domain/battle";
import { SceneChoices, type SceneChoiceView } from "../../components/SceneChoices";
import { DIALOGUE_WINDOW_ATTRIBUTE, DialogueText } from "../../components/DialogueText";
import { LineStage, PhotoShowLayer, RecallLayer } from "../../components/LineStage";
import { SceneTint, WeatherLayer } from "../../components/SceneAtmosphere";
import { ItemShowLayer } from "../../components/ItemShow";
import { sceneTimeTint } from "../journey/time-of-day";
import { lineCues, lineSpeed, showsSpeakerPlate } from "../../components/line-staging";
import { playSe } from "../../audio/sound-effects";
import { DialogueWindowHide, DialogueWindowRestore, useDialogueWindow } from "../../components/DialogueWindowVisibility";
import { useAutoAdvance } from "../../components/useAutoAdvance";
import { readLineId, type ReadSkip } from "../../components/read-skip";
import { DialogueControls, DialogueWindowHead } from "../../components/DialogueControls";
import { useSceneTap } from "../../components/useSceneTap";
import { dialogueObstructed } from "../../components/dialogueObstructed";
import { CanalScene } from "../../components/CanalScene";
import { SceneHeading, SceneNotebookTool } from "../../components/SceneHeading";
import { CharacterPortrait, characterForBattle } from "../../components/CharacterPortrait";
import { portraitFocus } from "../../components/speaker-focus";
import { nameCutIn, speakerPlate } from "../../components/speaker-plate";
import { useSpeakingPerson } from "../../components/useSpeakingPerson";
import { speakingPerson } from "../../domain/scene-person";
import { useNameCutIn } from "../../components/NameCutIn";
import { ComicEffect } from "../../components/ComicEffect";
import { useDialogueLog } from "../../components/DialogueLog";
import { EnemyPortrait } from "./EnemyPortrait";
import { BattleRewards } from "../journey/BattleRewards";
import { ReasoningPanel } from "./ReasoningPanel";
import { ReasoningCutIn } from "./ReasoningCutIn";
import { OutcomeHeading } from "./OutcomeHeading";
import { HeroineNote } from "./HeroineNote";
import { LandmarkReveal } from "./LandmarkReveal";
import { DOUBLE_TAP_WINDOW_MS, isSecondTap } from "../../components/double-tap";
import { answerBeat, CORRECT_HOLD_MS } from "./answer-beat";
import { showIgnoredTap } from "../../components/ignored-tap";
import {
  Translation,
  TranslationAll,
  revealTranslation,
} from "../learning/Translations";
import { InteractiveEnglish } from "../learning/InteractiveEnglish";
import { ReadAloudButton, useReadAloud } from "../learning/ReadAloud";
import { metQuestions } from "../learning/EnglishReview";
import { metWordKeys } from "../learning/met-words";
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
 * until the first line shows; the rest and 「相手の反応を見る」 are read by
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
  /** This device's read lines: 高速送り stops at a line not read before (read-skip.ts). */
  readSkip?: ReadSkip;
  reduceMotion: boolean;
  /** 「英語を読み上げるボタンを出す」 is on and this browser can read aloud: a speaker button by each English text (ReadAloud.tsx). */
  readAloud?: boolean;
  /** An episode's title card waits or shows over the opening (GameApp's useJourneyMoments): a name plate comes after it. */
  introHeld?: boolean;
  onSpeed: (speed: number) => void;
  onAdvance: () => void;
  /** The shown choices of a battle's conversation, and choosing one. */
  choices?: SceneChoiceView[];
  onChoose?: (index: number) => void;
  onAnswer: (id: string) => boolean;
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
  readAloud = false,
  introHeld = false,
  autoAdvanceEnabled = false,
  readSkip,
  onAdvance,
  choices = [],
  onChoose,
  onAnswer,
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
  // The rebuttal is lines of the battle's flow (saved, decision 1). The cut-in plays as the flow first reaches its
  // stop point in this mounted screen: mounting directly in reasoning (a reload) never replays it, and a different
  // run cannot inherit the prior transition.
  const previousBattle = useRef({ runId: active.runId, phase: active.phase, proof: !!active.reasoning });
  const [cutIn, setCutIn] = useState<"contradiction" | "connection" | null>(null);
  useLayoutEffect(() => {
    const previous = previousBattle.current;
    previousBattle.current = { runId: active.runId, phase: active.phase, proof: !!active.reasoning };
    if (previous.runId !== active.runId || active.phase !== "reasoning") setCutIn(null);
    const config = battle.reasoning;
    if (config && previous.runId === active.runId && previous.phase === "dialogue" && !previous.proof && active.phase === "reasoning" && active.reasoning)
      setCutIn(config.kind);
  }, [active.runId, active.phase, active.reasoning, battle]);
  const windowVisibility = useDialogueWindow();
  const readingArea = useRef<HTMLElement>(null);
  const roundBar = useRef<HTMLDivElement>(null);
  const displayedStoryState = active.phase === "dialogue" ? active.storyState : null;
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
  // ためと決め (CORRECT_HOLD_MS): the right answer being held still (its key), then the one whose option gives its gold
  // pulse. Presentation only: the answer is saved and scored before either; a restored feedback has neither.
  const [heldAnswer, setHeldAnswer] = useState<string | null>(null);
  const [glowAnswer, setGlowAnswer] = useState<string | null>(null);
  const holding = active.phase === "feedback" && heldAnswer === answerKey;
  useEffect(() => {
    if (!heldAnswer) return;
    const timer = window.setTimeout(() => {
      setHeldAnswer(null);
      setGlowAnswer(heldAnswer);
      setEffectAnswer(heldAnswer);
    }, CORRECT_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [heldAnswer]);
  // The answer's sound, once, for an answer saved in this mounted screen (a restored feedback is silent, as it does not
  // animate): quiz_correct or quiz_incorrect, and quiz_perfect in place of quiz_correct for the last answer of a full score.
  // A right answer's comes as its hold ends, with its pulse.
  const soundedAnswer = useRef<string | null>(null);
  useEffect(() => {
    if (active.phase !== "feedback" || !answer || animatedAnswer !== answerKey || holding || soundedAnswer.current === answerKey) return;
    soundedAnswer.current = answerKey;
    playSe(perfectAnswer ? "quiz_perfect" : answer.correct ? "quiz_correct" : "quiz_incorrect");
  }, [active.phase, answer, animatedAnswer, answerKey, perfectAnswer, holding]);
  // The result's sound as the result comes in this mounted screen (a restored result is silent), the same whatever the
  // score; the result of a city finale that shows 「都市クリア」 (BattleRewards) rings city_clear instead.
  const shownPhase = useRef(active.phase);
  useEffect(() => {
    const before = shownPhase.current;
    shownPhase.current = active.phase;
    if (active.phase !== "result" || before === "result") return;
    const episode = episodes.find((item) => item.battleId === active.battleId);
    playSe(episode?.kind === "city_finale" && game.completedEpisodeIds.includes(episode.id) ? "city_clear" : "quiz_result");
  }, [active.phase, active.battleId, game.completedEpisodeIds]);
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
    // The feedback is not on the page while its right answer is held (it comes, and is focused, after).
    if (active.phase !== "feedback" || holding) return;
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
  }, [active.phase, active.roundIndex, animatedAnswer, answerKey, reduceMotion, holding]);
  const frame = active.frame;
  const isDialogue = active.phase === "dialogue";
  // The line's scene tags (LineStage), only while the talk shows its line.
  const staging = isDialogue ? frame : null;
  // The scene's weather and tint (# weather:, # tint:) in every phase: its frame's, or what the battle keeps over a call.
  const atmosphere = frame ?? active;
  // What the line's screen shows: the next button at the end of a part, the conversation's choices, and what a rebuttal line hides.
  const chrome = battleChrome(active, battle);
  const choosing = chrome.choosing;
  const partEnd = !!chrome.advance;
  const backgroundId = frame?.background ?? battle.backgroundId;
  const landmark = landmarks.find((item) => item.id === battle.landmarkId);
  // Keep the same registered location photograph across dialogue, questions
  // and results. A city-wide finale has no landmark and keeps its own scene.
  const landmarkAsset = tourismAssets.find((asset) => asset.id === landmark?.imageAssetId);
  // The city whose outfit the heroine wears here (her portrait and her face by the quiz card).
  const heroineCityId = battle.cityId ?? landmark?.cityId;
  const storyId = battle.storyId;
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
  // A person line whose portrait is the opponent's own is the opponent speaking under the name the heroine knows them by
  // before they give theirs (an alias of progression/story.json people, 2026-11-11): their portrait, expression and
  // reaction stay the opponent's.
  const lineSpeaker = isDialogue && frame ? speakingPerson(storyState.people, frame) : undefined;
  const opponentSpeaks = frame?.speaker === "enemy" || (!!lineSpeaker && lineSpeaker === characterForBattle(battle.id));
  const enemyEmotion = enemyReaction?.expression ?? (opponentSpeaks && frame ? frame.emotion : "neutral");
  // A person with a portrait who speaks in their own name takes the opponent's place from that line
  // (speakingPerson) until the opponent speaks or reacts again, or the talk gives way to a question.
  const speaking = opponentSpeaks ? undefined : lineSpeaker;
  const personId = useSpeakingPerson(speaking, !isDialogue || opponentSpeaks || !!enemyReaction);
  const plate = speakerPlate(frame ?? { speaker: "narrator" }, { heroine: game.heroineName, player: game.playerName, enemy: battle.enemyNameJa },
    storyState.people);
  const speaker = plate.name;
  const { ready, onReady, entries } = useDialogueLog(
    `${battle.id}:${record?.attempts ?? 0}`,
    game.revision,
    speaker,
    frame?.text ?? "",
    frame?.delivery,
  );
  const advanceSafely = () => {
    if (cutIn || (isDialogue && !ready) || windowVisibility.hidden || dialogueObstructed() || choosing) return;
    onAdvance();
  };
  const { show } = windowVisibility;
  useEffect(() => {
    if (!isDialogue) show();
  }, [isDialogue, show]);
  const auto = useAutoAdvance({
    ready,
    canAdvance: isDialogue && !windowVisibility.hidden && !!frame && !partEnd && !choosing,
    text: frame?.text ?? "",
    onAdvance: advanceSafely,
    defaultEnabled: autoAdvanceEnabled,
    readSkip,
    lineId: isDialogue && frame?.text ? readLineId(battle.id, frame.text) : null,
  });
  const sceneTap = useSceneTap({ active: isDialogue, lineShown: ready, choicesShown: choosing, windowHidden: windowVisibility.hidden });
  // A line's `# cutin: name` shows its speaker's name plate over the scene for a moment (NameCutIn): the opponent's
  // heading (role, name, the quote when written), or a person's. An episode's title card over the opening holds it.
  const nameCut = useNameCutIn(isDialogue && frame
    ? nameCutIn(frame, { titleJa: battle.enemyTitleJa, nameJa: battle.enemyNameJa, ...(battle.enemyQuoteJa ? { quoteJa: battle.enemyQuoteJa } : {}) },
      storyState.people)
    : undefined, displayedStoryState ?? "", introHeld);
  const isResult = active.phase === "result";
  /** The answer whose explanation shows (its verdict heads the reading area). */
  const verdict = active.phase === "feedback" && !holding ? answer : undefined;
  // What the quiz card shows of the answer: nothing yet while a right answer is held (the card stays as it was tapped).
  const shownAnswer = holding ? undefined : answer;
  const isSpecial = !!battle.reasoning;
  const showReasoning =
    !!battle.reasoning && battle.reasoning.roundIndex === active.roundIndex;
  // The quiz card (a question and its explanation): its speaker buttons stop reading when it goes or the next question comes.
  const quizCard = active.phase === "question" || active.phase === "feedback";
  const reader = useReadAloud(readAloud, quizCard ? `${active.roundIndex}:${question?.id}` : "");
  // 前に出た単語 (met-words.ts): the words of the word book's other questions (this save's battles, this run's earlier
  // rounds), marked where the question and its options use them again. Read again when an answer or a record changes.
  const metWords = useMemo(
    () => metWordKeys(metQuestions(game, learning).map((entry) => entry.question), question?.id),
    [game.battleRecords, active.battleId, active.contentHash, active.answers, learning.data.records, question?.id],
  );

  return (
    <div
      className={`battle-screen ${answer && animatedAnswer === answerKey ? "answer-animating" : ""}`}
      onClickCapture={(event) => {
        // The second tap of a double tap on an answer is ignored, whatever moved under it.
        if (answeredAt.current !== null && isSecondTap(performance.now() - answeredAt.current)) {
          event.preventDefault();
          event.stopPropagation();
          // Heard and ignored: a faint ring where it landed (2026-11-13).
          if (event.detail > 0) showIgnoredTap(event.clientX, event.clientY);
        }
      }}
      data-phase={isDialogue ? "dialogue" : active.phase}
      data-answer-settling={answerSettling || undefined}
      // ためと決め: the right answer held still (battle.css keeps the tapped card as it was, its option pressed).
      data-answer-held={holding || undefined}
      data-effect-active={active.phase === "feedback" && effectAnswer === answerKey || undefined}
      // An ordinary quiz's wrong answer, saved in this screen, plays no stamp: its card gives a small shake (battle.css).
      data-answer-missed={active.phase === "feedback" && !!answer && !answer.correct && !isSpecial && animatedAnswer === answerKey || undefined}
      data-reduce-motion={reduceMotion || undefined}
      data-dialogue-hidden={isDialogue && windowVisibility.hidden || undefined}
      data-quiet={staging?.quiet}
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
        <SceneTint color={sceneTimeTint(game.travel.minute, atmosphere.tint === "off")} />
      </div>
      <WeatherLayer weather={atmosphere.weather} />
      <RecallLayer imageId={staging?.recall} />
      <PhotoShowLayer photo={staging?.photo} />
      <ItemShowLayer itemId={staging?.itemShow} quiet={!!staging?.quiet} />
      {/* The battle's heading in every phase (S5): its landmark, or the battle's title for a city
          finale; 手がかり帳 is in the header, shown at a choice: the talk's choices, a question, the
          reasoning stop (whose panel also has its own 「手がかり帳を開く」). */}
      <SceneHeading label={landmark?.nameJa ?? battle.titleJa} badge={tourSceneBadge(game)} />
      {chrome.notebookTab && onNotebook && <SceneNotebookTool onClick={onNotebook} />}
      <div
        className={`battle-stage ${isDialogue ? "" : "battle-stage-compact"} ${battle.scope === "city_finale" ? "finale-stage" : ""}`}
        data-testid={isDialogue ? "scene-picture" : undefined}
      >
        {/* The opponent's heading above the quiz card (its name plate in the talk: `# cutin: name`, NameCutIn). */}
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
                cityId={heroineCityId}
                emotion={heroineEmotion}
                focus={portraitFocus(frame?.speaker, "heroine")}
                stand={staging?.stand}
              >
                {heroineReaction?.mark && <ComicEffect effect={heroineReaction.mark} reduceMotion={reduceMotion} cueKey={displayedStoryState ?? ""} />}
              </CharacterPortrait>
            </div>
          )}
          <div className="battle-character-slot battle-enemy">
            {personId ? <CharacterPortrait key={personId} characterId={personId}
              focus={speaking === personId ? "speaking" : portraitFocus(frame?.speaker, "enemy")} /> :
            <CharacterPortrait
              characterId={characterForBattle(battle.id)}
              emotion={enemyEmotion}
              focus={portraitFocus(opponentSpeaks ? "enemy" : frame?.speaker, "enemy")}
              fallback={battle.portrait === "abstract" ? undefined :
                <EnemyPortrait
                  emotion={enemyEmotion}
                  variant={battle.format}
                  portrait={battle.portrait}
                />
              }
            >
              {enemyReaction?.mark && <ComicEffect effect={enemyReaction.mark} reduceMotion={reduceMotion} cueKey={displayedStoryState ?? ""} />}
            </CharacterPortrait>}
          </div>
        </div>
      </div>
      <div className="battle-paper-shell" {...{ [DIALOGUE_WINDOW_ATTRIBUTE]: "" }} aria-hidden={(isDialogue && windowVisibility.hidden) || !!cutIn || undefined} inert={(isDialogue && windowVisibility.hidden) || !!cutIn || undefined}>
      {isDialogue && <DialogueWindowHead
        plateClassName="battle-nameplate"
        cutIn={nameCut}
        narration={!!frame && plate.narration}
        speaker={frame && showsSpeakerPlate(frame) && speaker}
        controls={<DialogueControls close={<DialogueWindowHide state={windowVisibility} />} entries={entries} auto={auto} />}
      />}
      <section
        ref={readingArea}
        className={`paper battle-paper${isDialogue ? " battle-dialogue" : ""}`}
        id="battle-content"
        aria-label="クイズ"
        data-testid={chrome.rebuttal ? "reasoning-rebuttal" : undefined}
      >
        {/* The round bar, held at the top of the reading area: the verdict over an answer's
            explanation. A question has none (user decision 2026-11-11: no question count, English
            level, own 手がかり帳 or answers' review on the quiz card), nor does the result (user
            decision 2026-11-11: no 「決着」 over it). */}
        {verdict && <div className="battle-roundbar" data-testid="battle-roundbar" ref={roundBar}>
          <span
            className={`answer-verdict ${verdict.correct ? "answer-verdict-correct" : "answer-verdict-incorrect"}`}
            data-testid="answer-verdict"
            aria-hidden="true"
          >
            <b>{verdict.correct ? "○" : "×"}</b> {verdict.correct ? "正解" : "不正解"}
          </span>
        </div>}
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
              <summary>今回の正誤と成績</summary>
              <ol className="answer-history">
                {active.answers.map((item, index) => (
                  <li key={item.questionId}>
                    <span>第{index + 1}問</span>
                    <span className={item.correct ? "correct-label" : "incorrect-label"}>
                      {item.correct ? "正解" : "不正解"}
                    </span>
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
            <LineStage frame={frame} names={{ heroine: game.heroineName, player: game.playerName, enemy: battle.enemyNameJa }} compact={choosing}>
              <DialogueText
                key={game.revision}
                ref={sceneTap.line}
                text={frame.text}
                delivery={frame.delivery}
                voiceId={frame.voiceId}
                seId={frame.seId}
                cues={lineCues(frame, !!nameCut)}
                voice={auto.voice}
                speed={auto.fast ? 0 : lineSpeed(speed, frame)}
                onReady={onReady}
                onAdvance={advanceSafely}
              />
            </LineStage>
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
          <ReasoningPanel
            game={game}
            onPress={onPress}
            onSubmit={onSubmitEvidence}
            onNotebook={onNotebook}
          />
        ) : (
          <div className="question-area" data-testid="battle-question">
            {/* The battle's progress, for screen readers only (the card shows no question count). */}
            <p className="sr-only">第{active.roundIndex + 1}問 / 全{quiz.questions.length}問</p>
            {showReasoning && (
              <ReasoningPanel
                game={game}
                onPress={onPress}
                onSubmit={onSubmitEvidence}
              />
            )}
            <h2 className="question-en">
              <InteractiveEnglish
                key={question.id}
                text={question.questionEn}
                vocabulary={question.vocabularyJa}
                metWords={metWords}
                label="問題文"
                onDoubleTap={() =>
                  revealTranslation(learning, question.id, "question")
                }
              />
            </h2>
            <div className="question-translation-tools">
              <Translation learning={learning} id={question.id} part="question">
                <ReadAloudButton reader={reader} part="question" text={question.questionEn} />
              </Translation>
              <TranslationAll learning={learning} id={question.id} />
            </div>
            <div className="quiz-choices" aria-label="英語の3択">
              {question.options.map((option) => {
                const selected = answer?.optionId === option.id;
                const correct =
                  shownAnswer && option.id === question.correctOptionId;
                // The right answer's gold pulse, once its hold has ended (or at once under reduced motion).
                const glowing = selected && !holding && active.phase === "feedback" && glowAnswer === answerKey;
                return (
                  <div
                    key={`${question.id}:${option.id}`}
                    className={`quiz-option-wrap ${selected ? "selected-panel" : ""} ${shownAnswer && !selected ? "other-panel" : ""}`}
                  >
                    <div
                      data-testid={`option-text-${option.id}`}
                      className={`quiz-choice ${selected ? "chosen" : ""} ${correct ? "correct" : ""}${glowing ? " answer-glow" : ""}`}
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
                            const moving = !reduceMotion && !document.hidden && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                            // A right answer: held still first (its pulse, sound, stamp and feedback come after); under
                            // reduced motion no hold, its glow at once. A wrong one of a special battle: its stamp.
                            const beat = answerBeat({ right: option.id === question.correctOptionId, moving, special: isSpecial });
                            if (beat === "hold") setHeldAnswer(key);
                            else if (beat === "glow") setGlowAnswer(key);
                            else if (beat === "stamp") setEffectAnswer(key);
                          }
                        }}
                      >
                        {option.id}
                      </button>
                      <div className="option-body">
                        {/* At the right of the option's text, before its 「訳を見る」 and away from its answer button. */}
                        <ReadAloudButton reader={reader} part={option.id} text={option.textEn} />
                        <InteractiveEnglish
                          text={option.textEn}
                          vocabulary={question.vocabularyJa}
                          metWords={metWords}
                          label={`選択肢${option.id}`}
                          onDoubleTap={() =>
                            revealTranslation(learning, question.id, option.id)
                          }
                        />
                        {shownAnswer && (
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
            {active.phase === "feedback" && answer && !holding && (
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
                {/* Her short line on a right answer, only where the question has one (heroineCorrectJa). */}
                {answer.correct && question.heroineCorrectJa && (
                  <HeroineNote
                    label={game.heroineName}
                    text={question.heroineCorrectJa}
                    emotion="happy"
                    sceneId={battle.id}
                    cityId={heroineCityId}
                    testId="heroine-correct"
                  />
                )}
                {/* The reveal on the landmark photo, only where the question has a region (revealRegion). */}
                {question.revealRegion && landmarkAsset && (
                  <LandmarkReveal
                    key={question.id}
                    asset={landmarkAsset}
                    region={question.revealRegion}
                    captionJa={question.revealCaptionJa}
                  />
                )}
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
                  相手の反応を見る <span aria-hidden="true">→</span>
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
            {/* The hint as the heroine's whisper: her words when the question has them (hintHeroineJa),
                else its hint (hintJa, plain narration: shown as her note, not quoted as her words). Always
                shown under the question, with no button to open or close it (user decision 2026-11-11). */}
            {(active.phase === "question" || holding) && (
              <HeroineNote
                className="hint-whisper"
                label={`${game.heroineName}の耳打ち`}
                text={question.hintHeroineJa ?? question.hintJa}
                emotion="smile"
                sceneId={battle.id}
                cityId={heroineCityId}
              />
            )}

          </div>
        )}
      </section>
      </div>
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
