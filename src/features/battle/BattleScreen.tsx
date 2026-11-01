import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { dialogueExpressions, dialogueReactions, landmarks, presentation, reasoningIntroductions, tourismAssets } from "../../content";
import { resolveDialogueExpression } from "../../content/dialogue-expressions";
import { resolveDialogueReaction } from "../../content/dialogue-reactions";
import { presentationStoryId } from "../../content/legacy-milano";
import type { GameState } from "../../domain/game";
import { getActiveBattleContent, getBattleOutcome } from "../../domain/battle";
import { beginStory, continueStory, type StoryStep } from "../../story/runtime";
import { DialogueText } from "../../components/DialogueText";
import { DialogueWindowHide, DialogueWindowRestore, useDialogueWindow } from "../../components/DialogueWindowVisibility";
import { AutoAdvanceButton, useAutoAdvance } from "../../components/useAutoAdvance";
import { dialogueObstructed } from "../../components/dialogueObstructed";
import { CanalScene } from "../../components/CanalScene";
import { BackgroundCredits } from "../../components/BackgroundCredits";
import { CharacterPortrait, characterForBattle } from "../../components/CharacterPortrait";
import { ComicEffect } from "../../components/ComicEffect";
import { DialogueLog, useDialogueLog } from "../../components/DialogueLog";
import { EnemyPortrait } from "./EnemyPortrait";
import { BattleRewards } from "../journey/BattleRewards";
import { ReasoningPanel } from "./ReasoningPanel";
import { ReasoningCutIn } from "./ReasoningCutIn";
import {
  Translation,
  TranslationAll,
  revealTranslation,
} from "../learning/Translations";
import { InteractiveEnglish } from "../learning/InteractiveEnglish";
import type { Learning } from "../learning/useLearning";
import "./battle.css";

