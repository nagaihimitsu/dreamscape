import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { tourSceneBadge } from "../../domain/tour";
import { dialogueExpressions, dialogueReactions, episodes, landmarks, learningTranslations, storyState, tourismAssets } from "../../content";
import { resolveDialogueExpression } from "../../content/dialogue-expressions";
import { resolveDialogueReaction } from "../../content/dialogue-reactions";
import type { GameState } from "../../domain/game";
import { battleBackgroundId, battleChrome, getActiveBattleContent, getBattleOutcome } from "../../domain/battle";
import { SceneChoices, type SceneChoiceView } from "../../components/SceneChoices";
import { useEstablishingShot } from "../../components/useEstablishingShot";
import { speakerSpot, useNameBand } from "../../components/name-band";
import { DIALOGUE_WINDOW_ATTRIBUTE, DialogueText } from "../../components/DialogueText";
import { LineStage, PhotoShowLayer, RecallLayer } from "../../components/LineStage";
import { LineCards } from "../../components/LineCards";
import { SceneTint, WeatherLayer } from "../../components/SceneAtmosphere";
import { ItemShowLayer } from "../../components/ItemShow";
import { ItemOutLayer, itemOutCard } from "../../components/ItemOut";
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
import { CharacterFigure, CharacterPortrait, characterForBattle } from "../../components/CharacterPortrait";
import { ChoicePoint } from "../../minigames/host/ChoicePoint";
import { MiniGameSlot } from "../../minigames/host/MiniGameProvider";
import { figureIsEnemy, oppositeFigures, sceneStageOf, stageLine, type PortraitFocus, type StageFigure, type StageLine } from "../../components/scene-stage";
import { loggedSpeaker, nameCutIn, speakerPlate } from "../../components/speaker-plate";
import { stageLayout, useSceneStage } from "../../components/useSceneStage";
import { useStageGlide } from "../../components/useStageGlide";
import { NameCutInPlate, useNameCutIn } from "../../components/NameCutIn";
import { ComicEffect } from "../../components/ComicEffect";
import { useDialogueLog } from "../../components/DialogueLog";
import { EnemyPortrait } from "./EnemyPortrait";
import { BattleRewards } from "../journey/BattleRewards";
import { ReasoningPanel } from "./ReasoningPanel";
import { ReasoningCutIn } from "./ReasoningCutIn";
import { QuizCutIn } from "./QuizCutIn";
import { battleCutInView, shouldShowQuizCutIn } from "./quiz-cutin";
import { OutcomeHeading } from "./OutcomeHeading";
import { HeroineNote } from "./HeroineNote";
import { QuizChoices } from "./QuizChoices";
import { LandmarkReveal } from "./LandmarkReveal";
import { DOUBLE_TAP_WINDOW_MS, isSecondTap } from "../../components/double-tap";
import { answerBeat, CORRECT_HOLD_MS } from "./answer-beat";
import { showIgnoredTap } from "../../components/ignored-tap";
import { focusSceneHeading } from "../../components/scene-focus";
import {
  Translation,
  TranslationAll,
  revealTranslation,
} from "../learning/Translations";
import { InteractiveEnglish } from "../learning/InteractiveEnglish";
import { ReadAloudButton, useAutoReadAloud, useReadAloud } from "../learning/ReadAloud";
import { autoReadKey } from "../learning/read-aloud";
import { metQuestions } from "../learning/EnglishReview";
import { metWordKeys } from "../learning/met-words";
import type { Learning } from "../learning/useLearning";
import "./battle.css";

