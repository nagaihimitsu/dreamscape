import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { battles, battleQuizzes, landmarks, presentation } from "../../content";
import type { GameState } from "../../domain/game";
import { getBattleOutcome } from "../../domain/battle";
import { DialogueText } from "../../components/DialogueText";
import { DialogueWindowHide, DialogueWindowRestore, useDialogueWindow } from "../../components/DialogueWindowVisibility";
import { AutoAdvanceButton, useAutoAdvance } from "../../components/useAutoAdvance";
import { dialogueObstructed } from "../../components/dialogueObstructed";
import { CanalScene } from "../../components/CanalScene";
import { CharacterPortrait, characterForBattle } from "../../components/CharacterPortrait";
import { DialogueLog, useDialogueLog } from "../../components/DialogueLog";
import { EnemyPortrait } from "./EnemyPortrait";
import { BattleRewards } from "../journey/BattleRewards";
import { ReasoningPanel } from "./ReasoningPanel";
import {
  Translation,
  TranslationAll,
  toggleTranslation,
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
}: Props) {
  const active = game.activeBattle!;
  const battle = battles.find((item) => item.id === active.battleId)!;
  const quiz = battleQuizzes[battle.quizId];
  const question = quiz.questions[active.roundIndex];
  const answer = active.answers[active.roundIndex];
  const record = game.battleRecords.find((item) => item.battleId === battle.id);
  const [paused, setPaused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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
  const answerKey = `${battle.id}:${active.roundIndex}:${answer?.optionId}`;
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
  const frame = active.frame;
  const speaker = frame?.speaker === "enemy"
    ? battle.enemyNameJa
    : frame?.speaker === "heroine"
      ? game.heroineName
      : frame?.speaker === "player"
        ? game.playerName
        : "旅の風景";
  const { ready, onReady, entries } = useDialogueLog(
    `${battle.id}:${record?.attempts ?? 0}`,
    game.revision,
    speaker,
    frame?.text ?? "",
  );
  const isDialogue = active.phase === "dialogue";
  const advanceSafely = () => {
    if ((!isDialogue || ready) && !windowVisibility.hidden && !dialogueObstructed()) onAdvance();
  };
  const { show } = windowVisibility;
  useEffect(() => {
    if (!isDialogue) show();
  }, [isDialogue, show]);
  const auto = useAutoAdvance({
    ready,
    canAdvance: isDialogue && !paused && !menuOpen && !windowVisibility.hidden && !!frame && !frame.ended,
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
      data-phase={active.phase}
      data-reduce-motion={reduceMotion || undefined}
      data-dialogue-hidden={isDialogue && windowVisibility.hidden || undefined}
    >
      <div className="battle-backdrop">
        <CanalScene backgroundId={frame?.background ?? battle.backgroundAssetId} />
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
                emotion={frame?.speaker === "heroine" ? frame.emotion : "neutral"}
                active={frame?.speaker === "heroine"}
              />
            </div>
          )}
          <div className="battle-character-slot battle-enemy">
            <CharacterPortrait
              characterId={characterForBattle(battle.id)}
              emotion={frame?.speaker === "enemy" ? frame.emotion : "neutral"}
              active={frame?.speaker === "enemy"}
              fallback={
                <EnemyPortrait
                  emotion={frame?.speaker === "enemy" ? frame.emotion : "neutral"}
                  variant={battle.format}
                  portrait={battle.portrait}
                />
              }
            />
          </div>
        </div>
      </div>
      {isDialogue && onNotebook && (
        <button className="notebook-button battle-stage-notebook" onClick={onNotebook}>
          手がかり帳
        </button>
      )}
      <div className="battle-paper-shell" aria-hidden={isDialogue && windowVisibility.hidden || undefined} inert={isDialogue && windowVisibility.hidden || undefined}>
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
      >
        {!isDialogue && <div className="battle-roundbar">
          <span>
            {isResult
              ? "決着"
              : `第${active.roundIndex + 1}問 / 全${quiz.questions.length}問`}
          </span>
          <span>英語 {quiz.englishLevel}</span>
          {onNotebook && (
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
                特別対決の戦績を記録しました。この対決によるAPや恋愛の進行の変化はありません。
              </p>
            ) : (
              <BattleRewards game={game} onClaim={onClaimRewards} />
            )}
            <div className="battle-result-actions">
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
                className={onEpilogue ? "secondary" : "primary"}
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
              key={game.revision}
              text={frame.text}
              speed={speed}
              onReady={onReady}
              onAdvance={advanceSafely}
            />
            <button
              className="next"
              data-testid="battle-advance"
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
              単語は1回で意味、続けて2回で文の訳。回答はA・B・Cを押します。
            </p>
            <h2 className="question-en">
              <InteractiveEnglish
                key={question.id}
                text={question.questionEn}
                vocabulary={question.vocabularyJa}
                label="問題文"
                onDoubleTap={() =>
                  toggleTranslation(learning, question.id, "question")
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
                          if (onAnswer(option.id))
                            setAnimatedAnswer(`${battle.id}:${active.roundIndex}:${option.id}`);
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
                            toggleTranslation(learning, question.id, option.id)
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
                <h3 role="status">{answer.correct ? "正解" : "不正解"}</h3>
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
      {isDialogue && <DialogueWindowRestore state={windowVisibility} />}
    </div>
  );
}