interface Props {
  learning: Learning;
  onEnglish: (questionId?: string) => void;
  game: GameState;
  speed: number;
  reduceMotion: boolean;
  onSpeed: (speed: number) => void;
  onAdvance: () => void;
  onAnswer: (id: string) => boolean;
  onHint: () => void;
  onReplay: () => void;
  onLeave: () => void;
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
  onSpeed,
  onAdvance,
  onAnswer,
  onHint,
  onReplay,
  onLeave,
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
  const record = game.battleRecords.find((item) => item.battleId === battle.id);
  // The claim transition is already saved before these presentation-only
  // frames appear. Mounting directly in reasoning (reload or old save) never
  // replays them, and a different run cannot inherit the prior transition.
  const previousBattle = useRef({
    runId: active.runId, phase: active.phase, scene: active.dialogueScene,
    ended: active.frame?.ended ?? false,
  });
  const [rebuttal, setRebuttal] = useState<{ storyId: string; step: StoryStep; index: number } | null>(null);
  const [cutIn, setCutIn] = useState<"contradiction" | "connection" | null>(null);
  useLayoutEffect(() => {
    const previous = previousBattle.current;
    previousBattle.current = {
      runId: active.runId, phase: active.phase, scene: active.dialogueScene,
      ended: active.frame?.ended ?? false,
    };
    if (previous.runId !== active.runId || active.phase !== "reasoning") {
      setRebuttal(null);
      setCutIn(null);
    }
    const config = battle.reasoning;
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
  }, [active.runId, active.phase, active.dialogueScene, active.frame?.ended, battle, game.playerName, game.heroineName]);
  const [paused, setPaused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const windowVisibility = useDialogueWindow();
  const readingArea = useRef<HTMLElement>(null);
  const displayedStoryState = rebuttal?.step.storyState ?? (active.phase === "dialogue" ? active.storyState : null);
  // Start each new scene at the top of its own reading area, without moving
  // the page or disturbing a question when a notebook or translation opens.
  useLayoutEffect(() => {
    if (active.phase !== "feedback") readingArea.current?.scrollTo({ top: 0 });
  }, [active.phase, active.roundIndex, displayedStoryState]);
  // Only animate an answer saved in this mounted screen. A restored feedback
  // frame is already final and must never be scored or animated again.
  const [animatedAnswer, setAnimatedAnswer] = useState<string | null>(null);
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
    const timer = window.setTimeout(dismiss, 900);
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
  }, [active.phase, answerKey, effectAnswer, reduceMotion]);
  useEffect(() => {
    if (active.phase !== "feedback") return;
    const focusFeedback = () => document.getElementById("battle-feedback")?.focus();
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
  const backgroundId = frame?.background ?? battle.backgroundAssetId;
  const backgroundAssetId = presentation.backgrounds[backgroundId]?.imageAssetId;
  const backgroundAsset = backgroundAssetId
    ? tourismAssets.find((asset) => asset.id === backgroundAssetId)
    : undefined;
  const storyId = presentationStoryId(rebuttal?.storyId ?? battle.storyId);
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
    if (cutIn || (isDialogue && !ready) || windowVisibility.hidden || dialogueObstructed()) return;
    if (rebuttal) {
      if (rebuttal.step.frame.ended) {
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
    canAdvance: isDialogue && !paused && !menuOpen && !creditsOpen && !windowVisibility.hidden && !!frame && !frame.ended,
    text: frame?.text ?? "",
    onAdvance: advanceSafely,
  });
  const isResult = active.phase === "result";
  const isSpecial = !!battle.reasoning;
  const showReasoning =
    !!battle.reasoning && battle.reasoning.roundIndex === active.roundIndex;

  return (
    <div
      className={`battle-screen ${answer && animatedAnswer === answerKey ? "answer-animating" : ""}`}
      data-phase={isDialogue ? "dialogue" : active.phase}
      data-effect-active={active.phase === "feedback" && effectAnswer === answerKey || undefined}
      data-reduce-motion={reduceMotion || undefined}
      data-dialogue-hidden={isDialogue && windowVisibility.hidden || undefined}
    >
      {active.phase === "feedback" && answer && effectAnswer === answerKey && (
        <div
          className={`answer-effect ${answer.correct ? "answer-effect-correct" : "answer-effect-incorrect"}`}
          data-testid="answer-effect"
          data-result={answer.correct ? "correct" : "incorrect"}
          aria-hidden="true"
        >
          <div className="answer-effect-rays">
            {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
          </div>
          <div className="answer-effect-stamp">
            <span className="answer-effect-symbol">{answer.correct ? "○" : "×"}</span>
            <strong>{answer.correct ? "正解！" : "不正解"}</strong>
          </div>
        </div>
      )}
      <div className="battle-backdrop">
        <CanalScene backgroundId={backgroundId} />
      </div>
      <div
        className={`battle-stage ${isDialogue ? "" : "battle-stage-compact"} ${battle.scope === "city_finale" ? "finale-stage" : ""}`}
      >
        <div className="battle-enemy-info">
          <p className="eyebrow">{battle.titleJa}</p>
          <p className="enemy-title">{battle.enemyTitleJa}</p>
          <h1>{battle.enemyNameJa}</h1>
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
              fallback={
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
      {isDialogue && !rebuttal && onNotebook && (
        <button className="notebook-button battle-stage-notebook" onClick={onNotebook}>
          手がかり帳
        </button>
      )}
      <div className="battle-paper-shell" aria-hidden={(isDialogue && windowVisibility.hidden) || !!cutIn || undefined} inert={(isDialogue && windowVisibility.hidden) || !!cutIn || undefined}>
      {isDialogue && !paused && frame && (
        <div className="speaker battle-nameplate">
          {speaker}
          {frame.emotion !== "neutral" && (
            <span className="emotion">{presentation.emotions[frame.emotion]}</span>
          )}
        </div>
      )}
      <section
        ref={readingArea}
        className={`paper battle-paper${isDialogue && !paused ? " battle-dialogue" : ""}`}
        id="battle-content"
        aria-label="クイズバトル"
        data-testid={rebuttal ? "reasoning-rebuttal" : undefined}
      >
        {!isDialogue && <div className="battle-roundbar">
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
        {!paused && !isResult && active.phase !== "reasoning" && active.answers.length > 0 && (
          <button className="text-button" onClick={() => onEnglish()}>
            回答した問題を振り返る
          </button>
        )}
        {paused ? (
          <div className="paused">
            <h2>ひと休み</h2>
            <p>
              この場面は保存されています。
              <br />
              回答や戦績はそのままで再開できます。
            </p>
            <button className="primary" onClick={() => setPaused(false)}>
              バトルを再開する
            </button>
          </div>
        ) : isResult ? (
          <div className="battle-result" data-testid="battle-result">
            <p className="eyebrow">今回の結果</p>
            <div className="battle-result-heading">
              <h2 className="outcome">
                {
                  {
                    perfect: "PERFECT VICTORY",
                    victory: "VICTORY",
                    defeat: "DEFEAT",
                  }[getBattleOutcome(active.score, quiz.questions.length)]
                }
              </h2>
              <p className="battle-score">
                <strong>{active.score}</strong>
                <span> / {quiz.questions.length} 問正解</span>
              </p>
            </div>
            {isSpecial ? (
              <p className="special-result-note">
                この対決ではAPを獲得しません。
              </p>
            ) : (
              <BattleRewards game={game} onClaim={onClaimRewards} />
            )}
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
              <button
                className={onEpilogue || onNextStoryBattle ? "secondary" : "primary"}
                onClick={onLeave}
              >
                {isSpecial ? "自由時間へ戻る" : "自由時間へ進む"}{" "}
                <span aria-hidden="true">→</span>
              </button>
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
              <button className="secondary" onClick={onReplay}>
                再戦する <span aria-hidden="true">↻</span>
              </button>
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
              text={frame.text}
              speed={speed}
              onReady={onReady}
              onAdvance={advanceSafely}
            />
            <button
              className="next"
              data-testid={rebuttal ? "reasoning-rebuttal-advance" : "battle-advance"}
              disabled={!ready}
              onClick={advanceSafely}
            >
              {frame.ended
                ? active.dialogueScene === battle.scenes.outro
                  ? "結果を見る"
                  : isSpecial
                    ? "次へ進む"
                    : "問題へ進む"
                : "続きを読む"}{" "}
              <span aria-hidden="true">→</span>
            </button>
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
                            const key = `${battle.id}:${active.roundIndex}:${option.id}`;
                            setAnimatedAnswer(key);
                            if (!reduceMotion && !document.hidden &&
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
                  <p className="correct-answer">
                    正しい答え：
                    <span lang="en">
                      {
                        question.options.find(
                          (option) => option.id === question.correctOptionId,
                        )?.textEn
                      }
                    </span>
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
        {!isResult && (
          <div className="story-tools">
            {isDialogue && <DialogueLog entries={entries} />}
            {isDialogue && <AutoAdvanceButton state={auto} />}
            <details className="battle-tool-menu" open={menuOpen} onToggle={(event) => setMenuOpen(event.currentTarget.open)}>
              <summary>会話の操作</summary>
              <div className="battle-tool-menu-content">
            {isDialogue && <DialogueWindowHide state={windowVisibility} onHide={() => setMenuOpen(false)} />}
            {backgroundAsset && (
              <button type="button" className="text-button" onClick={() => setCreditsOpen(true)}>
                背景画像を見る
              </button>
            )}
            <button
              className="text-button"
              onClick={() => setPaused((value) => !value)}
            >
              {paused ? "中断を解除" : "中断する"}
            </button>
            <label>
              文字送り
              <select
                aria-label="文字送り"
                value={speed}
                onChange={(e) => onSpeed(Number(e.target.value))}
              >
                <option value={45}>ゆっくり</option>
                <option value={25}>ふつう</option>
                <option value={0}>一括表示</option>
              </select>
            </label>
              </div>
            </details>
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