interface Props {
  learning: Learning;
  /** 英語ノート on a question (none while it is not shown, NoteDialog.tsx's ENGLISH_NOTE_SHOWN: its buttons go too). */
  onEnglish?: (questionId?: string) => void;
  game: GameState;
  speed: number;
  autoAdvanceEnabled?: boolean;
  /** This device's read lines: 高速送り stops at a line not read before (read-skip.ts). */
  readSkip?: ReadSkip;
  reduceMotion: boolean;
  /** 「英語を読み上げるボタンを出す」 is on and this browser can read aloud: a speaker button by each English text (ReadAloud.tsx). */
  readAloud?: boolean;
  /** 「問題が出たら英語を自動で読み上げる」 is on and this browser can read aloud: the question read as it shows (ReadAloud.tsx). */
  autoReadAloud?: boolean;
  /** 「英語オフ」: the question and its options in their Japanese translation only (no English, translation buttons or speaker). */
  englishOff?: boolean;
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
  autoReadAloud = false,
  englishOff = false,
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
  const correctTranslation = question && learningTranslations[question.textKey]?.optionsJa[question.correctOptionId];
  // 「英語オフ」: the translation shown in the English's place, where the question has one (else its English stays).
  const quizTranslation = question ? learningTranslations[question.textKey] : undefined;
  const japaneseOnly = englishOff && !!quizTranslation;
  const perfectAnswer = active.phase === "feedback" && !!answer?.correct &&
    active.answers.length === quiz.questions.length && active.score === quiz.questions.length;
  const record = game.battleRecords.find((item) => item.battleId === battle.id);
  // The rebuttal is lines of the battle's flow (saved, decision 1). The cut-in plays as the flow first reaches its
  // stop point in this mounted screen: mounting directly in reasoning (a reload) never replays it, and a different
  // run cannot inherit the prior transition. 「Quiz」 (QuizCutIn) plays the same way as the flow first moves from the
  // talk to the run's first question (shouldShowQuizCutIn). Both read the view this screen showed before (previousBattle).
  const previousBattle = useRef(battleCutInView(active));
  const [cutIn, setCutIn] = useState<"contradiction" | "connection" | null>(null);
  const [quizCutIn, setQuizCutIn] = useState(false);
  useLayoutEffect(() => {
    const previous = previousBattle.current;
    const current = battleCutInView(active);
    previousBattle.current = current;
    if (previous.runId !== active.runId || active.phase !== "reasoning") setCutIn(null);
    const config = battle.reasoning;
    if (config && previous.runId === active.runId && previous.phase === "dialogue" && !previous.proof && active.phase === "reasoning" && active.reasoning)
      setCutIn(config.kind);
    if (shouldShowQuizCutIn(previous, current)) setQuizCutIn(true);
    else if (active.phase !== "question") setQuizCutIn(false);
  }, [active.runId, active.phase, active.roundIndex, active.answers.length, active.reasoning, battle]);
  // The battle under a cut-in: hidden from screen readers and taking no focus or press while it shows.
  const coveredByCutIn = !!cutIn || quizCutIn;
  const windowVisibility = useDialogueWindow();
  const readingArea = useRef<HTMLElement>(null);
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
    // The explanation stands in the window in the question's place (screen readers read on from it), its start shown:
    // the window's reading area back at its top, and where the page scrolls instead (below 500 px of portrait height,
    // battle.css) the page brought to it when it starts below the screen; the marked options above stay where they are.
    const focusFeedback = () => {
      const feedback = document.getElementById("battle-feedback");
      if (!feedback) return;
      readingArea.current?.scrollTo({ top: 0 });
      feedback.focus({ preventScroll: true });
      const explanation = feedback.querySelector(".quiz-explanation");
      if (explanation && explanation.getBoundingClientRect().top > window.innerHeight - 48) explanation.scrollIntoView({ block: "nearest" });
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
  // A question and its explanation (2026-11-28 user decision): a part of the talk, not a card over it. The opponent asks in
  // the talk's window, the options float above it as the talk's choices do, and the explanation comes in the window in
  // the question's place (QuizChoices, battle.css). The talk and the quiz share the scene's layout (data-talk).
  const quizCard = active.phase === "question" || active.phase === "feedback";
  const talk = isDialogue || quizCard;
  // The line's scene tags (LineStage), only while the talk shows its line.
  const staging = isDialogue ? frame : null;
  // The scene's weather and tint (# weather:, # tint:) in every phase: its frame's, or what the battle keeps over a call.
  const atmosphere = frame ?? active;
  // What the line's screen shows: the next button at the end of a part, the conversation's choices, and what a rebuttal line hides.
  const chrome = battleChrome(active, battle);
  const choosing = chrome.choosing;
  const partEnd = !!chrome.advance;
  // The line's background; over a quiz, the reasoning and the result the one its last line showed (battleBackgroundId).
  const backgroundId = battleBackgroundId(active, battle);
  const landmark = landmarks.find((item) => item.id === battle.landmarkId);
  // Keep the same registered location photograph across dialogue, questions
  // and results. A city-wide finale has no landmark: its story's background.
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
  // The opponent stands from the start; a person with a figure who speaks in their own name takes their place from that
  // line until the opponent speaks or reacts again, or the talk gives way to a question, where the opponent asks
  // (scene-stage.ts). She stands in the talk. A line's `# leave:` takes her or the one opposite off until they come
  // again (her next line or reaction; the opponent's next line or reaction, or their question); the place opposite stays
  // empty meanwhile. Only who stands there is drawn. A person line whose figure is the opponent's own is the opponent
  // speaking under the name the heroine knows them by before they give theirs (an alias of progression/story.json people,
  // 2026-11-11): their figure, expression and reaction stay the opponent's.
  const opponentFigure = characterForBattle(battle.id);
  const stageScene = sceneStageOf("battle", opponentFigure);
  // Over a question the opponent asks: they speak (their name band over them, she listens); over its explanation, the
  // narration, no one does.
  const line: StageLine = isDialogue && frame ? stageLine(frame, storyState.people, { heroine: !!heroineReaction, enemy: !!enemyReaction })
    : active.phase === "question" || holding ? { speaker: "enemy", enemyCue: true } : { enemyCue: true };
  const { stage, focus, leaving } = useSceneStage(line, stageScene, "", reduceMotion);
  // In the talk, those who stay walk to their new places as someone comes or goes (useStageGlide); the quiz's stage changes at once.
  const stageLayer = useRef<HTMLDivElement>(null);
  useStageGlide(stageLayer, stageLayout(stage), { enabled: isDialogue, reduceMotion });
  // Who stands opposite her (two or three in a stretch of `# together:`: the first in the opponent's place, the second
  // beside it, the third beyond). In the quiz (no line) the opponent asks, alone in their place, as without the tag.
  const opposite = oppositeFigures(stage, focus).filter(({ figure }) => isDialogue || figureIsEnemy(figure, stageScene));
  const inPlace = opposite[0];
  const beside = isDialogue ? opposite[1] : undefined;
  const far = isDialogue ? opposite[2] : undefined;
  const opponentSpeaks = frame?.speaker === "enemy" || line.personFigure === opponentFigure;
  const enemyEmotion = enemyReaction?.expression ?? (opponentSpeaks && frame ? frame.emotion : "neutral");
  /** A figure opposite her: the opponent with their expression, mark and drawn fallback, or a person's one picture. */
  const oppositePortrait = (figure: StageFigure, at: PortraitFocus | undefined) => !figureIsEnemy(figure, stageScene)
    ? <CharacterPortrait key={figure.figure} characterId={figure.figure} focus={at} leaving={leaving.includes(figure.figure)} />
    : <CharacterPortrait
      characterId={opponentFigure}
      emotion={enemyEmotion}
      focus={at}
      leaving={leaving.includes(figure.figure)}
      fallback={battle.portrait === "abstract" ? undefined :
        <EnemyPortrait
          emotion={enemyEmotion}
          variant={battle.format}
          portrait={battle.portrait}
        />
      }
    >
      {enemyReaction?.mark && <ComicEffect effect={enemyReaction.mark} reduceMotion={reduceMotion} cueKey={displayedStoryState ?? ""} />}
    </CharacterPortrait>;
  const plate = speakerPlate(frame ?? { speaker: "narrator" }, { heroine: game.heroineName, player: game.playerName, enemy: battle.enemyNameJa },
    storyState.people);
  const speaker = plate.name;
  // A remembered line's plate and window (`# remembered`): in the talk only (a quiz shows no line).
  const remembered = isDialogue && plate.remembered;
  const { ready, onReady, entries } = useDialogueLog(
    `${battle.id}:${record?.attempts ?? 0}`,
    game.revision,
    loggedSpeaker(plate),
    frame?.text ?? "",
    frame?.delivery,
    frame?.letter?.translationJa,
  );
  const advanceSafely = () => {
    if (coveredByCutIn || (isDialogue && !ready) || windowVisibility.hidden || dialogueObstructed() || choosing) return;
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
  // The explanation stands where the line would: a tap on the scene goes on to the opponent's reaction, as its 「→」 does
  // (the wayside quiz's way, 2026-11-16 user decision). While a right answer is held still nothing reads on.
  const feedbackShown = active.phase === "feedback" && !!answer && !holding;
  const sceneTap = useSceneTap({ active: isDialogue || feedbackShown, lineShown: ready, choicesShown: isDialogue && choosing,
    resultShown: feedbackShown, windowHidden: windowVisibility.hidden, onResult: advanceSafely });
  // Each part of the battle's talk opens on its establishing shot (the camera comes in with its next line; battle.css).
  const establishing = useEstablishingShot(`${battle.id}:${active.phase}`, game.revision);
  const band = useNameBand(talk ? speakerSpot(stage, focus, "battle") : undefined, frame?.speaker === "heroine", { sceneId: battle.id, cityId: heroineCityId });
  // A line's `# cutin: name` shows its speaker's name plate over the scene for a moment (NameCutIn): the opponent's
  // heading (role, name, the quote when written), or a person's. An episode's title card over the opening holds it.
  const nameCut = useNameCutIn(isDialogue && frame
    ? nameCutIn(frame, { titleJa: battle.enemyTitleJa, nameJa: battle.enemyNameJa, ...(battle.enemyQuoteJa ? { quoteJa: battle.enemyQuoteJa } : {}) },
      storyState.people)
    : undefined, displayedStoryState ?? "", introHeld);
  const isResult = active.phase === "result";
  // What the options show of the answer: nothing yet while a right answer is held (they stay as they were tapped).
  const shownAnswer = holding ? undefined : answer;
  const isSpecial = !!battle.reasoning;
  // The quiz's speaker buttons stop reading when it goes or the next question comes.
  const reader = useReadAloud(readAloud, quizCard ? `${active.roundIndex}:${question?.id}` : "", autoReadAloud);
  // 「問題が出たら英語を自動で読み上げる」 (2026-11-14): the question read once as it shows; the answer stops it (below).
  useAutoReadAloud(reader, autoReadKey(autoReadAloud, active.phase, active.runId, active.roundIndex, question?.id), "question",
    question?.questionEn ?? "");
  // However the answer came (the answer button stops it in its own press, for iOS's sound; Debug answers too), the English
  // being read stops as the explanation comes. A button pressed during the explanation reads as before.
  const stopReading = reader.stop;
  useEffect(() => {
    if (active.phase === "feedback") stopReading();
  }, [active.phase, active.roundIndex]);
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
      data-talk={talk || undefined}
      data-answer-settling={answerSettling || undefined}
      // ためと決め: the right answer held still (battle.css keeps the options as they were tapped, the chosen one pressed).
      data-answer-held={holding || undefined}
      data-effect-active={active.phase === "feedback" && effectAnswer === answerKey || undefined}
      // An ordinary quiz's wrong answer, saved in this screen, plays no stamp: the option chosen gives a small shake (battle.css).
      data-answer-missed={active.phase === "feedback" && !!answer && !answer.correct && !isSpecial && animatedAnswer === answerKey || undefined}
      data-reduce-motion={reduceMotion || undefined}
      data-dialogue-hidden={isDialogue && windowVisibility.hidden || undefined}
      data-establishing={isDialogue && establishing || undefined}
      data-quiet={staging?.quiet}
      {...sceneTap.props}
    >
      {/* The stamp over the scene: a special battle's answer and the last answer of a full score. An ordinary quiz's
          right answer has its 「○ 正解！」 on the option itself (QuizChoices; 2026-11-28 user decision). */}
      {active.phase === "feedback" && answer && effectAnswer === answerKey && (isSpecial || perfectAnswer) && (
        <div
          className={`answer-effect ${answer.correct ? "answer-effect-correct" : "answer-effect-incorrect"}${perfectAnswer ? " answer-effect-perfect" : ""}`}
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
      <NameCutInPlate cutIn={nameCut} />
      <ItemShowLayer itemId={staging?.itemShow} quiet={!!staging?.quiet} />
      <ItemOutLayer card={itemOutCard(game, staging?.itemOut)} quiet={!!staging?.quiet} />
      {/* The battle's heading in every phase (S5): its landmark, or the battle's title for a city
          finale; 手がかり帳 is in the header, shown at a choice: the talk's choices, a question, the
          reasoning stop (whose panel also has its own 「手がかり帳を開く」). */}
      <SceneHeading label={landmark?.nameJa ?? battle.titleJa} badge={tourSceneBadge(game)} />
      {chrome.notebookTab && onNotebook && <SceneNotebookTool onClick={onNotebook} />}
      <div
        className={`battle-stage ${talk ? "" : "battle-stage-compact"} ${battle.scope === "city_finale" ? "finale-stage" : ""}`}
        data-testid={talk ? "scene-picture" : undefined}
      >
        {/* The opponent's heading above the reasoning's panel (its name plate in the talk: `# cutin: name`, NameCutIn;
            over a question, the name band over the window). */}
        <div className="battle-enemy-info">
          <p className="eyebrow">{battle.titleJa}</p>
          <p className="enemy-title">{battle.enemyTitleJa}</p>
          <h2>{battle.enemyNameJa}</h2>
          <p className="enemy-detail">{battle.enemyDescriptionJa}</p>
        </div>
        <div ref={stageLayer} className="battle-characters" data-together={far ? "four" : beside ? "three" : undefined}>
          {talk && stage.heroine && (
            <div className="battle-character-slot battle-heroine">
              <CharacterPortrait
                characterId="heroine"
                sceneId={battle.id}
                cityId={heroineCityId}
                emotion={heroineEmotion}
                focus={focus.heroine}
                stand={staging?.stand}
                leaving={leaving.includes("heroine")}
              >
                {heroineReaction?.mark && <ComicEffect effect={heroineReaction.mark} reduceMotion={reduceMotion} cueKey={displayedStoryState ?? ""} />}
              </CharacterPortrait>
            </div>
          )}
          <div className="battle-character-slot battle-enemy">{inPlace && oppositePortrait(inPlace.figure, inPlace.focus)}</div>
          {beside && <div className="battle-character-slot battle-beside">{oppositePortrait(beside.figure, beside.focus)}</div>}
          {far && <div className="battle-character-slot battle-far">{oppositePortrait(far.figure, far.focus)}</div>}
        </div>
      </div>
      <div className="battle-paper-shell" {...{ [DIALOGUE_WINDOW_ATTRIBUTE]: "" }} data-remembered={remembered || undefined} aria-hidden={(isDialogue && windowVisibility.hidden) || coveredByCutIn || undefined} inert={(isDialogue && windowVisibility.hidden) || coveredByCutIn || undefined}>
      {/* The talk's window (battle.css): its head and the reading area; a box of its own only in the talk. */}
      <div className="battle-window">
      {isDialogue && <DialogueWindowHead
        plateClassName="battle-nameplate"
        narration={!!frame && plate.narration}
        remembered={remembered}
        speaker={frame && showsSpeakerPlate(frame) && speaker}
        band={band}
      />}
      {/* Over a question the opponent asks, a small 「Quiz」 by their name (the options above are scored, a talk's
          choices never are; 2026-11-28 user decision); the explanation is no one's words, with no name over it. */}
      {quizCard && <DialogueWindowHead
        plateClassName="battle-nameplate"
        narration={feedbackShown}
        speaker={<>{battle.enemyNameJa}<span className="speaker-tag" data-testid="quiz-mark">
          <span className="sr-only">（</span><span lang="en">Quiz</span><span className="sr-only">）</span>
        </span></>}
        band={band}
      />}
      <section
        ref={readingArea}
        className={`paper battle-paper${talk ? " battle-dialogue" : ""}`}
        id="battle-content"
        aria-label="クイズ"
        data-testid={chrome.rebuttal ? "reasoning-rebuttal" : undefined}
      >
        {isResult ? (
          <div className="battle-result" data-testid="battle-result" data-outcome={outcome}>
            {/* The outcome over the scene, the rest on a glass card at the foot (2026-11-25 user decision: the result
                as part of the place, not a sheet over it; battle.css). */}
            <div className="battle-result-heading">
              <h2 className="sr-only">結果</h2>
              <OutcomeHeading outcome={outcome} />
              <p className="battle-score">
                <strong>{active.score}</strong>
                <span> / {quiz.questions.length} 問正解</span>
              </p>
            </div>
            <div className="battle-result-card">
              <div className="battle-result-body">
                <BattleRewards game={game} />
              </div>
              {/* What to do next, at the card's bottom in thumb reach (2026-11-14, the phone UI audit: it floated
                  mid-card), held there while a long result scrolls above it (battle.css). */}
              <div className="battle-result-foot">
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
                  {/* The way back alone is only 「→」, its name for screen readers (2026-11-27 user decision: no words a
                      tap tells); beside other ways on, its words tell them apart. */}
                  {onLeave && (() => {
                    const name = leaveLabel ?? (isSpecial ? "街歩きへ戻る" : "街歩きへ進む");
                    const alone = !onEpilogue && !onNextStoryBattle && !onNextEpisode;
                    return <button
                      className={`${onEpilogue || onNextStoryBattle ? "secondary" : "primary"}${alone ? " arrow-only" : ""}`}
                      aria-label={alone ? name : undefined}
                      onClick={onLeave}
                    >
                      {!alone && <>{name}{" "}</>}
                      <span aria-hidden="true">→</span>
                    </button>;
                  })()}
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
                  {onEnglish && <button className="secondary" onClick={() => onEnglish()}>
                    回答した問題を振り返る
                  </button>}
                </div>
              </div>
            </div>
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
            {chrome.advance && <button
              className="next"
              data-testid={chrome.advance.testId}
              disabled={!ready}
              aria-label={chrome.advance.label}
              onClick={advanceSafely}
            >
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
          feedbackShown && answer ? (
            <div
              className="quiz-feedback"
              data-testid="battle-feedback"
              id="battle-feedback"
              tabIndex={-1}
            >
              <h3 className="sr-only" role="status">{answer.correct ? "正解" : "不正解"}</h3>
              {/* After a wrong answer the right option shows it (its mark and translation, QuizChoices); screen readers
                  hear it here, read on from the explanation. */}
              {!answer.correct && (
                <p className="sr-only" data-testid="correct-answer">
                  正しい答え：
                  {japaneseOnly ? correctTranslation : <>
                    <span lang="en">{question.options.find((option) => option.id === question.correctOptionId)?.textEn}</span>
                    {correctTranslation && <>（{correctTranslation}）</>}
                  </>}
                </p>
              )}
              {/* The explanation as the narration (2026-11-28 user decision: no one's words, so she is no teacher). */}
              <p className="quiz-explanation">{answer.correct ? question.correctExplanationJa : question.incorrectExplanationJa}</p>
              {/* The reveal on the landmark photo, only where the question has a region (revealRegion). */}
              {question.revealRegion && landmarkAsset && (
                <LandmarkReveal
                  key={question.id}
                  asset={landmarkAsset}
                  region={question.revealRegion}
                  captionJa={question.revealCaptionJa}
                />
              )}
              {/* Its sources, with the answer chosen, are in ≡メニュー's 「画面の出典」 while it shows (2026-11-20 user decision). */}
              <div className="quiz-feedback-actions">
                {!japaneseOnly && onEnglish && <button type="button" className="text-button" onClick={() => onEnglish(question.id)}>
                  英文を確認する
                </button>}
                <button
                  type="button"
                  className="next"
                  data-testid="battle-advance"
                  aria-label="相手の反応を見る"
                  onClick={advanceSafely}
                >
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          ) : (
          <div className="question-area" data-testid="battle-question">
            {/* The battle's progress, for screen readers only (no question count on the screen). */}
            <p className="sr-only">第{active.roundIndex + 1}問 / 全{quiz.questions.length}問</p>
            {japaneseOnly ? (
              <h2 className="question-en question-ja" lang="ja">{quizTranslation?.questionJa}</h2>
            ) : (<>
            <h2 className="question-en">
              <InteractiveEnglish
                key={question.id}
                text={question.questionEn}
                vocabulary={question.vocabularyJa}
                metWords={metWords}
                label="問題文"
                onDoubleTap={() =>
                  revealTranslation(learning, question.textKey, "question")
                }
              />
            </h2>
            <div className="question-translation-tools">
              <Translation learning={learning} id={question.textKey} part="question">
                <ReadAloudButton reader={reader} part="question" text={question.questionEn} />
              </Translation>
              <TranslationAll learning={learning} id={question.textKey} />
            </div>
            </>)}
          </div>
          )
        )}
      </section>
      <LineCards />
      </div>
      {/* The options float above the window, which keeps the question they answer, as the talk's choices do; her whisper
          (the hint) above them, and after a right answer her line in its place (HeroineNote). */}
      {quizCard && question && <div className="vn-choices battle-quiz-choices">
        {/* The hint as the heroine's whisper: her words when the question has them (hintHeroineJa), else its hint
            (hintJa, plain narration: shown as her note, not quoted as her words). Always shown over the options, with
            no button to open or close it (user decision 2026-11-11). */}
        {(active.phase === "question" || holding) && (
          <HeroineNote
            className="hint-whisper"
            label={`${game.heroineName}の耳打ち`}
            hideLabel
            text={question.hintHeroineJa ?? question.hintJa}
            emotion="smile"
            sceneId={battle.id}
            cityId={heroineCityId}
          />
        )}
        {/* Her short line on a right answer, only where the question has one (heroineCorrectJa). */}
        {feedbackShown && answer?.correct && question.heroineCorrectJa && (
          <HeroineNote
            label={game.heroineName}
            text={question.heroineCorrectJa}
            emotion="happy"
            sceneId={battle.id}
            cityId={heroineCityId}
            testId="heroine-correct"
          />
        )}
        <QuizChoices
          question={question}
          optionsJa={quizTranslation?.optionsJa}
          learning={learning}
          reader={reader}
          japaneseOnly={japaneseOnly}
          metWords={metWords}
          answer={shownAnswer}
          disabled={active.phase !== "question"}
          chosenId={answer?.optionId}
          glowing={!holding && active.phase === "feedback" && glowAnswer === answerKey}
          popping={active.phase === "feedback" && effectAnswer === answerKey}
          animateLeaving={animatedAnswer === answerKey && !reduceMotion}
          onAnswer={(optionId) => {
            if (onAnswer(optionId)) {
              // The English being read (the automatic reading, or a button's) stops at the answer.
              reader.stop();
              answeredAt.current = performance.now();
              setAnswerSettling(true);
              const key = `${battle.id}:${active.roundIndex}:${optionId}`;
              setAnimatedAnswer(key);
              const moving = !reduceMotion && !document.hidden && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
              // A right answer: held still first (its pulse, sound, mark and explanation come after); under reduced
              // motion no hold, its glow at once. A wrong one of a special battle: its stamp.
              const beat = answerBeat({ right: optionId === question.correctOptionId, moving, special: isSpecial });
              if (beat === "hold") setHeldAnswer(key);
              else if (beat === "glow") setGlowAnswer(key);
              else if (beat === "stamp") setEffectAnswer(key);
            }
          }}
        />
      </div>}
      {/* The talk's choices float above its window, which keeps the line they answer (romance-scene.css .vn-choices). */}
      {isDialogue && frame && choosing && onChoose && <div className="vn-choices">
        <ChoicePoint minigame={frame.minigame} ready={ready} cast={{
          heroine: { emotion: heroineEmotion, sceneId: battle.id, cityId: heroineCityId },
          ...(stage.opposite ? { person: <CharacterFigure characterId={stage.opposite.figure} /> } : {}),
        }}>
          <SceneChoices choices={choices} disabled={!ready} onChoose={onChoose} testId="battle-choice" />
        </ChoicePoint>
      </div>}
      </div>
      {/* The talk's tools, at the screen's lower left corner (DialogueControls). */}
      {isDialogue && <DialogueControls close={<DialogueWindowHide state={windowVisibility} />} entries={entries} auto={auto} hidden={windowVisibility.hidden || coveredByCutIn} />}
      {isDialogue && <DialogueWindowRestore state={windowVisibility} />}
      <MiniGameSlot />
      {cutIn && <ReasoningCutIn kind={cutIn} reduceMotion={reduceMotion} onComplete={() => {
        setCutIn(null);
        window.requestAnimationFrame(() =>
          readingArea.current?.querySelector<HTMLButtonElement>('[data-testid="reasoning-notebook"]')?.focus({ preventScroll: true }),
        );
      }} />}
      {quizCutIn && <QuizCutIn reduceMotion={reduceMotion} onComplete={() => {
        setQuizCutIn(false);
        // The talk's line or button that had the focus went with the talk: once the question takes it again, a lost
        // focus goes where a new screen's does (the scene's heading, scene-focus.ts), never left on the page body. A
        // focus placed meanwhile (the header's ≡メニュー) stays.
        window.requestAnimationFrame(() => focusSceneHeading(document.getElementById("main")));
      }} />}
    </div>
  );
}
