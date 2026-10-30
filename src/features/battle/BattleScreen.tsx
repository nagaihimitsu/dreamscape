import { useCallback, useEffect, useState } from "react";
import { battles, battleQuizzes, presentation } from "../../content";
import type { GameState } from "../../domain/game";
import { getBattleOutcome } from "../../domain/battle";
import { DialogueText } from "../../components/DialogueText";
import { EnemyPortrait } from "./EnemyPortrait";

interface Props {
  game: GameState;
  speed: number;
  onSpeed: (speed: number) => void;
  onAdvance: () => void;
  onAnswer: (id: string) => void;
  onHint: () => void;
  onReplay: () => void;
  onLeave: () => void;
}

export function BattleScreen({
  game,
  speed,
  onSpeed,
  onAdvance,
  onAnswer,
  onHint,
  onReplay,
  onLeave,
}: Props) {
  const active = game.activeBattle!;
  const battle = battles.find((item) => item.id === active.battleId)!;
  const quiz = battleQuizzes[battle.quizId];
  const question = quiz.questions[active.roundIndex];
  const answer = active.answers[active.roundIndex];
  const record = game.battleRecords.find((item) => item.battleId === battle.id);
  const [ready, setReady] = useState(false);
  const onReady = useCallback((value: boolean) => setReady(value), []);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const target = document.getElementById(
      active.phase === "feedback" ? "battle-feedback" : "battle-content",
    );
    target?.scrollIntoView({ block: "start" });
    if (active.phase === "feedback") target?.focus({ preventScroll: true });
  }, [active.phase, active.roundIndex]);
  const frame = active.frame;
  const isDialogue = active.phase === "dialogue";
  const isResult = active.phase === "result";

  return (
    <div className="battle-screen" data-phase={active.phase}>
      <div
        className={`battle-stage ${isDialogue ? "" : "battle-stage-compact"}`}
      >
        <div className="battle-enemy-info">
          <p className="eyebrow">{battle.titleJa}</p>
          <p className="enemy-title">{battle.enemyTitleJa}</p>
          <h1>{battle.enemyNameJa}</h1>
          <p className="enemy-detail">{battle.enemyDescriptionJa}</p>
        </div>
        <EnemyPortrait emotion={frame?.emotion} />
      </div>
      <section
        className="paper battle-paper"
        id="battle-content"
        aria-label="クイズバトル"
      >
        <div className="battle-roundbar">
          <span>
            {isResult
              ? "決着"
              : `第${active.roundIndex + 1}問 / 全${quiz.questions.length}問`}
          </span>
          <span>英語 {quiz.englishLevel}</span>
        </div>
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
            <h2 className="outcome">
              {
                {
                  perfect: "PERFECT VICTORY",
                  victory: "VICTORY",
                  defeat: "DEFEAT",
                }[getBattleOutcome(active.score)]
              }
            </h2>
            <p className="battle-score">
              <strong>{active.score}</strong>
              <span> / {quiz.questions.length} 問正解</span>
            </p>
            <ol className="answer-history">
              {active.answers.map((item, index) => (
                <li key={item.questionId}>
                  <span>第{index + 1}問</span>
                  <span
                    className={
                      item.correct ? "correct-label" : "incorrect-label"
                    }
                  >
                    {item.correct ? "正解" : "不正解"}
                  </span>
                  {item.hintUsed && (
                    <span className="fine-print">ヒント使用</span>
                  )}
                </li>
              ))}
            </ol>
            {record && (
              <p className="record-summary">
                挑戦 {record.attempts}回 · 初回 {record.firstScore}問 · 最高{" "}
                {record.bestScore}問正解
              </p>
            )}
            <button className="primary" onClick={onReplay}>
              再戦する <span aria-hidden="true">↻</span>
            </button>
            <button className="secondary" onClick={onLeave}>
              恋愛モードに戻る
            </button>
          </div>
        ) : isDialogue && frame ? (
          <>
            <div className="speaker">
              <span
                className={`speaker-dot ${frame.emotion}`}
                aria-hidden="true"
              />
              {frame.speaker === "enemy"
                ? battle.enemyNameJa
                : frame.speaker === "heroine"
                  ? game.heroineName
                  : frame.speaker === "player"
                    ? game.playerName
                    : "旅の風景"}
              {frame.emotion !== "neutral" && (
                <span className="emotion">
                  {presentation.emotions[frame.emotion]}
                </span>
              )}
            </div>
            <DialogueText
              key={game.revision}
              text={frame.text}
              speed={speed}
              onReady={onReady}
            />
            <button
              className="next"
              data-testid="battle-advance"
              disabled={!ready}
              onClick={onAdvance}
            >
              {frame.ended
                ? active.dialogueScene === battle.scenes.outro
                  ? "結果を見る"
                  : "問題へ進む"
                : "続きを読む"}{" "}
              <span aria-hidden="true">→</span>
            </button>
          </>
        ) : (
          <div className="question-area" data-testid="battle-question">
            <h2 className="question-en" lang="en">
              {question.questionEn}
            </h2>
            <div className="quiz-choices" aria-label="英語の3択">
              {question.options.map((option) => {
                const selected = answer?.optionId === option.id;
                const correct =
                  answer && option.id === question.correctOptionId;
                return (
                  <button
                    key={option.id}
                    data-testid={`answer-${option.id}`}
                    className={`quiz-choice ${selected ? "chosen" : ""} ${correct ? "correct" : ""}`}
                    disabled={active.phase !== "question"}
                    onClick={() => onAnswer(option.id)}
                  >
                    <span className="option-id" aria-hidden="true">
                      {option.id}
                    </span>
                    <span lang="en">{option.textEn}</span>
                    {answer && (
                      <span className="option-mark">
                        {selected ? "選んだ答え" : ""}
                        {correct ? " ✓ 正解" : ""}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
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
                <details className="quiz-sources">
                  <summary>解説の根拠を読む</summary>
                  <ul>
                    {question.sources.map((source) => (
                      <li key={source.url}>
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
                  onClick={onAdvance}
                >
                  敵の反応を見る <span aria-hidden="true">→</span>
                </button>
              </div>
            )}
          </div>
        )}
        {!isResult && (
          <div className="story-tools">
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
        )}
      </section>
    </div>
  );
}
